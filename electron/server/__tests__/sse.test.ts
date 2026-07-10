/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import { sanitizeTournament } from '../sse'

describe('sanitizeTournament', () => {
  const tournament = {
    id: 't1',
    name: 'Locals',
    decklistVisibility: 'hidden',
    players: [
      {
        id: 'p1',
        name: 'Alice',
        deckName: 'Blue-Eyes',
        decklist: [{ cardName: 'Blue-Eyes White Dragon', quantity: 3 }],
        dateOfBirth: '2000-01-01',
        playerId: 'K-123',
        droppedInRound: null,
      },
    ],
    deckChecks: [{ id: 'c1', matchId: 'm1', roundNumber: 1, result: null }],
    penalties: [{ id: 'pen1', playerId: 'p1', type: 'warning', reason: 'Slow play' }],
  }

  it('strips decklist, dateOfBirth and playerId from every player', () => {
    const result = sanitizeTournament(tournament) as typeof tournament
    expect(result.players[0]).not.toHaveProperty('decklist')
    expect(result.players[0]).not.toHaveProperty('dateOfBirth')
    expect(result.players[0]).not.toHaveProperty('playerId')
  })

  it('strips the deck-check log', () => {
    const result = sanitizeTournament(tournament) as typeof tournament
    expect(result).not.toHaveProperty('deckChecks')
    expect(tournament.deckChecks).toHaveLength(1) // original untouched
  })

  it('strips the penalty list', () => {
    const result = sanitizeTournament(tournament) as typeof tournament
    expect(result).not.toHaveProperty('penalties')
    expect(tournament.penalties).toHaveLength(1) // original untouched
  })

  it('keeps the fields the mobile page needs', () => {
    const result = sanitizeTournament(tournament) as typeof tournament
    expect(result.players[0].id).toBe('p1')
    expect(result.players[0].name).toBe('Alice')
    expect(result.players[0].deckName).toBe('Blue-Eyes')
    expect(result.name).toBe('Locals')
  })

  it('does not mutate the original tournament', () => {
    sanitizeTournament(tournament)
    expect(tournament.players[0].decklist).toHaveLength(1)
    expect(tournament.players[0].dateOfBirth).toBe('2000-01-01')
  })

  it('passes through values without a players array', () => {
    expect(sanitizeTournament(null)).toBeNull()
    expect(sanitizeTournament({ id: 't1' })).toEqual({ id: 't1' })
  })
})
