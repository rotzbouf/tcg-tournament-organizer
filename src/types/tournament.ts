import { Player } from './player'
import { Round } from './round'
import { Penalty } from './penalty'
import { TournamentPhase } from './phase'

export type GameType = 'yugioh' | 'pokemon' | 'star_wars_unlimited' | 'riftbound' | 'lorcana' | 'altered' | 'mtg' | 'flesh_and_blood' | 'one_piece' | 'dragonball_fusion_world'

export type TournamentStatus = 'registration' | 'in_progress' | 'top_cut' | 'completed'

export type TopCutSize = 0 | 4 | 8 | 16 | 32

export type TournamentFormat = 'swiss' | 'swiss_topcut' | 'double_elimination' | 'round_robin' | 'multiplayer_pods'

export type DecklistVisibility = 'hidden' | 'to_only' | 'public'

export type DeckCheckResult = 'ok' | 'issue'

// One deck check on a table. Started by the TO (random or targeted table) or
// by a judge from the mobile page, completed with a result; the completed
// check auto-grants the official time extension (check duration + 3 minutes)
// to the match.
export interface DeckCheck {
  id: string
  roundNumber: number
  matchId: string
  tableNumber: number
  playerIds: string[]
  startedAt: string
  completedAt: string | null
  result: DeckCheckResult | null
  // Judge display name when started from a judge device; absent for TO checks.
  startedBy?: string
}

export interface Tournament {
  id: string
  name: string
  game: GameType
  gameFormat: string | null
  format: TournamentFormat
  status: TournamentStatus
  players: Player[]
  rounds: Round[]
  penalties: Penalty[]
  deckChecks?: DeckCheck[]
  phases: TournamentPhase[]
  currentPhaseIndex: number
  roundTimeMinutes: number
  totalRounds: number
  currentRound: number
  topCut: TopCutSize
  // Points per pod win in 'multiplayer_pods' tournaments (draw is always 1):
  // 5 = TopDeck standard, 7 = 2n−1 per the community Multiplayer Addendum.
  // Absent everywhere else; treated as 5 when missing.
  podWinPoints?: number
  grandFinalReset: boolean
  ageDivisionsEnabled: boolean
  decklistVisibility: DecklistVisibility
  powerPairings: boolean
  eloSeeding: boolean
  discordWebhookUrl: string | null
  eloApplied: boolean
  archived: boolean
  countForSeason: boolean
  createdAt: string
  updatedAt: string
}
