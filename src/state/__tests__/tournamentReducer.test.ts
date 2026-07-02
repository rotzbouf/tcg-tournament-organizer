import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tournamentReducer, initialState } from '../tournamentReducer'
import { AppState, TournamentAction } from '../actions'

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

function createTournament(state: AppState = initialState): AppState {
  return dispatch(state, {
    type: 'CREATE_TOURNAMENT',
    payload: { name: 'Test', game: 'yugioh', format: 'swiss', roundTimeMinutes: 50, topCut: 0 },
  })
}

function getTournament(state: AppState) {
  const ids = Object.keys(state.tournaments)
  return state.tournaments[ids[ids.length - 1]]
}

describe('tournamentReducer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CREATE_TOURNAMENT', () => {
    it('creates a tournament with correct defaults', () => {
      const state = createTournament()
      const t = getTournament(state)
      expect(t.name).toBe('Test')
      expect(t.game).toBe('yugioh')
      expect(t.status).toBe('registration')
      expect(t.players).toEqual([])
      expect(t.rounds).toEqual([])
      expect(t.roundTimeMinutes).toBe(50)
      expect(t.topCut).toBe(0)
    })
  })

  describe('DELETE_TOURNAMENT', () => {
    it('removes tournament from state', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'DELETE_TOURNAMENT', payload: { tournamentId: id } })
      expect(Object.keys(state.tournaments)).toHaveLength(0)
    })

    it('ignores nonexistent ID', () => {
      const state = createTournament()
      const result = dispatch(state, { type: 'DELETE_TOURNAMENT', payload: { tournamentId: 'nope' } })
      expect(Object.keys(result.tournaments)).toHaveLength(1)
    })
  })

  describe('ADD_PLAYER', () => {
    it('adds a player during registration', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'Alice' } })
      expect(getTournament(state).players).toHaveLength(1)
      expect(getTournament(state).players[0].name).toBe('Alice')
      expect(getTournament(state).players[0].deckName).toBeNull()
    })

    it('rejects adding during in_progress', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'A' } })
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'B' } })
      state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'C' } })
      expect(getTournament(state).players).toHaveLength(2)
    })
  })

  describe('REMOVE_PLAYER', () => {
    it('removes a player during registration', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'A' } })
      const playerId = getTournament(state).players[0].id
      state = dispatch(state, { type: 'REMOVE_PLAYER', payload: { tournamentId: id, playerId } })
      expect(getTournament(state).players).toHaveLength(0)
    })
  })

  describe('DROP_PLAYER', () => {
    it('drops a player during in_progress', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'A' } })
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'B' } })
      state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
      const playerId = getTournament(state).players[0].id
      state = dispatch(state, { type: 'DROP_PLAYER', payload: { tournamentId: id, playerId } })
      const droppedPlayer = getTournament(state).players.find(p => p.id === playerId)
      expect(droppedPlayer?.droppedInRound).toBe(1)
    })

    it('rejects during registration', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'A' } })
      const playerId = getTournament(state).players[0].id
      state = dispatch(state, { type: 'DROP_PLAYER', payload: { tournamentId: id, playerId } })
      expect(getTournament(state).players[0].droppedInRound).toBeNull()
    })
  })

  describe('START_TOURNAMENT', () => {
    it('transitions to in_progress with 2+ players', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'A' } })
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'B' } })
      state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
      expect(getTournament(state).status).toBe('in_progress')
      expect(getTournament(state).rounds).toHaveLength(1)
      expect(getTournament(state).currentRound).toBe(1)
    })

    it('rejects with fewer than 2 players', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'A' } })
      state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
      expect(getTournament(state).status).toBe('registration')
    })

    it('seats every player in double elimination, padding with byes (F1)', () => {
      let state = dispatch(initialState, {
        type: 'CREATE_TOURNAMENT',
        payload: { name: 'DE', game: 'yugioh', format: 'double_elimination', roundTimeMinutes: 50, topCut: 0 },
      })
      const id = getTournament(state).id
      for (const name of ['A', 'B', 'C', 'D', 'E', 'F']) {
        state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: name } })
      }
      state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })

      const t = getTournament(state)
      expect(t.status).toBe('in_progress')
      const seated = t.rounds[0].matches.flatMap(m => [m.player1Id, m.player2Id].filter(Boolean))
      expect(new Set(seated).size).toBe(6)
      expect(t.rounds[0].matches.filter(m => m.isBye)).toHaveLength(2)
    })
  })

  describe('SUBMIT_MATCH_RESULT', () => {
    it('updates match result in active round', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'A' } })
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'B' } })
      state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
      const matchId = getTournament(state).rounds[0].matches[0].id
      state = dispatch(state, { type: 'SUBMIT_MATCH_RESULT', payload: { tournamentId: id, matchId, result: 'player1_win' } })
      expect(getTournament(state).rounds[0].matches[0].result).toBe('player1_win')
    })

    it('rejects for nonexistent match', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'A' } })
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'B' } })
      state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
      const before = getTournament(state)
      state = dispatch(state, { type: 'SUBMIT_MATCH_RESULT', payload: { tournamentId: id, matchId: 'fake', result: 'player1_win' } })
      expect(getTournament(state).rounds[0].matches[0].result).toBe(before.rounds[0].matches[0].result)
    })

    it('rejects a draw in knockout rounds (F2)', () => {
      let state = dispatch(initialState, {
        type: 'CREATE_TOURNAMENT',
        payload: { name: 'DE', game: 'yugioh', format: 'double_elimination', roundTimeMinutes: 50, topCut: 0 },
      })
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'A' } })
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'B' } })
      state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
      expect(getTournament(state).rounds[0].phase).toBe('winners_bracket')

      const matchId = getTournament(state).rounds[0].matches[0].id
      state = dispatch(state, { type: 'SUBMIT_MATCH_RESULT', payload: { tournamentId: id, matchId, result: 'draw' } })
      expect(getTournament(state).rounds[0].matches[0].result).toBe('pending')

      state = dispatch(state, { type: 'SUBMIT_MATCH_RESULT', payload: { tournamentId: id, matchId, result: 'player1_win' } })
      expect(getTournament(state).rounds[0].matches[0].result).toBe('player1_win')
    })

    it('still allows a draw in swiss rounds', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'A' } })
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'B' } })
      state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
      const matchId = getTournament(state).rounds[0].matches[0].id
      state = dispatch(state, { type: 'SUBMIT_MATCH_RESULT', payload: { tournamentId: id, matchId, result: 'draw' } })
      expect(getTournament(state).rounds[0].matches[0].result).toBe('draw')
    })
  })

  describe('ISSUE_PENALTY', () => {
    function startedTournament() {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'A' } })
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'B' } })
      state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
      return { state, id }
    }

    it('disqualification drops the player and decides the running match (F6)', () => {
      const { state: started, id } = startedTournament()
      const t = getTournament(started)
      const match = t.rounds[0].matches[0]
      const dqPlayerId = match.player1Id

      const state = dispatch(started, {
        type: 'ISSUE_PENALTY',
        payload: { tournamentId: id, playerId: dqPlayerId, type: 'disqualification', reason: 'Cheating' },
      })

      const after = getTournament(state)
      expect(after.players.find(p => p.id === dqPlayerId)?.droppedInRound).toBe(1)
      expect(after.rounds[0].matches[0].result).toBe('player2_win')
      expect(after.penalties).toHaveLength(1)
      // the round can now be completed without manual result entry
      const completed = dispatch(state, { type: 'COMPLETE_ROUND', payload: { tournamentId: id } })
      expect(getTournament(completed).rounds[0].isComplete).toBe(true)
    })

    it('disqualification leaves an already-decided match untouched', () => {
      const { state: started, id } = startedTournament()
      const t = getTournament(started)
      const match = t.rounds[0].matches[0]

      let state = dispatch(started, { type: 'SUBMIT_MATCH_RESULT', payload: { tournamentId: id, matchId: match.id, result: 'player1_win' } })
      state = dispatch(state, {
        type: 'ISSUE_PENALTY',
        payload: { tournamentId: id, playerId: match.player1Id, type: 'disqualification', reason: 'Cheating' },
      })
      expect(getTournament(state).rounds[0].matches[0].result).toBe('player1_win')
    })
  })

  describe('GENERATE_ROUND — round robin', () => {
    function completeCurrentRound(state: AppState, id: string): AppState {
      const t = getTournament(state)
      const round = t.rounds[t.rounds.length - 1]
      let s = state
      for (const m of round.matches) {
        if (m.result === 'pending') {
          s = dispatch(s, { type: 'SUBMIT_MATCH_RESULT', payload: { tournamentId: id, matchId: m.id, result: 'player1_win' } })
        }
      }
      return dispatch(s, { type: 'COMPLETE_ROUND', payload: { tournamentId: id } })
    }

    it('skips dropped players and gives their scheduled opponent a bye (F3)', () => {
      let state = dispatch(initialState, {
        type: 'CREATE_TOURNAMENT',
        payload: { name: 'RR', game: 'yugioh', format: 'round_robin', roundTimeMinutes: 50, topCut: 0 },
      })
      const id = getTournament(state).id
      for (const name of ['A', 'B', 'C', 'D']) {
        state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: name } })
      }
      state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
      expect(getTournament(state).totalRounds).toBe(3)
      state = completeCurrentRound(state, id)

      const droppedId = getTournament(state).players[1].id // "B"
      state = dispatch(state, { type: 'DROP_PLAYER', payload: { tournamentId: id, playerId: droppedId } })

      const laterPairs = new Set<string>()
      for (const roundNumber of [2, 3]) {
        state = dispatch(state, { type: 'GENERATE_ROUND', payload: { tournamentId: id } })
        const round = getTournament(state).rounds[roundNumber - 1]
        expect(round.roundNumber).toBe(roundNumber)
        // the dropped player is never seated again
        expect(round.matches.every(m => m.player1Id !== droppedId && m.player2Id !== droppedId)).toBe(true)
        // their scheduled opponent gets a bye instead
        expect(round.matches.filter(m => m.isBye)).toHaveLength(1)
        for (const m of round.matches.filter(m => !m.isBye)) {
          laterPairs.add([m.player1Id, m.player2Id].sort().join('-'))
        }
        state = completeCurrentRound(state, id)
      }

      // the two remaining pairs among active players are played exactly once
      expect(laterPairs.size).toBe(2)
    })

    it('continues a round-robin phase with the phase-relative schedule (F4)', () => {
      const phases = [
        { id: 'ph1', name: 'Swiss', format: 'swiss' as const, topCut: 0 as const, advanceCount: 0, roundTimeMinutes: 50 },
        { id: 'ph2', name: 'Finals', format: 'round_robin' as const, topCut: 0 as const, advanceCount: 4, roundTimeMinutes: 30 },
      ]
      let state = dispatch(initialState, {
        type: 'CREATE_TOURNAMENT',
        payload: { name: 'MP', game: 'yugioh', format: 'swiss', roundTimeMinutes: 50, topCut: 0, phases },
      })
      const id = getTournament(state).id
      for (const name of ['A', 'B', 'C', 'D', 'E', 'F']) {
        state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: name } })
      }
      state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
      state = completeCurrentRound(state, id)

      state = dispatch(state, { type: 'ADVANCE_PHASE', payload: { tournamentId: id } })
      const afterAdvance = getTournament(state)
      expect(afterAdvance.rounds[1].phase).toBe('round_robin')
      const advanced = new Set(afterAdvance.players.filter(p => p.droppedInRound === null).map(p => p.id))
      expect(advanced.size).toBe(4)

      // play the round-robin phase to the end: 4 players → 3 rounds
      const rrPairs = new Set<string>()
      const collect = (roundIdx: number) => {
        const round = getTournament(state).rounds[roundIdx]
        expect(round.phase).toBe('round_robin')
        expect(round.matches.length).toBeGreaterThan(0)
        for (const m of round.matches) {
          expect(advanced.has(m.player1Id)).toBe(true)
          if (m.player2Id) {
            expect(advanced.has(m.player2Id)).toBe(true)
            rrPairs.add([m.player1Id, m.player2Id].sort().join('-'))
          }
        }
      }

      collect(1)
      state = completeCurrentRound(state, id)
      for (const roundIdx of [2, 3]) {
        state = dispatch(state, { type: 'GENERATE_ROUND', payload: { tournamentId: id } })
        collect(roundIdx)
        state = completeCurrentRound(state, id)
      }

      // every pair of the four finalists met exactly once across the phase
      expect(rrPairs.size).toBe(6)
      // and the schedule is exhausted
      const before = getTournament(state).rounds.length
      state = dispatch(state, { type: 'GENERATE_ROUND', payload: { tournamentId: id } })
      expect(getTournament(state).rounds.length).toBe(before)
    })
  })

  describe('COMPLETE_ROUND', () => {
    it('marks round complete when all results are in', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'A' } })
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'B' } })
      state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
      const matchId = getTournament(state).rounds[0].matches[0].id
      state = dispatch(state, { type: 'SUBMIT_MATCH_RESULT', payload: { tournamentId: id, matchId, result: 'player1_win' } })
      state = dispatch(state, { type: 'COMPLETE_ROUND', payload: { tournamentId: id } })
      expect(getTournament(state).rounds[0].isComplete).toBe(true)
    })

    it('rejects when results are pending', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'A' } })
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'B' } })
      state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
      state = dispatch(state, { type: 'COMPLETE_ROUND', payload: { tournamentId: id } })
      expect(getTournament(state).rounds[0].isComplete).toBe(false)
    })
  })

  describe('COMPLETE_TOURNAMENT', () => {
    it('sets status to completed', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'A' } })
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'B' } })
      state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
      state = dispatch(state, { type: 'COMPLETE_TOURNAMENT', payload: { tournamentId: id } })
      expect(getTournament(state).status).toBe('completed')
    })
  })

  describe('UPDATE_TOURNAMENT', () => {
    it('updates name during registration', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'UPDATE_TOURNAMENT', payload: { tournamentId: id, name: 'New Name' } })
      expect(getTournament(state).name).toBe('New Name')
    })

    it('rejects after tournament started', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'A' } })
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'B' } })
      state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
      state = dispatch(state, { type: 'UPDATE_TOURNAMENT', payload: { tournamentId: id, name: 'Nope' } })
      expect(getTournament(state).name).toBe('Test')
    })
  })

  describe('BULK_ADD_PLAYERS', () => {
    it('adds multiple players at once', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'BULK_ADD_PLAYERS', payload: { tournamentId: id, playerNames: ['A', 'B', 'C'] } })
      expect(getTournament(state).players).toHaveLength(3)
    })
  })

  describe('UPDATE_PLAYER', () => {
    it('updates deck name', () => {
      let state = createTournament()
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'A' } })
      const playerId = getTournament(state).players[0].id
      state = dispatch(state, { type: 'UPDATE_PLAYER', payload: { tournamentId: id, playerId, deckName: 'Blue-Eyes' } })
      expect(getTournament(state).players[0].deckName).toBe('Blue-Eyes')
    })
  })

  describe('LOAD_STATE', () => {
    it('replaces entire state', () => {
      const state = createTournament()
      const result = dispatch(state, { type: 'LOAD_STATE', payload: initialState })
      expect(Object.keys(result.tournaments)).toHaveLength(0)
    })
  })

  describe('COMPLETE_TOURNAMENT — Elo application', () => {
    // Play a minimal 2-player, 1-round tournament to completion.
    function playToCompletion(seedDb: AppState['playerDatabase'] = {}, aliceExternalId: string | null = null): AppState {
      let state: AppState = { ...createTournament(), playerDatabase: seedDb }
      const id = getTournament(state).id
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'Alice', playerId: aliceExternalId } })
      state = dispatch(state, { type: 'ADD_PLAYER', payload: { tournamentId: id, playerName: 'Bob' } })
      state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })
      const matchId = getTournament(state).rounds[0].matches[0].id
      state = dispatch(state, { type: 'SUBMIT_MATCH_RESULT', payload: { tournamentId: id, matchId, result: 'player1_win' } })
      state = dispatch(state, { type: 'COMPLETE_ROUND', payload: { tournamentId: id } })
      return dispatch(state, { type: 'COMPLETE_TOURNAMENT', payload: { tournamentId: id } })
    }

    it('applies Elo once and creates database entries', () => {
      const state = playToCompletion()
      const entries = Object.values(state.playerDatabase)
      expect(entries).toHaveLength(2)
      for (const e of entries) {
        expect(e.tournamentsPlayed).toBe(1)
        expect(e.history).toHaveLength(1)
      }
    })

    it('does not re-apply Elo when dispatched again (M2)', () => {
      const state = playToCompletion()
      const id = getTournament(state).id
      const again = dispatch(state, { type: 'COMPLETE_TOURNAMENT', payload: { tournamentId: id } })
      expect(again).toBe(state) // guard returns the same reference — no double count
    })

    it('matches an existing database player by external player ID, not name (M3)', () => {
      // A returning player registered under a slightly different name but the same ID.
      const seed: AppState['playerDatabase'] = {
        db1: {
          id: 'db1', name: 'Alicia', game: 'yugioh', playerId: 'KONAMI-1',
          elo: 1500, matchesPlayed: 5, tournamentsPlayed: 1, history: [], penalties: [], lastUpdated: '2026-01-01',
        },
      }
      const state = playToCompletion(seed, 'KONAMI-1')
      // No new "Alice" entry — the existing db1 entry was updated instead.
      expect(Object.values(state.playerDatabase).filter(p => p.name === 'Alice')).toHaveLength(0)
      const updated = state.playerDatabase.db1
      expect(updated.tournamentsPlayed).toBe(2)
      expect(updated.matchesPlayed).toBe(6) // 5 prior + 1 game this event
      expect(updated.elo).not.toBe(1500)
    })
  })
})
