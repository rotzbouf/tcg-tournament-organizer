import { DecklistEntry } from '@/types/player'
import { GameType } from '@/types/tournament'
import { GAME_CONFIG, DeckRules } from './gameConfig'

export interface ValidationError {
  type: 'too_few_cards' | 'too_many_cards' | 'too_many_copies'
  message: string
  cardName?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export function validateDecklist(entries: DecklistEntry[], game: GameType): ValidationResult {
  const rules = GAME_CONFIG[game].deckRules
  if (!rules) return { valid: true, errors: [] }

  const errors: ValidationError[] = []
  const totalCards = entries.reduce((sum, e) => sum + e.quantity, 0)

  if (rules.mainMin > 0 && totalCards < rules.mainMin) {
    errors.push({
      type: 'too_few_cards',
      message: `${totalCards}/${rules.mainMin}`,
    })
  }

  if (rules.mainMax > 0 && totalCards > rules.mainMax) {
    errors.push({
      type: 'too_many_cards',
      message: `${totalCards}/${rules.mainMax}`,
    })
  }

  for (const entry of entries) {
    if (entry.quantity > rules.maxCopies) {
      errors.push({
        type: 'too_many_copies',
        message: `${entry.quantity}x`,
        cardName: entry.cardName,
      })
    }
  }

  return { valid: errors.length === 0, errors }
}

export function getCardCountSummary(entries: DecklistEntry[], rules: DeckRules | null): string {
  const total = entries.reduce((sum, e) => sum + e.quantity, 0)
  if (!rules) return `${total}`
  if (rules.mainMin === rules.mainMax && rules.mainMax > 0) return `${total}/${rules.mainMax}`
  if (rules.mainMax > 0) return `${total} (${rules.mainMin}–${rules.mainMax})`
  return `${total} (min ${rules.mainMin})`
}
