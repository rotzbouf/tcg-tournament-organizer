import { describe, it, expect } from 'vitest'
import { calculateStandings } from '../standings'
import { Player } from '@/types/player'
import { Round } from '@/types/round'

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    hasBye: false,
  }))
}

describe('calculateStandings', () => {
  it('returns empty for no players', () => {
    expect(calculateStandings([], [])).toEqual([])
  })

  it('ranks by match points', () => {
    const players = makePlayers(3)
    const rounds: Round[] = [
      {
        roundNumber: 1,
        isComplete: true,
        matches: [
          { id: 'm1', roundNumber: 1, player1Id: 'p1', player2Id: 'p2', result: 'player1_win', isBye: false },
          { id: 'm2', roundNumber: 1, player1Id: 'p3', player2Id: null, result: 'player1_win', isBye: true },
        ],
      },
      {
        roundNumber: 2,
        isComplete: true,
        matches: [
          { id: 'm3', roundNumber: 2, player1Id: 'p1', player2Id: 'p3', result: 'player1_win', isBye: false },
          { id: 'm4', roundNumber: 2, player1Id: 'p2', player2Id: null, result: 'player1_win', isBye: true },
        ],
      },
    ]

    const standings = calculateStandings(players, rounds)

    expect(standings[0].playerId).toBe('p1')
    expect(standings[0].matchPoints).toBe(6)
    expect(standings[0].rank).toBe(1)

    expect(standings[1].matchPoints).toBe(3)
    expect(standings[2].matchPoints).toBe(3)
  })

  it('uses buchholz as first tiebreaker', () => {
    const players = makePlayers(4)
    const rounds: Round[] = [
      {
        roundNumber: 1,
        isComplete: true,
        matches: [
          { id: 'm1', roundNumber: 1, player1Id: 'p1', player2Id: 'p2', result: 'player1_win', isBye: false },
          { id: 'm2', roundNumber: 1, player1Id: 'p3', player2Id: 'p4', result: 'player3_win' as any, isBye: false },
        ],
      },
    ]
    // Fix: use correct result values
    rounds[0].matches[1].result = 'player1_win'

    const standings = calculateStandings(players, rounds)

    // p1 and p3 both have 3 points
    const threePointers = standings.filter(s => s.matchPoints === 3)
    expect(threePointers).toHaveLength(2)

    // p1 beat p2 (0 pts), p3 beat p4 (0 pts) → same buchholz
    // Both should have buchholz = 0
    expect(threePointers[0].buchholz).toBe(0)
    expect(threePointers[1].buchholz).toBe(0)
  })

  it('calculates win/loss/draw record correctly', () => {
    const players = makePlayers(2)
    const rounds: Round[] = [
      {
        roundNumber: 1,
        isComplete: true,
        matches: [
          { id: 'm1', roundNumber: 1, player1Id: 'p1', player2Id: 'p2', result: 'player1_win', isBye: false },
        ],
      },
      {
        roundNumber: 2,
        isComplete: true,
        matches: [
          { id: 'm2', roundNumber: 2, player1Id: 'p1', player2Id: 'p2', result: 'draw', isBye: false },
        ],
      },
    ]

    const standings = calculateStandings(players, rounds)
    const p1 = standings.find(s => s.playerId === 'p1')!
    const p2 = standings.find(s => s.playerId === 'p2')!

    expect(p1.wins).toBe(1)
    expect(p1.draws).toBe(1)
    expect(p1.losses).toBe(0)

    expect(p2.wins).toBe(0)
    expect(p2.draws).toBe(1)
    expect(p2.losses).toBe(1)
  })

  it('assigns sequential ranks', () => {
    const players = makePlayers(4)
    const rounds: Round[] = [
      {
        roundNumber: 1,
        isComplete: true,
        matches: [
          { id: 'm1', roundNumber: 1, player1Id: 'p1', player2Id: 'p2', result: 'player1_win', isBye: false },
          { id: 'm2', roundNumber: 1, player1Id: 'p3', player2Id: 'p4', result: 'player1_win', isBye: false },
        ],
      },
    ]

    const standings = calculateStandings(players, rounds)
    expect(standings.map(s => s.rank)).toEqual([1, 2, 3, 4])
  })

  it('ignores incomplete rounds', () => {
    const players = makePlayers(2)
    const rounds: Round[] = [
      {
        roundNumber: 1,
        isComplete: false,
        matches: [
          { id: 'm1', roundNumber: 1, player1Id: 'p1', player2Id: 'p2', result: 'player1_win', isBye: false },
        ],
      },
    ]

    const standings = calculateStandings(players, rounds)
    expect(standings[0].matchPoints).toBe(0)
    expect(standings[1].matchPoints).toBe(0)
  })
})
