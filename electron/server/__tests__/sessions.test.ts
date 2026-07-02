/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import { createSession, getSessionPlayerName } from '../sessions'

describe('sessions', () => {
  it('issues distinct tokens that resolve to the lowercased player name', () => {
    const a = createSession('t1', 'Alice Alpha')
    const b = createSession('t1', 'Bob Beta')
    expect(a).not.toBe(b)
    expect(getSessionPlayerName(a, 't1')).toBe('alice alpha')
    expect(getSessionPlayerName(b, 't1')).toBe('bob beta')
  })

  it('rejects unknown tokens and null', () => {
    expect(getSessionPlayerName('not-a-token', 't1')).toBeNull()
    expect(getSessionPlayerName(null, 't1')).toBeNull()
  })

  it('scopes tokens to their tournament', () => {
    const token = createSession('t1', 'Alice')
    expect(getSessionPlayerName(token, 't2')).toBeNull()
    expect(getSessionPlayerName(token, 't1')).toBe('alice')
  })

  it('evicts the oldest sessions beyond the cap', () => {
    const first = createSession('t1', 'First')
    for (let i = 0; i < 1000; i++) createSession('t1', `Filler ${i}`)
    expect(getSessionPlayerName(first, 't1')).toBeNull()
  })
})
