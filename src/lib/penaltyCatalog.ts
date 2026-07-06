import { GameType } from '../types/tournament'
import { PenaltyType } from '../types/penalty'

// Penalty *levels* that carry a mechanical game effect, ordered by severity.
// 'note' lives outside this ladder (no effect) and never escalates.
export type PenaltyLevel = Exclude<PenaltyType, 'note'>
export const LEVEL_ORDER: PenaltyLevel[] = ['warning', 'game_loss', 'match_loss', 'disqualification']

// Broad rulebook groupings, used both to organise the dropdown and as headings.
export type InfractionCategory = 'game_play_error' | 'tournament_error' | 'unsporting_conduct' | 'serious'
export const CATEGORY_ORDER: InfractionCategory[] = ['game_play_error', 'tournament_error', 'unsporting_conduct', 'serious']

export interface Infraction {
  // Stable key, also the i18n slug: penalties.infraction.<id>. Persisted on the
  // penalty so history and escalation survive relabelling.
  id: string
  category: InfractionCategory
  // Recommended starting penalty per the game's official guidelines.
  defaultPenalty: PenaltyType
  // When true, a repeat of this exact infraction by the same player in the same
  // tournament bumps the recommendation one level up the ladder per repeat.
  escalates: boolean
}

// The catalogs below follow the published penalty guidelines of each game
// (MTG IPG, Pokémon Penalty Guidelines, Konami Tournament Policy). They encode
// the *recommended* starting penalty and whether the offence escalates on
// repeat — the judge always keeps final say via the level dropdown.

const MTG: Infraction[] = [
  { id: 'mtg_missed_trigger', category: 'game_play_error', defaultPenalty: 'warning', escalates: true },
  { id: 'mtg_game_rule_violation', category: 'game_play_error', defaultPenalty: 'warning', escalates: true },
  { id: 'mtg_hidden_card_error', category: 'game_play_error', defaultPenalty: 'warning', escalates: true },
  { id: 'mtg_looking_extra_cards', category: 'game_play_error', defaultPenalty: 'warning', escalates: true },
  { id: 'mtg_mulligan_error', category: 'game_play_error', defaultPenalty: 'warning', escalates: true },
  { id: 'mtg_failure_maintain_game_state', category: 'game_play_error', defaultPenalty: 'warning', escalates: true },
  { id: 'mtg_tardiness', category: 'tournament_error', defaultPenalty: 'game_loss', escalates: true },
  { id: 'mtg_slow_play', category: 'tournament_error', defaultPenalty: 'warning', escalates: true },
  { id: 'mtg_insufficient_shuffling', category: 'tournament_error', defaultPenalty: 'warning', escalates: true },
  { id: 'mtg_deck_problem', category: 'tournament_error', defaultPenalty: 'game_loss', escalates: true },
  { id: 'mtg_marked_cards', category: 'tournament_error', defaultPenalty: 'warning', escalates: true },
  { id: 'mtg_limited_procedure', category: 'tournament_error', defaultPenalty: 'warning', escalates: true },
  { id: 'mtg_communication_violation', category: 'tournament_error', defaultPenalty: 'warning', escalates: true },
  { id: 'mtg_outside_assistance', category: 'tournament_error', defaultPenalty: 'game_loss', escalates: false },
  { id: 'mtg_usc_minor', category: 'unsporting_conduct', defaultPenalty: 'warning', escalates: true },
  { id: 'mtg_usc_major', category: 'unsporting_conduct', defaultPenalty: 'match_loss', escalates: false },
  { id: 'mtg_improperly_determining_winner', category: 'unsporting_conduct', defaultPenalty: 'match_loss', escalates: false },
  { id: 'mtg_cheating', category: 'serious', defaultPenalty: 'disqualification', escalates: false },
  { id: 'mtg_stalling', category: 'serious', defaultPenalty: 'disqualification', escalates: false },
  { id: 'mtg_bribery', category: 'serious', defaultPenalty: 'disqualification', escalates: false },
  { id: 'mtg_aggressive_behavior', category: 'serious', defaultPenalty: 'disqualification', escalates: false },
  { id: 'mtg_theft', category: 'serious', defaultPenalty: 'disqualification', escalates: false },
]

const POKEMON: Infraction[] = [
  { id: 'pkmn_tardiness', category: 'tournament_error', defaultPenalty: 'game_loss', escalates: true },
  { id: 'pkmn_procedural_error', category: 'tournament_error', defaultPenalty: 'warning', escalates: true },
  { id: 'pkmn_deck_error', category: 'tournament_error', defaultPenalty: 'game_loss', escalates: true },
  { id: 'pkmn_slow_play', category: 'tournament_error', defaultPenalty: 'warning', escalates: true },
  { id: 'pkmn_marked_cards', category: 'tournament_error', defaultPenalty: 'warning', escalates: true },
  { id: 'pkmn_unsporting_minor', category: 'unsporting_conduct', defaultPenalty: 'warning', escalates: true },
  { id: 'pkmn_unsporting_major', category: 'unsporting_conduct', defaultPenalty: 'game_loss', escalates: true },
  { id: 'pkmn_cheating', category: 'serious', defaultPenalty: 'disqualification', escalates: false },
  { id: 'pkmn_bribery', category: 'serious', defaultPenalty: 'disqualification', escalates: false },
  { id: 'pkmn_theft', category: 'serious', defaultPenalty: 'disqualification', escalates: false },
]

