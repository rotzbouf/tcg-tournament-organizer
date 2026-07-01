import { describe, it, expect } from 'vitest'
import { checkLegality, aggregateByName } from '../legalityChecker'
import { DecklistEntry } from '@/types/player'
import { BanlistData } from '@/types/banlist'

function entry(cardName: string, quantity: number, extra: Partial<DecklistEntry> = {}): DecklistEntry {
  return { cardName, quantity, ...extra }
}

const emptyBanlist: BanlistData = {
  game: 'yugioh',
  format: 'advanced',
  lastUpdated: '2026-01-01',
  forbidden: [],
  limited: [],
  semiLimited: [],
}

describe('aggregateByName', () => {
  it('sums quantities of the same card case-insensitively', () => {
    const result = aggregateByName([
      entry('Lightning Bolt', 3),
      entry('lightning bolt', 2),
      entry('Island', 4),
    ])
    expect(result).toEqual([
      { cardName: 'Lightning Bolt', quantity: 5 },
      { cardName: 'Island', quantity: 4 },
    ])
  })

  it('preserves first-seen order and spelling', () => {
    const result = aggregateByName([entry('  Fire  ', 1), entry('fire', 1)])
    expect(result).toEqual([{ cardName: '  Fire  ', quantity: 2 }])
  })
})

describe('checkLegality — ban/limit aggregation (Bug 1)', () => {
  it('flags a forbidden card', () => {
    const banlist = { ...emptyBanlist, forbidden: ['Pot of Greed'] }
    const errors = checkLegality([entry('Pot of Greed', 1)], banlist)
    expect(errors).toEqual([
      { type: 'forbidden', cardName: 'Pot of Greed', quantity: 1, maxAllowed: 0 },
    ])
  })

  it('allows one copy of a limited card', () => {
    const banlist = { ...emptyBanlist, limited: ['Raigeki'] }
    expect(checkLegality([entry('Raigeki', 1)], banlist)).toEqual([])
  })

  it('flags a limited card only when the summed copies exceed 1', () => {
    const banlist = { ...emptyBanlist, limited: ['Raigeki'] }
    // 1 in main + 1 in side = 2 total; must be caught even though each line is 1
    const errors = checkLegality([entry('Raigeki', 1), entry('Raigeki', 1)], banlist)
    expect(errors).toEqual([
      { type: 'limited_exceeded', cardName: 'Raigeki', quantity: 2, maxAllowed: 1 },
    ])
  })

  it('flags a semi-limited card when summed copies exceed 2', () => {
    const banlist = { ...emptyBanlist, semiLimited: ['Foolish Burial'] }
    const errors = checkLegality([entry('Foolish Burial', 2), entry('Foolish Burial', 1)], banlist)
    expect(errors).toEqual([
      { type: 'semi_limited_exceeded', cardName: 'Foolish Burial', quantity: 3, maxAllowed: 2 },
    ])
  })

  it('allows a semi-limited card at exactly 2 across entries', () => {
    const banlist = { ...emptyBanlist, semiLimited: ['Foolish Burial'] }
    expect(checkLegality([entry('Foolish Burial', 1), entry('Foolish Burial', 1)], banlist)).toEqual([])
  })

  it('reports a split forbidden card once', () => {
    const banlist = { ...emptyBanlist, forbidden: ['Pot of Greed'] }
    const errors = checkLegality([entry('Pot of Greed', 1), entry('Pot of Greed', 1)], banlist)
    expect(errors).toEqual([
      { type: 'forbidden', cardName: 'Pot of Greed', quantity: 2, maxAllowed: 0 },
    ])
  })
})

describe('checkLegality — legal whitelist', () => {
  it('flags cards not on the legal list', () => {
    const banlist: BanlistData = { ...emptyBanlist, game: 'mtg', format: 'standard', legalCards: ['Island'] }
    const errors = checkLegality([entry('Island', 4), entry('Black Lotus', 1)], banlist)
    expect(errors).toEqual([
      { type: 'out_of_rotation', cardName: 'Black Lotus', quantity: 1, maxAllowed: 0 },
    ])
  })

  it('matches a front-face-only export against a "Front // Back" whitelist entry (Bug 4)', () => {
    const banlist: BanlistData = {
      ...emptyBanlist, game: 'mtg', format: 'standard',
      legalCards: ['Fable of the Mirror-Breaker // Reflection of Kiki-Rikki'],
    }
    expect(checkLegality([entry('Fable of the Mirror-Breaker', 3)], banlist)).toEqual([])
  })

  it('matches a full "Front // Back" export against a front-face-only whitelist entry (Bug 4)', () => {
    const banlist: BanlistData = { ...emptyBanlist, game: 'mtg', format: 'standard', legalCards: ['Fire'] }
    expect(checkLegality([entry('Fire // Ice', 2)], banlist)).toEqual([])
  })
})

describe('checkLegality — Pokémon rotation', () => {
  const banlist: BanlistData = {
    ...emptyBanlist, game: 'pokemon', format: 'standard', legalSetCodes: ['SVI'],
  }

  it('flags Pokémon-section cards from out-of-rotation sets', () => {
    const errors = checkLegality([entry('Pikachu', 2, { section: 'pokemon', setCode: 'OLD' })], banlist)
    expect(errors).toEqual([
      { type: 'out_of_rotation', cardName: 'Pikachu', quantity: 2, maxAllowed: 0, setCode: 'OLD' },
    ])
  })

  it('allows in-rotation set codes', () => {
    expect(checkLegality([entry('Pikachu', 2, { section: 'pokemon', setCode: 'SVI' })], banlist)).toEqual([])
  })

  it('skips rotation for non-Pokémon sections and missing set codes', () => {
    expect(checkLegality([
      entry('Boss’s Orders', 4, { section: 'trainer', setCode: 'OLD' }),
      entry('Pikachu', 1, { section: 'pokemon' }),
    ], banlist)).toEqual([])
  })
})
