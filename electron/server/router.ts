import http from 'node:http'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { getCurrentState, getCurrentTimers, dispatchToRenderer, sendJudgeCall, sendMatchReport, sendDecklistSubmitted } from '../ipc/stateSync'
import { addClient, sanitizeTournament } from './sse'
import { createSession, getSession, bindSessionToPlayer, isNameClaimed, isJudgeSession, getJudgeLabel } from './sessions'
import { allowPost } from './rateLimit'
import { calculateStandings } from '../../src/engine/standings'
import { parseDecklistText } from '../../src/lib/decklistParser'
import { getInfraction, getAllCatalogs, CATEGORY_ORDER } from '../../src/lib/penaltyCatalog'
import deJson from '../../src/i18n/de.json'
import enJson from '../../src/i18n/en.json'

let mobileHtmlCache: string | null = null

// The penalty catalog the judge view needs, with bilingual labels taken from
// the app's i18n files. Injected into mobile.html at serve time so the page
// (which has no bundler) never carries its own copy that could drift.
function buildPenaltyCatalogPayload(): string {
  const label = (lang: typeof deJson, key: string): string =>
    (lang.penalties.infraction as Record<string, string>)[key] ?? key
  const catalogs: Record<string, unknown[]> = {}
  for (const [game, infractions] of Object.entries(getAllCatalogs())) {
    catalogs[game] = infractions.map(inf => ({
      i: inf.id,
      c: inf.category,
      d: inf.defaultPenalty,
      e: inf.escalates ? 1 : 0,
      l: { en: label(enJson, inf.id), de: label(deJson, inf.id) },
    }))
  }
  const categories: Record<string, { en: string; de: string }> = {}
  for (const cat of CATEGORY_ORDER) {
    categories[cat] = { en: enJson.penalties.category[cat], de: deJson.penalties.category[cat] }
  }
  return JSON.stringify({ order: CATEGORY_ORDER, categories, catalogs })
}

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
      const raw = fs.readFileSync(p, 'utf-8')
      mobileHtmlCache = raw.replace('/*__PENALTY_CATALOG__*/null', buildPenaltyCatalogPayload())
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
  penalties?: Array<{ playerId: string; infractionId?: string; type: string }>
  deckChecks?: Array<{ id: string; roundNumber: number; matchId: string; result: string | null }>
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

  // Every POST either writes state or raises a banner on the TO screen —
  // throttle them per device so one phone cannot flood the TO. Judge devices
  // are exempt: a judge entering a round's worth of results would trip the
  // player budget, and the token already proves the TO handed out access.
  if (req.method === 'POST'
    && !isJudgeSession(getBearerToken(req), boundTournamentId)
    && !allowPost(req.socket.remoteAddress || 'unknown')) {
    jsonResponse(res, { error: 'rate limited' }, 429)
    return
  }

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
      const existing = tournament.players.find(p => p.name.toLowerCase() === nameLower)
      // First claim wins: once any device (or a TO-issued QR token) holds a
      // session for this name/player, further claims are rejected — otherwise
      // any LAN device could take over a known player name. Recovery path for
      // a phone that lost its session is the per-player QR code from the TO.
      if (isNameClaimed(boundTournamentId, existing?.id ?? null, nameLower)) {
        jsonResponse(res, { error: 'name already claimed', code: 'claimed' }, 409)
        return
      }
      const exists = existing !== undefined
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

  // Resolves a session token to the player it belongs to. Used by the mobile
  // page when it adopts a TO-issued QR token: the phone only has the token and
  // needs to learn which player it represents.
  if (reqPath === '/api/me' && req.method === 'GET') {
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
    jsonResponse(res, { playerId: player.id, playerName: player.name })
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
      // After the tournament has started, flag a fresh submission to the TO so
      // the renderer (which owns the banlist) can check legality and warn. The
      // notification is informational only — the TO decides any action manually.
      if (entries.length > 0) {
        const state = getCurrentState() as { tournaments?: Record<string, Tournament> } | null
        const tournament = state?.tournaments?.[boundTournamentId]
        if (tournament && (tournament.status === 'in_progress' || tournament.status === 'top_cut')) {
          const player = tournament.players.find(p => p.id === decklistMatch[1])
          if (player) {
            sendDecklistSubmitted({ tournamentId: boundTournamentId, playerId: player.id, playerName: player.name, entries })
          }
        }
      }
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
      const { playerName, tableNumber, reasonCode, reasonText } = body as {
        playerName?: string; tableNumber?: number; reasonCode?: unknown; reasonText?: unknown
      }
      if (!playerName) { jsonResponse(res, { error: 'name required' }, 400); return }
      if (reasonCode !== undefined && !CALL_REASON_CODES.includes(reasonCode as string)) {
        jsonResponse(res, { error: 'invalid reason' }, 400); return
      }
      const state = getCurrentState() as { tournaments: Record<string, Tournament> } | null
      const player = state?.tournaments[boundTournamentId]?.players.find(
        p => p.name.toLowerCase() === playerName.toLowerCase()
      )
      if (player?.droppedInRound !== null && player?.droppedInRound !== undefined) {
        jsonResponse(res, { error: 'dropped' }, 403); return
      }
      const call = {
        playerName,
        tableNumber: tableNumber ?? 0,
        reasonCode: reasonCode !== undefined ? reasonCode as string : null,
        reasonText: typeof reasonText === 'string' ? reasonText.trim().slice(0, 120) : '',
      }
      sendJudgeCall(call)
      recordJudgeCall(boundTournamentId, { ...call, at: Date.now() })
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
      recordMatchReport(boundTournamentId, reportMatch[1], reporterName ?? '?', result)
      jsonResponse(res, { ok: true })
    })
    return
  }

  // Note: players submit results via /api/matches/:id/report, which requires TO
  // confirmation before the result is stored. There is deliberately no direct
  // result-writing endpoint from the mobile client.

  // Judge endpoints: gated by the TO-issued judge token (QR in the ServerPanel).
  // Judges are trusted staff, so results are dispatched directly — no TO
  // confirmation loop. Round advancement stays TO-only by design: there is no
  // judge endpoint for generating or completing rounds.
  if (reqPath.startsWith('/api/judge/')) {
    if (!isJudgeSession(getBearerToken(req), boundTournamentId)) {
      jsonResponse(res, { error: 'judge access required' }, 401)
      return
    }
    handleJudgeRequest(req, res, boundTournamentId, reqPath)
    return
  }

  jsonResponse(res, { error: 'not found' }, 404)
}

