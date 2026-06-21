import { Player } from './player'
import { Round } from './round'

export type GameType = 'yugioh' | 'pokemon' | 'star_wars_unlimited' | 'riftbound'

export type TournamentStatus = 'registration' | 'in_progress' | 'top_cut' | 'completed'

export type TopCutSize = 0 | 4 | 8 | 16 | 32

export interface Tournament {
  id: string
  name: string
  game: GameType
  status: TournamentStatus
  players: Player[]
  rounds: Round[]
  roundTimeMinutes: number
  totalRounds: number
  currentRound: number
  topCut: TopCutSize
  createdAt: string
  updatedAt: string
}
