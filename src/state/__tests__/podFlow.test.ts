import { describe, it, expect, vi } from 'vitest'
import { tournamentReducer, initialState } from '../tournamentReducer'
import { AppState, TournamentAction } from '../actions'
import { calculateStandings } from '@/engine/standings'
import { Tournament } from '@/types/tournament'

vi.mock('@/lib/utils', () => {
  let counter = 0
  return {
    generateId: vi.fn(() => `id-${++counter}`),
    cn: (...args: string[]) => args.filter(Boolean).join(' '),
    formatTime: (s: number) => `${s}`,
    nearestPowerOfTwo: (n: number) => {
      if (n < 2) return 0
      let p = 1
      while (p * 2 <= n) p *= 2
      return p
    },
  }
})

function dispatch(state: AppState, action: TournamentAction): AppState {
  return tournamentReducer(state, action)
}

function getTournament(state: AppState): Tournament {
  const ids = Object.keys(state.tournaments)
  return state.tournaments[ids[ids.length - 1]]
}

function createPodTournament(playerCount: number, topCut: 0 | 4 | 16, podWinPoints = 5): AppState {
  let state = dispatch(initialState, {
    type: 'CREATE_TOURNAMENT',
    payload: { name: 'Pods', game: 'mtg', gameFormat: 'commander', format: 'multiplayer_pods', roundTimeMinutes: 75, topCut, podWinPoints },
  })
  const id = getTournament(state).id
  for (let i = 1; i <= playerCount; i++) {
    state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: `Player ${i}` } })
  }
  return state
}

// Decide every pod of the current round: first participant wins.
function decideRound(state: AppState): AppState {
  const t = getTournament(state)
  const round = t.rounds[t.rounds.length - 1]
  for (const m of round.matches) {
    state = dispatch(state, {
      type: 'SUBMIT_POD_RESULT',
      payload: { tournamentId: t.id, matchId: m.id, winnerId: m.participantIds![0] },
    })
  }
  return dispatch(state, { type: 'COMPLETE_ROUND', payload: { tournamentId: t.id } })
}

