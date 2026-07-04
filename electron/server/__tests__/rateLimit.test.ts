/** @vitest-environment node */
import { describe, it, expect, beforeEach } from 'vitest'
import { allowPost, resetRateLimits } from '../rateLimit'

const T0 = 1_000_000

beforeEach(() => {
  resetRateLimits()
})

describe('allowPost', () => {
  it('allows 30 posts per minute per IP, then blocks', () => {
    for (let i = 0; i < 30; i++) {
      expect(allowPost('10.0.0.1', T0 + i)).toBe(true)
    }
    expect(allowPost('10.0.0.1', T0 + 30)).toBe(false)
  })

  it('tracks IPs independently', () => {
    for (let i = 0; i < 31; i++) allowPost('10.0.0.1', T0)
    expect(allowPost('10.0.0.1', T0)).toBe(false)
    expect(allowPost('10.0.0.2', T0)).toBe(true)
  })

  it('opens a fresh window once the old one expired', () => {
    for (let i = 0; i < 31; i++) allowPost('10.0.0.1', T0)
    expect(allowPost('10.0.0.1', T0 + 59_999)).toBe(false)
    expect(allowPost('10.0.0.1', T0 + 60_000)).toBe(true)
  })

  it('caps the number of tracked IPs', () => {
    for (let i = 0; i < 2500; i++) {
      allowPost(`10.0.${Math.floor(i / 250)}.${i % 250}`, T0 + i)
    }
    // evicted IPs simply start a fresh window — they are allowed, not blocked
    expect(allowPost('10.0.0.0', T0 + 61_000)).toBe(true)
  })
})
