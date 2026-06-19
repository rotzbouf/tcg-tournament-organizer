import { GameType } from '@/types/tournament'

export interface GameConfig {
  name: string
  color: string
  accent: string
  icon: string
}

export const GAME_CONFIG: Record<GameType, GameConfig> = {
  yugioh: {
    name: 'Yu-Gi-Oh!',
    color: '#7B2D8B',
    accent: '#F5E6FF',
    icon: '🃏',
  },
  pokemon: {
    name: 'Pokémon TCG',
    color: '#FFCB05',
    accent: '#FFF8E1',
    icon: '⚡',
  },
  star_wars_unlimited: {
    name: 'Star Wars: Unlimited',
    color: '#1A1A2E',
    accent: '#E8E8F0',
    icon: '⭐',
  },
  riftbound: {
    name: 'Riftbound',
    color: '#2E7D32',
    accent: '#E8F5E9',
    icon: '🌀',
  },
}
