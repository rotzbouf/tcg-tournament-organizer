import { ipcMain, app, safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const BACKUP_INTERVAL_MS = 2 * 60 * 1000
const BACKUP_KEEP_MAX = 40
const BACKUP_NAME_RE = /^state-[0-9TZ-]+\.json$/

// Age-tiered thinning: the 2-minute cadence keeps crash-recovery loss small,
// while older backups are thinned out so the dense recent ones cannot flush
// yesterday's states out of the rotation ("restore an older state" stays useful).
const BACKUP_TIERS: Array<{ maxAgeMs: number; keepEveryMs: number }> = [
  { maxAgeMs: 15 * 60 * 1000, keepEveryMs: 0 },                    // < 15 min: alle
  { maxAgeMs: 2 * 60 * 60 * 1000, keepEveryMs: 15 * 60 * 1000 },   // < 2 h: alle 15 min
  { maxAgeMs: 24 * 60 * 60 * 1000, keepEveryMs: 2 * 60 * 60 * 1000 }, // < 24 h: alle 2 h
  { maxAgeMs: Infinity, keepEveryMs: 24 * 60 * 60 * 1000 },        // älter: täglich
]

// State files hold PII (birthdates, player IDs), so they are encrypted at rest
// via the OS keychain when available. The prefix marks encrypted files; files
// without it are legacy plaintext and stay readable, so updating the app (or
// losing the keychain) never strands existing data.
const ENC_PREFIX = 'TCGSAFE1:'

export function isEncryptionActive(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

function encryptForDisk(plain: string): string {
  if (!isEncryptionActive()) return plain
  try {
    return ENC_PREFIX + safeStorage.encryptString(plain).toString('base64')
  } catch {
    // Failing the write would lose data; plaintext is the lesser evil.
    return plain
  }
}

// Returns the plaintext state JSON, or null if the file is encrypted but
// cannot be decrypted (keychain changed/unavailable) — callers treat that
// like a corrupt file and fall back to backups.
function decryptFromDisk(raw: string): string | null {
  if (!raw.startsWith(ENC_PREFIX)) return raw
  try {
    return safeStorage.decryptString(Buffer.from(raw.slice(ENC_PREFIX.length), 'base64'))
  } catch {
    return null
  }
}

function stateFile(): string {
  return path.join(app.getPath('userData'), 'state.json')
}

function backupDir(): string {
  return path.join(app.getPath('userData'), 'backups')
}

interface BackupInfo {
  name: string
  createdAt: number
  size: number
}

// Newest first — backup names embed an ISO timestamp, so name order is time order.
function listBackupFiles(): BackupInfo[] {
  try {
    return fs.readdirSync(backupDir())
      .filter(name => BACKUP_NAME_RE.test(name))
      .sort()
      .reverse()
      .map(name => {
        const stat = fs.statSync(path.join(backupDir(), name))
        return { name, createdAt: stat.mtimeMs, size: stat.size }
      })
  } catch {
    return []
  }
}

function pruneBackups(): void {
  const now = Date.now()
  const backups = listBackupFiles() // newest first
  const kept: BackupInfo[] = []
  for (const backup of backups) {
    const lastKept = kept[kept.length - 1]
    if (!lastKept) {
      kept.push(backup) // das neueste Backup überlebt immer
      continue
    }
    const age = now - backup.createdAt
    const tier = BACKUP_TIERS.find(t => age < t.maxAgeMs)!
    if (tier.keepEveryMs === 0 || lastKept.createdAt - backup.createdAt >= tier.keepEveryMs) {
      kept.push(backup)
    }
  }
  const keepNames = new Set(kept.slice(0, BACKUP_KEEP_MAX).map(b => b.name))
  for (const backup of backups) {
    if (keepNames.has(backup.name)) continue
    try {
      fs.unlinkSync(path.join(backupDir(), backup.name))
    } catch { /* ignore */ }
  }
}

// A backup only has recovery value if it parses and holds actual data.
// Without this guard the first backup ever taken would be the empty state
// persisted right after first boot, and a corrupt state file could poison
// the rotation.
function isWorthBackingUp(raw: string): boolean {
  try {
    const plain = decryptFromDisk(raw)
    if (plain === null) return false
    const parsed = JSON.parse(plain) as Record<string, unknown> | null
    if (!parsed || typeof parsed !== 'object' || !parsed.tournaments || typeof parsed.tournaments !== 'object') return false
    return Object.keys(parsed.tournaments).length > 0 ||
      Object.keys((parsed.playerDatabase as object) ?? {}).length > 0 ||
      (Array.isArray(parsed.seasons) && parsed.seasons.length > 0) ||
      (Array.isArray(parsed.templates) && parsed.templates.length > 0)
  } catch {
    return false
  }
}

// Snapshots the current state file into the backup rotation, regardless of
// how recently the last backup was taken.
function createBackupNow(): void {
  const file = stateFile()
  let raw: string
  try {
    raw = fs.readFileSync(file, 'utf-8')
  } catch {
    return
  }
  if (!isWorthBackingUp(raw)) return
  fs.mkdirSync(backupDir(), { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  let target = path.join(backupDir(), `state-${stamp}.json`)
  for (let i = 2; fs.existsSync(target); i++) {
    target = path.join(backupDir(), `state-${stamp}-${i}.json`)
  }
  fs.writeFileSync(target, raw, 'utf-8')
  pruneBackups()
}

function maybeCreateBackup(): void {
  try {
    const newest = listBackupFiles()[0]
    if (newest && Date.now() - newest.createdAt < BACKUP_INTERVAL_MS) return
    createBackupNow()
  } catch { /* backups are best-effort; never block a state write */ }
}

export function persistState(stateJson: string): void {
  try {
    maybeCreateBackup()
    const file = stateFile()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    // Write-then-rename so an app crash mid-write never corrupts the state
    // file, plus fsync on file and directory so even power loss / OS crash
    // cannot leave a truncated state.json behind (delayed allocation would
    // otherwise allow the rename to survive without the data blocks).
    const tmp = file + '.tmp'
    const fd = fs.openSync(tmp, 'w')
    try {
      fs.writeSync(fd, encryptForDisk(stateJson), null, 'utf-8')
      fs.fsyncSync(fd)
    } finally {
      fs.closeSync(fd)
    }
    fs.renameSync(tmp, file)
    try {
      const dirFd = fs.openSync(path.dirname(file), 'r')
      try {
        fs.fsyncSync(dirFd)
      } finally {
        fs.closeSync(dirFd)
      }
    } catch { /* directory fsync is unsupported on some platforms (Windows) */ }
  } catch (err) {
    console.error('Failed to persist state:', err)
  }
}

function isValidStateJson(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null
    return !!parsed && typeof parsed === 'object' && !!parsed.tournaments && typeof parsed.tournaments === 'object'
  } catch {
    return false
  }
}

export interface LoadedState {
  state: string
  recoveredFrom: string | null
  recoveredAt: number | null
}

export function loadPersistedState(): LoadedState | null {
  const file = stateFile()
  let fileIsBad = false
  try {
    const plain = decryptFromDisk(fs.readFileSync(file, 'utf-8'))
    if (plain !== null && isValidStateJson(plain)) return { state: plain, recoveredFrom: null, recoveredAt: null }
    fileIsBad = true
  } catch {
    fileIsBad = fs.existsSync(file) // present but unreadable
  }

  // Always move a bad state file aside before anything else: the next persist
  // must neither push it into the backup rotation nor overwrite it — an
  // undecryptable ciphertext becomes readable again if the keychain returns.
  if (fileIsBad) {
    try {
      fs.rmSync(file + '.corrupt', { force: true })
      fs.renameSync(file, file + '.corrupt')
    } catch { /* ignore */ }
  }

  for (const backup of listBackupFiles()) {
    try {
      const plain = decryptFromDisk(fs.readFileSync(path.join(backupDir(), backup.name), 'utf-8'))
      if (plain === null || !isValidStateJson(plain)) continue
      return { state: plain, recoveredFrom: backup.name, recoveredAt: backup.createdAt }
    } catch { /* try older backup */ }
  }

  return null
}

export function readBackupFile(name: string): string {
  if (!BACKUP_NAME_RE.test(name)) {
    throw new Error(`Invalid backup name: ${name}`)
  }
  // Restoring will overwrite the live state, so snapshot it first
  createBackupNow()
  const plain = decryptFromDisk(fs.readFileSync(path.join(backupDir(), name), 'utf-8'))
  if (plain === null) throw new Error(`Cannot decrypt backup: ${name}`)
  return plain
}

export function registerStorageHandlers() {
  // Synchronous on purpose: the renderer loads its initial state before the
  // first render, so there is no window where an empty state could be saved.
  ipcMain.on('storage:load', event => {
    try {
      event.returnValue = loadPersistedState()
    } catch {
      event.returnValue = null
    }
  })

  // Synchronous so a flush during beforeunload is guaranteed to complete
  ipcMain.on('storage:flush', (event, state: string) => {
    persistState(state)
    event.returnValue = true
  })

  ipcMain.handle('storage:listBackups', () => listBackupFiles())

  ipcMain.handle('storage:readBackup', (_event, name: string) => readBackupFile(name))

  ipcMain.handle('storage:encryptionStatus', () => isEncryptionActive())
}
