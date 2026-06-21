import { Player } from './player'
import { Round } from './round'
import { Penalty } from './penalty'
import { TournamentPhase } from './phase'

export type GameType = 'yugioh' | 'pokemon' | 'star_wars_unlimited' | 'riftbound'

export type TournamentStatus = 'registration' | 'in_progress' | 'top_cut' | 'completed'

export type TopCutSize = 0 | 4 | 8 | 16 | 32

export type TournamentFormat = 'swiss' | 'swiss_topcut' | 'double_elimination' | 'round_robin'

export interface Tournament {
  id: string
  name: string
  game: GameType
  format: TournamentFormat
  status: TournamentStatus
  players: Player[]
  rounds: Round[]
  penalties: Penalty[]
  phases: TournamentPhase[]
  currentPhaseIndex: number
  roundTimeMinutes: number
  totalRounds: number
  currentRound: number
  topCut: TopCutSize
  discordWebhookUrl: string | null
  createdAt: string
  updatedAt: string
}
