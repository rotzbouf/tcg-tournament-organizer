import { AppState, TournamentAction } from './actions'
import { Tournament } from '@/types/tournament'
import { Penalty } from '@/types/penalty'
import { Round } from '@/types/round'
import { generateId, nearestPowerOfTwo } from '@/lib/utils'
import { calculateTotalRounds } from '@/engine/scoring'
import { generatePairings, generateFirstRoundPairings } from '@/engine/swiss'
import { generateTopCutRound } from '@/engine/topcut'
import { generateRoundRobinRound, getRoundRobinTotalRounds } from '@/engine/roundrobin'
import { generateDoubleElimFirstRound, advanceDoubleElimBracket, calculateDoubleElimTotalRounds } from '@/engine/doubleelim'
import { calculateStandings } from '@/engine/standings'
import { calculateEloChanges } from '@/engine/elo'
import { EloHistoryEntry } from '@/types/database'

export const initialState: AppState = {
  tournaments: {},
  playerDatabase: {},
}

function makeRound(partial: Omit<Round, 'phaseIndex'>, phaseIndex: number): Round {
  return { ...partial, phaseIndex }
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
        format: action.payload.format,
        status: 'registration',
        players: [],
        rounds: [],
        penalties: [],
        phases: action.payload.phases ?? [],
        currentPhaseIndex: 0,
        roundTimeMinutes: action.payload.roundTimeMinutes,
        totalRounds: 0,
        currentRound: 0,
        topCut: action.payload.topCut,
        grandFinalReset: action.payload.grandFinalReset ?? false,
        discordWebhookUrl: null,
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
        playerId: null,
        deckName: null,
        decklist: null,
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
      const pi = tournament.currentPhaseIndex

      if (tournament.format === 'round_robin') {
        const playerIds = tournament.players.map(p => p.id)
        const totalRounds = getRoundRobinTotalRounds(playerIds.length)
        const matches = generateRoundRobinRound(playerIds, 0, 1)
        return updateTournament(state, action.payload.tournamentId, {
          status: 'in_progress',
          totalRounds,
          currentRound: 1,
          rounds: [makeRound({ roundNumber: 1, matches, isComplete: false, phase: 'round_robin' }, pi)],
        })
      }

      if (tournament.format === 'double_elimination') {
        const playerIds = tournament.players.map(p => p.id)
        const clamped = nearestPowerOfTwo(playerIds.length)
        const seeded = playerIds.slice(0, clamped)
        const totalRounds = calculateDoubleElimTotalRounds(seeded.length)
        const matches = generateDoubleElimFirstRound(seeded, 1)
        return updateTournament(state, action.payload.tournamentId, {
          status: 'in_progress',
          totalRounds,
          currentRound: 1,
          rounds: [makeRound({ roundNumber: 1, matches, isComplete: false, phase: 'winners_bracket' }, pi)],
        })
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
        rounds: [makeRound({ roundNumber: 1, matches, isComplete: false, phase: 'swiss' }, pi)],
      })
    }

    case 'GENERATE_ROUND': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament) return state
      const lastRound = tournament.rounds[tournament.rounds.length - 1]
      if (lastRound && !lastRound.isComplete) return state
      const pi = tournament.currentPhaseIndex

      if (tournament.format === 'round_robin' && tournament.status === 'in_progress') {
        if (tournament.currentRound >= tournament.totalRounds) return state
        const nextRoundNumber = tournament.currentRound + 1
        const playerIds = tournament.players.map(p => p.id)
        const matches = generateRoundRobinRound(playerIds, tournament.currentRound, nextRoundNumber)
        return updateTournament(state, action.payload.tournamentId, {
          currentRound: nextRoundNumber,
          rounds: [...tournament.rounds, makeRound({ roundNumber: nextRoundNumber, matches, isComplete: false, phase: 'round_robin' }, pi)],
        })
      }

      if (tournament.format === 'double_elimination' && tournament.status === 'in_progress') {
        const advance = advanceDoubleElimBracket(tournament)
        if (!advance || advance.matches.length === 0) return state
        const nextRoundNumber = tournament.currentRound + 1
        return updateTournament(state, action.payload.tournamentId, {
          currentRound: nextRoundNumber,
          rounds: [...tournament.rounds, makeRound({ roundNumber: nextRoundNumber, matches: advance.matches, isComplete: false, phase: advance.phase }, pi)],
        })
      }

      if (tournament.status === 'in_progress') {
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
          rounds: [...tournament.rounds, makeRound({ roundNumber: nextRoundNumber, matches, isComplete: false, phase: 'swiss' }, pi)],
        })
      }

      if (tournament.status === 'top_cut') {
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
          rounds: [...tournament.rounds, makeRound({ roundNumber: nextRoundNumber, matches, isComplete: false, phase: 'top_cut' }, pi)],
        })
      }

      return state
    }

    case 'START_TOP_CUT': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament || tournament.status !== 'in_progress') return state
      if (tournament.topCut === 0) return state

      const swissRounds = tournament.rounds.filter(r => r.phase === 'swiss')
      const standings = calculateStandings(tournament.players, swissRounds, tournament.game)
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
        rounds: [...tournament.rounds, makeRound({ roundNumber: nextRoundNumber, matches, isComplete: false, phase: 'top_cut' }, tournament.currentPhaseIndex)],
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
            ? {
                ...match,
                result: action.payload.result,
                ...(action.payload.player1Games !== undefined && { player1Games: action.payload.player1Games }),
                ...(action.payload.player2Games !== undefined && { player2Games: action.payload.player2Games }),
              }
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
        players: tournament.players.map(p => {
          if (p.id !== action.payload.playerId) return p
          const updates: Partial<typeof p> = {}
          if (action.payload.deckName !== undefined) updates.deckName = action.payload.deckName
          if (action.payload.decklist !== undefined) updates.decklist = action.payload.decklist
          return { ...p, ...updates }
        }),
      })
    }

    case 'BULK_ADD_PLAYERS': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament || tournament.status !== 'registration') return state
      const newPlayers = action.payload.playerNames.map(name => ({
        id: generateId(),
        name,
        playerId: null,
        deckName: null,
        decklist: null,
        hasBye: false,
        droppedInRound: null,
      }))
      return updateTournament(state, action.payload.tournamentId, {
        players: [...tournament.players, ...newPlayers],
      })
    }

    case 'UPDATE_TOURNAMENT': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament) return state
      const updates: Partial<Tournament> = {}
      if (action.payload.discordWebhookUrl !== undefined) updates.discordWebhookUrl = action.payload.discordWebhookUrl
      if (tournament.status === 'registration') {
        if (action.payload.name !== undefined) updates.name = action.payload.name
        if (action.payload.roundTimeMinutes !== undefined) updates.roundTimeMinutes = action.payload.roundTimeMinutes
        if (action.payload.topCut !== undefined) updates.topCut = action.payload.topCut
        if (action.payload.format !== undefined) updates.format = action.payload.format
      }
      if (Object.keys(updates).length === 0) return state
      return updateTournament(state, action.payload.tournamentId, updates)
    }

    case 'ISSUE_PENALTY': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament || (tournament.status !== 'in_progress' && tournament.status !== 'top_cut')) return state

      const penalty: Penalty = {
        id: generateId(),
        playerId: action.payload.playerId,
        roundNumber: tournament.currentRound,
        type: action.payload.type,
        reason: action.payload.reason,
        issuedAt: new Date().toISOString(),
      }

      const updates: Partial<Tournament> = {
        penalties: [...tournament.penalties, penalty],
      }

      if (action.payload.type === 'disqualification') {
        updates.players = tournament.players.map(p =>
          p.id === action.payload.playerId
            ? { ...p, droppedInRound: tournament.currentRound }
            : p
        )
      }

      if (action.payload.type === 'game_loss') {
        const currentRound = tournament.rounds[tournament.rounds.length - 1]
        if (currentRound && !currentRound.isComplete) {
          const match = currentRound.matches.find(
            m => !m.isBye && (m.player1Id === action.payload.playerId || m.player2Id === action.payload.playerId)
          )
          if (match) {
            const isPlayer1 = match.player1Id === action.payload.playerId
            const updatedMatch = {
              ...match,
              player1Games: isPlayer1 ? (match.player1Games ?? 0) : (match.player1Games ?? 0) + 1,
              player2Games: !isPlayer1 ? (match.player2Games ?? 0) : (match.player2Games ?? 0) + 1,
            }
            updates.rounds = tournament.rounds.map(round =>
              round.roundNumber === currentRound.roundNumber
                ? { ...round, matches: round.matches.map(m => m.id === match.id ? updatedMatch : m) }
                : round
            )
          }
        }
      }

      if (action.payload.type === 'match_loss') {
        const currentRound = tournament.rounds[tournament.rounds.length - 1]
        if (currentRound && !currentRound.isComplete) {
          const match = currentRound.matches.find(
            m => !m.isBye && (m.player1Id === action.payload.playerId || m.player2Id === action.payload.playerId)
          )
          if (match) {
            const result = match.player1Id === action.payload.playerId ? 'player2_win' as const : 'player1_win' as const
            updates.rounds = tournament.rounds.map(round =>
              round.roundNumber === currentRound.roundNumber
                ? { ...round, matches: round.matches.map(m => m.id === match.id ? { ...m, result } : m) }
                : round
            )
          }
        }
      }

      return updateTournament(state, action.payload.tournamentId, updates)
    }

    case 'REMOVE_PENALTY': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament) return state
      return updateTournament(state, action.payload.tournamentId, {
        penalties: tournament.penalties.filter(p => p.id !== action.payload.penaltyId),
      })
    }

    case 'ADVANCE_PHASE': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament || tournament.status !== 'in_progress') return state
      if (tournament.phases.length === 0) return state
      const nextIndex = tournament.currentPhaseIndex + 1
      if (nextIndex >= tournament.phases.length) return state

      const currentPhaseRounds = tournament.rounds.filter(r => r.phaseIndex === tournament.currentPhaseIndex)
      const standings = calculateStandings(tournament.players, currentPhaseRounds, tournament.game)
      const nextPhase = tournament.phases[nextIndex]
      const advanceCount = nextPhase.advanceCount > 0 ? nextPhase.advanceCount : standings.length
      const advancingIds = new Set(
        standings.filter(s => !s.dropped).slice(0, advanceCount).map(s => s.playerId)
      )

      const updatedPlayers = tournament.players.map(p => {
        if (p.droppedInRound !== null) return p
        if (!advancingIds.has(p.id)) return { ...p, droppedInRound: tournament.currentRound }
        return { ...p, hasBye: false }
      })

      const nextRoundNumber = tournament.currentRound + 1
      let matches
      let phase: Round['phase']
      let totalRounds: number

      if (nextPhase.format === 'round_robin') {
        const activeIds = updatedPlayers.filter(p => p.droppedInRound === null).map(p => p.id)
        matches = generateRoundRobinRound(activeIds, 0, nextRoundNumber)
        phase = 'round_robin'
        totalRounds = tournament.currentRound + getRoundRobinTotalRounds(activeIds.length)
      } else if (nextPhase.format === 'swiss' || nextPhase.format === 'swiss_topcut') {
        const activePlayers = updatedPlayers.filter(p => p.droppedInRound === null)
        matches = generateFirstRoundPairings(activePlayers)
        phase = 'swiss'
        totalRounds = tournament.currentRound + calculateTotalRounds(activePlayers.length)
      } else {
        const activeIds = updatedPlayers.filter(p => p.droppedInRound === null).map(p => p.id)
        const clamped = nearestPowerOfTwo(activeIds.length)
        matches = generateDoubleElimFirstRound(activeIds.slice(0, clamped), nextRoundNumber)
        phase = 'winners_bracket'
        totalRounds = tournament.currentRound + calculateDoubleElimTotalRounds(clamped)
      }

      return updateTournament(state, action.payload.tournamentId, {
        currentPhaseIndex: nextIndex,
        currentRound: nextRoundNumber,
        totalRounds,
        players: updatedPlayers,
        roundTimeMinutes: nextPhase.roundTimeMinutes,
        rounds: [...tournament.rounds, makeRound({ roundNumber: nextRoundNumber, matches, isComplete: false, phase }, nextIndex)],
      })
    }

    case 'UPDATE_ELO_RATINGS': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament || tournament.status !== 'completed') return state

      const playerIds = tournament.players.map(p => p.id)
      const playerNameMap: Record<string, string> = {}
      tournament.players.forEach(p => { playerNameMap[p.id] = p.name })

      const eloUpdates = calculateEloChanges(playerIds, tournament.rounds, state.playerDatabase, playerNameMap, tournament.game)
      const standings = calculateStandings(tournament.players, tournament.rounds, tournament.game)
      const now = new Date().toISOString()

      const updatedDb = { ...state.playerDatabase }
      for (const update of eloUpdates) {
        const player = tournament.players.find(p => p.id === update.playerId)
        if (!player) continue
        const nameKey = player.name.toLowerCase()
        const existing = Object.values(updatedDb).find(p => p.name.toLowerCase() === nameKey && p.game === tournament.game)
        const standing = standings.find(s => s.playerId === update.playerId)

        const historyEntry: EloHistoryEntry = {
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          date: now,
          eloBefore: update.eloBefore,
          eloAfter: update.eloAfter,
          placement: standing?.rank ?? 0,
        }

        if (existing) {
          const s = standings.find(s => s.playerId === update.playerId)!
          updatedDb[existing.id] = {
            ...existing,
            elo: update.eloAfter,
            matchesPlayed: existing.matchesPlayed + s.wins + s.losses + s.draws,
            tournamentsPlayed: existing.tournamentsPlayed + 1,
            history: [...existing.history, historyEntry],
            lastUpdated: now,
          }
        } else {
          const id = generateId()
          const s = standings.find(s => s.playerId === update.playerId)!
          updatedDb[id] = {
            id,
            name: player.name,
            game: tournament.game,
            playerId: player.playerId ?? null,
            elo: update.eloAfter,
            matchesPlayed: s.wins + s.losses + s.draws,
            tournamentsPlayed: 1,
            history: [historyEntry],
            lastUpdated: now,
          }
        }
      }

      return { ...state, playerDatabase: updatedDb }
    }

    case 'RESET_PLAYER_DATABASE': {
      const gameFilter = action.payload?.game
      const keepNames = action.payload?.keepNames ?? false

      if (!gameFilter && !keepNames) {
        return { ...state, playerDatabase: {} }
      }

      const updatedDb: Record<string, typeof state.playerDatabase[string]> = {}
      for (const [id, player] of Object.entries(state.playerDatabase)) {
        if (gameFilter && player.game !== gameFilter) {
          updatedDb[id] = player
          continue
        }
        if (keepNames) {
          updatedDb[id] = { ...player, elo: 1500, matchesPlayed: 0, tournamentsPlayed: 0, history: [] }
        }
      }
      return { ...state, playerDatabase: updatedDb }
    }

    case 'ADD_FROM_DATABASE': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament || tournament.status !== 'registration') return state
      const dbPlayer = state.playerDatabase[action.payload.databasePlayerId]
      if (!dbPlayer) return state
      const alreadyAdded = tournament.players.some(p => p.name.toLowerCase() === dbPlayer.name.toLowerCase())
      if (alreadyAdded) return state
      const newPlayer = {
        id: generateId(),
        name: dbPlayer.name,
        playerId: dbPlayer.playerId ?? null,
        deckName: null,
        decklist: null,
        hasBye: false,
        droppedInRound: null,
      }
      return updateTournament(state, action.payload.tournamentId, {
        players: [...tournament.players, newPlayer],
      })
    }

    case 'UPDATE_DATABASE_PLAYER': {
      const dbPlayer = state.playerDatabase[action.payload.databasePlayerId]
      if (!dbPlayer) return state
      const updates: Partial<typeof dbPlayer> = {}
      if (action.payload.playerId !== undefined) updates.playerId = action.payload.playerId
      if (action.payload.name !== undefined) updates.name = action.payload.name
      if (Object.keys(updates).length === 0) return state
      return {
        ...state,
        playerDatabase: {
          ...state.playerDatabase,
          [dbPlayer.id]: { ...dbPlayer, ...updates, lastUpdated: new Date().toISOString() },
        },
      }
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
