import { describe, it, expect } from 'vitest'
import {
  getInfractionCatalog,
  getInfraction,
  priorOffenseCount,
  suggestPenaltyLevel,
} from '../penaltyCatalog'

describe('penaltyCatalog', () => {
  describe('getInfractionCatalog', () => {
    it('returns the game-specific catalog for games with official guidelines', () => {
      expect(getInfractionCatalog('mtg').some(i => i.id === 'mtg_missed_trigger')).toBe(true)
      expect(getInfractionCatalog('pokemon').some(i => i.id === 'pkmn_deck_error')).toBe(true)
      expect(getInfractionCatalog('yugioh').some(i => i.id === 'ygo_drawing_extra')).toBe(true)
    })

    it('falls back to the generic catalog for games without a specific one', () => {
      const swu = getInfractionCatalog('star_wars_unlimited')
      expect(swu.every(i => i.id.startsWith('gen_'))).toBe(true)
      expect(getInfractionCatalog('lorcana')).toBe(swu)
    })

    it('only uses the four known categories', () => {
      const valid = new Set(['game_play_error', 'tournament_error', 'unsporting_conduct', 'serious'])
      for (const game of ['mtg', 'pokemon', 'yugioh', 'altered'] as const) {
        for (const inf of getInfractionCatalog(game)) expect(valid.has(inf.category)).toBe(true)
      }
    })
  })

  describe('getInfraction', () => {
    it('resolves an id from any game catalog', () => {
      expect(getInfraction('mtg_tardiness')?.defaultPenalty).toBe('game_loss')
      expect(getInfraction('ygo_slow_play')?.category).toBe('tournament_error')
    })

    it('returns undefined for unknown or empty ids', () => {
      expect(getInfraction('nope')).toBeUndefined()
      expect(getInfraction(null)).toBeUndefined()
      expect(getInfraction(undefined)).toBeUndefined()
    })
  })

  describe('priorOffenseCount', () => {
    const penalties = [
      { playerId: 'a', infractionId: 'mtg_slow_play', type: 'warning' as const },
      { playerId: 'a', infractionId: 'mtg_slow_play', type: 'game_loss' as const },
      { playerId: 'a', infractionId: 'mtg_missed_trigger', type: 'warning' as const },
      { playerId: 'b', infractionId: 'mtg_slow_play', type: 'warning' as const },
      { playerId: 'a', infractionId: 'mtg_slow_play', type: 'note' as const },
    ]

    it('counts only same player + same infraction, excluding notes', () => {
      expect(priorOffenseCount(penalties, 'a', 'mtg_slow_play')).toBe(2)
      expect(priorOffenseCount(penalties, 'a', 'mtg_missed_trigger')).toBe(1)
      expect(priorOffenseCount(penalties, 'b', 'mtg_slow_play')).toBe(1)
      expect(priorOffenseCount(penalties, 'a', 'mtg_deck_problem')).toBe(0)
    })
  })

  describe('suggestPenaltyLevel', () => {
    const slowPlay = getInfraction('mtg_slow_play')!       // warning, escalates
    const cheating = getInfraction('mtg_cheating')!        // disqualification, no escalation
    const uscMajor = getInfraction('mtg_usc_major')!       // match_loss, no escalation

    it('returns the default penalty for a first offence', () => {
      expect(suggestPenaltyLevel(slowPlay, 0)).toEqual({ level: 'warning', escalated: false, offenseNumber: 1 })
    })

    it('bumps one ladder step per prior offence', () => {
      expect(suggestPenaltyLevel(slowPlay, 1)).toEqual({ level: 'game_loss', escalated: true, offenseNumber: 2 })
      expect(suggestPenaltyLevel(slowPlay, 2)).toEqual({ level: 'match_loss', escalated: true, offenseNumber: 3 })
    })

    it('caps escalation at disqualification', () => {
      expect(suggestPenaltyLevel(slowPlay, 5).level).toBe('disqualification')
      expect(suggestPenaltyLevel(slowPlay, 5).offenseNumber).toBe(6)
    })

    it('never escalates infractions flagged non-escalating', () => {
      expect(suggestPenaltyLevel(cheating, 3)).toEqual({ level: 'disqualification', escalated: false, offenseNumber: 4 })
      expect(suggestPenaltyLevel(uscMajor, 2)).toEqual({ level: 'match_loss', escalated: false, offenseNumber: 3 })
    })

    it('escalates a game-loss default up the ladder', () => {
      const deck = getInfraction('mtg_deck_problem')!      // game_loss, escalates
      expect(suggestPenaltyLevel(deck, 1)).toEqual({ level: 'match_loss', escalated: true, offenseNumber: 2 })
    })
  })
})
