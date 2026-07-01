import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { getCurrentState, getCurrentTimers, dispatchToRenderer, sendJudgeCall, sendMatchReport } from '../ipc/stateSync'
import { addClient, sanitizeTournament } from './sse'
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

export function handleRequest(req: http.IncomingMessage, res: http.ServerResponse, boundTournamentId: string): void {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  const reqPath = url.pathname

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

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
      if (!playerName?.trim()) { jsonResponse(res, { error: 'name required' }, 400); return }
      const payload: Record<string, unknown> = { tournamentId: boundTournamentId, playerName: playerName.trim() }
      if (playerId?.trim()) payload.playerId = playerId.trim()
      if (dateOfBirth?.trim()) payload.dateOfBirth = dateOfBirth.trim()
      dispatchToRenderer({ type: 'ADD_PLAYER', payload })
      jsonResponse(res, { ok: true })
    })
    return
  }

  const decklistMatch = reqPath.match(/^\/api\/players\/([^/]+)\/decklist$/)
  if (decklistMatch && req.method === 'POST') {
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

  const resultMatch = reqPath.match(/^\/api\/matches\/([^/]+)\/result$/)
  if (resultMatch && req.method === 'POST') {
    readBody(req, res, (body) => {
      const { result, player1Games, player2Games } = body as { result?: string; player1Games?: number; player2Games?: number }
      if (!result || !['player1_win', 'player2_win', 'draw'].includes(result)) {
        jsonResponse(res, { error: 'invalid result' }, 400); return
      }
      const payload: Record<string, unknown> = {
        tournamentId: boundTournamentId, matchId: resultMatch[1], result,
      }
      if (player1Games !== undefined) payload.player1Games = player1Games
      if (player2Games !== undefined) payload.player2Games = player2Games
      dispatchToRenderer({ type: 'SUBMIT_MATCH_RESULT', payload })
      jsonResponse(res, { ok: true })
    })
    return
  }

  jsonResponse(res, { error: 'not found' }, 404)
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
