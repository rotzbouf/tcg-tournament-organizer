// Scale regression: a 160-player tournament exercises the sparse pairing
// window (pools > 128 candidates) and the single-pass standings, checked
// against the reference oracle and the no-avoidable-rematch guarantee.
import { describe, it, expect, vi } from 'vitest'
import { tournamentReducer, initialState } from '@/state/tournamentReducer'
import { AppState, TournamentAction } from '@/state/actions'
import { calculateStandings } from '@/engine/standings'
import { calculateStandingsOld } from './standingsReference.helper'

vi.mock('@/lib/utils', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/utils')>()
  let counter = 0
  return { ...orig, generateId: () => `id-${++counter}` }
})

function dispatch(state: AppState, action: TournamentAction): AppState {
  return tournamentReducer(state, action)
}

describe('scale: 160-player swiss with sparse pairing', () => {
  it('pairs without avoidable rematches and matches the standings oracle', () => {
    const N = 160
    let state = dispatch(initialState, {
      type: 'CREATE_TOURNAMENT',
      payload: { name: 'Scale', game: 'yugioh', format: 'swiss_topcut', roundTimeMinutes: 50, topCut: 0 },
    })
    const id = Object.keys(state.tournaments)[0]
    const names = Array.from({ length: N }, (_, i) => `P${String(i + 1).padStart(3, '0')}`)
    state = dispatch(state, { type: 'BULK_ADD_PLAYERS', payload: { tournamentId: id, playerNames: names } })
    state = dispatch(state, { type: 'START_TOURNAMENT', payload: { tournamentId: id } })

    const t = () => state.tournaments[id]
    expect(t().totalRounds).toBe(8)

    for (let r = 1; r <= t().totalRounds; r++) {
      const round = t().rounds[t().rounds.length - 1]
      for (const m of round.matches) {
        if (m.isBye || m.result !== 'pending') continue
        // deterministic, mixed outcomes so score groups stay realistic
        const win = (parseInt(m.player1Id.slice(3), 10) * 7919 + r) % 10 < 7
        state = dispatch(state, {
          type: 'SUBMIT_MATCH_RESULT',
          payload: { tournamentId: id, matchId: m.id, result: win ? 'player1_win' : 'player2_win', player1Games: win ? 2 : 1, player2Games: win ? 1 : 2 },
        })
      }
      state = dispatch(state, { type: 'COMPLETE_ROUND', payload: { tournamentId: id } })
      if (r < t().totalRounds) {
        state = dispatch(state, { type: 'GENERATE_ROUND', payload: { tournamentId: id } })
        const generated = t().rounds[t().rounds.length - 1]
        // everyone is seated: 80 matches, no unpaired players
        expect(generated.matches.reduce((n, m) => n + (m.isBye ? 1 : 2), 0)).toBe(N)
      }
    }

    // No pair may meet twice — with 160 players over 8 rounds every rematch
    // is avoidable, so the sparse window must never force one.
    const seen = new Set<string>()
    for (const round of t().rounds) {
      if (round.phase !== 'swiss') continue
      for (const m of round.matches) {
        if (m.isBye || !m.player2Id) continue
        const key = [m.player1Id, m.player2Id].sort().join('|')
        expect(seen.has(key)).toBe(false)
        seen.add(key)
      }
    }

    // Single-pass standings must equal the reference implementation field by
    // field and in identical order, for all three tiebreaker systems.
    for (const game of ['yugioh', 'mtg', 'riftbound'] as const) {
      expect(calculateStandings(t().players, t().rounds, game))
        .toEqual(calculateStandingsOld(t().players, t().rounds, game))
    }

    state = dispatch(state, { type: 'START_TOP_CUT', payload: { tournamentId: id } })
    expect(t().rounds[t().rounds.length - 1].matches).toHaveLength(4) // YGO 33+ → Top 8
  }, 60000)
})
