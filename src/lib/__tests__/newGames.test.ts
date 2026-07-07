// Coverage for the games added 2026-07-07: Flesh and Blood, One Piece,
// Dragon Ball Super: Fusion World — deck rules (verified against the official
// documents), tiebreaker configs and the generic fallbacks they rely on.
import { describe, it, expect } from 'vitest'
import { GAME_CONFIG } from '../gameConfig'
import { validateDecklist } from '../decklistValidator'
import { getInfractionCatalog } from '../penaltyCatalog'
import { recommendedTopCut } from '../cutRules'
import { DecklistEntry } from '@/types/player'

function deck(cards: number, copies = 1): DecklistEntry[] {
  const entries: DecklistEntry[] = []
  let remaining = cards
  let i = 0
  while (remaining > 0) {
    const quantity = Math.min(copies, remaining)
    entries.push({ cardName: `Card ${++i}`, quantity })
    remaining -= quantity
  }
  return entries
}

describe('new game configs', () => {
  it('Flesh and Blood CC: deck 60–80, max 3 copies', () => {
    expect(validateDecklist(deck(60, 3), 'flesh_and_blood', 'classic_constructed').valid).toBe(true)
    expect(validateDecklist(deck(59, 3), 'flesh_and_blood', 'classic_constructed').errors[0].type).toBe('too_few_cards')
    expect(validateDecklist(deck(81, 3), 'flesh_and_blood', 'classic_constructed').errors[0].type).toBe('too_many_cards')
    expect(validateDecklist([...deck(56, 1), { cardName: 'Sink Below', quantity: 4 }], 'flesh_and_blood', 'classic_constructed').errors[0].type).toBe('too_many_copies')
  })

  it('Flesh and Blood Blitz override: exactly 40, max 2 copies', () => {
    expect(validateDecklist(deck(40, 2), 'flesh_and_blood', 'blitz').valid).toBe(true)
    expect(validateDecklist(deck(41, 2), 'flesh_and_blood', 'blitz').errors[0].type).toBe('too_many_cards')
    expect(validateDecklist([...deck(37, 1), { cardName: 'Snatch', quantity: 3 }], 'flesh_and_blood', 'blitz').errors[0].type).toBe('too_many_copies')
  })

  it('One Piece: exactly 50 cards, max 4 copies', () => {
    expect(validateDecklist(deck(50, 4), 'one_piece', 'standard').valid).toBe(true)
    expect(validateDecklist(deck(51, 4), 'one_piece', 'standard').errors[0].type).toBe('too_many_cards')
  })

  it('Fusion World: 50–60 cards, max 4 copies', () => {
    expect(validateDecklist(deck(50, 4), 'dragonball_fusion_world', 'standard').valid).toBe(true)
    expect(validateDecklist(deck(60, 4), 'dragonball_fusion_world', 'standard').valid).toBe(true)
    expect(validateDecklist(deck(61, 4), 'dragonball_fusion_world', 'standard').errors[0].type).toBe('too_many_cards')
  })

  it('Bandai games use the official tiebreakers (floor 0.33, head-to-head)', () => {
    for (const game of ['one_piece', 'dragonball_fusion_world'] as const) {
      expect(GAME_CONFIG[game].tiebreakers).toEqual({ system: 'tcg', opponentWinFloor: 0.33, useGameWinPct: false, useHeadToHead: true })
    }
  })

  it('new games fall back to the generic penalty catalog and cut table', () => {
    for (const game of ['flesh_and_blood', 'one_piece', 'dragonball_fusion_world'] as const) {
      expect(getInfractionCatalog(game)[0].id.startsWith('gen_')).toBe(true)
      expect(recommendedTopCut(game, 12)).toBe(4)
      expect(recommendedTopCut(game, 17)).toBe(8)
    }
  })
})
