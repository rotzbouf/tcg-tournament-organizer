import { describe, it, expect } from 'vitest'
import { podSizes, generateFirstRoundPods, generatePodPairings, calculatePodPoints, snakeSeedPods, generatePodCutRound, DEFAULT_POD_WIN_POINTS } from '../pods'
import { calculateStandings } from '../standings'
import { Player } from '@/types/player'
import { Match, Round } from '@/types/round'

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    playerId: null,
    dateOfBirth: null,
    deckName: null,
    decklist: null,
    hasBye: false,
    droppedInRound: null,
  }))
}

let matchCounter = 0
function podMatch(participantIds: string[], roundNumber: number, winnerId: string | null | 'pending', tableNumber = 1): Match {
  return {
    id: `m${++matchCounter}`,
    roundNumber,
    tableNumber,
    player1Id: participantIds[0],
    player2Id: null,
    result: winnerId === 'pending' ? 'pending' : winnerId === null ? 'draw' : 'player1_win',
    isBye: false,
    participantIds,
    podWinnerId: winnerId === 'pending' ? null : winnerId,
  }
}

function makeRound(matches: Match[], roundNumber: number, isComplete = true, phase: Round['phase'] = 'swiss'): Round {
  return { roundNumber, matches, isComplete, phase, phaseIndex: 0 }
}

describe('podSizes', () => {
  it('handles small counts as a single pod', () => {
    expect(podSizes(0)).toEqual([])
    expect(podSizes(1)).toEqual([])
    expect(podSizes(3)).toEqual([3])
    expect(podSizes(4)).toEqual([4])
    expect(podSizes(5)).toEqual([5])
  })

  it('prefers pods of three at the bottom over byes', () => {
    expect(podSizes(6)).toEqual([3, 3])
    expect(podSizes(7)).toEqual([4, 3])
    expect(podSizes(8)).toEqual([4, 4])
    expect(podSizes(9)).toEqual([3, 3, 3])
    expect(podSizes(10)).toEqual([4, 3, 3])
    expect(podSizes(13)).toEqual([4, 3, 3, 3])
    // Addendum example: 23 players = 5×4 + 1×3
    expect(podSizes(23)).toEqual([4, 4, 4, 4, 4, 3])
  })

  it('always seats every player', () => {
    for (let n = 2; n <= 60; n++) {
      const sizes = podSizes(n)
      expect(sizes.reduce((s, x) => s + x, 0)).toBe(n)
      for (const size of sizes) {
        expect(size).toBeGreaterThanOrEqual(n <= 2 ? 2 : 3)
        expect(size).toBeLessThanOrEqual(5)
      }
    }
  })
})

describe('generateFirstRoundPods', () => {
  it('seats everyone exactly once with sequential tables', () => {
    const matches = generateFirstRoundPods(makePlayers(10))
    expect(matches.map(m => (m.participantIds ?? []).length).sort()).toEqual([3, 3, 4])
    const seated = matches.flatMap(m => m.participantIds ?? [])
    expect(new Set(seated).size).toBe(10)
    matches.forEach((m, i) => {
      expect(m.tableNumber).toBe(i + 1)
      expect(m.player1Id).toBe(m.participantIds![0])
      expect(m.player2Id).toBeNull()
      expect(m.isBye).toBe(false)
      expect(m.result).toBe('pending')
    })
  })
})

describe('calculatePodPoints', () => {
  const rounds = [
    makeRound([podMatch(['p1', 'p2', 'p3', 'p4'], 1, 'p1'), podMatch(['p5', 'p6', 'p7', 'p8'], 1, null, 2)], 1),
    makeRound([podMatch(['p1', 'p5', 'p6', 'p7'], 2, 'pending')], 2, false),
  ]

  it('scores wins and draws, ignoring incomplete rounds', () => {
    expect(calculatePodPoints('p1', rounds, DEFAULT_POD_WIN_POINTS)).toBe(5)
    expect(calculatePodPoints('p2', rounds, DEFAULT_POD_WIN_POINTS)).toBe(0)
    expect(calculatePodPoints('p5', rounds, DEFAULT_POD_WIN_POINTS)).toBe(1)
  })

  it('honors the configured win points', () => {
    expect(calculatePodPoints('p1', rounds, 7)).toBe(7)
  })
})

