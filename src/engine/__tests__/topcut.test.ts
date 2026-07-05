import { describe, it, expect, vi } from 'vitest'
import { generateTopCutRound, bracketSeedOrder } from '../topcut'

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

describe('bracketSeedOrder', () => {
  it('produces the standard bracket for the supported cut sizes', () => {
    expect(bracketSeedOrder(2)).toEqual([1, 2])
    expect(bracketSeedOrder(4)).toEqual([1, 4, 2, 3])
    expect(bracketSeedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6])
    expect(bracketSeedOrder(16)).toEqual([1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11])
  })

  it('holds the bracket invariants for top 32', () => {
    const order = bracketSeedOrder(32)
    // jeder Seed genau einmal
    expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: 32 }, (_, i) => i + 1))
    // jede Runde-1-Paarung summiert auf size+1 (1v32, 16v17, ...)
    for (let i = 0; i < 32; i += 2) {
      expect(order[i] + order[i + 1]).toBe(33)
    }
    // Seed 1 und 2 in gegenüberliegenden Hälften — Finale ist ihr frühestes Treffen
    expect(order.slice(0, 16)).toContain(1)
    expect(order.slice(16)).toContain(2)
  })

  it('collapses correctly: sequential winner pairing meets seeds per round', () => {
    // Wenn immer der bessere Seed gewinnt, muss Runde für Runde i vs 2^k+1-i entstehen
    let current = bracketSeedOrder(16)
    while (current.length > 1) {
      const half = current.length / 2
      for (let i = 0; i < current.length; i += 2) {
        expect(current[i] + current[i + 1]).toBe(current.length + 1)
      }
      const winners: number[] = []
      for (let i = 0; i < current.length; i += 2) {
        winners.push(Math.min(current[i], current[i + 1]))
      }
      expect(winners).toHaveLength(half)
      current = winners
    }
    expect(current).toEqual([1])
  })
})
