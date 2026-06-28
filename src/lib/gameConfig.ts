import { GameType } from '@/types/tournament'

export type TiebreakerSystem = 'chess' | 'tcg'

export interface TiebreakerConfig {
  system: TiebreakerSystem
  opponentWinFloor: number
  useGameWinPct: boolean
  useHeadToHead: boolean
}

export interface DeckRules {
  mainMin: number
  mainMax: number
  sideMin: number
  sideMax: number
  maxCopies: number
}

export type BanlistApiSource = 'ygoprodeck' | 'pokemontcg' | 'scryfall' | null

// banlist    – explicit forbidden/limited/semi-limited list
// legal_list – whitelist of all legal card names (rotating or rarity-restricted formats)
// rotation   – Pokémon-style: legal set codes + explicit bans
export type FormatValidationType = 'banlist' | 'legal_list' | 'rotation'

export interface GameFormatConfig {
  id: string
  name: string
  hasBanlist: boolean
  apiSource: BanlistApiSource
  validationType: FormatValidationType
  deckRulesOverride?: Partial<DeckRules>
}

export interface GameConfig {
  name: string
  color: string
  accent: string
  icon: string
  tiebreakers: TiebreakerConfig
  hasAgeDivisions: boolean
  minSwissRounds: number
  deckRules: DeckRules | null
  formats: GameFormatConfig[]
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
    deckRules: { mainMin: 40, mainMax: 60, sideMin: 0, sideMax: 15, maxCopies: 3 },
    formats: [
      { id: 'advanced', name: 'Advanced Format', hasBanlist: true, apiSource: 'ygoprodeck', validationType: 'banlist' },
      { id: 'traditional', name: 'Traditional Format', hasBanlist: true, apiSource: 'ygoprodeck', validationType: 'banlist' },
    ],
  },
  pokemon: {
    name: 'Pokémon TCG',
    color: '#FFCB05',
    accent: '#FFF8E1',
    icon: '⚡',
    tiebreakers: { system: 'tcg', opponentWinFloor: 0.25, useGameWinPct: false, useHeadToHead: true },
    hasAgeDivisions: true,
    minSwissRounds: 0,
    deckRules: { mainMin: 60, mainMax: 60, sideMin: 0, sideMax: 0, maxCopies: 4 },
    formats: [
      { id: 'standard', name: 'Standard', hasBanlist: true, apiSource: 'pokemontcg', validationType: 'rotation' },
      { id: 'expanded', name: 'Expanded', hasBanlist: true, apiSource: 'pokemontcg', validationType: 'banlist' },
    ],
  },
  star_wars_unlimited: {
    name: 'Star Wars: Unlimited',
    color: '#1A1A2E',
    accent: '#E8E8F0',
    icon: '⭐',
    tiebreakers: { system: 'tcg', opponentWinFloor: 0.33, useGameWinPct: true, useHeadToHead: false },
    hasAgeDivisions: false,
    minSwissRounds: 0,
    deckRules: { mainMin: 50, mainMax: 50, sideMin: 0, sideMax: 10, maxCopies: 3 },
    formats: [
      { id: 'standard', name: 'Standard', hasBanlist: false, apiSource: null, validationType: 'banlist' },
    ],
  },
  riftbound: {
    name: 'Riftbound',
    color: '#2E7D32',
    accent: '#E8F5E9',
    icon: '🌀',
    tiebreakers: { system: 'chess', opponentWinFloor: 0, useGameWinPct: false, useHeadToHead: false },
    hasAgeDivisions: false,
    minSwissRounds: 0,
    deckRules: null,
    formats: [
      { id: 'standard', name: 'Standard', hasBanlist: false, apiSource: null, validationType: 'banlist' },
    ],
  },
  lorcana: {
    name: 'Disney Lorcana',
    color: '#0D47A1',
    accent: '#E3F2FD',
    icon: '✨',
    tiebreakers: { system: 'tcg', opponentWinFloor: 0.33, useGameWinPct: true, useHeadToHead: false },
    hasAgeDivisions: false,
    minSwissRounds: 4,
    deckRules: { mainMin: 60, mainMax: 60, sideMin: 0, sideMax: 0, maxCopies: 4 },
    formats: [
      { id: 'core', name: 'Core', hasBanlist: false, apiSource: null, validationType: 'banlist' },
    ],
  },
  altered: {
    name: 'Altered',
    color: '#6A1B9A',
    accent: '#F3E5F5',
    icon: '🔮',
    tiebreakers: { system: 'tcg', opponentWinFloor: 0.33, useGameWinPct: true, useHeadToHead: false },
    hasAgeDivisions: false,
    minSwissRounds: 0,
    deckRules: { mainMin: 40, mainMax: 40, sideMin: 0, sideMax: 0, maxCopies: 3 },
    formats: [
      { id: 'standard', name: 'Standard', hasBanlist: false, apiSource: null, validationType: 'banlist' },
    ],
  },
  mtg: {
    name: 'Magic: The Gathering',
    color: '#BF360C',
    accent: '#FBE9E7',
    icon: '🔥',
    tiebreakers: { system: 'tcg', opponentWinFloor: 0.33, useGameWinPct: true, useHeadToHead: false },
    hasAgeDivisions: false,
    minSwissRounds: 4,
    deckRules: { mainMin: 60, mainMax: -1, sideMin: 0, sideMax: 15, maxCopies: 4 },
    formats: [
      { id: 'standard', name: 'Standard', hasBanlist: true, apiSource: 'scryfall', validationType: 'legal_list' },
      { id: 'pioneer', name: 'Pioneer', hasBanlist: true, apiSource: 'scryfall', validationType: 'banlist' },
      { id: 'modern', name: 'Modern', hasBanlist: true, apiSource: 'scryfall', validationType: 'banlist' },
      { id: 'legacy', name: 'Legacy', hasBanlist: true, apiSource: 'scryfall', validationType: 'banlist' },
      { id: 'vintage', name: 'Vintage', hasBanlist: true, apiSource: 'scryfall', validationType: 'banlist' },
      { id: 'commander', name: 'Commander (EDH)', hasBanlist: true, apiSource: 'scryfall', validationType: 'banlist', deckRulesOverride: { mainMin: 100, mainMax: 100, sideMin: 0, sideMax: 0, maxCopies: 1 } },
      { id: 'pauper', name: 'Pauper', hasBanlist: true, apiSource: 'scryfall', validationType: 'legal_list' },
    ],
  },
}
