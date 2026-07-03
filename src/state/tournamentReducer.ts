import { AppState, TournamentAction } from './actions'
import { Tournament } from '@/types/tournament'
import { Penalty } from '@/types/penalty'
import { Match, Round } from '@/types/round'
import { Player } from '@/types/player'
import { generateId, nearestPowerOfTwo } from '@/lib/utils'
import { calculateTotalRounds, calculateTopCutSize } from '@/engine/scoring'
import { generatePairings, generatePowerPairings, generateFirstRoundPairings, generateEloSeededPairings } from '@/engine/swiss'
import { generateTopCutRound } from '@/engine/topcut'
import { generateRoundRobinRound, getRoundRobinTotalRounds } from '@/engine/roundrobin'
import { generateDoubleElimFirstRound, advanceDoubleElimBracket, calculateDoubleElimTotalRounds } from '@/engine/doubleelim'
import { calculateStandings } from '@/engine/standings'
import { calculateEloChanges } from '@/engine/elo'
import { DatabasePenalty, DatabasePlayer, EloHistoryEntry } from '@/types/database'
import { getPlayerDivision, DIVISION_ORDER, AgeDivision } from '@/lib/ageDivision'
import { GAME_CONFIG } from '@/lib/gameConfig'

export const initialState: AppState = {
  tournaments: {},
  playerDatabase: {},
  templates: [],
  seasons: [],
}

function makeRound(partial: Omit<Round, 'phaseIndex'>, phaseIndex: number): Round {
  return { ...partial, phaseIndex }
}

function groupByDivision(players: Player[], createdAt: string): Map<AgeDivision, Player[]> {
  const groups = new Map<AgeDivision, Player[]>()
  for (const div of DIVISION_ORDER) groups.set(div, [])
  for (const p of players) {
    const div = getPlayerDivision(p.dateOfBirth, createdAt)
    groups.get(div)!.push(p)
  }
  return groups
}

function renumberTables(matches: Match[]): Match[] {
  let table = 1
  return matches.map(m => ({ ...m, tableNumber: m.isBye ? 0 : table++ }))
}

function generateDivisionFirstRoundPairings(players: Player[], createdAt: string): Match[] {
  const groups = groupByDivision(players, createdAt)
  const allMatches: Match[] = []
  for (const div of DIVISION_ORDER) {
    const divPlayers = groups.get(div)!
    if (divPlayers.length >= 2) allMatches.push(...generateFirstRoundPairings(divPlayers))
    else if (divPlayers.length === 1) allMatches.push({ id: generateId(), roundNumber: 1, tableNumber: 0, player1Id: divPlayers[0].id, player2Id: null, result: 'player1_win', isBye: true })
  }
  return renumberTables(allMatches)
}

function generateDivisionPairings(players: Player[], rounds: Round[], roundNumber: number, createdAt: string): Match[] {
  const groups = groupByDivision(players, createdAt)
  const allMatches: Match[] = []
  for (const div of DIVISION_ORDER) {
    const divPlayers = groups.get(div)!
    if (divPlayers.length < 2) continue
    const divPlayerIds = new Set(divPlayers.map(p => p.id))
    const divRounds = rounds.map(r => ({ ...r, matches: r.matches.filter(m => divPlayerIds.has(m.player1Id)) }))
    allMatches.push(...generatePairings(divPlayers, divRounds, roundNumber))
  }
  return renumberTables(allMatches)
}

function generateDivisionPowerPairings(players: Player[], rounds: Round[], roundNumber: number, createdAt: string, game: string): Match[] {
  const groups = groupByDivision(players, createdAt)
  const allMatches: Match[] = []
  for (const div of DIVISION_ORDER) {
    const divPlayers = groups.get(div)!
    if (divPlayers.length < 2) continue
    const divPlayerIds = new Set(divPlayers.map(p => p.id))
    const divRounds = rounds.map(r => ({ ...r, matches: r.matches.filter(m => divPlayerIds.has(m.player1Id)) }))
    const divStandings = calculateStandings(divPlayers, divRounds, game as never)
    allMatches.push(...generatePowerPairings(divPlayers, divRounds, roundNumber, divStandings))
  }
  return renumberTables(allMatches)
}

