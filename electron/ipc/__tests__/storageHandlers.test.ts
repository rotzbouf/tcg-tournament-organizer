/** @vitest-environment node */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const testDir = vi.hoisted(() => ({ current: '' }))
const enc = vi.hoisted(() => ({ available: false }))

// Fake safeStorage: reversible base64 with an ENC marker, so bad ciphertext
// throws like the real keychain-backed implementation does.
vi.mock('electron', () => ({
  app: { getPath: () => testDir.current },
  ipcMain: { on: vi.fn(), handle: vi.fn() },
  safeStorage: {
    isEncryptionAvailable: () => enc.available,
    encryptString: (s: string) => Buffer.from('ENC' + Buffer.from(s, 'utf-8').toString('base64'), 'utf-8'),
    decryptString: (b: Buffer) => {
      const str = b.toString('utf-8')
      if (!str.startsWith('ENC')) throw new Error('bad ciphertext')
      return Buffer.from(str.slice(3), 'base64').toString('utf-8')
    },
  },
}))

import { persistState, loadPersistedState, readBackupFile } from '../storageHandlers'

const VALID_STATE = JSON.stringify({ tournaments: { t1: { id: 't1' } }, playerDatabase: {} })
const OTHER_STATE = JSON.stringify({ tournaments: { t2: { id: 't2' } }, playerDatabase: {} })
const EMPTY_STATE = JSON.stringify({ tournaments: {}, playerDatabase: {}, seasons: [], templates: [] })

const stateFile = () => path.join(testDir.current, 'state.json')
const backupDir = () => path.join(testDir.current, 'backups')

function listBackups(): string[] {
  try {
    return fs.readdirSync(backupDir()).sort()
  } catch {
    return []
  }
}

function ageNewestBackup(ms: number) {
  const newest = listBackups().at(-1)!
  const old = new Date(Date.now() - ms)
  fs.utimesSync(path.join(backupDir(), newest), old, old)
}

beforeEach(() => {
  testDir.current = fs.mkdtempSync(path.join(os.tmpdir(), 'tcg-storage-test-'))
  enc.available = false
})

describe('persistState', () => {
  it('writes the state file without leaving a temp file behind', () => {
    persistState(VALID_STATE)
    expect(fs.readFileSync(stateFile(), 'utf-8')).toBe(VALID_STATE)
    expect(fs.existsSync(stateFile() + '.tmp')).toBe(false)
  })

  it('creates no backup on the first write (nothing to back up yet)', () => {
    persistState(VALID_STATE)
    expect(listBackups()).toHaveLength(0)
  })

  it('backs up the previous state before overwriting once the interval elapsed', () => {
    persistState(VALID_STATE)
    persistState(OTHER_STATE)
    expect(listBackups()).toHaveLength(1)
    const backup = fs.readFileSync(path.join(backupDir(), listBackups()[0]), 'utf-8')
    expect(backup).toBe(VALID_STATE)
  })

  it('skips the backup while the newest one is fresher than the interval', () => {
    persistState(VALID_STATE)
    persistState(OTHER_STATE)
    persistState(VALID_STATE)
    persistState(OTHER_STATE)
    expect(listBackups()).toHaveLength(1)
  })

  it('creates another backup once the newest one is old enough', () => {
    persistState(VALID_STATE)
    persistState(OTHER_STATE)
    ageNewestBackup(11 * 60 * 1000)
    persistState(VALID_STATE)
    expect(listBackups()).toHaveLength(2)
  })

  it('never puts an empty state into the backup rotation', () => {
    persistState(EMPTY_STATE)
    persistState(VALID_STATE)
    expect(listBackups()).toHaveLength(0)
    // the first worthwhile state is what gets backed up next
    persistState(OTHER_STATE)
    expect(listBackups()).toHaveLength(1)
    expect(fs.readFileSync(path.join(backupDir(), listBackups()[0]), 'utf-8')).toBe(VALID_STATE)
  })

  it('never puts a corrupt state file into the backup rotation', () => {
    persistState(VALID_STATE)
    persistState(OTHER_STATE)
    ageNewestBackup(11 * 60 * 1000)
    fs.writeFileSync(stateFile(), 'garbage', 'utf-8')
    persistState(VALID_STATE)
    expect(listBackups()).toHaveLength(1)
  })

  it('prunes the rotation to 10 backups, dropping the oldest', () => {
    fs.mkdirSync(backupDir(), { recursive: true })
    for (let i = 10; i < 22; i++) {
      fs.writeFileSync(path.join(backupDir(), `state-2026-01-${i}T00-00-00-000Z.json`), VALID_STATE)
    }
    persistState(VALID_STATE)
    ageNewestBackup(11 * 60 * 1000)
    persistState(OTHER_STATE)
    const backups = listBackups()
    expect(backups).toHaveLength(10)
    expect(backups).not.toContain('state-2026-01-10T00-00-00-000Z.json')
  })
})