const KO_PHASES = new Set(['top_cut', 'winners_bracket', 'losers_bracket', 'grand_final'])
const PENALTY_TYPES = ['warning', 'game_loss', 'match_loss', 'disqualification', 'note'] // mirrors PenaltyType
// Quick reasons a player can attach to a judge call; labels live in the
// mobile page (player picks) and the app i18n (TO modal shows them).
const CALL_REASON_CODES = ['rule_question', 'result_dispute', 'missing_material', 'other']

function handleJudgeRequest(req: http.IncomingMessage, res: http.ServerResponse, boundTournamentId: string, reqPath: string): void {
  // The TO-chosen label of this judge token is the authoritative audit
  // identity; the device-chosen name from the request body is only the
  // fallback for unlabelled (legacy) tokens.
  const judgeLabel = getJudgeLabel(getBearerToken(req), boundTournamentId)
  const attribution = (bodyName: unknown): string => judgeLabel || cleanJudgeName(bodyName)

  // Token validity check for the mobile page when it adopts a judge QR; the
  // label lets the device prefill the judge name.
  if (reqPath === '/api/judge/me' && req.method === 'GET') {
    jsonResponse(res, { ok: true, role: 'judge', tournamentId: boundTournamentId, label: judgeLabel })
    return
  }

  // Recent judge calls, newest last — lets co-judges on the floor see calls
  // that otherwise only banner on the TO screen.
  if (reqPath === '/api/judge/calls' && req.method === 'GET') {
    jsonResponse(res, { calls: judgeCallLog.get(boundTournamentId) ?? [] })
    return
  }

  // A judge takes over a call. First claim wins: a second judge gets a 409
  // with the name of whoever is already on it. The judge name is per-device
  // (all co-judges share one token), chosen on the phone.
  const claimMatch = reqPath.match(/^\/api\/judge\/calls\/([^/]+)\/claim$/)
  if (claimMatch && req.method === 'POST') {
    readBody(req, res, (body) => {
      const judgeName = attribution((body as { judgeName?: string }).judgeName)
      if (!judgeName) { jsonResponse(res, { error: 'judge name required' }, 400); return }
      const call = (judgeCallLog.get(boundTournamentId) ?? []).find(c => c.id === claimMatch[1])
      if (!call) { jsonResponse(res, { error: 'call not found' }, 404); return }
      if (call.claimedBy && call.claimedBy.toLowerCase() !== judgeName.toLowerCase()) {
        jsonResponse(res, { error: 'already claimed', claimedBy: call.claimedBy }, 409)
        return
      }
      call.claimedBy = judgeName
      call.claimedAt ??= Date.now()
      jsonResponse(res, { ok: true })
    })
    return
  }

  // A judge marks a call as handled. Any judge may resolve (the one who dealt
  // with it on the floor is not necessarily the claimer); resolving an
  // unclaimed call claims it implicitly so the log shows who handled it.
  const resolveMatch = reqPath.match(/^\/api\/judge\/calls\/([^/]+)\/resolve$/)
  if (resolveMatch && req.method === 'POST') {
    readBody(req, res, (body) => {
      const judgeName = attribution((body as { judgeName?: string }).judgeName)
      if (!judgeName) { jsonResponse(res, { error: 'judge name required' }, 400); return }
      const call = (judgeCallLog.get(boundTournamentId) ?? []).find(c => c.id === resolveMatch[1])
      if (!call) { jsonResponse(res, { error: 'call not found' }, 404); return }
      if (!call.resolvedAt) {
        call.resolvedBy = judgeName
        call.resolvedAt = Date.now()
        call.claimedBy ??= judgeName
        call.claimedAt ??= call.resolvedAt
      }
      jsonResponse(res, { ok: true })
    })
    return
  }

  const state = getCurrentState() as { tournaments: Record<string, Tournament> } | null
  const tournament = state?.tournaments[boundTournamentId]
  if (!tournament) { jsonResponse(res, { error: 'not found' }, 404); return }

  // Penalties are stripped from the broadcast state (every phone receives it);
  // judges need them for the escalation suggestion, so they read them here.
  if (reqPath === '/api/judge/penalties' && req.method === 'GET') {
    jsonResponse(res, { penalties: tournament.penalties ?? [] })
    return
  }

  // Pending self-reports, mirrored from the player devices: what the TO sees
  // as a confirmation banner, a judge on the floor sees here. Only matches of
  // the current round that are still pending — once a result is stored (TO
  // confirmed, judge entered, round completed) the report disappears.
  if (reqPath === '/api/judge/reports' && req.method === 'GET') {
    const currentRound = tournament.rounds[tournament.rounds.length - 1]
    const byMatch = matchReportLog.get(boundTournamentId)
    const reports: Array<{ matchId: string; reports: MatchReportEntry[] }> = []
    if (byMatch && currentRound && !currentRound.isComplete) {
      // Prune reports for matches no longer in the current round (round
      // completed and regenerated, re-pairing) so the log cannot grow.
      for (const matchId of [...byMatch.keys()]) {
        if (!currentRound.matches.some(m => m.id === matchId)) byMatch.delete(matchId)
      }
      for (const match of currentRound.matches) {
        if (match.result !== 'pending' || match.isBye) continue
        const entries = byMatch.get(match.id)
        if (entries?.length) reports.push({ matchId: match.id, reports: entries })
      }
    }
    jsonResponse(res, { reports })
    return
  }

  const resultMatch = reqPath.match(/^\/api\/judge\/matches\/([^/]+)\/result$/)
  if (resultMatch && req.method === 'POST') {
    readBody(req, res, (body) => {
      const { result, player1Games, player2Games, judgeName } = body as { result?: string; player1Games?: unknown; player2Games?: unknown; judgeName?: unknown }
      if (!result || !['player1_win', 'player2_win', 'draw'].includes(result)) {
        jsonResponse(res, { error: 'invalid result' }, 400); return
      }
      if (tournament.status !== 'in_progress' && tournament.status !== 'top_cut') {
        jsonResponse(res, { error: 'tournament not running' }, 409); return
      }
      const currentRound = tournament.rounds[tournament.rounds.length - 1]
      if (!currentRound || currentRound.isComplete) {
        jsonResponse(res, { error: 'round complete' }, 409); return
      }
      const match = currentRound.matches.find(m => m.id === resultMatch[1])
      if (!match) { jsonResponse(res, { error: 'match not in current round' }, 404); return }
      if (match.isBye) { jsonResponse(res, { error: 'bye match' }, 400); return }
      // The reducer rejects this silently; fail loudly so the judge sees why.
      if (result === 'draw' && KO_PHASES.has(currentRound.phase)) {
        jsonResponse(res, { error: 'draw not allowed in knockout rounds' }, 400); return
      }
      const payload: Record<string, unknown> = { tournamentId: boundTournamentId, matchId: match.id, result }
      const g1 = Number(player1Games), g2 = Number(player2Games)
      if (Number.isInteger(g1) && Number.isInteger(g2) && g1 >= 0 && g2 >= 0 && g1 <= 9 && g2 <= 9) {
        payload.player1Games = g1
        payload.player2Games = g2
      }
      const enteredBy = attribution(judgeName)
      if (enteredBy) payload.enteredBy = enteredBy
      dispatchToRenderer({ type: 'SUBMIT_MATCH_RESULT', payload })
      jsonResponse(res, { ok: true })
    })
    return
  }

  // Time extension for a table (judge ruling, deck check, …). Judges add
  // minutes; a negative value corrects a mistaken grant (reducer floors at 0).
  const extraTimeMatch = reqPath.match(/^\/api\/judge\/matches\/([^/]+)\/extratime$/)
  if (extraTimeMatch && req.method === 'POST') {
    readBody(req, res, (body) => {
      const minutes = Number((body as { minutes?: unknown }).minutes)
      if (!Number.isInteger(minutes) || minutes === 0 || Math.abs(minutes) > 99) {
        jsonResponse(res, { error: 'invalid minutes' }, 400); return
      }
      if (tournament.status !== 'in_progress' && tournament.status !== 'top_cut') {
        jsonResponse(res, { error: 'tournament not running' }, 409); return
      }
      const currentRound = tournament.rounds[tournament.rounds.length - 1]
      if (!currentRound || currentRound.isComplete) {
        jsonResponse(res, { error: 'round complete' }, 409); return
      }
      const match = currentRound.matches.find(m => m.id === extraTimeMatch[1])
      if (!match) { jsonResponse(res, { error: 'match not in current round' }, 404); return }
      if (match.isBye) { jsonResponse(res, { error: 'bye match' }, 400); return }
      dispatchToRenderer({
        type: 'ADD_MATCH_EXTRA_TIME',
        payload: { tournamentId: boundTournamentId, matchId: match.id, minutes },
      })
      jsonResponse(res, { ok: true })
    })
    return
  }

  const penaltyMatch = reqPath.match(/^\/api\/judge\/players\/([^/]+)\/penalty$/)
  if (penaltyMatch && req.method === 'POST') {
    readBody(req, res, (body) => {
      const { type, reason, infractionId, judgeName } = body as { type?: string; reason?: string; infractionId?: string; judgeName?: unknown }
      if (!type || !PENALTY_TYPES.includes(type)) { jsonResponse(res, { error: 'invalid penalty type' }, 400); return }
      // An infraction id is optional (a judge can log a free-text penalty), but
      // if supplied it must be a real catalog key so history stays consistent.
      if (infractionId && !getInfraction(infractionId)) { jsonResponse(res, { error: 'invalid infraction' }, 400); return }
      if (tournament.status !== 'in_progress' && tournament.status !== 'top_cut') {
        jsonResponse(res, { error: 'tournament not running' }, 409); return
      }
      const player = tournament.players.find(p => p.id === penaltyMatch[1])
      if (!player) { jsonResponse(res, { error: 'player not found' }, 404); return }
      const issuedBy = attribution(judgeName)
      dispatchToRenderer({
        type: 'ISSUE_PENALTY',
        payload: {
          tournamentId: boundTournamentId,
          playerId: player.id,
          type,
          reason: (reason ?? '').trim(),
          ...(infractionId ? { infractionId } : {}),
          ...(issuedBy ? { issuedBy } : {}),
        },
      })
      jsonResponse(res, { ok: true })
    })
    return
  }

  const judgeDropMatch = reqPath.match(/^\/api\/judge\/players\/([^/]+)\/drop$/)
  if (judgeDropMatch && req.method === 'POST') {
    readBody(req, res, (body) => {
      const player = tournament.players.find(p => p.id === judgeDropMatch[1])
      if (!player) { jsonResponse(res, { error: 'player not found' }, 404); return }
      if (player.droppedInRound !== null) { jsonResponse(res, { error: 'already dropped' }, 409); return }
      const droppedBy = attribution((body as { judgeName?: unknown }).judgeName)
      dispatchToRenderer({
        type: 'DROP_PLAYER',
        payload: { tournamentId: boundTournamentId, playerId: player.id, ...(droppedBy ? { droppedBy } : {}) },
      })
      jsonResponse(res, { ok: true })
    })
    return
  }

  // Deck checks are stripped from the broadcast (TO-side working record), so
  // judge devices read them here — the running check banner needs them.
  if (reqPath === '/api/judge/deckchecks' && req.method === 'GET') {
    jsonResponse(res, { deckChecks: tournament.deckChecks ?? [] })
    return
  }

  // A judge starts a deck check at the table they stand at (the random-table
  // pick stays a TO feature). Same guards as the reducer, but failing loudly
  // so the judge sees why nothing happened.
  if (reqPath === '/api/judge/deckchecks' && req.method === 'POST') {
    readBody(req, res, (body) => {
      const { matchId, judgeName } = body as { matchId?: string; judgeName?: unknown }
      if (!matchId) { jsonResponse(res, { error: 'match required' }, 400); return }
      if (tournament.status !== 'in_progress' && tournament.status !== 'top_cut') {
        jsonResponse(res, { error: 'tournament not running' }, 409); return
      }
      const currentRound = tournament.rounds[tournament.rounds.length - 1]
      if (!currentRound || currentRound.isComplete) {
        jsonResponse(res, { error: 'round complete' }, 409); return
      }
      const match = currentRound.matches.find(m => m.id === matchId)
      if (!match) { jsonResponse(res, { error: 'match not in current round' }, 404); return }
      if (match.isBye) { jsonResponse(res, { error: 'bye match' }, 400); return }
      if (match.result !== 'pending') { jsonResponse(res, { error: 'match already decided' }, 409); return }
      if ((tournament.deckChecks ?? []).some(c => c.matchId === match.id && c.roundNumber === currentRound.roundNumber)) {
        jsonResponse(res, { error: 'table already checked this round' }, 409); return
      }
      const startedBy = attribution(judgeName)
      dispatchToRenderer({
        type: 'START_DECK_CHECK',
        payload: { tournamentId: boundTournamentId, matchId: match.id, ...(startedBy ? { startedBy } : {}) },
      })
      jsonResponse(res, { ok: true })
    })
    return
  }

  const checkCompleteMatch = reqPath.match(/^\/api\/judge\/deckchecks\/([^/]+)\/complete$/)
  if (checkCompleteMatch && req.method === 'POST') {
    readBody(req, res, (body) => {
      const { result } = body as { result?: string }
      if (result !== 'ok' && result !== 'issue') { jsonResponse(res, { error: 'invalid result' }, 400); return }
      const check = (tournament.deckChecks ?? []).find(c => c.id === checkCompleteMatch[1])
      if (!check) { jsonResponse(res, { error: 'check not found' }, 404); return }
      if (check.result !== null) { jsonResponse(res, { error: 'check already completed' }, 409); return }
      dispatchToRenderer({
        type: 'COMPLETE_DECK_CHECK',
        payload: { tournamentId: boundTournamentId, checkId: check.id, result },
      })
      jsonResponse(res, { ok: true })
    })
    return
  }

  const checkCancelMatch = reqPath.match(/^\/api\/judge\/deckchecks\/([^/]+)\/cancel$/)
  if (checkCancelMatch && req.method === 'POST') {
    const check = (tournament.deckChecks ?? []).find(c => c.id === checkCancelMatch[1])
    if (!check) { jsonResponse(res, { error: 'check not found' }, 404); return }
    if (check.result !== null) { jsonResponse(res, { error: 'check already completed' }, 409); return }
    dispatchToRenderer({
      type: 'CANCEL_DECK_CHECK',
      payload: { tournamentId: boundTournamentId, checkId: check.id },
    })
    jsonResponse(res, { ok: true })
    return
  }

  // Deck checks: judges may read any decklist regardless of visibility —
  // this is the same trust level as the TO's own decklist tab.
  const judgeDecklistMatch = reqPath.match(/^\/api\/judge\/players\/([^/]+)\/decklist$/)
  if (judgeDecklistMatch && req.method === 'GET') {
    const player = tournament.players.find(p => p.id === judgeDecklistMatch[1])
    if (!player) { jsonResponse(res, { error: 'player not found' }, 404); return }
    jsonResponse(res, { playerId: player.id, name: player.name, deckName: player.deckName, decklist: player.decklist })
    return
  }

  jsonResponse(res, { error: 'not found' }, 404)
}

