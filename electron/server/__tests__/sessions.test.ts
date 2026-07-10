/** @vitest-environment node */
import { describe, it, expect, beforeEach } from 'vitest'
import { createSession, getSession, bindSessionToPlayer, createPlayerSession, isNameClaimed, clearSessions } from '../sessions'

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

describe('TO-issued player sessions', () => {
  beforeEach(() => clearSessions())

  it('creates a session pre-bound to the player', () => {
    const token = createPlayerSession('t1', 'p1', 'Alice Alpha')
    const session = getSession(token, 't1')
    expect(session?.playerId).toBe('p1')
    expect(session?.playerName).toBe('alice alpha')
  })

  it('returns the same token when asked again for the same player', () => {
    const a = createPlayerSession('t1', 'p1', 'Alice Alpha')
    const b = createPlayerSession('t1', 'p1', 'Alice Alpha')
    expect(a).toBe(b)
    expect(createPlayerSession('t1', 'p2', 'Bob Beta')).not.toBe(a)
    expect(createPlayerSession('t2', 'p1', 'Alice Alpha')).not.toBe(a)
  })

  it('mints a fresh token if the cached one was evicted', () => {
    const a = createPlayerSession('t1', 'p1', 'Alice Alpha')
    for (let i = 0; i < 1000; i++) createSession('t1', `Filler ${i}`)
    expect(getSession(a, 't1')).toBeNull()
    const b = createPlayerSession('t1', 'p1', 'Alice Alpha')
    expect(b).not.toBe(a)
    expect(getSession(b, 't1')?.playerId).toBe('p1')
  })
})

describe('isNameClaimed', () => {
  beforeEach(() => clearSessions())

  it('matches unbound sessions by claimed name', () => {
    createSession('t1', 'Alice Alpha')
    expect(isNameClaimed('t1', null, 'alice alpha')).toBe(true)
    expect(isNameClaimed('t1', null, 'bob beta')).toBe(false)
    expect(isNameClaimed('t2', null, 'alice alpha')).toBe(false)
  })

  it('matches bound sessions by player id, surviving renames', () => {
    const token = createSession('t1', 'Alice Alpha')
    bindSessionToPlayer(token, 'p1')
    expect(isNameClaimed('t1', 'p1', 'alice omega')).toBe(true)
    // the stale claimed name no longer counts once the session is bound
    expect(isNameClaimed('t1', null, 'alice alpha')).toBe(false)
  })

  it('counts TO-issued tokens as claims', () => {
    createPlayerSession('t1', 'p1', 'Alice Alpha')
    expect(isNameClaimed('t1', 'p1', 'alice alpha')).toBe(true)
  })
})
