import { DecklistEntry } from '@/types/player'
import { BanlistData } from '@/types/banlist'

export interface LegalityError {
  type: 'forbidden' | 'limited_exceeded' | 'semi_limited_exceeded' | 'out_of_rotation'
  cardName: string
  quantity: number
  maxAllowed: number
  setCode?: string
}

function normalize(name: string): string {
  return name.toLowerCase().trim()
}

// Double-faced / split / adventure cards are named "Front // Back" on Scryfall,
// but deck exports often list only the front face. Return the front face so both
// spellings can be matched against the legal-card whitelist.
function frontFace(name: string): string {
  return name.split(' // ')[0].trim()
}

/**
 * Sum quantities of entries that refer to the same card (case-insensitive),
 * so copy limits apply to the whole decklist rather than per line. Preserves
 * first-seen order and the first-seen spelling of each card name.
 */
export function aggregateByName(entries: DecklistEntry[]): { cardName: string; quantity: number }[] {
  const totals = new Map<string, { cardName: string; quantity: number }>()
  for (const entry of entries) {
    const key = normalize(entry.cardName)
    const existing = totals.get(key)
    if (existing) existing.quantity += entry.quantity
    else totals.set(key, { cardName: entry.cardName, quantity: entry.quantity })
  }
  return [...totals.values()]
}

export function checkLegality(entries: DecklistEntry[], banlist: BanlistData): LegalityError[] {
  const errors: LegalityError[] = []

  // Legal card whitelist (MTG Standard, Pauper — rotation or rarity restriction)
  if (banlist.legalCards && banlist.legalCards.length > 0) {
    const legalSet = new Set<string>()
    for (const name of banlist.legalCards) {
      legalSet.add(normalize(name))
      legalSet.add(normalize(frontFace(name)))
    }
    for (const entry of entries) {
      if (!legalSet.has(normalize(entry.cardName)) && !legalSet.has(normalize(frontFace(entry.cardName)))) {
        errors.push({ type: 'out_of_rotation', cardName: entry.cardName, quantity: entry.quantity, maxAllowed: 0 })
      }
    }
  }

  // Pokémon rotation: set-code check for Pokémon section cards only
  // Trainer/Energy legality is name-based; skipped here to avoid false positives from reprints
  if (banlist.legalSetCodes && banlist.legalSetCodes.length > 0) {
    const legalCodes = new Set(banlist.legalSetCodes.map(c => c.toUpperCase()))
    for (const entry of entries) {
      if (entry.section !== 'pokemon') continue
      if (!entry.setCode || legalCodes.has(entry.setCode.toUpperCase())) continue
      errors.push({ type: 'out_of_rotation', cardName: entry.cardName, quantity: entry.quantity, maxAllowed: 0, setCode: entry.setCode })
    }
  }

  // Explicit ban/limit checks — copies of the same card count together across
  // all entries (e.g. main + side deck), so aggregate before comparing to limits.
  const forbiddenSet = new Set(banlist.forbidden.map(normalize))
  const limitedSet = new Set(banlist.limited.map(normalize))
  const semiLimitedSet = new Set(banlist.semiLimited.map(normalize))

  for (const { cardName, quantity } of aggregateByName(entries)) {
    const key = normalize(cardName)
    if (forbiddenSet.has(key)) {
      errors.push({ type: 'forbidden', cardName, quantity, maxAllowed: 0 })
    } else if (limitedSet.has(key) && quantity > 1) {
      errors.push({ type: 'limited_exceeded', cardName, quantity, maxAllowed: 1 })
    } else if (semiLimitedSet.has(key) && quantity > 2) {
      errors.push({ type: 'semi_limited_exceeded', cardName, quantity, maxAllowed: 2 })
    }
  }

  return errors
}