// Ring buffer of recent judge calls per tournament, served to judge devices.
// A call can be claimed by one judge (first claim wins) and resolved by any
// judge once handled; both travel to the other judge devices through their
// regular /api/judge/calls polling.
interface JudgeCallEntry {
  id: string
  playerName: string
  tableNumber: number
  reasonCode: string | null
  reasonText: string
  at: number
  claimedBy: string | null
  claimedAt: number | null
  resolvedBy: string | null
  resolvedAt: number | null
}

const MAX_JUDGE_CALLS = 50
const judgeCallLog = new Map<string, JudgeCallEntry[]>()

function recordJudgeCall(
  tournamentId: string,
  entry: { playerName: string; tableNumber: number; reasonCode: string | null; reasonText: string; at: number },
): void {
  const log = judgeCallLog.get(tournamentId) ?? []
  log.push({ ...entry, id: crypto.randomUUID(), claimedBy: null, claimedAt: null, resolvedBy: null, resolvedAt: null })
  if (log.length > MAX_JUDGE_CALLS) log.splice(0, log.length - MAX_JUDGE_CALLS)
  judgeCallLog.set(tournamentId, log)
}

// Test helper — the call log is module state shared across a test file.
export function clearJudgeCallLog(): void {
  judgeCallLog.clear()
}

