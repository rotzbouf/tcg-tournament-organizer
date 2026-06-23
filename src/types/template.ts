import { GameType, TournamentFormat, DecklistVisibility } from './tournament'

export interface TournamentTemplate {
  id: string
  name: string
  game: GameType
  format: TournamentFormat
  roundTimeMinutes: number
  decklistVisibility: DecklistVisibility
  grandFinalReset: boolean
  ageDivisionsEnabled: boolean
  powerPairings: boolean
}
