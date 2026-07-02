import { describe, it, expect } from 'vitest'
import { calculateStandings } from '../standings'
import { Player } from '@/types/player'
import { Round } from '@/types/round'

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    playerId: null, dateOfBirth: null, deckName: null, decklist: null, hasBye: false,
    droppedInRound: null,
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
        isComplete: true, phase: 'swiss', phaseIndex: 0,
        matches: [
          { id: 'm1', roundNumber: 1, player1Id: 'p1', player2Id: 'p2', result: 'player1_win', isBye: false, tableNumber: 0 },
          { id: 'm2', roundNumber: 1, player1Id: 'p3', player2Id: null, result: 'player1_win', isBye: true, tableNumber: 0 },
        ],
      },
      {
        roundNumber: 2,
        isComplete: true, phase: 'swiss', phaseIndex: 0,
        matches: [
          { id: 'm3', roundNumber: 2, player1Id: 'p1', player2Id: 'p3', result: 'player1_win', isBye: false, tableNumber: 0 },
          { id: 'm4', roundNumber: 2, player1Id: 'p2', player2Id: null, result: 'player1_win', isBye: true, tableNumber: 0 },
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

  it('excludes byes from opponent match-win percentage but not from the W-L-D record (F5)', () => {
    const players = makePlayers(3)
    // R1: p1 beats p2, p3 has a bye. R2: p1 beats p3, p2 has a bye.
    const rounds: Round[] = [
      {
        roundNumber: 1,
        isComplete: true, phase: 'swiss', phaseIndex: 0,
        matches: [
          { id: 'm1', roundNumber: 1, player1Id: 'p1', player2Id: 'p2', result: 'player1_win', isBye: false, tableNumber: 1 },
          { id: 'm2', roundNumber: 1, player1Id: 'p3', player2Id: null, result: 'player1_win', isBye: true, tableNumber: 0 },
        ],
      },
      {
        roundNumber: 2,
        isComplete: true, phase: 'swiss', phaseIndex: 0,
        matches: [
          { id: 'm3', roundNumber: 2, player1Id: 'p1', player2Id: 'p3', result: 'player1_win', isBye: false, tableNumber: 1 },
          { id: 'm4', roundNumber: 2, player1Id: 'p2', player2Id: null, result: 'player1_win', isBye: true, tableNumber: 0 },
        ],
      },
    ]

    const standings = calculateStandings(players, rounds)
    const p1 = standings.find(s => s.playerId === 'p1')!
    const p2 = standings.find(s => s.playerId === 'p2')!
    const p3 = standings.find(s => s.playerId === 'p3')!

    // p1's opponents (p2 and p3) each have one real loss and one bye:
    // official rules say their MWP is 0/1 = 0%, not 1/2 = 50%
    expect(p1.opponentMatchWinPct).toBe(0)

    // the displayed record still counts byes as wins
    expect(p2.wins).toBe(1)
    expect(p2.losses).toBe(1)
    expect(p3.wins).toBe(1)
    expect(p3.losses).toBe(1)
  })

  it('applies the per-game floor to bye-free opponent records', () => {
    const players = makePlayers(3)
    const rounds: Round[] = [
      {
        roundNumber: 1,
        isComplete: true, phase: 'swiss', phaseIndex: 0,
        matches: [
          { id: 'm1', roundNumber: 1, player1Id: 'p1', player2Id: 'p2', result: 'player1_win', isBye: false, tableNumber: 1 },
          { id: 'm2', roundNumber: 1, player1Id: 'p3', player2Id: null, result: 'player1_win', isBye: true, tableNumber: 0 },
        ],
      },
    ]

    // Pokémon floors opponent win percentage at 25 %
    const standings = calculateStandings(players, rounds, 'pokemon')
    const p1 = standings.find(s => s.playerId === 'p1')!
    expect(p1.opponentMatchWinPct).toBe(0.25)
  })

  it('uses buchholz as first tiebreaker', () => {
    const players = makePlayers(4)
    const rounds: Round[] = [
      {
        roundNumber: 1,
        isComplete: true, phase: 'swiss', phaseIndex: 0,
        matches: [
          { id: 'm1', roundNumber: 1, player1Id: 'p1', player2Id: 'p2', result: 'player1_win', isBye: false, tableNumber: 0 },
          { id: 'm2', roundNumber: 1, player1Id: 'p3', player2Id: 'p4', result: 'player1_win', isBye: false, tableNumber: 0 },
        ],
      },
    ]

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
        isComplete: true, phase: 'swiss', phaseIndex: 0,
        matches: [
          { id: 'm1', roundNumber: 1, player1Id: 'p1', player2Id: 'p2', result: 'player1_win', isBye: false, tableNumber: 0 },
        ],
      },
      {
        roundNumber: 2,
        isComplete: true, phase: 'swiss', phaseIndex: 0,
        matches: [
          { id: 'm2', roundNumber: 2, player1Id: 'p1', player2Id: 'p2', result: 'draw', isBye: false, tableNumber: 0 },
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
        isComplete: true, phase: 'swiss', phaseIndex: 0,
        matches: [
          { id: 'm1', roundNumber: 1, player1Id: 'p1', player2Id: 'p2', result: 'player1_win', isBye: false, tableNumber: 0 },
          { id: 'm2', roundNumber: 1, player1Id: 'p3', player2Id: 'p4', result: 'player1_win', isBye: false, tableNumber: 0 },
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
        isComplete: false, phase: 'swiss', phaseIndex: 0,
        matches: [
          { id: 'm1', roundNumber: 1, player1Id: 'p1', player2Id: 'p2', result: 'player1_win', isBye: false, tableNumber: 0 },
        ],
      },
    ]

    const standings = calculateStandings(players, rounds)
    expect(standings[0].matchPoints).toBe(0)
    expect(standings[1].matchPoints).toBe(0)
  })
})
