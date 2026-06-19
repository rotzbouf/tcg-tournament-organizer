import { AppState } from './actions'
import { Tournament } from '@/types/tournament'
import { Round } from '@/types/round'
import { Standing } from '@/types/standing'
import { calculateStandings } from '@/engine/standings'

export function selectTournament(state: AppState, id: string): Tournament | undefined {
  return state.tournaments[id]
}

export function selectAllTournaments(state: AppState): Tournament[] {
  return Object.values(state.tournaments)
}

export function selectActiveTournaments(state: AppState): Tournament[] {
  return Object.values(state.tournaments).filter(t => t.status !== 'completed')
}

export function selectCurrentRound(tournament: Tournament): Round | undefined {
  return tournament.rounds[tournament.rounds.length - 1]
}

export function selectStandings(tournament: Tournament): Standing[] {
  return calculateStandings(tournament.players, tournament.rounds)
}