describe('loadPersistedState', () => {
  it('returns null when nothing was ever persisted', () => {
    expect(loadPersistedState()).toBeNull()
  })

  it('loads the state file when it is valid', () => {
    persistState(VALID_STATE)
    expect(loadPersistedState()).toEqual({ state: VALID_STATE, recoveredFrom: null, recoveredAt: null })
  })

  it('recovers from the newest valid backup when the state file is corrupt', () => {
    persistState(VALID_STATE)
    persistState(OTHER_STATE)
    fs.writeFileSync(stateFile(), '{"tournaments": {truncated', 'utf-8')

    const loaded = loadPersistedState()
    expect(loaded?.state).toBe(VALID_STATE)
    expect(loaded?.recoveredFrom).toMatch(/^state-.*\.json$/)
    expect(loaded?.recoveredAt).toBeTypeOf('number')
  })

  it('moves the corrupt state file aside so it never enters the backup rotation', () => {
    persistState(VALID_STATE)
    persistState(OTHER_STATE)
    fs.writeFileSync(stateFile(), 'not json', 'utf-8')

    loadPersistedState()
    expect(fs.existsSync(stateFile())).toBe(false)
    expect(fs.readFileSync(stateFile() + '.corrupt', 'utf-8')).toBe('not json')
  })

  it('treats a state file with the wrong shape as corrupt', () => {
    persistState(VALID_STATE)
    persistState(OTHER_STATE)
    fs.writeFileSync(stateFile(), JSON.stringify({ foo: 'bar' }), 'utf-8')

    expect(loadPersistedState()?.state).toBe(VALID_STATE)
  })

  it('skips corrupt backups and falls through to an older valid one', () => {
    fs.mkdirSync(backupDir(), { recursive: true })
    fs.writeFileSync(path.join(backupDir(), 'state-2026-07-04T10-00-00-000Z.json'), VALID_STATE, 'utf-8')
    fs.writeFileSync(path.join(backupDir(), 'state-2026-07-04T11-00-00-000Z.json'), 'garbage', 'utf-8')

    const loaded = loadPersistedState()
    expect(loaded?.state).toBe(VALID_STATE)
    expect(loaded?.recoveredFrom).toBe('state-2026-07-04T10-00-00-000Z.json')
  })

  it('returns null when the state file and all backups are corrupt', () => {
    persistState(VALID_STATE)
    persistState(OTHER_STATE)
    fs.writeFileSync(stateFile(), 'x', 'utf-8')
    fs.writeFileSync(path.join(backupDir(), listBackups()[0]), 'y', 'utf-8')

    expect(loadPersistedState()).toBeNull()
  })
})

