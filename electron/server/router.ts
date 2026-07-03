import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { getCurrentState, getCurrentTimers, dispatchToRenderer, sendJudgeCall, sendMatchReport } from '../ipc/stateSync'
import { addClient, sanitizeTournament } from './sse'
import { createSession, getSession, bindSessionToPlayer } from './sessions'
import { calculateStandings } from '../../src/engine/standings'
import { parseDecklistText } from '../../src/lib/decklistParser'

let mobileHtmlCache: string | null = null

function getMobileHtml(): string {
  if (mobileHtmlCache) return mobileHtmlCache
  const candidates = [
    path.join(process.resourcesPath || '', 'mobile.html'),
    path.join(__dirname, 'mobile.html'),
    path.join(__dirname, '../electron/server/mobile.html'),
    path.join(app?.getAppPath?.() || '', 'electron/server/mobile.html'),
  ]
  for (const p of candidates) {
    try {
      mobileHtmlCache = fs.readFileSync(p, 'utf-8')
      return mobileHtmlCache
    } catch { /* try next */ }
  }
  return '<html><body><h1>Mobile page not found</h1></body></html>'
}

interface Tournament {
  id: string
  name: string
  game: string
  format: string
  status: string
  decklistVisibility: 'hidden' | 'to_only' | 'public'
  players: Array<{ id: string; name: string; deckName: string | null; decklist: unknown; droppedInRound: number | null }>
  rounds: Array<{ roundNumber: number; matches: Array<{ id: string; player1Id: string; player2Id: string | null; result: string; tableNumber: number; isBye: boolean; player1Games?: number; player2Games?: number }>; isComplete: boolean; phase: string }>
  roundTimeMinutes: number
  currentRound: number
  totalRounds: number
}

// Clients reach this server via its LAN IP (or localhost while testing), so a
// legitimate Host header is always an IP literal. A DNS name here means a
// browser resolved someone else's domain to this address (DNS rebinding) —
// reject it. No CORS headers are set anywhere: the mobile page is served from
// this same origin, so no cross-origin access is ever legitimate.
function isAllowedHost(hostHeader: string | undefined): boolean {
  const hostname = (hostHeader || '').replace(/:\d+$/, '')
  return hostname === 'localhost'
    || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
    || /^\[[0-9a-fA-F:.]+\]$/.test(hostname)
}

