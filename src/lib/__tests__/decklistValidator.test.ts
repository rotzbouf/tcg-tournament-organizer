import { describe, it, expect } from 'vitest'
import { validateDecklist } from '../decklistValidator'
import { DecklistEntry } from '@/types/player'

function entry(cardName: string, quantity: number): DecklistEntry {
  return { cardName, quantity }
}

function side(cardName: string, quantity: number): DecklistEntry {
  return { cardName, quantity, sideboard: true }
}

// Fill a list to a given total card count with distinct filler cards (1 copy each).
function fillTo(total: number, base: DecklistEntry[] = []): DecklistEntry[] {
  const used = base.reduce((sum, e) => sum + e.quantity, 0)
  const filler = Array.from({ length: total - used }, (_, i) => entry(`Filler ${i}`, 1))
  return [...base, ...filler]
}

describe('validateDecklist — copy limit aggregation (Bug 1)', () => {
  it('flags copies summed across duplicate entries', () => {
    // MTG allows 4; 3 in main + 2 in side = 5 must be caught
    const result = validateDecklist(
      fillTo(60, [entry('Lightning Bolt', 3), entry('Lightning Bolt', 2)]),
      'mtg', 'modern',
    )
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({ type: 'too_many_copies', message: '5x', cardName: 'Lightning Bolt' })
  })

  it('allows a card at exactly the limit across entries', () => {
    const result = validateDecklist(
      fillTo(60, [entry('Lightning Bolt', 2), entry('Lightning Bolt', 2)]),
      'mtg', 'modern',
    )
    expect(result.errors.filter(e => e.type === 'too_many_copies')).toEqual([])
  })
})

describe('validateDecklist — basics exemption (Bug 2)', () => {
  it('does not flag many basic lands in MTG', () => {
    const result = validateDecklist(fillTo(60, [entry('Mountain', 20)]), 'mtg', 'modern')
    expect(result.errors.filter(e => e.type === 'too_many_copies')).toEqual([])
  })

  it('exempts snow-covered basics', () => {
    const result = validateDecklist(fillTo(60, [entry('Snow-Covered Island', 12)]), 'mtg', 'modern')
    expect(result.errors.filter(e => e.type === 'too_many_copies')).toEqual([])
  })

  it('does not flag many basic energy in Pokémon', () => {
    const result = validateDecklist(fillTo(60, [entry('Basic Grass Energy', 12)]), 'pokemon', 'expanded')
    expect(result.errors.filter(e => e.type === 'too_many_copies')).toEqual([])
  })

  it('exempts basic energy written without the "Basic" prefix', () => {
    const result = validateDecklist(fillTo(60, [entry('Fire Energy', 10)]), 'pokemon', 'expanded')
    expect(result.errors.filter(e => e.type === 'too_many_copies')).toEqual([])
  })

  it('still limits special energy in Pokémon', () => {
    const result = validateDecklist(fillTo(60, [entry('Double Turbo Energy', 5)]), 'pokemon', 'expanded')
    expect(result.errors).toContainEqual({ type: 'too_many_copies', message: '5x', cardName: 'Double Turbo Energy' })
  })

  it('does not exempt basic lands in games without the exemption', () => {
    // In YGO a card named like a land gets no special treatment (limit 3)
    const result = validateDecklist(fillTo(40, [entry('Mountain', 4)]), 'yugioh', 'advanced')
    expect(result.errors).toContainEqual({ type: 'too_many_copies', message: '4x', cardName: 'Mountain' })
  })
})

describe('validateDecklist — main/sideboard separation (Bug 3)', () => {
  it('does not count sideboard cards toward the main-deck maximum', () => {
    // YGO main 40–60. 55 main + 10 side must NOT trip too_many_cards.
    const result = validateDecklist([...fillTo(55), ...Array.from({ length: 10 }, (_, i) => side(`SB ${i}`, 1))], 'yugioh', 'advanced')
    expect(result.errors.filter(e => e.type === 'too_many_cards')).toEqual([])
    expect(result.errors.filter(e => e.type === 'too_few_cards')).toEqual([])
  })

  it('flags an oversized sideboard', () => {
    // YGO sideMax 15
    const result = validateDecklist([...fillTo(40), ...Array.from({ length: 16 }, (_, i) => side(`SB ${i}`, 1))], 'yugioh', 'advanced')
    expect(result.errors).toContainEqual({ type: 'too_many_side_cards', message: '16/15' })
  })

  it('counts copies across main + sideboard for the copy limit', () => {
    // MTG limit 4: 3 in main + 2 in side = 5 → violation
    const result = validateDecklist([...fillTo(60, [entry('Lightning Bolt', 3)]), side('Lightning Bolt', 2)], 'mtg', 'modern')
    expect(result.errors).toContainEqual({ type: 'too_many_copies', message: '5x', cardName: 'Lightning Bolt' })
  })

  it('flags too few main-deck cards even when the sideboard is full', () => {
    const result = validateDecklist([...fillTo(35), ...Array.from({ length: 15 }, (_, i) => side(`SB ${i}`, 1))], 'yugioh', 'advanced')
    expect(result.errors).toContainEqual({ type: 'too_few_cards', message: '35/40' })
  })
})

describe('validateDecklist — card counts', () => {
  it('flags too few cards', () => {
    const result = validateDecklist(fillTo(50), 'mtg', 'modern')
    expect(result.errors).toContainEqual({ type: 'too_few_cards', message: '50/60' })
  })

  it('accepts a legal minimal deck', () => {
    const result = validateDecklist(fillTo(60), 'mtg', 'modern')
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('applies commander deck-rule overrides (100 singleton)', () => {
    const result = validateDecklist(fillTo(100, [entry('Sol Ring', 2)]), 'mtg', 'commander')
    expect(result.errors).toContainEqual({ type: 'too_many_copies', message: '2x', cardName: 'Sol Ring' })
  })

  it('returns no deck-rule errors for games without deck rules', () => {
    const result = validateDecklist([entry('Whatever', 99)], 'riftbound', 'standard')
    expect(result.errors).toEqual([])
  })
})
