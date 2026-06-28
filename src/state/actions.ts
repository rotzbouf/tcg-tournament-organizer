import { DecklistVisibility, GameType, TopCutSize, TournamentFormat } from '@/types/tournament'
import { MatchResult } from '@/types/round'
import { PenaltyType } from '@/types/penalty'
import { TournamentPhase } from '@/types/phase'
import { DecklistEntry } from '@/types/player'
import { DatabasePlayer } from '@/types/database'
import { TournamentTemplate } from '@/types/template'
import { Season, PointTier } from '@/types/season'

export type TournamentAction =
  | { type: 'CREATE_TOURNAMENT'; payload: { name: string; game: GameType; gameFormat?: string | null; format: TournamentFormat; roundTimeMinutes: number; topCut: TopCutSize; phases?: TournamentPhase[]; grandFinalReset?: boolean; ageDivisionsEnabled?: boolean; decklistVisibility?: DecklistVisibility; powerPairings?: boolean; eloSeeding?: boolean; countForSeason?: boolean } }
  | { type: 'DELETE_TOURNAMENT'; payload: { tournamentId: string } }
  | { type: 'ADD_PLAYER'; payload: { tournamentId: string; playerName: string; playerId?: string | null; dateOfBirth?: string | null } }
  | { type: 'REMOVE_PLAYER'; payload: { tournamentId: string; playerId: string } }
  | { type: 'DROP_PLAYER'; payload: { tournamentId: string; playerId: string } }
  | { type: 'START_TOURNAMENT'; payload: { tournamentId: string } }
  | { type: 'GENERATE_ROUND'; payload: { tournamentId: string } }
  | { type: 'SUBMIT_MATCH_RESULT'; payload: { tournamentId: string; matchId: string; result: MatchResult; player1Games?: number; player2Games?: number } }
  | { type: 'COMPLETE_ROUND'; payload: { tournamentId: string } }
  | { type: 'START_TOP_CUT'; payload: { tournamentId: string } }
  | { type: 'COMPLETE_TOURNAMENT'; payload: { tournamentId: string } }
  | { type: 'ARCHIVE_TOURNAMENT'; payload: { tournamentId: string } }
  | { type: 'UNARCHIVE_TOURNAMENT'; payload: { tournamentId: string } }
  | { type: 'UPDATE_TOURNAMENT'; payload: { tournamentId: string; name?: string; roundTimeMinutes?: number; topCut?: TopCutSize; format?: TournamentFormat; discordWebhookUrl?: string | null; decklistVisibility?: DecklistVisibility } }
  | { type: 'BULK_ADD_PLAYERS'; payload: { tournamentId: string; playerNames: string[] } }
  | { type: 'UPDATE_PLAYER'; payload: { tournamentId: string; playerId: string; deckName?: string | null; decklist?: DecklistEntry[] | null } }
  | { type: 'ISSUE_PENALTY'; payload: { tournamentId: string; playerId: string; type: PenaltyType; reason: string } }
  | { type: 'REMOVE_PENALTY'; payload: { tournamentId: string; penaltyId: string } }
  | { type: 'ADVANCE_PHASE'; payload: { tournamentId: string } }
  | { type: 'UPDATE_ELO_RATINGS'; payload: { tournamentId: string } }
  | { type: 'RESET_PLAYER_DATABASE'; payload?: { game?: GameType; keepNames?: boolean } }
  | { type: 'ADD_FROM_DATABASE'; payload: { tournamentId: string; databasePlayerId: string } }
  | { type: 'UPDATE_DATABASE_PLAYER'; payload: { databasePlayerId: string; playerId?: string | null; name?: string } }
  | { type: 'DELETE_DATABASE_PLAYER'; payload: { databasePlayerId: string } }
  | { type: 'SWAP_PLAYERS'; payload: { tournamentId: string; matchId1: string; playerId1: string; matchId2: string; playerId2: string } }
  | { type: 'SAVE_TEMPLATE'; payload: Omit<TournamentTemplate, 'id'> }
  | { type: 'DELETE_TEMPLATE'; payload: { templateId: string } }
  | { type: 'CREATE_SEASON'; payload: { name: string; game: GameType; startDate: string; endDate: string; pointTiers: PointTier[] } }
  | { type: 'DELETE_SEASON'; payload: { seasonId: string } }
  | { type: 'UPDATE_SEASON'; payload: { seasonId: string; name?: string; startDate?: string; endDate?: string; pointTiers?: PointTier[] } }
  | { type: 'LOAD_STATE'; payload: AppState }

export interface AppState {
  tournaments: Record<string, import('@/types/tournament').Tournament>
  playerDatabase: Record<string, DatabasePlayer>
  templates: TournamentTemplate[]
  seasons: Season[]
}
