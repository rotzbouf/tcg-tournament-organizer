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
    payload: { name: 'Test', game: 'yugioh', roundTimeMinutes: 50, topCut: 0 },
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
})
