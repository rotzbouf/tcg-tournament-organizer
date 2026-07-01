import { AppState } from '@/state/actions'
import { migrateTournament, migrateDatabasePlayer } from './migration'

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
      migrateDatabasePlayer(p)
    }
    for (const t of Object.values(parsed.tournaments) as Record<string, unknown>[]) {
      migrateTournament(t)
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
