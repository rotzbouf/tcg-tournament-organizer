import { GameType, TopCutSize } from '@/types/tournament'
import { calculateTotalRounds } from '@/engine/scoring'

// Official single-elimination top cut per attendance, verified 2026-07-07
// against the current documents:
// - MTG: Magic Tournament Rules, Appendix E — 8 or fewer players play
//   single elimination (no swiss/cut); 9+ cut to Top 8.
// - Pokémon: Play! Pokémon Tournament Rules Handbook (May 21, 2026),
//   structure "TCG Single Day" — 4–8 none, 9–20 Top 4, 21+ Top 8
//   (per age division when divisions are separated).
// - Yu-Gi-Oh!: KDE-US Tournament Policy v2.5, "Number of Rounds – Tier 1
//   and Tier 2" — 4–8 none, 9–16 Top 4, 17–32 Top 4, 33+ Top 8.
//   The playoff column is explicitly optional for TOs.
// - Lorcana Set Championships use 9–16 Top 4, 17+ Top 8; SWU/Riftbound/
//   Altered publish no fixed local table — all four share that customary
//   structure here.
export function recommendedTopCut(game: GameType, playerCount: number): TopCutSize {
  if (playerCount < 9) return 0
  switch (game) {
    case 'mtg':
      return 8
    case 'pokemon':
      return playerCount <= 20 ? 4 : 8
    case 'yugioh':
      return playerCount <= 32 ? 4 : 8
    default:
      return playerCount <= 16 ? 4 : 8
  }
}

// i18n key suffix for the per-game rule description shown in the dialogs.
export function cutRuleKey(game: GameType): 'mtg' | 'pokemon' | 'yugioh' | 'generic' {
  return game === 'mtg' || game === 'pokemon' || game === 'yugioh' ? game : 'generic'
}

// Swiss round count, honoring that the official with-cut structures deviate
// from plain ceil(log2) in a few brackets (same sources as above):
// - MTG (MTR Appendix E, constructed with Top 8): 9–16 → 5 rounds,
//   227–256 → 9, capped at 10 from 410 players.
// - Pokémon (TRH "TCG Single Day"): 13–16 → 5 rounds, 227–256 → 9,
//   capped at 10 from 410 players.
// - Yu-Gi-Oh! and everything else: identical to ceil(log2) with or without
//   a cut (Konami's table matches it exactly).
// Without a top cut every game uses the plain swiss-only table.
export function recommendedSwissRounds(game: GameType, playerCount: number, withTopCut: boolean, minRounds = 0): number {
  const base = calculateTotalRounds(playerCount, minRounds)
  if (!withTopCut || (game !== 'mtg' && game !== 'pokemon')) return base
  if (playerCount >= 410) return Math.max(10, minRounds)
  if (playerCount >= 227) return Math.max(9, minRounds)
  const fiveFrom = game === 'mtg' ? 9 : 13
  if (playerCount >= fiveFrom && playerCount <= 16) return Math.max(5, minRounds)
  return base
}
