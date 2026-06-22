import { AppState } from './actions'
import { Tournament } from '@/types/tournament'
import { Round } from '@/types/round'
import { Standing } from '@/types/standing'
import { calculateStandings } from '@/engine/standings'
import { AgeDivision, getPlayerDivision } from '@/lib/ageDivision'

export function selectTournament(state: AppState, id: string): Tournament | undefined {
  return state.tournaments[id]
}

export function selectAllTournaments(state: AppState): Tournament[] {
  return Object.values(state.tournaments)
}

export function selectCurrentRound(tournament: Tournament): Round | undefined {
  return tournament.rounds[tournament.rounds.length - 1]
}

export function selectStandings(tournament: Tournament): Standing[] {
  return calculateStandings(tournament.players, tournament.rounds, tournament.game)
}

export function selectDivisionStandings(tournament: Tournament, division: AgeDivision): Standing[] {
  const divPlayerIds = new Set(
    tournament.players
      .filter(p => getPlayerDivision(p.dateOfBirth, tournament.createdAt) === division)
      .map(p => p.id)
  )
  return calculateStandings(tournament.players, tournament.rounds, tournament.game, divPlayerIds)
}
