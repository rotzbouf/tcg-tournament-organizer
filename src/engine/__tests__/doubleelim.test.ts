import { describe, it, expect, vi } from 'vitest'
import { generateDoubleElimFirstRound, advanceDoubleElimBracket, calculateDoubleElimTotalRounds } from '../doubleelim'
import { Round } from '@/types/round'
import { Tournament } from '@/types/tournament'

vi.mock('@/lib/utils', () => ({
  generateId: vi.fn(() => Math.random().toString(36).slice(2)),
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

  it('pads a non-power-of-two field with byes for the top seeds (F1)', () => {
    const ids = Array.from({ length: 6 }, (_, i) => `p${i + 1}`)
    const matches = generateDoubleElimFirstRound(ids, 1)

    const byes = matches.filter(m => m.isBye)
    expect(byes).toHaveLength(2)
    expect(byes.map(b => b.player1Id)).toEqual(['p1', 'p2'])
    expect(byes.every(b => b.result === 'player1_win' && b.player2Id === null)).toBe(true)

    // every player is seated
    const seated = matches.flatMap(m => [m.player1Id, m.player2Id].filter(Boolean))
    expect(new Set(seated).size).toBe(6)
  })

  it('assigns table numbers to real matches and 0 to byes', () => {
    const matches = generateDoubleElimFirstRound(['p1', 'p2', 'p3', 'p4', 'p5'], 1)
    expect(matches.filter(m => m.isBye).every(m => m.tableNumber === 0)).toBe(true)
    expect(matches.filter(m => !m.isBye).map(m => m.tableNumber)).toEqual([1])
  })

  it('all real matches are pending', () => {
    const matches = generateDoubleElimFirstRound(['p1', 'p2', 'p3', 'p4'], 1)
    expect(matches.every(m => m.result === 'pending')).toBe(true)
  })
})

describe('calculateDoubleElimTotalRounds', () => {
  it('returns 0 for less than 2 players', () => {
    expect(calculateDoubleElimTotalRounds(0)).toBe(0)
    expect(calculateDoubleElimTotalRounds(1)).toBe(0)
  })

  it('rounds the bracket size up, not down', () => {
    expect(calculateDoubleElimTotalRounds(4)).toBe(5)
    expect(calculateDoubleElimTotalRounds(6)).toBe(7)
    expect(calculateDoubleElimTotalRounds(8)).toBe(7)
  })
})

// Simulates a whole bracket: every pending match is decided for player1, the
// round is completed, and the bracket advanced until it produces no next round.
function runBracket(playerCount: number): { rounds: Round[]; championId: string } {
  const ids = Array.from({ length: playerCount }, (_, i) => `p${i + 1}`)
  const rounds: Round[] = [{
    roundNumber: 1,
    matches: generateDoubleElimFirstRound(ids, 1),
    isComplete: false,
    phase: 'winners_bracket',
    phaseIndex: 0,
  }]
  const tournament = { rounds, currentRound: 1, grandFinalReset: false } as unknown as Tournament

  for (let guard = 0; guard < 50; guard++) {
    const last = rounds[rounds.length - 1]
    last.matches = last.matches.map(m => m.result === 'pending' ? { ...m, result: 'player1_win' as const } : m)
    last.isComplete = true

    const advance = advanceDoubleElimBracket(tournament)
    if (!advance) break
    ;(tournament as { currentRound: number }).currentRound++
    rounds.push({
      roundNumber: tournament.currentRound,
      matches: advance.matches,
      isComplete: false,
      phase: advance.phase,
      phaseIndex: 0,
    })
  }

  const final = rounds[rounds.length - 1]
  const finalMatch = final.matches[0]
  const championId = finalMatch.result === 'player1_win' ? finalMatch.player1Id : finalMatch.player2Id!
  return { rounds, championId }
}

function lossCounts(rounds: Round[]): Map<string, number> {
  const losses = new Map<string, number>()
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.isBye || match.result === 'pending') continue
      const loser = match.result === 'player1_win' ? match.player2Id : match.player1Id
      if (loser) losses.set(loser, (losses.get(loser) ?? 0) + 1)
    }
  }
  return losses
}

describe('advanceDoubleElimBracket — full bracket simulation', () => {
  it.each([2, 5, 6, 8, 12])('%i players: ends in a grand final and nobody vanishes', (n) => {
    const { rounds, championId } = runBracket(n)

    expect(rounds[rounds.length - 1].phase).toBe('grand_final')

    // every player appears in the bracket
    const seated = new Set(rounds.flatMap(r => r.matches.flatMap(m => [m.player1Id, m.player2Id].filter(Boolean))))
    expect(seated.size).toBe(n)

    // double elimination invariant: the champion never lost, everyone else
    // was eliminated with exactly two losses
    const losses = lossCounts(rounds)
    expect(losses.get(championId)).toBeUndefined()
    for (let i = 1; i <= n; i++) {
      const id = `p${i}`
      if (id === championId) continue
      expect(losses.get(id), `losses of ${id}`).toBe(2)
    }
  })

  it('grand final reset: a losers-bracket champion forces a second grand final', () => {
    const ids = ['p1', 'p2', 'p3', 'p4']
    const rounds: Round[] = [{
      roundNumber: 1,
      matches: generateDoubleElimFirstRound(ids, 1),
      isComplete: false,
      phase: 'winners_bracket',
      phaseIndex: 0,
    }]
    const tournament = { rounds, currentRound: 1, grandFinalReset: true } as unknown as Tournament

    for (let guard = 0; guard < 50; guard++) {
      const last = rounds[rounds.length - 1]
      // LB champion (player2) wins the first grand final to force the reset
      const winner = last.phase === 'grand_final' && rounds.filter(r => r.phase === 'grand_final').length === 1
        ? 'player2_win' as const
        : 'player1_win' as const
      last.matches = last.matches.map(m => m.result === 'pending' ? { ...m, result: winner } : m)
      last.isComplete = true

      const advance = advanceDoubleElimBracket(tournament)
      if (!advance) break
      ;(tournament as { currentRound: number }).currentRound++
      rounds.push({ roundNumber: tournament.currentRound, matches: advance.matches, isComplete: false, phase: advance.phase, phaseIndex: 0 })
    }

    const gfRounds = rounds.filter(r => r.phase === 'grand_final')
    expect(gfRounds).toHaveLength(2)
  })
})
