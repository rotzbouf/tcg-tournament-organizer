import { GameType } from '@/types/tournament'

export type TiebreakerSystem = 'chess' | 'tcg'

export interface TiebreakerConfig {
  system: TiebreakerSystem
  opponentWinFloor: number
  useGameWinPct: boolean
  useHeadToHead: boolean
}

export interface GameConfig {
  name: string
  color: string
  accent: string
  icon: string
  tiebreakers: TiebreakerConfig
  hasAgeDivisions: boolean
  minSwissRounds: number
}

export const GAME_CONFIG: Record<GameType, GameConfig> = {
  yugioh: {
    name: 'Yu-Gi-Oh!',
    color: '#7B2D8B',
    accent: '#F5E6FF',
    icon: '🃏',
    tiebreakers: { system: 'tcg', opponentWinFloor: 0.25, useGameWinPct: false, useHeadToHead: true },
    hasAgeDivisions: false,
    minSwissRounds: 0,
  },
  pokemon: {
    name: 'Pokémon TCG',
    color: '#FFCB05',
    accent: '#FFF8E1',
    icon: '⚡',
    tiebreakers: { system: 'tcg', opponentWinFloor: 0.25, useGameWinPct: false, useHeadToHead: true },
    hasAgeDivisions: true,
    minSwissRounds: 0,
  },
  star_wars_unlimited: {
    name: 'Star Wars: Unlimited',
    color: '#1A1A2E',
    accent: '#E8E8F0',
    icon: '⭐',
    tiebreakers: { system: 'tcg', opponentWinFloor: 0.33, useGameWinPct: true, useHeadToHead: false },
    hasAgeDivisions: false,
    minSwissRounds: 0,
  },
  riftbound: {
    name: 'Riftbound',
    color: '#2E7D32',
    accent: '#E8F5E9',
    icon: '🌀',
    tiebreakers: { system: 'chess', opponentWinFloor: 0, useGameWinPct: false, useHeadToHead: false },
    hasAgeDivisions: false,
    minSwissRounds: 0,
  },
  lorcana: {
    name: 'Disney Lorcana',
    color: '#0D47A1',
    accent: '#E3F2FD',
    icon: '✨',
    tiebreakers: { system: 'tcg', opponentWinFloor: 0.33, useGameWinPct: true, useHeadToHead: false },
    hasAgeDivisions: false,
    minSwissRounds: 4,
  },
  altered: {
    name: 'Altered',
    color: '#6A1B9A',
    accent: '#F3E5F5',
    icon: '🔮',
    tiebreakers: { system: 'tcg', opponentWinFloor: 0.33, useGameWinPct: true, useHeadToHead: false },
    hasAgeDivisions: false,
    minSwissRounds: 0,
  },
  mtg: {
    name: 'Magic: The Gathering',
    color: '#BF360C',
    accent: '#FBE9E7',
    icon: '🔥',
    tiebreakers: { system: 'tcg', opponentWinFloor: 0.33, useGameWinPct: true, useHeadToHead: false },
    hasAgeDivisions: false,
    minSwissRounds: 4,
  },
}
