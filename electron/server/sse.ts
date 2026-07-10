import http from 'node:http'

interface Client {
  res: http.ServerResponse
  tournamentId: string
}

interface AppStateShape {
  tournaments?: Record<string, unknown>
}

const clients = new Set<Client>()
let keepaliveInterval: ReturnType<typeof setInterval> | null = null

interface TournamentLike {
  players?: Array<Record<string, unknown>>
  [key: string]: unknown
}

// Remove per-player personal data (date of birth, external player IDs) and
// decklists before a tournament leaves the app. The mobile page reads personal
// data from the local session; a player's own decklist comes from the
// token-gated /api/my-decklist endpoint, and public decklists from
// /api/decklists — so nothing here may bypass `decklistVisibility`.
// The deck-check log is a TO-side working record and stays off the wire too,
// as is the penalty list — penalties are between the player, the judge and the
// TO, not something every phone in the room should see. Judge devices read them
// via the token-gated /api/judge/penalties instead.
export function sanitizeTournament(tournament: unknown): unknown {
  const t = tournament as TournamentLike | null
  if (!t || !Array.isArray(t.players)) return tournament
  const clone = { ...t }
  delete clone.deckChecks
  delete clone.penalties
  return {
    ...clone,
    players: t.players.map(player => {
      const playerClone = { ...player }
      delete playerClone.dateOfBirth
      delete playerClone.playerId
      delete playerClone.decklist
      return playerClone
    }),
  }
}

// Reduce the full app state to only the tournament a client is bound to, with
// personal data stripped. This keeps the player database, other tournaments, and
// PII off the wire while preserving the shape the mobile page expects:
// `state.tournaments[boundTournamentId]`.
function scopeState(fullState: unknown, tournamentId: string): AppStateShape {
  const tournaments = (fullState as AppStateShape | null)?.tournaments
  const tournament = tournaments?.[tournamentId]
  return { tournaments: tournament ? { [tournamentId]: sanitizeTournament(tournament) } : {} }
}

function ensureKeepalive(): void {
  if (keepaliveInterval) return
  keepaliveInterval = setInterval(() => {
    for (const client of clients) client.res.write(':ping\n\n')
  }, 30000)
}

function stopKeepaliveIfIdle(): void {
  if (clients.size === 0 && keepaliveInterval) {
    clearInterval(keepaliveInterval)
    keepaliveInterval = null
  }
}

export function addClient(
  res: http.ServerResponse,
  tournamentId: string,
  initial?: { state: unknown; timers: unknown },
): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })
  res.write(':ok\n\n')
  if (initial?.state) {
    const payload = { type: 'state', state: scopeState(initial.state, tournamentId), timers: initial.timers ?? null }
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  const client: Client = { res, tournamentId }
  clients.add(client)
  res.on('close', () => {
    clients.delete(client)
    stopKeepaliveIfIdle()
  })

  ensureKeepalive()
}

export function broadcastState(fullState: unknown, timers: unknown): void {
  for (const client of clients) {
    const payload = { type: 'state', state: scopeState(fullState, client.tournamentId), timers }
    client.res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }
}

export function broadcastTimers(timers: unknown): void {
  const message = `data: ${JSON.stringify({ type: 'timers', timers })}\n\n`
  for (const client of clients) client.res.write(message)
}

export function getClientCount(tournamentId?: string): number {
  if (!tournamentId) return clients.size
  let count = 0
  for (const client of clients) if (client.tournamentId === tournamentId) count++
  return count
}

export function closeAll(tournamentId?: string): void {
  for (const client of [...clients]) {
    if (tournamentId && client.tournamentId !== tournamentId) continue
    client.res.end()
    clients.delete(client)
  }
  stopKeepaliveIfIdle()
}
