import { DecklistEntry } from '@/types/player'
import { BanlistData } from '@/types/banlist'

export interface LegalityError {
  type: 'forbidden' | 'limited_exceeded' | 'semi_limited_exceeded'
  cardName: string
  quantity: number
  maxAllowed: number
}

function normalize(name: string): string {
  return name.toLowerCase().trim()
}

export function checkLegality(entries: DecklistEntry[], banlist: BanlistData): LegalityError[] {
  const forbiddenSet = new Set(banlist.forbidden.map(normalize))
  const limitedSet = new Set(banlist.limited.map(normalize))
  const semiLimitedSet = new Set(banlist.semiLimited.map(normalize))

  const errors: LegalityError[] = []
  for (const entry of entries) {
    const key = normalize(entry.cardName)
    if (forbiddenSet.has(key)) {
      errors.push({ type: 'forbidden', cardName: entry.cardName, quantity: entry.quantity, maxAllowed: 0 })
    } else if (limitedSet.has(key) && entry.quantity > 1) {
      errors.push({ type: 'limited_exceeded', cardName: entry.cardName, quantity: entry.quantity, maxAllowed: 1 })
    } else if (semiLimitedSet.has(key) && entry.quantity > 2) {
      errors.push({ type: 'semi_limited_exceeded', cardName: entry.cardName, quantity: entry.quantity, maxAllowed: 2 })
    }
  }
  return errors
}
