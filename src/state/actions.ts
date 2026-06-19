import { GameType } from '@/types/tournament'
import { MatchResult } from '@/types/round'

export type TournamentAction =
  | { type: 'CREATE_TOURNAMENT'; payload: { name: string; game: GameType; roundTimeMinutes: number } }
  | { type: 'DELETE_TOURNAMENT'; payload: { tournamentId: string } }
  | { type: 'ADD_PLAYER'; payload: { tournamentId: string; playerName: string } }
  | { type: 'REMOVE_PLAYER'; payload: { tournamentId: string; playerId: string } }
  | { type: 'START_TOURNAMENT'; payload: { tournamentId: string } }
  | { type: 'GENERATE_ROUND'; payload: { tournamentId: string } }
  | { type: 'SUBMIT_MATCH_RESULT'; payload: { tournamentId: string; matchId: string; result: MatchResult } }
  | { type: 'COMPLETE_ROUND'; payload: { tournamentId: string } }
  | { type: 'COMPLETE_TOURNAMENT'; payload: { tournamentId: string } }
  | { type: 'LOAD_STATE'; payload: AppState }

export interface AppState {
  tournaments: Record<string, import('@/types/tournament').Tournament>
}
