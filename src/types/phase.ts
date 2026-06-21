import { TournamentFormat, TopCutSize } from './tournament'

export interface TournamentPhase {
  id: string
  name: string
  format: TournamentFormat
  topCut: TopCutSize
  advanceCount: number
  roundTimeMinutes: number
}
