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
    for (const t of Object.values(parsed.tournaments) as Record<string, unknown>[]) {
      if (!t.format) {
        const topCut = typeof t.topCut === 'number' ? t.topCut : 0
        t.format = topCut > 0 ? 'swiss_topcut' : 'swiss'
      }
      if (!Array.isArray(t.penalties)) {
        t.penalties = []
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
