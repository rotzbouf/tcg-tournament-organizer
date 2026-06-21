import { describe, it, expect } from 'vitest'
import { calculateEloChanges, DEFAULT_ELO } from '../elo'
import { Round } from '@/types/round'

function makeRound(matches: { p1: string; p2: string; result: 'player1_win' | 'player2_win' | 'draw' }[]): Round {
  return {
    roundNumber: 1,
    isComplete: true,
    phase: 'swiss',
    phaseIndex: 0,
    matches: matches.map((m, i) => ({
      id: `m${i}`,
      roundNumber: 1,
      tableNumber: i + 1,
      player1Id: m.p1,
      player2Id: m.p2,
      result: m.result,
      isBye: false,
    })),
  }
}

describe('calculateEloChanges', () => {
  it('winner gains elo and loser loses elo', () => {
    const rounds = [makeRound([{ p1: 'a', p2: 'b', result: 'player1_win' }])]
    const updates = calculateEloChanges(['a', 'b'], rounds, {}, { a: 'Alice', b: 'Bob' })

    expect(updates).toHaveLength(2)
    const a = updates.find(u => u.playerId === 'a')!
    const b = updates.find(u => u.playerId === 'b')!
    expect(a.delta).toBeGreaterThan(0)
    expect(b.delta).toBeLessThan(0)
  })

  it('starts at default elo for new players', () => {
    const rounds = [makeRound([{ p1: 'a', p2: 'b', result: 'player1_win' }])]
    const updates = calculateEloChanges(['a', 'b'], rounds, {}, { a: 'Alice', b: 'Bob' })

    expect(updates[0].eloBefore).toBe(DEFAULT_ELO)
    expect(updates[1].eloBefore).toBe(DEFAULT_ELO)
  })

  it('draw gives equal small changes', () => {
    const rounds = [makeRound([{ p1: 'a', p2: 'b', result: 'draw' }])]
    const updates = calculateEloChanges(['a', 'b'], rounds, {}, { a: 'Alice', b: 'Bob' })

    const a = updates.find(u => u.playerId === 'a')!
    const b = updates.find(u => u.playerId === 'b')!
    expect(Math.abs(a.delta)).toBeLessThanOrEqual(1)
    expect(Math.abs(b.delta)).toBeLessThanOrEqual(1)
  })

  it('uses database elo for known players', () => {
    const db = {
      'db1': { id: 'db1', name: 'Alice', game: 'yugioh', elo: 1800, matchesPlayed: 50, tournamentsPlayed: 5, history: [], lastUpdated: '' },
    }
    const rounds = [makeRound([{ p1: 'a', p2: 'b', result: 'player1_win' }])]
    const updates = calculateEloChanges(['a', 'b'], rounds, db, { a: 'Alice', b: 'Bob' })

    const a = updates.find(u => u.playerId === 'a')!
    expect(a.eloBefore).toBe(1800)
  })

  it('zero-sum: total elo gained equals total elo lost (approximately)', () => {
    const rounds = [makeRound([
      { p1: 'a', p2: 'b', result: 'player1_win' },
      { p1: 'c', p2: 'd', result: 'player2_win' },
    ])]
    const updates = calculateEloChanges(['a', 'b', 'c', 'd'], rounds, {}, { a: 'A', b: 'B', c: 'C', d: 'D' })
    const totalDelta = updates.reduce((sum, u) => sum + u.delta, 0)
    expect(Math.abs(totalDelta)).toBeLessThanOrEqual(2)
  })
})
