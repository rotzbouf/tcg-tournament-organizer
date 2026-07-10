import { describe, it, expect } from 'vitest'
import { generatePairings, generateFirstRoundPairings, generatePowerPairings } from '../swiss'
import { Player } from '@/types/player'
import { Round, Match } from '@/types/round'
import { Standing } from '@/types/standing'

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    playerId: null, dateOfBirth: null, deckName: null, decklist: null, hasBye: false,
    droppedInRound: null,
  }))
}

function makeCompletedRound(matches: Partial<Match>[], roundNumber: number): Round {
  return {
    roundNumber,
    isComplete: true,
    phase: 'swiss',
    phaseIndex: 0,
    matches: matches.map((m, i) => ({
      id: `r${roundNumber}m${i + 1}`,
      roundNumber,
      tableNumber: 0,
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

  it('assigns a repeat bye when every player already had one, leaving nobody unmatched (L2)', () => {
    const players = makePlayers(3)
    players.forEach(p => { p.hasBye = true })

    const rounds: Round[] = [
      makeCompletedRound([
        { player1Id: 'p1', player2Id: null, result: 'player1_win', isBye: true },
        { player1Id: 'p2', player2Id: 'p3', result: 'player1_win' },
      ], 1),
      makeCompletedRound([
        { player1Id: 'p2', player2Id: null, result: 'player1_win', isBye: true },
        { player1Id: 'p1', player2Id: 'p3', result: 'player1_win' },
      ], 2),
      makeCompletedRound([
        { player1Id: 'p3', player2Id: null, result: 'player1_win', isBye: true },
        { player1Id: 'p1', player2Id: 'p2', result: 'player1_win' },
      ], 3),
    ]

    const matches = generatePairings(players, rounds, 4)
    const seated = matches.flatMap(m => [m.player1Id, m.player2Id].filter(Boolean))
    expect(new Set(seated).size).toBe(3)
    expect(matches.filter(m => m.isBye)).toHaveLength(1)
  })

  it('handles 8 players through multiple rounds', () => {
    const players = makePlayers(8)
    const rounds: Round[] = []

    const r1Matches = generatePairings(players, rounds, 1)
    expect(r1Matches).toHaveLength(4)

    rounds.push({
      roundNumber: 1,
      isComplete: true,
      phase: 'swiss',
      phaseIndex: 0,
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

describe('maximum-weight pairing', () => {
  it('finds the only rematch-free pairing even when it crosses the sort order', () => {
    // p1 hat schon gegen p3 und p4 gespielt, p2 gegen p3 und p4 ebenso —
    // die einzige rematch-freie Paarung ist p1-p2 und p3-p4.
    const players = makePlayers(4)
    const rounds: Round[] = [
      makeCompletedRound([
        { player1Id: 'p1', player2Id: 'p3', result: 'draw' },
        { player1Id: 'p2', player2Id: 'p4', result: 'draw' },
      ], 1),
      makeCompletedRound([
        { player1Id: 'p1', player2Id: 'p4', result: 'draw' },
        { player1Id: 'p2', player2Id: 'p3', result: 'draw' },
      ], 2),
    ]

    const matches = generatePairings(players, rounds, 3)
    const pairs = matches.map(m => [m.player1Id, m.player2Id].sort().join('-')).sort()
    expect(pairs).toEqual(['p1-p2', 'p3-p4'])
  })

  it('prefers two small pair-downs over one big one', () => {
    // Punktstände über Byes (keine gemeinsamen Gegner): p1=6, p2=3, p3=3, p4=0.
    // Quadratische Differenz-Strafe: 6-3 & 3-0 (9+9) schlägt 6-0 & 3-3 (36+0).
    const players = makePlayers(4)
    const byeRound = (byePlayers: string[], roundNumber: number) =>
      makeCompletedRound(
        byePlayers.map(id => ({ player1Id: id, player2Id: null, result: 'player1_win' as const, isBye: true })),
        roundNumber
      )
    const rounds = [byeRound(['p1', 'p2'], 1), byeRound(['p1', 'p3'], 2)]

    const matches = generatePairings(players, rounds, 3)
    const pairs = matches.map(m => [m.player1Id, m.player2Id].sort().join('-'))
    expect(pairs).not.toContain('p1-p4')
  })

  it('keeps power pairings rank-adjacent within a score group', () => {
    const players = makePlayers(4)
    const standings: Standing[] = ['p3', 'p1', 'p4', 'p2'].map((playerId, i) => ({
      playerId,
      playerName: playerId,
      rank: i + 1,
      matchPoints: 0, wins: 0, losses: 0, draws: 0,
      buchholz: 0, medianBuchholz: 0, sonnebornBerger: 0,
      opponentMatchWinPct: 0, gameWinPct: 0, opponentGameWinPct: 0,
      dropped: false,
    }))

    const matches = generatePowerPairings(players, [], 1, standings)
    const pairs = matches.map(m => [m.player1Id, m.player2Id].sort().join('-')).sort()
    expect(pairs).toEqual(['p1-p3', 'p2-p4'])
  })

  it('produces the minimal number of rematches on random histories (vs. brute force)', () => {
    const n = 8
    for (let trial = 0; trial < 100; trial++) {
      const players = makePlayers(n)
      const historyRounds = 2 + Math.floor(Math.random() * 4)
      const rounds: Round[] = []
      for (let r = 1; r <= historyRounds; r++) {
        const order = players.map(p => p.id).sort(() => Math.random() - 0.5)
        const roundMatches: Partial<Match>[] = []
        for (let i = 0; i < n; i += 2) {
          roundMatches.push({
            player1Id: order[i],
            player2Id: order[i + 1],
            result: Math.random() < 0.5 ? 'player1_win' : 'player2_win',
          })
        }
        rounds.push(makeCompletedRound(roundMatches, r))
      }

      const played = new Set<string>()
      for (const round of rounds) {
        for (const m of round.matches) {
          played.add([m.player1Id, m.player2Id].sort().join('-'))
        }
      }

      // Brute Force: minimale Rematch-Anzahl über alle perfekten Matchings
      const ids = players.map(p => p.id)
      const minRematches = (used: boolean[]): number => {
        const i = used.indexOf(false)
        if (i === -1) return 0
        used[i] = true
        let best = Infinity
        for (let j = i + 1; j < n; j++) {
          if (used[j]) continue
          used[j] = true
          const cost = (played.has([ids[i], ids[j]].sort().join('-')) ? 1 : 0) + minRematches(used)
          used[j] = false
          if (cost < best) best = cost
        }
        used[i] = false
        return best
      }
      const optimal = minRematches(new Array(n).fill(false))

      const matches = generatePairings(players, rounds, historyRounds + 1)
      const rematches = matches.filter(
        m => !m.isBye && played.has([m.player1Id, m.player2Id].sort().join('-'))
      ).length

      expect(rematches, `Trial ${trial}: ${rematches} Rematches, optimal wären ${optimal}`).toBe(optimal)
    }
  })
})
