import { AppState, TournamentAction } from './actions'
import { Tournament } from '@/types/tournament'
import { generateId, nearestPowerOfTwo } from '@/lib/utils'
import { calculateTotalRounds } from '@/engine/scoring'
import { generatePairings, generateFirstRoundPairings } from '@/engine/swiss'
import { generateTopCutRound } from '@/engine/topcut'
import { calculateStandings } from '@/engine/standings'

export const initialState: AppState = {
  tournaments: {},
}

export function tournamentReducer(state: AppState, action: TournamentAction): AppState {
  switch (action.type) {
    case 'CREATE_TOURNAMENT': {
      const id = generateId()
      const now = new Date().toISOString()
      const tournament: Tournament = {
        id,
        name: action.payload.name,
        game: action.payload.game,
        status: 'registration',
        players: [],
        rounds: [],
        roundTimeMinutes: action.payload.roundTimeMinutes,
        totalRounds: 0,
        currentRound: 0,
        topCut: action.payload.topCut,
        createdAt: now,
        updatedAt: now,
      }
      return {
        ...state,
        tournaments: { ...state.tournaments, [id]: tournament },
      }
    }

    case 'DELETE_TOURNAMENT': {
      const { [action.payload.tournamentId]: _, ...rest } = state.tournaments
      return { ...state, tournaments: rest }
    }

    case 'ADD_PLAYER': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament || tournament.status !== 'registration') return state
      const newPlayer = {
        id: generateId(),
        name: action.payload.playerName,
        deckName: null,
        hasBye: false,
        droppedInRound: null,
      }
      return updateTournament(state, action.payload.tournamentId, {
        players: [...tournament.players, newPlayer],
      })
    }

    case 'REMOVE_PLAYER': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament || tournament.status !== 'registration') return state
      return updateTournament(state, action.payload.tournamentId, {
        players: tournament.players.filter(p => p.id !== action.payload.playerId),
      })
    }

    case 'DROP_PLAYER': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament || tournament.status === 'registration' || tournament.status === 'completed') return state
      return updateTournament(state, action.payload.tournamentId, {
        players: tournament.players.map(p =>
          p.id === action.payload.playerId
            ? { ...p, droppedInRound: tournament.currentRound }
            : p
        ),
      })
    }

    case 'START_TOURNAMENT': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament || tournament.status !== 'registration' || tournament.players.length < 2) {
        return state
      }
      const totalRounds = calculateTotalRounds(tournament.players.length)
      const matches = generateFirstRoundPairings(tournament.players)
      const updatedPlayers = tournament.players.map(p => {
        const hasBye = matches.some(m => m.isBye && m.player1Id === p.id)
        return hasBye ? { ...p, hasBye: true } : p
      })
      return updateTournament(state, action.payload.tournamentId, {
        status: 'in_progress',
        totalRounds,
        currentRound: 1,
        players: updatedPlayers,
        rounds: [{ roundNumber: 1, matches, isComplete: false, phase: 'swiss' }],
      })
    }

    case 'GENERATE_ROUND': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament) return state

      if (tournament.status === 'in_progress') {
        const currentRound = tournament.rounds[tournament.rounds.length - 1]
        if (currentRound && !currentRound.isComplete) return state
        if (tournament.currentRound >= tournament.totalRounds) return state

        const nextRoundNumber = tournament.currentRound + 1
        const matches = generatePairings(tournament.players, tournament.rounds, nextRoundNumber)
        const updatedPlayers = tournament.players.map(p => {
          const hasBye = p.hasBye || matches.some(m => m.isBye && m.player1Id === p.id)
          return hasBye ? { ...p, hasBye: true } : p
        })
        return updateTournament(state, action.payload.tournamentId, {
          currentRound: nextRoundNumber,
          players: updatedPlayers,
          rounds: [...tournament.rounds, { roundNumber: nextRoundNumber, matches, isComplete: false, phase: 'swiss' }],
        })
      }

      if (tournament.status === 'top_cut') {
        const currentRound = tournament.rounds[tournament.rounds.length - 1]
        if (currentRound && !currentRound.isComplete) return state

        const topCutRounds = tournament.rounds.filter(r => r.phase === 'top_cut')
        const lastTopCutRound = topCutRounds[topCutRounds.length - 1]
        if (!lastTopCutRound) return state

        const winners = lastTopCutRound.matches
          .map(m => m.result === 'player1_win' ? m.player1Id : m.player2Id!)
          .filter(Boolean)

        if (winners.length < 2) return state

        const nextRoundNumber = tournament.currentRound + 1
        const matches = generateTopCutRound(winners, nextRoundNumber)
        return updateTournament(state, action.payload.tournamentId, {
          currentRound: nextRoundNumber,
          rounds: [...tournament.rounds, { roundNumber: nextRoundNumber, matches, isComplete: false, phase: 'top_cut' }],
        })
      }

      return state
    }

    case 'START_TOP_CUT': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament || tournament.status !== 'in_progress') return state
      if (tournament.topCut === 0) return state

      const swissRounds = tournament.rounds.filter(r => r.phase === 'swiss')
      const standings = calculateStandings(tournament.players, swissRounds)
      const eligible = standings.filter(s => !s.dropped)
      const clampedSize = nearestPowerOfTwo(Math.min(tournament.topCut, eligible.length))
      if (clampedSize < 2) return state

      const topPlayerIds = eligible.slice(0, clampedSize).map(s => s.playerId)

      const nextRoundNumber = tournament.currentRound + 1
      const matches = generateTopCutRound(topPlayerIds, nextRoundNumber)
      const topCutTotalRounds = Math.log2(clampedSize)

      return updateTournament(state, action.payload.tournamentId, {
        status: 'top_cut',
        currentRound: nextRoundNumber,
        totalRounds: tournament.totalRounds + topCutTotalRounds,
        rounds: [...tournament.rounds, { roundNumber: nextRoundNumber, matches, isComplete: false, phase: 'top_cut' }],
      })
    }

    case 'SUBMIT_MATCH_RESULT': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament || (tournament.status !== 'in_progress' && tournament.status !== 'top_cut')) return state
      const currentRound = tournament.rounds[tournament.rounds.length - 1]
      if (!currentRound || currentRound.isComplete) return state
      if (!currentRound.matches.some(m => m.id === action.payload.matchId)) return state
      const rounds = tournament.rounds.map(round => ({
        ...round,
        matches: round.matches.map(match =>
          match.id === action.payload.matchId
            ? { ...match, result: action.payload.result }
            : match
        ),
      }))
      return updateTournament(state, action.payload.tournamentId, { rounds })
    }

    case 'COMPLETE_ROUND': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament) return state
      const currentRound = tournament.rounds[tournament.rounds.length - 1]
      if (!currentRound) return state
      const allResultsIn = currentRound.matches.every(m => m.result !== 'pending')
      if (!allResultsIn) return state
      const rounds = tournament.rounds.map(round =>
        round.roundNumber === currentRound.roundNumber
          ? { ...round, isComplete: true }
          : round
      )
      return updateTournament(state, action.payload.tournamentId, { rounds })
    }

    case 'COMPLETE_TOURNAMENT': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament) return state
      return updateTournament(state, action.payload.tournamentId, {
        status: 'completed',
      })
    }

    case 'UPDATE_PLAYER': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament) return state
      return updateTournament(state, action.payload.tournamentId, {
        players: tournament.players.map(p =>
          p.id === action.payload.playerId ? { ...p, deckName: action.payload.deckName } : p
        ),
      })
    }

    case 'BULK_ADD_PLAYERS': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament || tournament.status !== 'registration') return state
      const newPlayers = action.payload.playerNames.map(name => ({
        id: generateId(),
        name,
        deckName: null,
        hasBye: false,
        droppedInRound: null,
      }))
      return updateTournament(state, action.payload.tournamentId, {
        players: [...tournament.players, ...newPlayers],
      })
    }

    case 'UPDATE_TOURNAMENT': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament || tournament.status !== 'registration') return state
      const updates: Partial<Tournament> = {}
      if (action.payload.name !== undefined) updates.name = action.payload.name
      if (action.payload.roundTimeMinutes !== undefined) updates.roundTimeMinutes = action.payload.roundTimeMinutes
      if (action.payload.topCut !== undefined) updates.topCut = action.payload.topCut
      return updateTournament(state, action.payload.tournamentId, updates)
    }

    case 'LOAD_STATE': {
      return action.payload
    }

    default:
      return state
  }
}

function updateTournament(
  state: AppState,
  tournamentId: string,
  updates: Partial<Tournament>
): AppState {
  const tournament = state.tournaments[tournamentId]
  if (!tournament) return state
  return {
    ...state,
    tournaments: {
      ...state.tournaments,
      [tournamentId]: {
        ...tournament,
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    },
  }
}
