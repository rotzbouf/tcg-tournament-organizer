import { describe, it, expect } from 'vitest'
import { matchesSearch, normalizeForSearch } from '../search'

describe('normalizeForSearch', () => {
  it('lowercases and trims', () => {
    expect(normalizeForSearch('  Max Mustermann ')).toBe('max mustermann')
  })

  it('strips diacritics', () => {
    expect(normalizeForSearch('José Müller-Lüdenscheidt')).toBe('jose muller-ludenscheidt')
  })
})

describe('matchesSearch', () => {
  it('empty query matches everything', () => {
    expect(matchesSearch('', 'anything')).toBe(true)
    expect(matchesSearch('   ', 'anything')).toBe(true)
  })

  it('matches case-insensitive substrings in any field', () => {
    expect(matchesSearch('must', 'Max Mustermann', null, undefined)).toBe(true)
    expect(matchesSearch('MAX', 'Max Mustermann')).toBe(true)
    expect(matchesSearch('4711', 'Max Mustermann', '0000-4711-9999')).toBe(true)
    expect(matchesSearch('lisa', 'Max Mustermann', '4711')).toBe(false)
  })

  it('matches across diacritics in both directions', () => {
    expect(matchesSearch('jose', 'José García')).toBe(true)
    expect(matchesSearch('José', 'Jose Garcia')).toBe(true)
  })

  it('ignores null and undefined fields', () => {
    expect(matchesSearch('x', null, undefined)).toBe(false)
  })
})
