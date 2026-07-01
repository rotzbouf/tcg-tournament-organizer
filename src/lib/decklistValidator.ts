import { DecklistEntry } from '@/types/player'
import { GameType } from '@/types/tournament'
import { GAME_CONFIG, DeckRules } from './gameConfig'
import { BanlistData } from '@/types/banlist'
import { aggregateByName, checkLegality, LegalityError } from './legalityChecker'

// Basic lands (MTG) and basic energy (Pokémon) may be included in any number,
// so they are exempt from the per-card copy limit.
const MTG_BASIC_LANDS = new Set([
  'plains', 'island', 'swamp', 'mountain', 'forest', 'wastes',
  'snow-covered plains', 'snow-covered island', 'snow-covered swamp',
  'snow-covered mountain', 'snow-covered forest',
])

const POKEMON_BASIC_ENERGY = /^(?:basic\s+)?(?:grass|fire|water|lightning|psychic|fighting|darkness|metal|fairy)\s+energy$/i

function hasUnlimitedCopies(cardName: string, game: GameType): boolean {
  const name = cardName.toLowerCase().trim()
  if (game === 'mtg') return MTG_BASIC_LANDS.has(name)
  if (game === 'pokemon') return POKEMON_BASIC_ENERGY.test(name)
  return false
}

export interface ValidationError {
  type: 'too_few_cards' | 'too_many_cards' | 'too_many_copies' | 'too_many_side_cards'
  message: string
  cardName?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  legalityErrors: LegalityError[]
}

export function validateDecklist(entries: DecklistEntry[], game: GameType, gameFormat?: string | null, banlist?: BanlistData | null): ValidationResult {
  const gameConfig = GAME_CONFIG[game]
  const formatConfig = gameFormat ? gameConfig.formats.find(f => f.id === gameFormat) : null
  const rules = formatConfig?.deckRulesOverride
    ? { ...gameConfig.deckRules, ...formatConfig.deckRulesOverride } as DeckRules
    : gameConfig.deckRules

  const errors: ValidationError[] = []
  const legalityErrors: LegalityError[] = []

  if (rules) {
    // Main deck and sideboard are sized independently; the copy limit spans both.
    const mainCards = entries.reduce((sum, e) => sum + (e.sideboard ? 0 : e.quantity), 0)
    const sideCards = entries.reduce((sum, e) => sum + (e.sideboard ? e.quantity : 0), 0)

    if (rules.mainMin > 0 && mainCards < rules.mainMin) {
      errors.push({ type: 'too_few_cards', message: `${mainCards}/${rules.mainMin}` })
    }
    if (rules.mainMax > 0 && mainCards > rules.mainMax) {
      errors.push({ type: 'too_many_cards', message: `${mainCards}/${rules.mainMax}` })
    }
    if (rules.sideMax > 0 && sideCards > rules.sideMax) {
      errors.push({ type: 'too_many_side_cards', message: `${sideCards}/${rules.sideMax}` })
    }
    // Copy limit applies to the total across the whole list; basics are exempt.
    const countedEntries = entries.filter(e => !hasUnlimitedCopies(e.cardName, game))
    for (const { cardName, quantity } of aggregateByName(countedEntries)) {
      if (quantity > rules.maxCopies) {
        errors.push({ type: 'too_many_copies', message: `${quantity}x`, cardName })
      }
    }
  }

  if (banlist) {
    legalityErrors.push(...checkLegality(entries, banlist))
  }

  return { valid: errors.length === 0 && legalityErrors.length === 0, errors, legalityErrors }
}

export function getCardCountSummary(entries: DecklistEntry[], rules: DeckRules | null): string {
  const total = entries.reduce((sum, e) => sum + e.quantity, 0)
  if (!rules) return `${total}`
  if (rules.mainMin === rules.mainMax && rules.mainMax > 0) return `${total}/${rules.mainMax}`
  if (rules.mainMax > 0) return `${total} (${rules.mainMin}–${rules.mainMax})`
  return `${total} (min ${rules.mainMin})`
}
