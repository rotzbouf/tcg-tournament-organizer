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

export function checkLegality(entries: DecklistEntry[], banlist: BanlistData): LegalityError[] {
  const errors: LegalityError[] = []

  // Legal card whitelist (MTG Standard, Pauper — rotation or rarity restriction)
  if (banlist.legalCards && banlist.legalCards.length > 0) {
    const legalSet = new Set(banlist.legalCards.map(normalize))
    for (const entry of entries) {
      if (!legalSet.has(normalize(entry.cardName))) {
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

  // Explicit ban/limit checks
  const forbiddenSet = new Set(banlist.forbidden.map(normalize))
  const limitedSet = new Set(banlist.limited.map(normalize))
  const semiLimitedSet = new Set(banlist.semiLimited.map(normalize))

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
