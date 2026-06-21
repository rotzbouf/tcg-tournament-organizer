import { describe, it, expect, vi } from 'vitest'
import { generateRoundRobinRound, getRoundRobinTotalRounds } from '../roundrobin'

vi.mock('@/lib/utils', () => ({
  generateId: vi.fn(() => Math.random().toString(36).slice(2)),
}))

describe('getRoundRobinTotalRounds', () => {
  it('returns 0 for 0 or 1 players', () => {
    expect(getRoundRobinTotalRounds(0)).toBe(0)
    expect(getRoundRobinTotalRounds(1)).toBe(0)
  })

  it('returns N-1 for even player count', () => {
    expect(getRoundRobinTotalRounds(4)).toBe(3)
    expect(getRoundRobinTotalRounds(6)).toBe(5)
    expect(getRoundRobinTotalRounds(8)).toBe(7)
  })

  it('returns N for odd player count', () => {
    expect(getRoundRobinTotalRounds(3)).toBe(3)
    expect(getRoundRobinTotalRounds(5)).toBe(5)
    expect(getRoundRobinTotalRounds(7)).toBe(7)
  })
})

describe('generateRoundRobinRound', () => {
  it('generates correct pairings for 4 players', () => {
    const ids = ['a', 'b', 'c', 'd']
    const totalRounds = getRoundRobinTotalRounds(4)
    const allPairings = new Set<string>()

    for (let i = 0; i < totalRounds; i++) {
      const matches = generateRoundRobinRound(ids, i, i + 1)
      expect(matches).toHaveLength(2)
      for (const m of matches) {
        expect(m.isBye).toBe(false)
        const pair = [m.player1Id, m.player2Id!].sort().join('-')
        allPairings.add(pair)
      }
    }

    expect(allPairings.size).toBe(6)
  })

  it('generates bye for odd player count', () => {
    const ids = ['a', 'b', 'c']
    const totalRounds = getRoundRobinTotalRounds(3)
    let byeCount = 0

    for (let i = 0; i < totalRounds; i++) {
      const matches = generateRoundRobinRound(ids, i, i + 1)
      for (const m of matches) {
        if (m.isBye) byeCount++
      }
    }

    expect(byeCount).toBe(3)
  })

  it('every player plays every other player exactly once', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f']
    const totalRounds = getRoundRobinTotalRounds(6)
    const matchups = new Map<string, Set<string>>()
    ids.forEach(id => matchups.set(id, new Set()))

    for (let i = 0; i < totalRounds; i++) {
      const matches = generateRoundRobinRound(ids, i, i + 1)
      for (const m of matches) {
        if (!m.isBye && m.player2Id) {
          matchups.get(m.player1Id)!.add(m.player2Id)
          matchups.get(m.player2Id)!.add(m.player1Id)
        }
      }
    }

    for (const id of ids) {
      expect(matchups.get(id)!.size).toBe(5)
    }
  })

  it('no player plays themselves', () => {
    const ids = ['a', 'b', 'c', 'd']
    const totalRounds = getRoundRobinTotalRounds(4)

    for (let i = 0; i < totalRounds; i++) {
      const matches = generateRoundRobinRound(ids, i, i + 1)
      for (const m of matches) {
        expect(m.player1Id).not.toBe(m.player2Id)
      }
    }
  })

  it('assigns table numbers starting from 1', () => {
    const ids = ['a', 'b', 'c', 'd']
    const matches = generateRoundRobinRound(ids, 0, 1)
    const tables = matches.filter(m => !m.isBye).map(m => m.tableNumber)
    expect(tables).toEqual([1, 2])
  })
})