describe('generatePodPairings', () => {
  it('groups by points and excludes dropped players', () => {
    const players = makePlayers(9)
    players[8].droppedInRound = 1
    const rounds = [
      makeRound([
        podMatch(['p1', 'p2', 'p3', 'p4'], 1, 'p1'),
        podMatch(['p5', 'p6', 'p7', 'p8'], 1, 'p5', 2),
      ], 1),
    ]
    const matches = generatePodPairings(players, rounds, 2, 5)
    expect(matches.map(m => (m.participantIds ?? []).length).sort()).toEqual([4, 4])
    const seated = matches.flatMap(m => m.participantIds ?? [])
    expect(seated).not.toContain('p9')
    expect(new Set(seated).size).toBe(8)
    // The two 5-point players sit in the same (top) pod.
    const topPod = matches.find(m => m.participantIds!.includes('p1'))!
    expect(topPod.participantIds).toContain('p5')
  })

  it('avoids repeat podmates when a clean split exists', () => {
    // Two rounds with fixed pods; all players on equal points (all draws), so
    // only rematch avoidance drives the assignment.
    const players = makePlayers(8)
    const rounds = [
      makeRound([
        podMatch(['p1', 'p2', 'p3', 'p4'], 1, null),
        podMatch(['p5', 'p6', 'p7', 'p8'], 1, null, 2),
      ], 1),
    ]
    const matches = generatePodPairings(players, rounds, 2, 5)
    const oldPods = [new Set(['p1', 'p2', 'p3', 'p4']), new Set(['p5', 'p6', 'p7', 'p8'])]
    let repeats = 0
    for (const m of matches) {
      const ids = m.participantIds!
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          if (oldPods.some(pod => pod.has(ids[i]) && pod.has(ids[j]))) repeats++
        }
      }
    }
    // The optimum after one round of two 4-pods is a 2+2 split per new pod:
    // 2 repeat pairs each, 4 total. A 3+1 split would give 3+1+3+1 = 8 —
    // anything above 4 means the swap optimizer regressed.
    expect(repeats).toBeLessThanOrEqual(4)
  })
})

describe('snakeSeedPods', () => {
  it('builds TopDeck snake pods for a Top 16', () => {
    const ids = Array.from({ length: 16 }, (_, i) => `s${i + 1}`)
    expect(snakeSeedPods(ids)).toEqual([
      ['s1', 's8', 's9', 's16'],
      ['s2', 's7', 's10', 's15'],
      ['s3', 's6', 's11', 's14'],
      ['s4', 's5', 's12', 's13'],
    ])
  })

  it('keeps a Top 4 as the single final pod', () => {
    expect(snakeSeedPods(['a', 'b', 'c', 'd'])).toEqual([['a', 'b', 'c', 'd']])
  })
})

describe('generatePodCutRound', () => {
  it('creates one match per pod in seed order', () => {
    const matches = generatePodCutRound([['a', 'b', 'c', 'd'], ['e', 'f', 'g', 'h']], 4)
    expect(matches).toHaveLength(2)
    expect(matches[0].participantIds).toEqual(['a', 'b', 'c', 'd'])
    expect(matches[0].tableNumber).toBe(1)
    expect(matches[1].tableNumber).toBe(2)
    expect(matches.every(m => m.roundNumber === 4 && m.result === 'pending')).toBe(true)
  })
})

describe('pod standings', () => {
  // R1: pod [a,b,c,d] winner a; pod [e,f,g,h] draw.
  // R2: pod [a,e,f,g] winner e; pod [b,c,d,h] winner h.
  const players = makePlayers(8)
  const [a, b, c, d, e, f, g, h] = players.map(p => p.id)
  const rounds = [
    makeRound([podMatch([a, b, c, d], 1, a), podMatch([e, f, g, h], 1, null, 2)], 1),
    makeRound([podMatch([a, e, f, g], 2, e), podMatch([b, c, d, h], 2, h, 2)], 2),
  ]

  it('computes points, MW%, avg opponent points and OMW%', () => {
    const standings = calculateStandings(players, rounds, 'mtg', undefined, 5)
    const of = (id: string) => standings.find(s => s.playerId === id)!

    expect(of(e).matchPoints).toBe(6) // draw + win
    expect(of(h).matchPoints).toBe(6)
    expect(of(a).matchPoints).toBe(5)
    expect(of(b).matchPoints).toBe(0)

    // MW% lives in gameWinPct for pods
    expect(of(e).gameWinPct).toBeCloseTo(0.5)
    expect(of(a).gameWinPct).toBeCloseTo(0.5)
    expect(of(b).gameWinPct).toBe(0)

    // e's opponents: f,g,h (r1) + a,f,g (r2) → points 1,1,6,5,1,1 → avg 2.5
    expect(of(e).avgOpponentPoints).toBeCloseTo(15 / 6)
    // h's opponents: e,f,g (r1) + b,c,d (r2) → points 6,1,1,0,0,0 → avg 8/6
    expect(of(h).avgOpponentPoints).toBeCloseTo(8 / 6)

    // 6 points before 5; e over h via avg opponent points
    expect(standings[0].playerId).toBe(e)
    expect(standings[1].playerId).toBe(h)
    expect(standings[2].playerId).toBe(a)
    expect(standings[0].rank).toBe(1)
  })

  it('honors configured win points', () => {
    const standings = calculateStandings(players, rounds, 'mtg', undefined, 7)
    const of = (id: string) => standings.find(s => s.playerId === id)!
    expect(of(a).matchPoints).toBe(7)
    expect(of(e).matchPoints).toBe(8)
  })

  it('ranks the final pod by cut result, rest by swiss order', () => {
    const cutRound = makeRound([podMatch([e, h, a, f], 3, h)], 3, true, 'top_cut')
    const standings = calculateStandings(players, [...rounds, cutRound], 'mtg', undefined, 5)
    expect(standings[0].playerId).toBe(h)
    expect(standings[0].rank).toBe(1)
    // Remaining finalists follow in swiss order: e, a, f
    expect(standings.slice(1, 4).map(s => s.playerId)).toEqual([e, a, f])
    expect(standings[1].rank).toBe(2)
    // Non-cut players continue at rank 5
    expect(standings[4].rank).toBe(5)
  })
})
