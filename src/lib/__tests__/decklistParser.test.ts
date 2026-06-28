import { describe, it, expect } from 'vitest'
import { parseDecklistText, formatDecklistText, getDecklistStats } from '../decklistParser'

describe('parseDecklistText', () => {
  it('parses "3x Card Name" format', () => {
    const result = parseDecklistText('3x Blue-Eyes White Dragon')
    expect(result).toEqual([{ quantity: 3, cardName: 'Blue-Eyes White Dragon' }])
  })

  it('parses "3 Card Name" format', () => {
    const result = parseDecklistText('3 Blue-Eyes White Dragon')
    expect(result).toEqual([{ quantity: 3, cardName: 'Blue-Eyes White Dragon' }])
  })

  it('parses "3X Card Name" format (uppercase X)', () => {
    const result = parseDecklistText('3X Blue-Eyes White Dragon')
    expect(result).toEqual([{ quantity: 3, cardName: 'Blue-Eyes White Dragon' }])
  })

  it('defaults to quantity 1 for plain card names', () => {
    const result = parseDecklistText('Blue-Eyes White Dragon')
    expect(result).toEqual([{ quantity: 1, cardName: 'Blue-Eyes White Dragon' }])
  })

  it('parses multiple lines', () => {
    const text = '3x Blue-Eyes White Dragon\n2x Pot of Greed\nMonster Reborn'
    const result = parseDecklistText(text)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ quantity: 3, cardName: 'Blue-Eyes White Dragon' })
    expect(result[1]).toEqual({ quantity: 2, cardName: 'Pot of Greed' })
    expect(result[2]).toEqual({ quantity: 1, cardName: 'Monster Reborn' })
  })

  it('ignores empty lines', () => {
    const result = parseDecklistText('3x Card A\n\n2x Card B\n  \n')
    expect(result).toHaveLength(2)
  })

  it('extracts set code from MTGA format', () => {
    const result = parseDecklistText('4 Lightning Bolt (STA) 62')
    expect(result).toEqual([{ quantity: 4, cardName: 'Lightning Bolt', setCode: 'STA' }])
  })

  it('extracts set code from Limitless format', () => {
    const result = parseDecklistText('4 Comfey LOR 79')
    expect(result).toEqual([{ quantity: 4, cardName: 'Comfey', setCode: 'LOR' }])
  })

  it('parses PTCGL format with asterisk', () => {
    const result = parseDecklistText('* 4 Comfey LOR 79')
    expect(result).toEqual([{ quantity: 4, cardName: 'Comfey', setCode: 'LOR' }])
  })

  it('skips section headers but keeps card names starting with section words', () => {
    const text = 'Monster: 3\nMonster Reborn\nSpell: 1\nDark Hole'
    const result = parseDecklistText(text)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ quantity: 1, cardName: 'Monster Reborn' })
    expect(result[1]).toEqual({ quantity: 1, cardName: 'Dark Hole' })
  })

  it('skips standalone section headers', () => {
    const text = 'Deck\n4 Lightning Bolt\nSideboard\n2 Rest in Peace'
    const result = parseDecklistText(text)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ quantity: 4, cardName: 'Lightning Bolt' })
    expect(result[1]).toEqual({ quantity: 2, cardName: 'Rest in Peace' })
  })

  it('tracks section and extracts set codes for all Pokémon sections', () => {
    const text = 'Pokémon: 2\n* 4 Comfey LOR 79\nTrainer: 1\n* 4 Nest Ball SVI 181\nEnergy: 1\n* 4 Psychic Energy SVE 5'
    const result = parseDecklistText(text)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ quantity: 4, cardName: 'Comfey', setCode: 'LOR', section: 'pokemon' })
    expect(result[1]).toEqual({ quantity: 4, cardName: 'Nest Ball', setCode: 'SVI', section: 'trainer' })
    expect(result[2]).toEqual({ quantity: 4, cardName: 'Psychic Energy', setCode: 'SVE', section: 'energy' })
  })
})

describe('formatDecklistText', () => {
  it('formats entries as "Nx CardName"', () => {
    const text = formatDecklistText([
      { quantity: 3, cardName: 'Blue-Eyes White Dragon' },
      { quantity: 1, cardName: 'Monster Reborn' },
    ])
    expect(text).toBe('3x Blue-Eyes White Dragon\n1x Monster Reborn')
  })
})

describe('getDecklistStats', () => {
  it('calculates total and unique card counts', () => {
    const stats = getDecklistStats([
      { quantity: 3, cardName: 'A' },
      { quantity: 2, cardName: 'B' },
      { quantity: 1, cardName: 'C' },
    ])
    expect(stats.totalCards).toBe(6)
    expect(stats.uniqueCards).toBe(3)
  })
})
