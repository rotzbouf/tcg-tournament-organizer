import { describe, it, expect } from 'vitest'
import { serializeState, deserializeState } from '../serialization'
import { AppState } from '@/state/actions'

function makeTournament(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 't1',
    name: 'Locals',
    game: 'yugioh',
    status: 'registration',
    players: [],
    rounds: [],
    ...overrides,
  }
}

function makeExport(tournaments: Record<string, unknown>, playerDatabase: Record<string, unknown> = {}): string {
  return JSON.stringify({ version: '1.2.0', data: { tournaments, playerDatabase } })
}

describe('serializeState / deserializeState', () => {
  it('round-trips a state', () => {
    const state = { tournaments: { t1: makeTournament({ format: 'swiss' }) }, playerDatabase: {} } as unknown as AppState
    const restored = deserializeState(serializeState(state))
    expect(restored.tournaments.t1.id).toBe('t1')
    expect(restored.tournaments.t1.name).toBe('Locals')
  })

  it('rejects invalid JSON', () => {
    expect(() => deserializeState('{nope')).toThrow('Invalid JSON format')
  })

  it('rejects a missing version field', () => {
    expect(() => deserializeState(JSON.stringify({ data: { tournaments: {} } }))).toThrow('Missing version field')
  })

  it('rejects a missing data field', () => {
    expect(() => deserializeState(JSON.stringify({ version: '1.0.0' }))).toThrow('Missing data field')
  })

  it('rejects a missing tournaments field', () => {
    expect(() => deserializeState(JSON.stringify({ version: '1.0.0', data: {} }))).toThrow('Missing tournaments field')
  })

  it('rejects an unknown game type', () => {
    expect(() => deserializeState(makeExport({ t1: makeTournament({ game: 'chess' }) }))).toThrow('invalid game type')
  })

  it('rejects an unknown status', () => {
    expect(() => deserializeState(makeExport({ t1: makeTournament({ status: 'paused' }) }))).toThrow('invalid status')
  })

  it('rejects non-array players', () => {
    expect(() => deserializeState(makeExport({ t1: makeTournament({ players: {} }) }))).toThrow('players must be an array')
  })
})

describe('import migration (shared with storage load)', () => {
  it('fills defaults missing from old export files', () => {
    const old = makeTournament({
      players: [{ id: 'p1', name: 'Alice' }],
      rounds: [{ roundNumber: 1, matches: [], isComplete: true }],
    })
    const state = deserializeState(makeExport({ t1: old }))
    const t = state.tournaments.t1

    expect(t.format).toBe('swiss')
    expect(t.penalties).toEqual([])
    expect(t.phases).toEqual([])
    expect(t.currentPhaseIndex).toBe(0)
    expect(t.archived).toBe(false)
    expect(t.ageDivisionsEnabled).toBe(false)
    expect(t.grandFinalReset).toBe(false)
    expect(t.discordWebhookUrl).toBeNull()
    expect(t.gameFormat).toBeNull()
    expect(t.rounds[0].phaseIndex).toBe(0)
    expect(t.players[0].decklist).toBeNull()
    expect(t.players[0].playerId).toBeNull()
    expect(t.players[0].dateOfBirth).toBeNull()
  })

  it('derives format swiss_topcut from a legacy topCut field', () => {
    const state = deserializeState(makeExport({ t1: makeTournament({ topCut: 8 }) }))
    expect(state.tournaments.t1.format).toBe('swiss_topcut')
  })

  it('marks completed tournaments as eloApplied so import cannot double-apply Elo', () => {
    const state = deserializeState(makeExport({ t1: makeTournament({ status: 'completed' }) }))
    expect(state.tournaments.t1.eloApplied).toBe(true)
  })

  it('creates an empty playerDatabase and migrates existing entries', () => {
    const withoutDb = deserializeState(JSON.stringify({ version: '1.0.0', data: { tournaments: {} } }))
    expect(withoutDb.playerDatabase).toEqual({})

    const withDb = deserializeState(makeExport({}, { alice: { name: 'Alice' } }))
    expect(withDb.playerDatabase.alice.game).toBe('yugioh')
    expect(withDb.playerDatabase.alice.playerId).toBeNull()
  })
})

describe('PII-free export', () => {
  const stateWithPii = () => ({
    tournaments: {
      t1: makeTournament({
        format: 'swiss',
        players: [
          { id: 'p1', name: 'Alice Alpha', playerId: 'K-1234567890', dateOfBirth: '2010-05-01', deckName: 'Aggro', decklist: [{ cardName: 'X', quantity: 3 }], hasBye: false, droppedInRound: null },
        ],
      }),
    },
    playerDatabase: {
      d1: { id: 'd1', name: 'Alice Alpha', game: 'yugioh', playerId: 'K-1234567890', elo: 1234, matchesPlayed: 5, tournamentsPlayed: 2, history: [], penalties: [], lastUpdated: '2026-07-01' },
    },
  }) as unknown as AppState

  it('strips birthdates and player IDs but keeps names, decks and Elo', () => {
    const restored = deserializeState(serializeState(stateWithPii(), { stripPii: true }))
    const player = restored.tournaments.t1.players[0]
    expect(player.dateOfBirth).toBeNull()
    expect(player.playerId).toBeNull()
    expect(player.name).toBe('Alice Alpha')
    expect(player.decklist).toEqual([{ cardName: 'X', quantity: 3 }])
    const dbPlayer = Object.values(restored.playerDatabase)[0]
    expect(dbPlayer.playerId).toBeNull()
    expect(dbPlayer.elo).toBe(1234)
    expect(serializeState(stateWithPii(), { stripPii: true })).not.toContain('K-1234567890')
  })

  it('does not mutate the live state and exports PII by default', () => {
    const state = stateWithPii()
    serializeState(state, { stripPii: true })
    expect(state.tournaments.t1.players[0].dateOfBirth).toBe('2010-05-01')
    expect(serializeState(state)).toContain('K-1234567890')
  })
})
