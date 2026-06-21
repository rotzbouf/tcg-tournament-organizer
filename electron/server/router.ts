import http from 'node:http'
import { getCurrentState, getCurrentTimers, dispatchToRenderer } from '../ipc/stateSync'
import { addClient } from './sse'
import { calculateStandings } from '@/engine/standings'
import { parseDecklistText } from '@/lib/decklistParser'

// @ts-expect-error -- raw import handled by vite-plugin-electron
import mobileHtml from './mobile.html?raw'

interface Tournament {
  id: string
  name: string
  game: string
  format: string
  status: string
  players: Array<{ id: string; name: string; deckName: string | null; decklist: unknown; droppedInRound: number | null }>
  rounds: Array<{ roundNumber: number; matches: Array<{ id: string; player1Id: string; player2Id: string | null; result: string; tableNumber: number; isBye: boolean; player1Games?: number; player2Games?: number }>; isComplete: boolean; phase: string }>
  roundTimeMinutes: number
  currentRound: number
  totalRounds: number
}

export function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  const path = url.pathname

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (path === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(mobileHtml)
    return
  }

  if (path === '/api/events' && req.method === 'GET') {
    addClient(res)
    return
  }

  if (path === '/api/state' && req.method === 'GET') {
    jsonResponse(res, { state: getCurrentState(), timers: getCurrentTimers() })
    return
  }

  if (path === '/api/tournaments' && req.method === 'GET') {
    const state = getCurrentState() as { tournaments: Record<string, Tournament> } | null
    if (!state) { jsonResponse(res, [], 200); return }
    const list = Object.values(state.tournaments).map(t => ({
      id: t.id, name: t.name, game: t.game, format: t.format, status: t.status,
      playerCount: t.players.length, currentRound: t.currentRound, totalRounds: t.totalRounds,
    }))
    jsonResponse(res, list)
    return
  }

  const tournamentMatch = path.match(/^\/api\/tournaments\/([^/]+)$/)
  if (tournamentMatch && req.method === 'GET') {
    const state = getCurrentState() as { tournaments: Record<string, Tournament> } | null
    const tournament = state?.tournaments[tournamentMatch[1]]
    if (!tournament) { jsonResponse(res, { error: 'not found' }, 404); return }
    const standings = calculateStandings(tournament.players as never[], tournament.rounds as never[], tournament.game as never)
    jsonResponse(res, { tournament, standings, timers: getCurrentTimers() })
    return
  }

  const registerMatch = path.match(/^\/api\/tournaments\/([^/]+)\/register$/)
  if (registerMatch && req.method === 'POST') {
    readBody(req, (body) => {
      const { playerName } = body as { playerName?: string }
      if (!playerName?.trim()) { jsonResponse(res, { error: 'name required' }, 400); return }
      dispatchToRenderer({
        type: 'ADD_PLAYER',
        payload: { tournamentId: registerMatch[1], playerName: playerName.trim() },
      })
      jsonResponse(res, { ok: true })
    })
    return
  }

  const decklistMatch = path.match(/^\/api\/tournaments\/([^/]+)\/players\/([^/]+)\/decklist$/)
  if (decklistMatch && req.method === 'POST') {
    readBody(req, (body) => {
      const { decklistText } = body as { decklistText?: string }
      if (!decklistText) { jsonResponse(res, { error: 'decklist required' }, 400); return }
      const entries = parseDecklistText(decklistText)
      dispatchToRenderer({
        type: 'UPDATE_PLAYER',
        payload: { tournamentId: decklistMatch[1], playerId: decklistMatch[2], decklist: entries.length > 0 ? entries : null },
      })
      jsonResponse(res, { ok: true })
    })
    return
  }

  const resultMatch = path.match(/^\/api\/tournaments\/([^/]+)\/matches\/([^/]+)\/result$/)
  if (resultMatch && req.method === 'POST') {
    readBody(req, (body) => {
      const { result, player1Games, player2Games } = body as { result?: string; player1Games?: number; player2Games?: number }
      if (!result || !['player1_win', 'player2_win', 'draw'].includes(result)) {
        jsonResponse(res, { error: 'invalid result' }, 400); return
      }
      const payload: Record<string, unknown> = {
        tournamentId: resultMatch[1], matchId: resultMatch[2], result,
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

function readBody(req: http.IncomingMessage, callback: (body: unknown) => void): void {
  let data = ''
  req.on('data', (chunk: Buffer) => { data += chunk.toString() })
  req.on('end', () => {
    try { callback(JSON.parse(data)) }
    catch { callback({}) }
  })
}