// Self-reports from player phones, per tournament and match. The renderer owns
// the confirmation flow; this log only mirrors the claims to judge devices. One
// entry per reporter (a re-report replaces the earlier claim), so a match holds
// at most its two seats plus the odd mistyped name.
interface MatchReportEntry {
  reporterName: string
  result: string
  at: number
}

const MAX_REPORTERS_PER_MATCH = 8
const matchReportLog = new Map<string, Map<string, MatchReportEntry[]>>()

function recordMatchReport(tournamentId: string, matchId: string, reporterName: string, result: string): void {
  const byMatch = matchReportLog.get(tournamentId) ?? new Map<string, MatchReportEntry[]>()
  const entries = byMatch.get(matchId) ?? []
  const entry: MatchReportEntry = { reporterName, result, at: Date.now() }
  const existing = entries.findIndex(e => e.reporterName.toLowerCase() === reporterName.toLowerCase())
  if (existing !== -1) entries[existing] = entry
  else entries.push(entry)
  if (entries.length > MAX_REPORTERS_PER_MATCH) entries.splice(0, entries.length - MAX_REPORTERS_PER_MATCH)
  byMatch.set(matchId, entries)
  matchReportLog.set(tournamentId, byMatch)
}

// Test helper — module state, same reasoning as clearJudgeCallLog.
export function clearMatchReportLog(): void {
  matchReportLog.clear()
}

// The judge display name is chosen freely on the phone (all judges share one
// token), travels into persisted state as attribution, so cap its length.
function cleanJudgeName(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 60) : ''
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
