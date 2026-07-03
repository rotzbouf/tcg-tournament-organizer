/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import { createSession, getSession, bindSessionToPlayer } from '../sessions'

describe('sessions', () => {
  it('issues distinct tokens that resolve to the lowercased player name', () => {
    const a = createSession('t1', 'Alice Alpha')
    const b = createSession('t1', 'Bob Beta')
    expect(a).not.toBe(b)
    expect(getSession(a, 't1')?.playerName).toBe('alice alpha')
    expect(getSession(b, 't1')?.playerName).toBe('bob beta')
  })

  it('rejects unknown tokens and null', () => {
    expect(getSession('not-a-token', 't1')).toBeNull()
    expect(getSession(null, 't1')).toBeNull()
  })

  it('scopes tokens to their tournament', () => {
    const token = createSession('t1', 'Alice')
    expect(getSession(token, 't2')).toBeNull()
    expect(getSession(token, 't1')?.playerName).toBe('alice')
  })

  it('starts unbound and keeps the first bound player id (F12)', () => {
    const token = createSession('t1', 'Alice')
    expect(getSession(token, 't1')?.playerId).toBeNull()
    bindSessionToPlayer(token, 'p1')
    expect(getSession(token, 't1')?.playerId).toBe('p1')
    // First binding wins — a later attempt cannot re-point the session.
    bindSessionToPlayer(token, 'p2')
    expect(getSession(token, 't1')?.playerId).toBe('p1')
  })

  it('ignores binding for unknown tokens', () => {
    expect(() => bindSessionToPlayer('not-a-token', 'p1')).not.toThrow()
  })

  it('evicts the oldest sessions beyond the cap', () => {
    const first = createSession('t1', 'First')
    for (let i = 0; i < 1000; i++) createSession('t1', `Filler ${i}`)
    expect(getSession(first, 't1')).toBeNull()
  })
})
