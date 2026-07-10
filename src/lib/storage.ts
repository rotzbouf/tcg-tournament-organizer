import { AppState } from '@/state/actions'
import { migrateTournament, migrateDatabasePlayer } from './migration'

const STORAGE_KEY = 'tcg-tournament-state'

let recoveredAt: number | null = null

/** Timestamp of the backup the state was recovered from at startup, if the main state file was missing or corrupt. */
export function getRecoveredAt(): number | null {
  return recoveredAt
}

export function parseStoredState(raw: string): AppState | null {
  try {
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

function isEmptyState(state: AppState): boolean {
  return Object.keys(state.tournaments).length === 0 &&
    Object.keys(state.playerDatabase ?? {}).length === 0 &&
    (state.seasons ?? []).length === 0 &&
    (state.templates ?? []).length === 0
}

export function loadState(): AppState | null {
  // In Electron the state file is authoritative. If it is missing or corrupt,
  // a legacy localStorage copy (pre-encryption versions kept one) is preferred
  // over disk backups because it was written on the same debounce cadence.
  // Once the file store is proven, the localStorage copy is deleted: the state
  // file is encrypted at rest, so a plaintext PII copy must not linger.
  let backupState: AppState | null = null
  let backupRecoveredAt: number | null = null
  if (window.electronAPI?.loadStorageState) {
    try {
      const result = window.electronAPI.loadStorageState()
      if (result) {
        const state = parseStoredState(result.state)
        if (state) {
          if (!result.recoveredFrom) {
            try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
            return state
          }
          backupState = state
          backupRecoveredAt = result.recoveredAt
        }
      }
    } catch { /* fall through */ }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const state = parseStoredState(raw)
      if (state && !(isEmptyState(state) && backupState)) return state
    }
  } catch { /* fall through */ }
  if (backupState) {
    recoveredAt = backupRecoveredAt
    return backupState
  }
  return null
}

export function saveState(state: AppState): void {
  // Electron persists via the state:sync IPC into an encrypted file; writing a
  // plaintext localStorage copy alongside would defeat the at-rest encryption.
  if (window.electronAPI) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}
