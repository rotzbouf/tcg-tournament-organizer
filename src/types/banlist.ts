import { GameType } from './tournament'

export interface BanlistData {
  game: GameType
  format: string
  lastUpdated: string
  forbidden: string[]
  limited: string[]
  semiLimited: string[]
  legalCards?: string[]
  legalSetCodes?: string[]
}

export type BanlistStore = Partial<Record<string, BanlistData>>