function calculateDivisionTotalRounds(players: Player[], createdAt: string, minRounds = 0): number {
  const groups = groupByDivision(players, createdAt)
  let max = 0
  for (const divPlayers of groups.values()) {
    if (divPlayers.length >= 2) max = Math.max(max, calculateTotalRounds(divPlayers.length, minRounds))
  }
  return max
}

type PlayerDatabase = Record<string, DatabasePlayer>

// Knockout rounds cannot end in a draw — someone must advance.
const KO_PHASES = new Set<Round['phase']>(['top_cut', 'winners_bracket', 'losers_bracket', 'grand_final'])

// Assign the automatic match loss for a player leaving the tournament (drop or
// disqualification): their pending match in the current round goes to the
// opponent. Returns the rounds unchanged if there is nothing to decide.
function applyAutoLoss(rounds: Round[], playerId: string): Round[] {
  const currentRound = rounds[rounds.length - 1]
  if (!currentRound || currentRound.isComplete) return rounds
  const match = currentRound.matches.find(
    m => !m.isBye && m.result === 'pending' &&
      (m.player1Id === playerId || m.player2Id === playerId)
  )
  if (!match) return rounds
  const result = match.player1Id === playerId ? 'player2_win' as const : 'player1_win' as const
  return rounds.map(r =>
    r.roundNumber === currentRound.roundNumber
      ? { ...r, matches: r.matches.map(m => m.id === match.id ? { ...m, result } : m) }
      : r
  )
}

// Find a database entry for a tournament player, matching by external player ID
// first (so two different people who share a name don't merge), then by name.
function findDatabasePlayer(
  db: PlayerDatabase,
  player: { name: string; playerId: string | null },
  game: string,
): DatabasePlayer | undefined {
  const entries = Object.values(db).filter(p => p.game === game)
  if (player.playerId) {
    const byId = entries.find(p => p.playerId === player.playerId)
    if (byId) return byId
  }
  const nameKey = player.name.toLowerCase()
  return entries.find(p => p.name.toLowerCase() === nameKey)
}

