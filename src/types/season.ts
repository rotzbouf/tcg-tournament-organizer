import { GameType } from './tournament'

export interface PointTier {
  minRank: number
  maxRank: number
  points: number
}

export interface Season {
  id: string
  name: string
  game: GameType
  tournamentIds: string[]
  pointTiers: PointTier[]
  createdAt: string
}

export const DEFAULT_POINT_TIERS: PointTier[] = [
  { minRank: 1,  maxRank: 1,  points: 10 },
  { minRank: 2,  maxRank: 2,  points: 7  },
  { minRank: 3,  maxRank: 4,  points: 5  },
  { minRank: 5,  maxRank: 8,  points: 3  },
  { minRank: 9,  maxRank: 16, points: 1  },
]
