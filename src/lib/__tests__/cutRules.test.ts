import { describe, it, expect } from 'vitest'
import { recommendedTopCut, recommendedSwissRounds, cutRuleKey } from '../cutRules'

describe('recommendedTopCut', () => {
  it('never cuts below 9 players (all games)', () => {
    for (const game of ['mtg', 'pokemon', 'yugioh', 'lorcana'] as const) {
      expect(recommendedTopCut(game, 4)).toBe(0)
      expect(recommendedTopCut(game, 8)).toBe(0)
    }
  })

  it('MTG (MTR Appendix E): Top 8 from 9 players', () => {
    expect(recommendedTopCut('mtg', 9)).toBe(8)
    expect(recommendedTopCut('mtg', 16)).toBe(8)
    expect(recommendedTopCut('mtg', 200)).toBe(8)
  })

  it('Pokémon (TRH, TCG Single Day): 9–20 Top 4, 21+ Top 8', () => {
    expect(recommendedTopCut('pokemon', 9)).toBe(4)
    expect(recommendedTopCut('pokemon', 20)).toBe(4)
    expect(recommendedTopCut('pokemon', 21)).toBe(8)
    expect(recommendedTopCut('pokemon', 300)).toBe(8)
  })

  it('Yu-Gi-Oh! (Policy 2.5 Tier 1/2): 9–32 Top 4, 33+ Top 8', () => {
    expect(recommendedTopCut('yugioh', 9)).toBe(4)
    expect(recommendedTopCut('yugioh', 32)).toBe(4)
    expect(recommendedTopCut('yugioh', 33)).toBe(8)
    expect(recommendedTopCut('yugioh', 1000)).toBe(8)
  })

  it('other games: customary 9–16 Top 4, 17+ Top 8', () => {
    for (const game of ['lorcana', 'star_wars_unlimited', 'riftbound', 'altered'] as const) {
      expect(recommendedTopCut(game, 12)).toBe(4)
      expect(recommendedTopCut(game, 16)).toBe(4)
      expect(recommendedTopCut(game, 17)).toBe(8)
    }
  })
})

describe('recommendedSwissRounds', () => {
  it('without a cut every game uses ceil(log2)', () => {
    for (const game of ['mtg', 'pokemon', 'yugioh', 'lorcana'] as const) {
      expect(recommendedSwissRounds(game, 14, false)).toBe(4)
      expect(recommendedSwissRounds(game, 32, false)).toBe(5)
    }
  })

  it('Pokémon with cut (TCG Single Day): 13–16 play 5 rounds, 9–12 still 4', () => {
    expect(recommendedSwissRounds('pokemon', 12, true)).toBe(4)
    expect(recommendedSwissRounds('pokemon', 13, true)).toBe(5)
    expect(recommendedSwissRounds('pokemon', 16, true)).toBe(5)
    expect(recommendedSwissRounds('pokemon', 17, true)).toBe(5)
    expect(recommendedSwissRounds('pokemon', 33, true)).toBe(6)
  })

  it('MTG with cut (MTR Appendix E): 9–16 play 5 rounds', () => {
    expect(recommendedSwissRounds('mtg', 9, true)).toBe(5)
    expect(recommendedSwissRounds('mtg', 16, true)).toBe(5)
    expect(recommendedSwissRounds('mtg', 17, true)).toBe(5)
    expect(recommendedSwissRounds('mtg', 33, true)).toBe(6)
  })

  it('MTG/Pokémon with cut: 227–256 → 9, capped at 10 from 410', () => {
    for (const game of ['mtg', 'pokemon'] as const) {
      expect(recommendedSwissRounds(game, 226, true)).toBe(8)
      expect(recommendedSwissRounds(game, 240, true)).toBe(9)
      expect(recommendedSwissRounds(game, 409, true)).toBe(9)
      expect(recommendedSwissRounds(game, 500, true)).toBe(10)
      expect(recommendedSwissRounds(game, 2000, true)).toBe(10)
    }
  })

  it('Yu-Gi-Oh! with cut stays on ceil(log2) (Konami table matches it)', () => {
    expect(recommendedSwissRounds('yugioh', 14, true)).toBe(4)
    expect(recommendedSwissRounds('yugioh', 240, true)).toBe(8)
    expect(recommendedSwissRounds('yugioh', 2000, true)).toBe(11)
  })

  it('respects a game-config round minimum', () => {
    expect(recommendedSwissRounds('mtg', 6, true, 4)).toBe(4)
    expect(recommendedSwissRounds('lorcana', 6, true, 4)).toBe(4)
  })
})

describe('cutRuleKey', () => {
  it('maps the three verified games to their own key, the rest to generic', () => {
    expect(cutRuleKey('mtg')).toBe('mtg')
    expect(cutRuleKey('pokemon')).toBe('pokemon')
    expect(cutRuleKey('yugioh')).toBe('yugioh')
    expect(cutRuleKey('lorcana')).toBe('generic')
    expect(cutRuleKey('altered')).toBe('generic')
  })
})