describe('encryption at rest', () => {
  beforeEach(() => {
    enc.available = true
  })

  it('writes ciphertext to disk and loads it back as plaintext', () => {
    persistState(VALID_STATE)
    const onDisk = fs.readFileSync(stateFile(), 'utf-8')
    expect(onDisk.startsWith('TCGSAFE1:')).toBe(true)
    expect(onDisk).not.toContain('t1')
    expect(loadPersistedState()).toEqual({ state: VALID_STATE, recoveredFrom: null, recoveredAt: null })
  })

  it('still reads a legacy plaintext state file', () => {
    fs.writeFileSync(stateFile(), VALID_STATE, 'utf-8')
    expect(loadPersistedState()?.state).toBe(VALID_STATE)
  })

  it('keeps backups encrypted and decrypts them on restore', () => {
    persistState(VALID_STATE)
    persistState(OTHER_STATE)
    const name = listBackups()[0]
    const backupOnDisk = fs.readFileSync(path.join(backupDir(), name), 'utf-8')
    expect(backupOnDisk.startsWith('TCGSAFE1:')).toBe(true)
    expect(readBackupFile(name)).toBe(VALID_STATE)
    expect(loadPersistedState()?.state).toBe(OTHER_STATE)
  })

  it('applies the empty-state backup guard through the encryption layer', () => {
    persistState(EMPTY_STATE)
    persistState(VALID_STATE)
    expect(listBackups()).toHaveLength(0)
    persistState(OTHER_STATE)
    expect(listBackups()).toHaveLength(1)
    expect(readBackupFile(listBackups()[0])).toBe(VALID_STATE)
  })

  it('treats an undecryptable state file as corrupt and recovers from a backup', () => {
    persistState(VALID_STATE)
    persistState(OTHER_STATE)
    // simulate a changed/unavailable keychain: valid prefix, garbage ciphertext
    fs.writeFileSync(stateFile(), 'TCGSAFE1:' + Buffer.from('garbage').toString('base64'), 'utf-8')

    const loaded = loadPersistedState()
    expect(loaded?.state).toBe(VALID_STATE)
    expect(loaded?.recoveredFrom).toMatch(/^state-.*\.json$/)
    // the ciphertext is preserved for forensics instead of being overwritten
    expect(fs.existsSync(stateFile() + '.corrupt')).toBe(true)
  })

  it('preserves the ciphertext even when no backup can rescue it', () => {
    // keychain gone: state file and all backups are undecryptable
    persistState(VALID_STATE)
    persistState(OTHER_STATE)
    const badCipher = 'TCGSAFE1:' + Buffer.from('garbage').toString('base64')
    fs.writeFileSync(stateFile(), badCipher, 'utf-8')
    fs.writeFileSync(path.join(backupDir(), listBackups()[0]), badCipher, 'utf-8')

    expect(loadPersistedState()).toBeNull()
    // the ciphertext was moved aside, so the next persist cannot overwrite it
    expect(fs.existsSync(stateFile())).toBe(false)
    expect(fs.readFileSync(stateFile() + '.corrupt', 'utf-8')).toBe(badCipher)
    persistState(EMPTY_STATE)
    expect(fs.readFileSync(stateFile() + '.corrupt', 'utf-8')).toBe(badCipher)
  })

  it('falls back to plaintext when encryption is unavailable, and reads both formats', () => {
    persistState(VALID_STATE)
    enc.available = false
    persistState(OTHER_STATE) // written plaintext; previous encrypted file becomes the backup
    expect(fs.readFileSync(stateFile(), 'utf-8')).toBe(OTHER_STATE)
    expect(loadPersistedState()?.state).toBe(OTHER_STATE)
    enc.available = true
    expect(loadPersistedState()?.state).toBe(OTHER_STATE)
  })
})

describe('readBackupFile', () => {
  it('returns the backup content and snapshots the current state first', () => {
    persistState(VALID_STATE)
    persistState(OTHER_STATE)
    const name = listBackups()[0]

    const content = readBackupFile(name)
    expect(content).toBe(VALID_STATE)
    // restore safety net: the pre-restore state was backed up
    const snapshots = listBackups().filter(n => n !== name)
    expect(snapshots).toHaveLength(1)
    expect(fs.readFileSync(path.join(backupDir(), snapshots[0]), 'utf-8')).toBe(OTHER_STATE)
  })

  it('rejects names that are not plain backup file names', () => {
    persistState(VALID_STATE)
    expect(() => readBackupFile('../state.json')).toThrow()
    expect(() => readBackupFile('/etc/passwd')).toThrow()
    expect(() => readBackupFile('state-..-..json')).toThrow()
  })
})