const YUGIOH: Infraction[] = [
  { id: 'ygo_procedural_error', category: 'game_play_error', defaultPenalty: 'warning', escalates: true },
  { id: 'ygo_drawing_extra', category: 'game_play_error', defaultPenalty: 'warning', escalates: true },
  { id: 'ygo_slow_play', category: 'tournament_error', defaultPenalty: 'warning', escalates: true },
  { id: 'ygo_tardiness', category: 'tournament_error', defaultPenalty: 'game_loss', escalates: true },
  { id: 'ygo_deck_error', category: 'tournament_error', defaultPenalty: 'game_loss', escalates: true },
  { id: 'ygo_marked_cards', category: 'tournament_error', defaultPenalty: 'warning', escalates: true },
  { id: 'ygo_unsporting_minor', category: 'unsporting_conduct', defaultPenalty: 'warning', escalates: true },
  { id: 'ygo_unsporting_major', category: 'unsporting_conduct', defaultPenalty: 'match_loss', escalates: false },
  { id: 'ygo_cheating', category: 'serious', defaultPenalty: 'disqualification', escalates: false },
  { id: 'ygo_bribery', category: 'serious', defaultPenalty: 'disqualification', escalates: false },
  { id: 'ygo_theft', category: 'serious', defaultPenalty: 'disqualification', escalates: false },
]

// Games without a widely-published penalty catalog reuse a generic progression
// (Warning → Game Loss → Match Loss → DQ) that mirrors the common structure.
const GENERIC: Infraction[] = [
  { id: 'gen_procedural_error', category: 'game_play_error', defaultPenalty: 'warning', escalates: true },
  { id: 'gen_slow_play', category: 'tournament_error', defaultPenalty: 'warning', escalates: true },
  { id: 'gen_tardiness', category: 'tournament_error', defaultPenalty: 'game_loss', escalates: true },
  { id: 'gen_deck_error', category: 'tournament_error', defaultPenalty: 'game_loss', escalates: true },
  { id: 'gen_marked_cards', category: 'tournament_error', defaultPenalty: 'warning', escalates: true },
  { id: 'gen_unsporting_minor', category: 'unsporting_conduct', defaultPenalty: 'warning', escalates: true },
  { id: 'gen_unsporting_major', category: 'unsporting_conduct', defaultPenalty: 'match_loss', escalates: false },
  { id: 'gen_cheating', category: 'serious', defaultPenalty: 'disqualification', escalates: false },
  { id: 'gen_bribery', category: 'serious', defaultPenalty: 'disqualification', escalates: false },
  { id: 'gen_theft', category: 'serious', defaultPenalty: 'disqualification', escalates: false },
]

const CATALOGS: Partial<Record<GameType, Infraction[]>> = {
  mtg: MTG,
  pokemon: POKEMON,
  yugioh: YUGIOH,
}

export function getInfractionCatalog(game: GameType): Infraction[] {
  return CATALOGS[game] ?? GENERIC
}

const BY_ID: Record<string, Infraction> = {}
for (const list of [MTG, POKEMON, YUGIOH, GENERIC]) {
  for (const inf of list) BY_ID[inf.id] = inf
}

export function getInfraction(id: string | null | undefined): Infraction | undefined {
  return id ? BY_ID[id] : undefined
}

interface PenaltyLike {
  playerId: string
  infractionId?: string
  type: PenaltyType
}

// How many times this player already got THIS infraction in the tournament.
// Notes carry no weight and are excluded so a logged reminder can't escalate.
export function priorOffenseCount(penalties: PenaltyLike[], playerId: string, infractionId: string): number {
  return penalties.filter(p => p.playerId === playerId && p.infractionId === infractionId && p.type !== 'note').length
}

export interface PenaltySuggestion {
  level: PenaltyType
  escalated: boolean
  offenseNumber: number
}

// The recommended penalty for the next occurrence: the infraction's default,
// bumped one ladder step per prior offence when the infraction escalates.
export function suggestPenaltyLevel(infraction: Infraction, priorCount: number): PenaltySuggestion {
  const offenseNumber = priorCount + 1
  const baseIdx = LEVEL_ORDER.indexOf(infraction.defaultPenalty as PenaltyLevel)
  if (!infraction.escalates || priorCount === 0 || baseIdx === -1) {
    return { level: infraction.defaultPenalty, escalated: false, offenseNumber }
  }
  const newIdx = Math.min(baseIdx + priorCount, LEVEL_ORDER.length - 1)
  return { level: LEVEL_ORDER[newIdx], escalated: newIdx > baseIdx, offenseNumber }
}
