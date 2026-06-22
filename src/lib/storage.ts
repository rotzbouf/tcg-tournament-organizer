import { AppState } from '@/state/actions'

const STORAGE_KEY = 'tcg-tournament-state'

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !parsed.tournaments || typeof parsed.tournaments !== 'object') {
      return null
    }
    if (!parsed.playerDatabase || typeof parsed.playerDatabase !== 'object') {
      parsed.playerDatabase = {}
    }
    for (const p of Object.values(parsed.playerDatabase) as Record<string, unknown>[]) {
      if (!p.game) p.game = 'yugioh'
      if (p.playerId === undefined) p.playerId = null
    }
    for (const t of Object.values(parsed.tournaments) as Record<string, unknown>[]) {
      if (!t.format) {
        const topCut = typeof t.topCut === 'number' ? t.topCut : 0
        t.format = topCut > 0 ? 'swiss_topcut' : 'swiss'
      }
      if (!Array.isArray(t.penalties)) {
        t.penalties = []
      }
      if (!Array.isArray(t.phases)) {
        t.phases = []
      }
      if (typeof t.currentPhaseIndex !== 'number') {
        t.currentPhaseIndex = 0
      }
      if (Array.isArray(t.rounds)) {
        for (const r of t.rounds as Record<string, unknown>[]) {
          if (typeof r.phaseIndex !== 'number') r.phaseIndex = 0
        }
      }
      if (typeof t.grandFinalReset !== 'boolean') {
        t.grandFinalReset = false
      }
      if (typeof t.ageDivisionsEnabled !== 'boolean') {
        t.ageDivisionsEnabled = false
      }
      if (t.discordWebhookUrl === undefined) {
        t.discordWebhookUrl = null
      }
      if (Array.isArray(t.players)) {
        for (const p of t.players as Record<string, unknown>[]) {
          if (p.decklist === undefined) p.decklist = null
          if (p.playerId === undefined) p.playerId = null
          if (p.dateOfBirth === undefined) p.dateOfBirth = null
        }
      }
    }
    return parsed as AppState
  } catch {
    return null
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}
