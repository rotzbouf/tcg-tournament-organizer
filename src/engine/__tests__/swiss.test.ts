import { describe, it, expect } from 'vitest'
import { generatePairings, generateFirstRoundPairings } from '../swiss'
import { Player } from '@/types/player'
import { Round, Match } from '@/types/round'

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    hasBye: false,
    droppedInRound: null,
  }))
}

function makeCompletedRound(matches: Partial<Match>[], roundNumber: number): Round {
  return {
    roundNumber,
    isComplete: true,
    matches: matches.map((m, i) => ({
      id: `r${roundNumber}m${i + 1}`,
      roundNumber,
      player1Id: '',
      player2Id: null,
      result: 'pending' as const,
      isBye: false,
      ...m,
    })),
  }
}

describe('generateFirstRoundPairings', () => {
  it('returns empty for less than 2 players', () => {
    expect(generateFirstRoundPairings([])).toEqual([])
    expect(generateFirstRoundPairings(makePlayers(1))).toEqual([])
  })

  it('pairs all players with even count', () => {
    const players = makePlayers(4)
    const matches = generateFirstRoundPairings(players)
    expect(matches).toHaveLength(2)
    expect(matches.every(m => !m.isBye)).toBe(true)

    const allPlayerIds = matches.flatMap(m => [m.player1Id, m.player2Id!])
    expect(new Set(allPlayerIds).size).toBe(4)
  })

  it('assigns one bye with odd count', () => {
    const players = makePlayers(5)
    const matches = generateFirstRoundPairings(players)
    expect(matches).toHaveLength(3)

    const byeMatches = matches.filter(m => m.isBye)
    expect(byeMatches).toHaveLength(1)
    expect(byeMatches[0].player2Id).toBeNull()
    expect(byeMatches[0].result).toBe('player1_win')
  })

  it('does not pair a player with themselves', () => {
    const players = makePlayers(6)
    const matches = generateFirstRoundPairings(players)
    matches.forEach(m => {
      expect(m.player1Id).not.toBe(m.player2Id)
    })
  })
})

describe('generatePairings', () => {
  it('returns empty for less than 2 players', () => {
    expect(generatePairings(makePlayers(0), [], 1)).toEqual([])
    expect(generatePairings(makePlayers(1), [], 1)).toEqual([])
  })

  it('pairs 2 players', () => {
    const players = makePlayers(2)
    const matches = generatePairings(players, [], 2)
    expect(matches).toHaveLength(1)
    expect(matches[0].player1Id).toBeTruthy()
    expect(matches[0].player2Id).toBeTruthy()
  })

  it('avoids rematches when possible', () => {
    const players = makePlayers(4)
    const round1: Round = makeCompletedRound([
      { player1Id: 'p1', player2Id: 'p2', result: 'player1_win' },
      { player1Id: 'p3', player2Id: 'p4', result: 'player1_win' },
    ], 1)

    const matches = generatePairings(players, [round1], 2)
    expect(matches).toHaveLength(2)

    for (const match of matches) {
      const pair = [match.player1Id, match.player2Id].sort()
      expect(pair).not.toEqual(['p1', 'p2'])
      expect(pair).not.toEqual(['p3', 'p4'])
    }
  })

  it('pairs by score bracket', () => {
    const players = makePlayers(4)
    const round1: Round = makeCompletedRound([
      { player1Id: 'p1', player2Id: 'p2', result: 'player1_win' },
      { player1Id: 'p3', player2Id: 'p4', result: 'player1_win' },
    ], 1)

    const matches = generatePairings(players, [round1], 2)
    const nonByeMatches = matches.filter(m => !m.isBye)

    const winsMatch = nonByeMatches.find(m =>
      (m.player1Id === 'p1' || m.player1Id === 'p3') &&
      (m.player2Id === 'p1' || m.player2Id === 'p3')
    )
    expect(winsMatch).toBeDefined()
  })

  it('assigns bye to lowest-ranked player with odd count', () => {
    const players = makePlayers(3)
    const round1: Round = makeCompletedRound([
      { player1Id: 'p1', player2Id: 'p2', result: 'player1_win' },
      { player1Id: 'p3', player2Id: null, result: 'player1_win', isBye: true },
    ], 1)
    players[2].hasBye = true

    const matches = generatePairings(players, [round1], 2)
    const byeMatch = matches.find(m => m.isBye)
    expect(byeMatch).toBeDefined()
    expect(byeMatch!.player1Id).not.toBe('p3')
  })

  it('does not assign bye to player who already had one', () => {
    const players = makePlayers(3)
    players[0].hasBye = true

    const round1: Round = makeCompletedRound([
      { player1Id: 'p1', player2Id: null, result: 'player1_win', isBye: true },
      { player1Id: 'p2', player2Id: 'p3', result: 'player2_win' },
    ], 1)

    const matches = generatePairings(players, [round1], 2)
    const byeMatch = matches.find(m => m.isBye)
    expect(byeMatch).toBeDefined()
    expect(byeMatch!.player1Id).not.toBe('p1')
  })

  it('handles 8 players through multiple rounds', () => {
    const players = makePlayers(8)
    let rounds: Round[] = []

    const r1Matches = generatePairings(players, rounds, 1)
    expect(r1Matches).toHaveLength(4)

    rounds.push({
      roundNumber: 1,
      isComplete: true,
      matches: r1Matches.map(m => ({
        ...m,
        result: 'player1_win' as const,
      })),
    })

    const r2Matches = generatePairings(players, rounds, 2)
    expect(r2Matches).toHaveLength(4)

    for (const m of r2Matches) {
      if (m.isBye) continue
      const wasR1Pair = rounds[0].matches.some(
        r1m => !r1m.isBye &&
          ((r1m.player1Id === m.player1Id && r1m.player2Id === m.player2Id) ||
          (r1m.player1Id === m.player2Id && r1m.player2Id === m.player1Id))
      )
      expect(wasR1Pair).toBe(false)
    }
  })
})