describe('multiplayer pod tournament flow', () => {
  it('stores podWinPoints only for pod tournaments', () => {
    const state = createPodTournament(4, 4, 7)
    expect(getTournament(state).podWinPoints).toBe(7)
  })

  it('refuses to start below three players', () => {
    let state = createPodTournament(2, 0)
    state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: getTournament(state).id } })
    expect(getTournament(state).status).toBe('registration')
  })

  it('starts with pods of 4/3/3 for 10 players and the pod round table', () => {
    let state = createPodTournament(10, 4)
    state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: getTournament(state).id } })
    const t = getTournament(state)
    expect(t.status).toBe('in_progress')
    expect(t.totalRounds).toBe(3)
    const sizes = t.rounds[0].matches.map(m => m.participantIds!.length).sort()
    expect(sizes).toEqual([3, 3, 4])
    expect(t.rounds[0].matches.every(m => !m.isBye && m.player2Id === null)).toBe(true)
  })

  it('rejects a winner who is not in the pod and draws in the cut', () => {
    let state = createPodTournament(8, 4)
    const id = getTournament(state).id
    state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
    const match = getTournament(state).rounds[0].matches[0]
    const before = state
    state = dispatch(state, { type: 'SUBMIT_POD_RESULT', payload: { tournamentId: id, matchId: match.id, winnerId: 'nobody' } })
    expect(state).toBe(before)
  })

  it('records draws with a null winner', () => {
    let state = createPodTournament(8, 0)
    const id = getTournament(state).id
    state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
    const match = getTournament(state).rounds[0].matches[0]
    state = dispatch(state, { type: 'SUBMIT_POD_RESULT', payload: { tournamentId: id, matchId: match.id, winnerId: null } })
    const updated = getTournament(state).rounds[0].matches[0]
    expect(updated.result).toBe('draw')
    expect(updated.podWinnerId).toBeNull()
  })

  it('does not auto-decide a pod when a player drops, and re-pods without them', () => {
    let state = createPodTournament(8, 0)
    const id = getTournament(state).id
    state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
    const t = getTournament(state)
    const victim = t.rounds[0].matches[0].participantIds![1]
    state = dispatch(state, { type: 'DROP_PLAYER', payload: { tournamentId: id, playerId: victim } })
    expect(getTournament(state).rounds[0].matches[0].result).toBe('pending')

    state = decideRound(state)
    state = dispatch(state, { type: 'GENERATE_ROUND', payload: { tournamentId: id } })
    const round2 = getTournament(state).rounds[1]
    const seated = round2.matches.flatMap(m => m.participantIds!)
    expect(seated).not.toContain(victim)
    expect(seated).toHaveLength(7)
    expect(round2.matches.map(m => m.participantIds!.length).sort()).toEqual([3, 4])
  })

  it('ignores match_loss auto-results for pod players but keeps the penalty', () => {
    let state = createPodTournament(8, 0)
    const id = getTournament(state).id
    state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
    const pid = getTournament(state).rounds[0].matches[0].participantIds![0]
    state = dispatch(state, { type: 'ISSUE_PENALTY', payload: { tournamentId: id, playerId: pid, type: 'match_loss', reason: 'test' } })
    const t = getTournament(state)
    expect(t.penalties).toHaveLength(1)
    expect(t.rounds[0].matches[0].result).toBe('pending')
    expect(t.rounds[0].matches[0].player1Games).toBeUndefined()
  })

  it('rejects swaps between pods', () => {
    let state = createPodTournament(8, 0)
    const id = getTournament(state).id
    state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
    const [m1, m2] = getTournament(state).rounds[0].matches
    const before = state
    state = dispatch(state, {
      type: 'SWAP_PLAYERS',
      payload: { tournamentId: id, matchId1: m1.id, playerId1: m1.participantIds![0], matchId2: m2.id, playerId2: m2.participantIds![0] },
    })
    expect(state).toBe(before)
  })

  it('deck-checks a pod with all participants', () => {
    let state = createPodTournament(8, 0)
    const id = getTournament(state).id
    state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
    const match = getTournament(state).rounds[0].matches[0]
    state = dispatch(state, { type: 'START_DECK_CHECK', payload: { tournamentId: id, matchId: match.id } })
    expect(getTournament(state).deckChecks![0].playerIds).toEqual(match.participantIds)
  })

  it('runs a full Top 4 event: swiss, cut, completion without Elo movement', () => {
    let state = createPodTournament(10, 4)
    const id = getTournament(state).id
    state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })

    for (let round = 1; round <= 3; round++) {
      state = decideRound(state)
      if (round < 3) {
        state = dispatch(state, { type: 'GENERATE_ROUND', payload: { tournamentId: id } })
        expect(getTournament(state).currentRound).toBe(round + 1)
      }
    }

    const swissStandings = calculateStandings(getTournament(state).players, getTournament(state).rounds, 'mtg', undefined, 5)
    state = dispatch(state, { type: 'START_TOP_CUT', payload: { tournamentId: id } })
    let t = getTournament(state)
    expect(t.status).toBe('top_cut')
    expect(t.totalRounds).toBe(4)
    const finalPod = t.rounds[3].matches
    expect(finalPod).toHaveLength(1)
    expect(finalPod[0].participantIds).toEqual(swissStandings.slice(0, 4).map(s => s.playerId))

    // Draw is not allowed in the cut
    const before = state
    state = dispatch(state, { type: 'SUBMIT_POD_RESULT', payload: { tournamentId: id, matchId: finalPod[0].id, winnerId: null } })
    expect(state).toBe(before)

    const champion = finalPod[0].participantIds![2]
    state = dispatch(state, { type: 'SUBMIT_POD_RESULT', payload: { tournamentId: id, matchId: finalPod[0].id, winnerId: champion } })
    state = dispatch(state, { type: 'COMPLETE_ROUND', payload: { tournamentId: id } })
    state = dispatch(state, { type: 'COMPLETE_TOURNAMENT', payload: { tournamentId: id } })

    t = getTournament(state)
    expect(t.status).toBe('completed')
    const finalStandings = calculateStandings(t.players, t.rounds, 'mtg', undefined, 5)
    expect(finalStandings[0].playerId).toBe(champion)

    // Pod events record participation but never move Elo.
    const dbEntries = Object.values(state.playerDatabase)
    expect(dbEntries.length).toBeGreaterThan(0)
    expect(dbEntries.every(p => p.elo === 1500)).toBe(true)
    expect(dbEntries.every(p => p.tournamentsPlayed === 1)).toBe(true)
  })

  it('runs a Top 16 with snake seeding and a winners final', () => {
    let state = createPodTournament(20, 16)
    const id = getTournament(state).id
    state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
    const rounds = getTournament(state).totalRounds
    expect(rounds).toBe(4) // 20 players

    for (let round = 1; round <= rounds; round++) {
      state = decideRound(state)
      if (round < rounds) state = dispatch(state, { type: 'GENERATE_ROUND', payload: { tournamentId: id } })
    }

    const swiss = calculateStandings(getTournament(state).players, getTournament(state).rounds, 'mtg', undefined, 5)
    state = dispatch(state, { type: 'START_TOP_CUT', payload: { tournamentId: id } })
    let t = getTournament(state)
    const semis = t.rounds[t.rounds.length - 1].matches
    expect(semis).toHaveLength(4)
    expect(t.totalRounds).toBe(rounds + 2)
    // Snake seeding: pod 1 holds seeds 1, 8, 9, 16
    const seedId = (n: number) => swiss[n - 1].playerId
    expect(semis[0].participantIds).toEqual([seedId(1), seedId(8), seedId(9), seedId(16)])
    expect(semis[3].participantIds).toEqual([seedId(4), seedId(5), seedId(12), seedId(13)])

    // Winners advance to the final pod, ordered by swiss standing
    const winners = semis.map(m => m.participantIds![0])
    for (const m of semis) {
      state = dispatch(state, { type: 'SUBMIT_POD_RESULT', payload: { tournamentId: id, matchId: m.id, winnerId: m.participantIds![0] } })
    }
    state = dispatch(state, { type: 'COMPLETE_ROUND', payload: { tournamentId: id } })
    state = dispatch(state, { type: 'GENERATE_ROUND', payload: { tournamentId: id } })
    t = getTournament(state)
    const final = t.rounds[t.rounds.length - 1].matches
    expect(final).toHaveLength(1)
    expect(new Set(final[0].participantIds)).toEqual(new Set(winners))
    const swissOrder = new Map(swiss.map((s, i) => [s.playerId, i]))
    const finalSeeds = final[0].participantIds!.map(p => swissOrder.get(p)!)
    expect([...finalSeeds].sort((a, b) => a - b)).toEqual(finalSeeds)

    const champion = final[0].participantIds![1]
    state = dispatch(state, { type: 'SUBMIT_POD_RESULT', payload: { tournamentId: id, matchId: final[0].id, winnerId: champion } })
    state = dispatch(state, { type: 'COMPLETE_ROUND', payload: { tournamentId: id } })
    state = dispatch(state, { type: 'COMPLETE_TOURNAMENT', payload: { tournamentId: id } })

    t = getTournament(state)
    const standings = calculateStandings(t.players, t.rounds, 'mtg', undefined, 5)
    expect(standings[0].playerId).toBe(champion)
    // Finalists occupy ranks 1–4, semifinal losers 5–16, rest from 17
    expect(new Set(standings.slice(0, 4).map(s => s.playerId))).toEqual(new Set(winners))
    expect(standings[4].rank).toBe(5)
    expect(standings[16].rank).toBe(17)
  })
})
