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