// Apply a completed tournament's Elo changes, match/tournament counts, and a
// history entry to the player database. Shared by COMPLETE_TOURNAMENT and
// UPDATE_ELO_RATINGS.
function applyTournamentResults(db: PlayerDatabase, tournament: Tournament): PlayerDatabase {
  const playerIds = tournament.players.map(p => p.id)
  const playerNameMap: Record<string, string> = {}
  const playerIdMap: Record<string, string | null> = {}
  tournament.players.forEach(p => {
    playerNameMap[p.id] = p.name
    playerIdMap[p.id] = p.playerId ?? null
  })

  const eloUpdates = calculateEloChanges(playerIds, tournament.rounds, db, playerNameMap, tournament.game, playerIdMap)
  const standings = calculateStandings(tournament.players, tournament.rounds, tournament.game)
  const now = new Date().toISOString()

  // Penalties are normally written to the database live by ISSUE_PENALTY, but
  // that only works for players who already have a database entry. Carry over
  // anything that isn't there yet (dedup by tournament + timestamp + type).
  const penaltiesFor = (tournamentPlayerId: string): DatabasePenalty[] =>
    tournament.penalties
      .filter(pen => pen.playerId === tournamentPlayerId && pen.type !== 'note')
      .map(pen => ({
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        date: pen.issuedAt,
        type: pen.type,
        reason: pen.reason,
      }))
  const mergePenalties = (existing: DatabasePenalty[], incoming: DatabasePenalty[]): DatabasePenalty[] => [
    ...existing,
    ...incoming.filter(inc => !existing.some(e => e.tournamentId === inc.tournamentId && e.date === inc.date && e.type === inc.type)),
  ]

  const updatedDb: PlayerDatabase = { ...db }
  for (const update of eloUpdates) {
    const player = tournament.players.find(p => p.id === update.playerId)
    const standing = standings.find(s => s.playerId === update.playerId)
    if (!player || !standing) continue

    const historyEntry: EloHistoryEntry = {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      date: now,
      eloBefore: update.eloBefore,
      eloAfter: update.eloAfter,
      placement: standing.rank ?? 0,
    }
    const gamesPlayed = standing.wins + standing.losses + standing.draws
    const existing = findDatabasePlayer(updatedDb, player, tournament.game)

    if (existing) {
      updatedDb[existing.id] = {
        ...existing,
        elo: update.eloAfter,
        matchesPlayed: existing.matchesPlayed + gamesPlayed,
        tournamentsPlayed: existing.tournamentsPlayed + 1,
        history: [...existing.history, historyEntry],
        penalties: mergePenalties(existing.penalties ?? [], penaltiesFor(player.id)),
        lastUpdated: now,
      }
    } else {
      const id = generateId()
      updatedDb[id] = {
        id,
        name: player.name,
        game: tournament.game,
        playerId: player.playerId ?? null,
        elo: update.eloAfter,
        matchesPlayed: gamesPlayed,
        tournamentsPlayed: 1,
        history: [historyEntry],
        penalties: penaltiesFor(player.id),
        lastUpdated: now,
      }
    }
  }
  return updatedDb
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
        gameFormat: action.payload.gameFormat ?? null,
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
        ageDivisionsEnabled: action.payload.ageDivisionsEnabled ?? false,
        decklistVisibility: action.payload.decklistVisibility ?? 'hidden',
        powerPairings: action.payload.powerPairings ?? true,
        eloSeeding: action.payload.eloSeeding ?? false,
        discordWebhookUrl: null,
        eloApplied: false,
        archived: false,
        countForSeason: action.payload.countForSeason ?? true,
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

    case 'ARCHIVE_TOURNAMENT': {
      return updateTournament(state, action.payload.tournamentId, { archived: true })
    }

    case 'UNARCHIVE_TOURNAMENT': {
      return updateTournament(state, action.payload.tournamentId, { archived: false })
    }

    case 'ADD_PLAYER': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament || tournament.status !== 'registration') return state
      const newPlayer = {
        id: generateId(),
        name: action.payload.playerName,
        playerId: action.payload.playerId ?? null,
        dateOfBirth: action.payload.dateOfBirth ?? null,
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

      const updatedPlayers = tournament.players.map(p =>
        p.id === action.payload.playerId
          ? { ...p, droppedInRound: tournament.currentRound }
          : p
      )

      return updateTournament(state, action.payload.tournamentId, {
        players: updatedPlayers,
        rounds: applyAutoLoss(tournament.rounds, action.payload.playerId),
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
        const totalRounds = calculateDoubleElimTotalRounds(playerIds.length)
        const matches = generateDoubleElimFirstRound(playerIds, 1)
        return updateTournament(state, action.payload.tournamentId, {
          status: 'in_progress',
          totalRounds,
          currentRound: 1,
          rounds: [makeRound({ roundNumber: 1, matches, isComplete: false, phase: 'winners_bracket' }, pi)],
        })
      }

      const useDivisions = tournament.ageDivisionsEnabled
      const minRounds = GAME_CONFIG[tournament.game].minSwissRounds
      const totalRounds = useDivisions
        ? calculateDivisionTotalRounds(tournament.players, tournament.createdAt, minRounds)
        : calculateTotalRounds(tournament.players.length, minRounds)
      const buildEloMap = () => {
        const m = new Map<string, number>()
        for (const p of tournament.players) {
          const dbEntry = findDatabasePlayer(state.playerDatabase, p, tournament.game)
          if (dbEntry) m.set(p.id, dbEntry.elo)
        }
        return m
      }
      const eloMap = tournament.eloSeeding && !useDivisions ? buildEloMap() : new Map()
      const matches = useDivisions
        ? generateDivisionFirstRoundPairings(tournament.players, tournament.createdAt)
        : eloMap.size > 0
          ? generateEloSeededPairings(tournament.players, eloMap)
          : generateFirstRoundPairings(tournament.players)
      const updatedPlayers = tournament.players.map(p => {
        const hasBye = matches.some(m => m.isBye && m.player1Id === p.id)
        return hasBye ? { ...p, hasBye: true } : p
      })
      // A manually configured cut size wins; only 0 means "pick one for me".
      const autoTopCut = tournament.format === 'swiss_topcut'
        ? (tournament.topCut > 0 ? tournament.topCut : calculateTopCutSize(tournament.players.length))
        : 0
      return updateTournament(state, action.payload.tournamentId, {
        status: 'in_progress',
        totalRounds,
        currentRound: 1,
        topCut: autoTopCut,
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

      // Branch on the running round's phase too: in a multi-phase tournament
      // `tournament.format` describes the first phase only.
      const isRoundRobin = tournament.format === 'round_robin' || lastRound?.phase === 'round_robin'
      if (isRoundRobin && tournament.status === 'in_progress') {
        if (tournament.currentRound >= tournament.totalRounds) return state
        const nextRoundNumber = tournament.currentRound + 1
        // The circle schedule is order-sensitive and must stay stable for the
        // whole phase: rebuild the participant list from the players seated in
        // the phase's first round (players-array order reproduces the original
        // list) and use the phase-relative round index — `currentRound` is
        // absolute and would point at the wrong schedule slice in a later
        // phase. Dropped players stay in the schedule; their opponents get a
        // bye instead of a dead pairing.
        const phaseRounds = tournament.rounds.filter(r => r.phaseIndex === pi)
        const firstPhaseRound = phaseRounds[0]
        if (!firstPhaseRound) return state
        const seated = new Set(firstPhaseRound.matches.flatMap(m =>
          [m.player1Id, m.player2Id].filter((id): id is string => id !== null)
        ))
        const participantIds = tournament.players.filter(p => seated.has(p.id)).map(p => p.id)
        const droppedIds = new Set(tournament.players.filter(p => p.droppedInRound !== null).map(p => p.id))
        const matches = generateRoundRobinRound(participantIds, phaseRounds.length, nextRoundNumber, droppedIds)
        if (matches.length === 0) return state
        return updateTournament(state, action.payload.tournamentId, {
          currentRound: nextRoundNumber,
          rounds: [...tournament.rounds, makeRound({ roundNumber: nextRoundNumber, matches, isComplete: false, phase: 'round_robin' }, pi)],
        })
      }

      const isDoubleElim = tournament.format === 'double_elimination' ||
        (lastRound != null && ['winners_bracket', 'losers_bracket', 'grand_final'].includes(lastRound.phase))
      if (isDoubleElim && tournament.status === 'in_progress') {
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
        const isLastRound = nextRoundNumber === tournament.totalRounds
        const usePowerPairings = isLastRound && tournament.powerPairings
        let matches: Match[]
        if (tournament.ageDivisionsEnabled) {
          matches = usePowerPairings
            ? generateDivisionPowerPairings(tournament.players, tournament.rounds, nextRoundNumber, tournament.createdAt, tournament.game)
            : generateDivisionPairings(tournament.players, tournament.rounds, nextRoundNumber, tournament.createdAt)
        } else if (usePowerPairings) {
          const standings = calculateStandings(tournament.players, tournament.rounds, tournament.game)
          matches = generatePowerPairings(tournament.players, tournament.rounds, nextRoundNumber, standings)
        } else {
          matches = generatePairings(tournament.players, tournament.rounds, nextRoundNumber)
        }
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
      // The desktop UI hides the draw option in knockout rounds, but a draw can
      // still arrive via a confirmed mobile self-report — reject it here, or the
      // bracket logic would silently advance the wrong player.
      if (action.payload.result === 'draw' && KO_PHASES.has(currentRound.phase)) return state
      const hasGames = action.payload.player1Games !== undefined || action.payload.player2Games !== undefined
      const rounds = tournament.rounds.map(round => ({
        ...round,
        matches: round.matches.map(match => {
          if (match.id !== action.payload.matchId) return match
          // Correcting an already-decided result without fresh game scores must
          // not keep the old ones — they described the previous result. On a
          // first submission the existing scores stay (a game_loss penalty may
          // have pre-set them before the result came in).
          const clearStaleGames = !hasGames && match.result !== 'pending' && match.result !== action.payload.result
          return {
            ...match,
            result: action.payload.result,
            player1Games: hasGames ? action.payload.player1Games : clearStaleGames ? undefined : match.player1Games,
            player2Games: hasGames ? action.payload.player2Games : clearStaleGames ? undefined : match.player2Games,
          }
        }),
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
      if (tournament.status === 'completed') return state // already finalized — don't re-apply Elo

      const completedState = updateTournament(state, action.payload.tournamentId, {
        status: 'completed',
        eloApplied: true,
      })

      const updatedDb = applyTournamentResults(completedState.playerDatabase, tournament)
      return { ...completedState, playerDatabase: updatedDb }
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
        dateOfBirth: null,
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
      if (action.payload.decklistVisibility !== undefined) updates.decklistVisibility = action.payload.decklistVisibility
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
        // Like a drop, a DQ decides the running match — otherwise the round
        // could never be completed without manual result entry.
        updates.rounds = applyAutoLoss(tournament.rounds, action.payload.playerId)
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

      let updatedState = updateTournament(state, action.payload.tournamentId, updates)

      if (action.payload.type !== 'note') {
        const player = tournament.players.find(p => p.id === action.payload.playerId)
        if (player) {
          const dbPlayer = findDatabasePlayer(updatedState.playerDatabase, player, tournament.game)
          if (dbPlayer) {
            const dbPenalty: DatabasePenalty = {
              tournamentId: tournament.id,
              tournamentName: tournament.name,
              date: penalty.issuedAt,
              type: action.payload.type,
              reason: action.payload.reason,
            }
            updatedState = {
              ...updatedState,
              playerDatabase: {
                ...updatedState.playerDatabase,
                [dbPlayer.id]: { ...dbPlayer, penalties: [...(dbPlayer.penalties ?? []), dbPenalty], lastUpdated: penalty.issuedAt },
              },
            }
          }
        }
      }

      return updatedState
    }

    case 'REMOVE_PENALTY': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament) return state
      const penalty = tournament.penalties.find(p => p.id === action.payload.penaltyId)
      let updatedState = updateTournament(state, action.payload.tournamentId, {
        penalties: tournament.penalties.filter(p => p.id !== action.payload.penaltyId),
      })

      // Mirror the removal in the player database (note penalties never get a
      // database entry). Match by tournament + timestamp + type — the same key
      // ISSUE_PENALTY / applyTournamentResults write.
      if (penalty && penalty.type !== 'note') {
        const player = tournament.players.find(p => p.id === penalty.playerId)
        const dbPlayer = player && findDatabasePlayer(updatedState.playerDatabase, player, tournament.game)
        if (dbPlayer) {
          const idx = (dbPlayer.penalties ?? []).findIndex(
            dp => dp.tournamentId === tournament.id && dp.date === penalty.issuedAt && dp.type === penalty.type
          )
          if (idx !== -1) {
            const penalties = (dbPlayer.penalties ?? []).filter((_, i) => i !== idx)
            updatedState = {
              ...updatedState,
              playerDatabase: {
                ...updatedState.playerDatabase,
                [dbPlayer.id]: { ...dbPlayer, penalties, lastUpdated: new Date().toISOString() },
              },
            }
          }
        }
      }
      return updatedState
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
        totalRounds = tournament.currentRound + calculateTotalRounds(activePlayers.length, GAME_CONFIG[tournament.game].minSwissRounds)
      } else {
        const activeIds = updatedPlayers.filter(p => p.droppedInRound === null).map(p => p.id)
        matches = generateDoubleElimFirstRound(activeIds, nextRoundNumber)
        phase = 'winners_bracket'
        totalRounds = tournament.currentRound + calculateDoubleElimTotalRounds(activeIds.length)
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
      if (!tournament || tournament.status !== 'completed' || tournament.eloApplied) return state

      const updatedDb = applyTournamentResults(state.playerDatabase, tournament)
      return { ...state, playerDatabase: updatedDb }
    }

    case 'DELETE_DATABASE_PLAYER': {
      const { [action.payload.databasePlayerId]: _, ...rest } = state.playerDatabase
      return { ...state, playerDatabase: rest }
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
          updatedDb[id] = { ...player, elo: 1500, matchesPlayed: 0, tournamentsPlayed: 0, history: [], penalties: player.penalties ?? [] }
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
        dateOfBirth: null,
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

    case 'SWAP_PLAYERS': {
      const tournament = state.tournaments[action.payload.tournamentId]
      if (!tournament || (tournament.status !== 'in_progress' && tournament.status !== 'top_cut')) return state
      const currentRound = tournament.rounds[tournament.rounds.length - 1]
      if (!currentRound || currentRound.isComplete) return state
      const match1 = currentRound.matches.find(m => m.id === action.payload.matchId1)
      const match2 = currentRound.matches.find(m => m.id === action.payload.matchId2)
      if (!match1 || !match2 || match1.isBye || match2.isBye) return state
      if (match1.id === match2.id) return state

      const { playerId1, playerId2 } = action.payload
      if (playerId1 === playerId2) return state
      const sitsIn = (m: Match, id: string) => m.player1Id === id || m.player2Id === id
      if (!sitsIn(match1, playerId1) || !sitsIn(match2, playerId2)) return state

      const swapInMatch = (match: Match, oldId: string, newId: string): Match => {
        if (match.player1Id === oldId) return { ...match, player1Id: newId, result: 'pending', player1Games: undefined, player2Games: undefined }
        if (match.player2Id === oldId) return { ...match, player2Id: newId, result: 'pending', player1Games: undefined, player2Games: undefined }
        return match
      }

      const rounds = tournament.rounds.map(round =>
        round.roundNumber === currentRound.roundNumber
          ? {
              ...round,
              matches: round.matches.map(m => {
                if (m.id === match1.id) return swapInMatch(m, playerId1, playerId2)
                if (m.id === match2.id) return swapInMatch(m, playerId2, playerId1)
                return m
              }),
            }
          : round
      )
      return updateTournament(state, action.payload.tournamentId, { rounds })
    }

    case 'SAVE_TEMPLATE': {
      const template = { ...action.payload, id: generateId() }
      return { ...state, templates: [...(state.templates ?? []), template] }
    }

    case 'DELETE_TEMPLATE': {
      return { ...state, templates: (state.templates ?? []).filter(t => t.id !== action.payload.templateId) }
    }

    case 'CREATE_SEASON': {
      const season = {
        id: generateId(),
        name: action.payload.name,
        game: action.payload.game,
        startDate: action.payload.startDate,
        endDate: action.payload.endDate,
        pointTiers: action.payload.pointTiers,
        createdAt: new Date().toISOString(),
      }
      return { ...state, seasons: [...(state.seasons ?? []), season] }
    }

    case 'DELETE_SEASON': {
      return { ...state, seasons: (state.seasons ?? []).filter(s => s.id !== action.payload.seasonId) }
    }

    case 'UPDATE_SEASON': {
      return {
        ...state,
        seasons: (state.seasons ?? []).map(s =>
          s.id === action.payload.seasonId
            ? { ...s, ...(action.payload.name !== undefined && { name: action.payload.name }), ...(action.payload.startDate !== undefined && { startDate: action.payload.startDate }), ...(action.payload.endDate !== undefined && { endDate: action.payload.endDate }), ...(action.payload.pointTiers !== undefined && { pointTiers: action.payload.pointTiers }) }
            : s
        ),
      }
    }

    case 'LOAD_STATE': {
      return { ...action.payload, templates: action.payload.templates ?? [], seasons: action.payload.seasons ?? [] }
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
