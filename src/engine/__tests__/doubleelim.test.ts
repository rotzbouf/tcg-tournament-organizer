import { describe, it, expect, vi } from 'vitest'
import { generateDoubleElimFirstRound, calculateDoubleElimTotalRounds } from '../doubleelim'

vi.mock('@/lib/utils', () => ({
  generateId: vi.fn(() => Math.random().toString(36).slice(2)),
  nearestPowerOfTwo: (n: number) => {
    if (n < 2) return 0
    let p = 1
    while (p * 2 <= n) p *= 2
    return p
  },
}))

describe('generateDoubleElimFirstRound', () => {
  it('pairs 4 players into 2 matches', () => {
    const matches = generateDoubleElimFirstRound(['p1', 'p2', 'p3', 'p4'], 1)
    expect(matches).toHaveLength(2)
    expect(matches[0].player1Id).toBe('p1')
    expect(matches[0].player2Id).toBe('p2')
    expect(matches[1].player1Id).toBe('p3')
    expect(matches[1].player2Id).toBe('p4')
  })

  it('pairs 8 players into 4 matches', () => {
    const ids = Array.from({ length: 8 }, (_, i) => `p${i + 1}`)
    const matches = generateDoubleElimFirstRound(ids, 1)
    expect(matches).toHaveLength(4)
    expect(matches.every(m => !m.isBye)).toBe(true)
  })

  it('clamps to power of 2', () => {
    const ids = Array.from({ length: 6 }, (_, i) => `p${i + 1}`)
    const matches = generateDoubleElimFirstRound(ids, 1)
    expect(matches).toHaveLength(2)
  })

  it('assigns table numbers', () => {
    const matches = generateDoubleElimFirstRound(['p1', 'p2', 'p3', 'p4'], 1)
    expect(matches[0].tableNumber).toBe(1)
    expect(matches[1].tableNumber).toBe(2)
  })

  it('all matches are pending', () => {
    const matches = generateDoubleElimFirstRound(['p1', 'p2', 'p3', 'p4'], 1)
    expect(matches.every(m => m.result === 'pending')).toBe(true)
  })
})

describe('calculateDoubleElimTotalRounds', () => {
  it('returns 0 for less than 2 players', () => {
    expect(calculateDoubleElimTotalRounds(0)).toBe(0)
    expect(calculateDoubleElimTotalRounds(1)).toBe(0)
  })

  it('returns correct total for 4 players', () => {
    const total = calculateDoubleElimTotalRounds(4)
    expect(total).toBeGreaterThan(3)
  })

  it('returns correct total for 8 players', () => {
    const total = calculateDoubleElimTotalRounds(8)
    expect(total).toBeGreaterThan(5)
  })
})