export function handleRequest(req: http.IncomingMessage, res: http.ServerResponse, boundTournamentId: string): void {
  if (!isAllowedHost(req.headers.host)) {
    jsonResponse(res, { error: 'forbidden' }, 403)
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  const reqPath = url.pathname

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (reqPath === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(getMobileHtml())
    return
  }

  if (reqPath === '/api/events' && req.method === 'GET') {
    const state = getCurrentState()
    const timers = getCurrentTimers()
    addClient(res, boundTournamentId, state ? { state, timers } : undefined)
    return
  }

  if (reqPath === '/api/state' && req.method === 'GET') {
    const full = getCurrentState() as { tournaments?: Record<string, unknown> } | null
    const tournament = full?.tournaments?.[boundTournamentId]
    jsonResponse(res, {
      state: { tournaments: tournament ? { [boundTournamentId]: sanitizeTournament(tournament) } : {} },
      timers: getCurrentTimers(),
      tournamentId: boundTournamentId,
    })
    return
  }

  if (reqPath === '/api/tournament' && req.method === 'GET') {
    const state = getCurrentState() as { tournaments: Record<string, Tournament> } | null
    const tournament = state?.tournaments[boundTournamentId]
    if (!tournament) { jsonResponse(res, { error: 'not found' }, 404); return }
    const standings = calculateStandings(tournament.players as never[], tournament.rounds as never[], tournament.game as never)
    jsonResponse(res, { tournament: sanitizeTournament(tournament), standings, timers: getCurrentTimers() })
    return
  }

  if (reqPath === '/api/decklists' && req.method === 'GET') {
    const state = getCurrentState() as { tournaments: Record<string, Tournament> } | null
    const tournament = state?.tournaments[boundTournamentId]
    if (!tournament) { jsonResponse(res, { error: 'not found' }, 404); return }
    if (tournament.decklistVisibility !== 'public') { jsonResponse(res, { error: 'decklists not public' }, 403); return }
    const decklists = tournament.players
      .filter(p => p.decklist && !p.droppedInRound)
      .map(p => ({ playerId: p.id, name: p.name, deckName: p.deckName, decklist: p.decklist }))
    jsonResponse(res, { decklists })
    return
  }

  if (reqPath === '/api/register' && req.method === 'POST') {
    readBody(req, res, (body) => {
      const { playerName, playerId, dateOfBirth } = body as { playerName?: string; playerId?: string; dateOfBirth?: string }
      const name = playerName?.trim()
      if (!name) { jsonResponse(res, { error: 'name required' }, 400); return }
      const state = getCurrentState() as { tournaments: Record<string, Tournament> } | null
      const tournament = state?.tournaments[boundTournamentId]
      if (!tournament || tournament.status !== 'registration') {
        jsonResponse(res, { error: 'registration closed' }, 403); return
      }
      // Re-claiming an existing name (e.g. the TO registered the player at the
      // desk, or the phone lost its session) must not create a duplicate. The
      // pending check closes the sync gap: a name dispatched moments ago is not
      // visible in getCurrentState() yet.
      const nameLower = name.toLowerCase()
      const exists = tournament.players.some(p => p.name.toLowerCase() === nameLower)
      if (!exists && !hasPendingRegistration(boundTournamentId, nameLower)) {
        markPendingRegistration(boundTournamentId, nameLower)
        const payload: Record<string, unknown> = { tournamentId: boundTournamentId, playerName: name }
        if (playerId?.trim()) payload.playerId = playerId.trim()
        if (dateOfBirth?.trim()) payload.dateOfBirth = dateOfBirth.trim()
        dispatchToRenderer({ type: 'ADD_PLAYER', payload })
      }
      jsonResponse(res, { ok: true, token: createSession(boundTournamentId, name) })
    })
    return
  }

  // A player's own decklist, gated by the session token from /api/register —
  // decklists are stripped from the broadcast state so hidden/to_only lists
  // never reach other devices.
  if (reqPath === '/api/my-decklist' && req.method === 'GET') {
    const token = getBearerToken(req)
    const session = getSession(token, boundTournamentId)
    if (!session) { jsonResponse(res, { error: 'invalid session' }, 401); return }
    const state = getCurrentState() as { tournaments: Record<string, Tournament> } | null
    const players = state?.tournaments[boundTournamentId]?.players
    const player = session.playerId
      ? players?.find(p => p.id === session.playerId)
      : players?.find(p => p.name.toLowerCase() === session.playerName)
    if (!player) { jsonResponse(res, { error: 'not found' }, 404); return }
    if (token && !session.playerId) bindSessionToPlayer(token, player.id)
    jsonResponse(res, { playerId: player.id, deckName: player.deckName, decklist: player.decklist })
    return
  }

  const decklistMatch = reqPath.match(/^\/api\/players\/([^/]+)\/decklist$/)
  if (decklistMatch && req.method === 'POST') {
    if (!isOwnPlayer(req, boundTournamentId, decklistMatch[1])) {
      jsonResponse(res, { error: 'invalid session' }, 401); return
    }
    readBody(req, res, (body) => {
      const { decklistText } = body as { decklistText?: string }
      if (!decklistText) { jsonResponse(res, { error: 'decklist required' }, 400); return }
      const entries = parseDecklistText(decklistText)
      dispatchToRenderer({
        type: 'UPDATE_PLAYER',
        payload: { tournamentId: boundTournamentId, playerId: decklistMatch[1], decklist: entries.length > 0 ? entries : null },
      })
      jsonResponse(res, { ok: true })
    })
    return
  }

  const dropMatch = reqPath.match(/^\/api\/players\/([^/]+)\/drop$/)
  if (dropMatch && req.method === 'POST') {
    if (!isOwnPlayer(req, boundTournamentId, dropMatch[1])) {
      jsonResponse(res, { error: 'invalid session' }, 401); return
    }
    dispatchToRenderer({
      type: 'DROP_PLAYER',
      payload: { tournamentId: boundTournamentId, playerId: dropMatch[1] },
    })
    jsonResponse(res, { ok: true })
    return
  }

  if (reqPath === '/api/judge-call' && req.method === 'POST') {
    readBody(req, res, (body) => {
      const { playerName, tableNumber } = body as { playerName?: string; tableNumber?: number }
      if (!playerName) { jsonResponse(res, { error: 'name required' }, 400); return }
      const state = getCurrentState() as { tournaments: Record<string, Tournament> } | null
      const player = state?.tournaments[boundTournamentId]?.players.find(
        p => p.name.toLowerCase() === playerName.toLowerCase()
      )
      if (player?.droppedInRound !== null && player?.droppedInRound !== undefined) {
        jsonResponse(res, { error: 'dropped' }, 403); return
      }
      sendJudgeCall({ playerName, tableNumber: tableNumber ?? 0 })
      jsonResponse(res, { ok: true })
    })
    return
  }

  const reportMatch = reqPath.match(/^\/api\/matches\/([^/]+)\/report$/)
  if (reportMatch && req.method === 'POST') {
    readBody(req, res, (body) => {
      const { result, reporterName } = body as { result?: string; reporterName?: string }
      if (!result || !['player1_win', 'player2_win', 'draw'].includes(result)) {
        jsonResponse(res, { error: 'invalid result' }, 400); return
      }
      sendMatchReport({ matchId: reportMatch[1], result, reporterName: reporterName ?? '?', tournamentId: boundTournamentId })
      jsonResponse(res, { ok: true })
    })
    return
  }

  // Note: players submit results via /api/matches/:id/report, which requires TO
  // confirmation before the result is stored. There is deliberately no direct
  // result-writing endpoint from the mobile client.

  jsonResponse(res, { error: 'not found' }, 404)
}

function getBearerToken(req: http.IncomingMessage): string | null {
  const auth = req.headers.authorization
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null
}

// True if the request carries a session token that belongs to the player with
// the given id in the bound tournament — guards self-service writes (decklist,
// drop) so one device cannot act for another player. On the first successful
// match the session is bound to the player id, so it keeps working after the
// TO renames the player.
function isOwnPlayer(req: http.IncomingMessage, boundTournamentId: string, playerId: string): boolean {
  const token = getBearerToken(req)
  const session = getSession(token, boundTournamentId)
  if (!session) return false
  const state = getCurrentState() as { tournaments: Record<string, Tournament> } | null
  const target = state?.tournaments[boundTournamentId]?.players.find(p => p.id === playerId)
  if (!target) return false
  if (session.playerId) return session.playerId === playerId
  if (target.name.toLowerCase() !== session.playerName) return false
  if (token) bindSessionToPlayer(token, playerId)
  return true
}

// Registrations reach the renderer asynchronously and come back through a
// debounced state sync, so a just-dispatched player is invisible to
// getCurrentState() for up to ~500 ms. Names dispatched within this window
// count as already registered; the TTL keeps a TO-side removal re-registrable.
const PENDING_REGISTRATION_TTL_MS = 5000
const pendingRegistrations = new Map<string, number>()

function pendingKey(tournamentId: string, nameLower: string): string {
  return `${tournamentId} ${nameLower}`
}

function hasPendingRegistration(tournamentId: string, nameLower: string): boolean {
  const dispatchedAt = pendingRegistrations.get(pendingKey(tournamentId, nameLower))
  if (dispatchedAt === undefined) return false
  if (Date.now() - dispatchedAt > PENDING_REGISTRATION_TTL_MS) {
    pendingRegistrations.delete(pendingKey(tournamentId, nameLower))
    return false
  }
  return true
}

function markPendingRegistration(tournamentId: string, nameLower: string): void {
  pendingRegistrations.set(pendingKey(tournamentId, nameLower), Date.now())
}

function jsonResponse(res: http.ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

const MAX_BODY_BYTES = 1_000_000 // 1 MB — mobile payloads are tiny; cap to avoid memory exhaustion

function readBody(req: http.IncomingMessage, res: http.ServerResponse, callback: (body: unknown) => void): void {
  let data = ''
  let aborted = false
  req.on('data', (chunk: Buffer) => {
    if (aborted) return
    data += chunk.toString()
    if (data.length > MAX_BODY_BYTES) {
      aborted = true
      jsonResponse(res, { error: 'payload too large' }, 413)
      req.destroy()
    }
  })
  req.on('end', () => {
    if (aborted) return
    try { callback(JSON.parse(data)) }
    catch { callback({}) }
  })
}
