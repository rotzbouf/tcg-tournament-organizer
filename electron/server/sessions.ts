import crypto from 'node:crypto'

// Per-device session tokens for the mobile page. A token is issued when a
// player registers (or re-claims their name while registration is open) and
// proves ownership of that player name within one tournament. Tokens live in
// memory only: an app restart invalidates them, but a player can re-claim
// their name during the registration phase, and after registration closes the
// mobile page no longer needs the token (it is only used for decklists).
interface Session {
  tournamentId: string
  playerName: string // lowercased
}

// Insertion-ordered; oldest entries are evicted beyond this cap so register
// spam cannot grow the map without bound.
const MAX_SESSIONS = 1000
const sessions = new Map<string, Session>()

export function createSession(tournamentId: string, playerName: string): string {
  const token = crypto.randomBytes(24).toString('base64url')
  sessions.set(token, { tournamentId, playerName: playerName.toLowerCase() })
  while (sessions.size > MAX_SESSIONS) {
    const oldest = sessions.keys().next().value
    if (oldest === undefined) break
    sessions.delete(oldest)
  }
  return token
}

// Returns the lowercased player name the token was issued for, or null if the
// token is unknown or belongs to a different tournament.
export function getSessionPlayerName(token: string | null, tournamentId: string): string | null {
  if (!token) return null
  const session = sessions.get(token)
  if (!session || session.tournamentId !== tournamentId) return null
  return session.playerName
}
