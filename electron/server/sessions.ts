import crypto from 'node:crypto'

// Per-device session tokens for the mobile page. A token is issued when a
// player registers (or re-claims their name while registration is open) and
// proves ownership of that player name within one tournament. The name is only
// the initial claim: as soon as the token is used while the player exists in
// state, the session is bound to the player id, so a TO renaming the player
// no longer disconnects the device. Tokens live in memory only: an app restart
// invalidates them, but a player can re-claim their name during the
// registration phase, and after registration closes the mobile page no longer
// needs the token (it is only used for decklists and drops).
interface Session {
  tournamentId: string
  playerName: string // lowercased
  playerId: string | null // bound lazily on first authorized use
}

// Insertion-ordered; oldest entries are evicted beyond this cap so register
// spam cannot grow the map without bound.
const MAX_SESSIONS = 1000
const sessions = new Map<string, Session>()

// TO-issued tokens (shown as per-player QR codes), keyed by tournament+player
// so re-opening the QR window hands out the same token instead of minting a
// new session per click.
const toIssuedTokens = new Map<string, string>()

function evictOldest(): void {
  while (sessions.size > MAX_SESSIONS) {
    const oldest = sessions.keys().next().value
    if (oldest === undefined) break
    sessions.delete(oldest)
  }
}

export function createSession(tournamentId: string, playerName: string): string {
  const token = crypto.randomBytes(24).toString('base64url')
  sessions.set(token, { tournamentId, playerName: playerName.toLowerCase(), playerId: null })
  evictOldest()
  return token
}

// Session pre-bound to a player, issued by the TO (per-player QR code). Unlike
// name-claimed sessions this needs no open registration phase and is immune to
// the first-claim race: the token only ever leaves the app via the QR code the
// TO hands to the player.
export function createPlayerSession(tournamentId: string, playerId: string, playerName: string): string {
  const key = `${tournamentId}:${playerId}`
  const existing = toIssuedTokens.get(key)
  if (existing) {
    const session = sessions.get(existing)
    if (session && session.tournamentId === tournamentId && session.playerId === playerId) return existing
  }
  const token = crypto.randomBytes(24).toString('base64url')
  sessions.set(token, { tournamentId, playerName: playerName.toLowerCase(), playerId })
  toIssuedTokens.set(key, token)
  evictOldest()
  return token
}

// True if any live session already claims this player: bound sessions count by
// player id, unbound ones by the name they claimed. Guards /api/register so a
// second device cannot take over a name that is already in use.
export function isNameClaimed(tournamentId: string, playerId: string | null, nameLower: string): boolean {
  for (const session of sessions.values()) {
    if (session.tournamentId !== tournamentId) continue
    if (session.playerId !== null ? session.playerId === playerId : session.playerName === nameLower) return true
  }
  return false
}

// Test helper — sessions are module state shared across a test file.
export function clearSessions(): void {
  sessions.clear()
  toIssuedTokens.clear()
}

// Returns the session the token was issued for, or null if the token is
// unknown or belongs to a different tournament.
export function getSession(token: string | null, tournamentId: string): { playerName: string; playerId: string | null } | null {
  if (!token) return null
  const session = sessions.get(token)
  if (!session || session.tournamentId !== tournamentId) return null
  return { playerName: session.playerName, playerId: session.playerId }
}

// Permanently ties a session to a player id. First binding wins — a session
// follows the player it first authenticated as, even through renames.
export function bindSessionToPlayer(token: string, playerId: string): void {
  const session = sessions.get(token)
  if (session && session.playerId === null) session.playerId = playerId
}
