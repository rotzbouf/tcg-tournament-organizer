import { describe, it, expect, vi } from 'vitest'
import { generateTopCutRound } from '../topcut'

vi.mock('@/lib/utils', () => ({
  generateId: vi.fn(() => Math.random().toString(36).slice(2)),
}))

describe('generateTopCutRound', () => {
  it('returns empty for less than 2 players', () => {
    expect(generateTopCutRound([], 1)).toEqual([])
    expect(generateTopCutRound(['p1'], 1)).toEqual([])
  })

  it('pairs 2 players into 1 match', () => {
    const matches = generateTopCutRound(['p1', 'p2'], 1)
    expect(matches).toHaveLength(1)
    expect(matches[0].player1Id).toBe('p1')
    expect(matches[0].player2Id).toBe('p2')
    expect(matches[0].result).toBe('pending')
    expect(matches[0].isBye).toBe(false)
  })

  it('pairs 4 players into 2 matches', () => {
    const matches = generateTopCutRound(['p1', 'p2', 'p3', 'p4'], 1)
    expect(matches).toHaveLength(2)
    expect(matches[0].player1Id).toBe('p1')
    expect(matches[0].player2Id).toBe('p2')
    expect(matches[1].player1Id).toBe('p3')
    expect(matches[1].player2Id).toBe('p4')
  })

  it('pairs 8 players into 4 matches', () => {
    const ids = Array.from({ length: 8 }, (_, i) => `p${i + 1}`)
    const matches = generateTopCutRound(ids, 1)
    expect(matches).toHaveLength(4)
  })

  it('returns empty for non-power-of-2 player count', () => {
    expect(generateTopCutRound(['p1', 'p2', 'p3'], 1)).toEqual([])
    expect(generateTopCutRound(['p1', 'p2', 'p3', 'p4', 'p5'], 1)).toEqual([])
  })

  it('assigns correct round number', () => {
    const matches = generateTopCutRound(['p1', 'p2'], 5)
    expect(matches[0].roundNumber).toBe(5)
  })
})
