import { Player } from './player'
import { Round } from './round'

export type GameType = 'yugioh' | 'pokemon' | 'star_wars_unlimited' | 'riftbound'

export type TournamentStatus = 'registration' | 'in_progress' | 'completed'

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
  createdAt: string
  updatedAt: string
}
