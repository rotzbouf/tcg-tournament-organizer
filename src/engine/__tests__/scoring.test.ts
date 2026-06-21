import { describe, it, expect } from 'vitest'
import {
  calculateMatchPoints,
  getMatchPointsForPlayer,
  getPlayerRecord,
  calculateTotalRounds,
  WIN_POINTS,
  DRAW_POINTS,
  LOSS_POINTS,
  BYE_POINTS,
} from '../scoring'
import { Round, Match } from '@/types/round'

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    roundNumber: 1,
    tableNumber: 0,
    player1Id: 'p1',
    player2Id: 'p2',
    result: 'pending',
    isBye: false,
    ...overrides,
  }
}

function makeRound(matches: Match[], roundNumber = 1, isComplete = true): Round {
  return { roundNumber, matches, isComplete, phase: 'swiss', phaseIndex: 0 }
}

describe('scoring constants', () => {
  it('has correct point values', () => {
    expect(WIN_POINTS).toBe(3)
    expect(DRAW_POINTS).toBe(1)
    expect(LOSS_POINTS).toBe(0)
    expect(BYE_POINTS).toBe(3)
  })
})

describe('getMatchPointsForPlayer', () => {
  it('returns WIN_POINTS for player1 win', () => {
    const match = makeMatch({ result: 'player1_win' })
    expect(getMatchPointsForPlayer('p1', match)).toBe(WIN_POINTS)
  })

  it('returns LOSS_POINTS for player1 loss', () => {
    const match = makeMatch({ result: 'player2_win' })
    expect(getMatchPointsForPlayer('p1', match)).toBe(LOSS_POINTS)
  })

  it('returns WIN_POINTS for player2 win', () => {
    const match = makeMatch({ result: 'player2_win' })
    expect(getMatchPointsForPlayer('p2', match)).toBe(WIN_POINTS)
  })

  it('returns DRAW_POINTS for draw', () => {
    const match = makeMatch({ result: 'draw' })
    expect(getMatchPointsForPlayer('p1', match)).toBe(DRAW_POINTS)
    expect(getMatchPointsForPlayer('p2', match)).toBe(DRAW_POINTS)
  })

  it('returns BYE_POINTS for bye match', () => {
    const match = makeMatch({ isBye: true, player2Id: null, result: 'player1_win' })
    expect(getMatchPointsForPlayer('p1', match)).toBe(BYE_POINTS)
  })

  it('returns 0 for pending match', () => {
    const match = makeMatch({ result: 'pending' })
    expect(getMatchPointsForPlayer('p1', match)).toBe(0)
  })

  it('returns 0 for unrelated player', () => {
    const match = makeMatch({ result: 'player1_win' })
    expect(getMatchPointsForPlayer('p3', match)).toBe(0)
  })
})

describe('calculateMatchPoints', () => {
  it('sums points across rounds', () => {
    const rounds: Round[] = [
      makeRound([makeMatch({ result: 'player1_win' })]),
      makeRound([makeMatch({ id: 'm2', roundNumber: 2, result: 'draw' })], 2),
    ]
    expect(calculateMatchPoints('p1', rounds)).toBe(WIN_POINTS + DRAW_POINTS)
  })

  it('ignores incomplete rounds', () => {
    const rounds: Round[] = [
      makeRound([makeMatch({ result: 'player1_win' })]),
      makeRound([makeMatch({ id: 'm2', roundNumber: 2, result: 'player1_win' })], 2, false),
    ]
    expect(calculateMatchPoints('p1', rounds)).toBe(WIN_POINTS)
  })
})

describe('getPlayerRecord', () => {
  it('counts wins, losses, draws correctly', () => {
    const rounds: Round[] = [
      makeRound([makeMatch({ result: 'player1_win' })]),
      makeRound([makeMatch({ id: 'm2', roundNumber: 2, result: 'player2_win' })], 2),
      makeRound([makeMatch({ id: 'm3', roundNumber: 3, result: 'draw' })], 3),
    ]
    expect(getPlayerRecord('p1', rounds)).toEqual({ wins: 1, losses: 1, draws: 1 })
    expect(getPlayerRecord('p2', rounds)).toEqual({ wins: 1, losses: 1, draws: 1 })
  })

  it('counts bye as a win', () => {
    const rounds: Round[] = [
      makeRound([makeMatch({ isBye: true, player2Id: null, result: 'player1_win' })]),
    ]
    expect(getPlayerRecord('p1', rounds)).toEqual({ wins: 1, losses: 0, draws: 0 })
  })
})

describe('calculateTotalRounds', () => {
  it('returns 0 for 0 or 1 players', () => {
    expect(calculateTotalRounds(0)).toBe(0)
    expect(calculateTotalRounds(1)).toBe(0)
  })

  it('returns correct values', () => {
    expect(calculateTotalRounds(2)).toBe(1)
    expect(calculateTotalRounds(3)).toBe(2)
    expect(calculateTotalRounds(4)).toBe(2)
    expect(calculateTotalRounds(5)).toBe(3)
    expect(calculateTotalRounds(8)).toBe(3)
    expect(calculateTotalRounds(9)).toBe(4)
    expect(calculateTotalRounds(16)).toBe(4)
    expect(calculateTotalRounds(32)).toBe(5)
    expect(calculateTotalRounds(64)).toBe(6)
  })
})
