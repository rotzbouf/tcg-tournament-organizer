import { GameType, TopCutSize, TournamentFormat } from '@/types/tournament'
import { MatchResult } from '@/types/round'
import { PenaltyType } from '@/types/penalty'
import { TournamentPhase } from '@/types/phase'
import { DecklistEntry } from '@/types/player'
import { DatabasePlayer } from '@/types/database'

export type TournamentAction =
  | { type: 'CREATE_TOURNAMENT'; payload: { name: string; game: GameType; format: TournamentFormat; roundTimeMinutes: number; topCut: TopCutSize; phases?: TournamentPhase[]; grandFinalReset?: boolean } }
  | { type: 'DELETE_TOURNAMENT'; payload: { tournamentId: string } }
  | { type: 'ADD_PLAYER'; payload: { tournamentId: string; playerName: string } }
  | { type: 'REMOVE_PLAYER'; payload: { tournamentId: string; playerId: string } }
  | { type: 'DROP_PLAYER'; payload: { tournamentId: string; playerId: string } }
  | { type: 'START_TOURNAMENT'; payload: { tournamentId: string } }
  | { type: 'GENERATE_ROUND'; payload: { tournamentId: string } }
  | { type: 'SUBMIT_MATCH_RESULT'; payload: { tournamentId: string; matchId: string; result: MatchResult; player1Games?: number; player2Games?: number } }
  | { type: 'COMPLETE_ROUND'; payload: { tournamentId: string } }
  | { type: 'START_TOP_CUT'; payload: { tournamentId: string } }
  | { type: 'COMPLETE_TOURNAMENT'; payload: { tournamentId: string } }
  | { type: 'UPDATE_TOURNAMENT'; payload: { tournamentId: string; name?: string; roundTimeMinutes?: number; topCut?: TopCutSize; format?: TournamentFormat; discordWebhookUrl?: string | null } }
  | { type: 'BULK_ADD_PLAYERS'; payload: { tournamentId: string; playerNames: string[] } }
  | { type: 'UPDATE_PLAYER'; payload: { tournamentId: string; playerId: string; deckName?: string | null; decklist?: DecklistEntry[] | null } }
  | { type: 'ISSUE_PENALTY'; payload: { tournamentId: string; playerId: string; type: PenaltyType; reason: string } }
  | { type: 'REMOVE_PENALTY'; payload: { tournamentId: string; penaltyId: string } }
  | { type: 'ADVANCE_PHASE'; payload: { tournamentId: string } }
  | { type: 'UPDATE_ELO_RATINGS'; payload: { tournamentId: string } }
  | { type: 'RESET_PLAYER_DATABASE'; payload?: { game?: GameType; keepNames?: boolean } }
  | { type: 'ADD_FROM_DATABASE'; payload: { tournamentId: string; databasePlayerId: string } }
  | { type: 'LOAD_STATE'; payload: AppState }

export interface AppState {
  tournaments: Record<string, import('@/types/tournament').Tournament>
  playerDatabase: Record<string, DatabasePlayer>
}
