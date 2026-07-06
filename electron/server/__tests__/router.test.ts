/** @vitest-environment node */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import http from 'node:http'
import { AddressInfo } from 'node:net'

vi.mock('electron', () => ({ app: { getAppPath: () => process.cwd(), isPackaged: false } }))
vi.mock('../../ipc/stateSync', () => ({
  getCurrentState: vi.fn(),
  getCurrentTimers: vi.fn(() => null),
  dispatchToRenderer: vi.fn(),
  sendJudgeCall: vi.fn(),
  sendMatchReport: vi.fn(),
  sendDecklistSubmitted: vi.fn(),
}))

import { handleRequest, clearJudgeCallLog } from '../router'
import { getCurrentState, dispatchToRenderer, sendMatchReport, sendDecklistSubmitted } from '../../ipc/stateSync'
import { clearSessions, createPlayerSession, createJudgeSession, revokeJudgeSession, isJudgeSession } from '../sessions'
import { resetRateLimits } from '../rateLimit'

const BOUND_ID = 't1'

function makeState(status = 'registration', decklistVisibility = 'hidden') {
  return {
    tournaments: {
      [BOUND_ID]: {
        id: BOUND_ID,
        name: 'Locals',
        game: 'yugioh',
        format: 'swiss',
        status,
        decklistVisibility,
        players: [
          {
            id: 'p1', name: 'Alice Alpha', deckName: 'Blue-Eyes',
            decklist: [{ cardName: 'Blue-Eyes White Dragon', quantity: 3 }],
            droppedInRound: null, dateOfBirth: '2000-01-01', playerId: 'K-123', hasBye: false,
          },
          { id: 'p2', name: 'Bob Beta', deckName: null, decklist: null, droppedInRound: null, hasBye: false },
        ],
        rounds: [],
        roundTimeMinutes: 50,
        currentRound: 0,
        totalRounds: 3,
      },
      other: { id: 'other', name: 'Other Tournament', players: [], rounds: [] },
    },
    playerDatabase: { secret: { name: 'Should never leave the app' } },
  }
}

let server: http.Server
let port: number

interface Response { status: number; body: Record<string, unknown> }

function request(method: string, path: string, opts: { body?: unknown; token?: string; host?: string } = {}): Promise<Response> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`
    if (opts.host) headers['Host'] = opts.host
    const req = http.request({ host: '127.0.0.1', port, method, path, headers }, res => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        let body: Record<string, unknown> = {}
        try { body = JSON.parse(data) } catch { /* html pages */ }
        resolve({ status: res.statusCode || 0, body })
      })
    })
    req.on('error', reject)
    if (opts.body !== undefined) req.write(JSON.stringify(opts.body))
    req.end()
  })
}

async function registerToken(playerName: string): Promise<string> {
  const res = await request('POST', '/api/register', { body: { playerName } })
  expect(res.status).toBe(200)
  return res.body.token as string
}

beforeAll(async () => {
  server = http.createServer((req, res) => handleRequest(req, res, BOUND_ID))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  port = (server.address() as AddressInfo).port
})

afterAll(() => new Promise<void>(resolve => server.close(() => resolve())))

beforeEach(() => {
  vi.mocked(getCurrentState).mockReturnValue(makeState())
  vi.mocked(dispatchToRenderer).mockClear()
  vi.mocked(sendMatchReport).mockClear()
  // Sessions and rate-limit buckets are module state; every test starts clean
  // (all requests here come from 127.0.0.1, so they share one bucket).
  clearSessions()
  resetRateLimits()
  clearJudgeCallLog()
})

describe('host guard (DNS rebinding)', () => {
  it('rejects requests with a DNS-name Host header', async () => {
    const res = await request('GET', '/api/state', { host: 'evil.example.com' })
    expect(res.status).toBe(403)
  })

  it('allows IP and localhost hosts', async () => {
    expect((await request('GET', '/api/state')).status).toBe(200)
    expect((await request('GET', '/api/state', { host: 'localhost:8080' })).status).toBe(200)
  })
})

describe('GET /api/state', () => {
  it('serves only the bound tournament without playerDatabase, PII or decklists', async () => {
    const res = await request('GET', '/api/state')
    const state = res.body.state as { tournaments: Record<string, { players: Record<string, unknown>[] }> }
    expect(res.body).not.toHaveProperty('playerDatabase')
    expect(state).not.toHaveProperty('playerDatabase')
    expect(Object.keys(state.tournaments)).toEqual([BOUND_ID])
    for (const player of state.tournaments[BOUND_ID].players) {
      expect(player).not.toHaveProperty('decklist')
      expect(player).not.toHaveProperty('dateOfBirth')
      expect(player).not.toHaveProperty('playerId')
    }
  })
})

describe('POST /api/register', () => {
  it('adds a new player and returns a session token', async () => {
    const res = await request('POST', '/api/register', { body: { playerName: 'Charlie New' } })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    expect(dispatchToRenderer).toHaveBeenCalledWith({
      type: 'ADD_PLAYER',
      payload: { tournamentId: BOUND_ID, playerName: 'Charlie New' },
    })
  })

  it('re-claims an existing name without creating a duplicate', async () => {
    const res = await request('POST', '/api/register', { body: { playerName: 'alice ALPHA' } })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    expect(dispatchToRenderer).not.toHaveBeenCalled()
  })

  it('refuses once registration is closed', async () => {
    vi.mocked(getCurrentState).mockReturnValue(makeState('in_progress'))
    const res = await request('POST', '/api/register', { body: { playerName: 'Late Larry' } })
    expect(res.status).toBe(403)
    expect(res.body.token).toBeUndefined()
    expect(dispatchToRenderer).not.toHaveBeenCalled()
  })

  it('requires a name', async () => {
    expect((await request('POST', '/api/register', { body: { playerName: '  ' } })).status).toBe(400)
  })

  it('dispatches ADD_PLAYER only once for two quick registrations of the same name (F9)', async () => {
    // The mocked state never learns about the first dispatch — exactly like the
    // real server inside the debounced sync window. The second device is
    // rejected outright: the first registration already claimed the name.
    const r1 = await request('POST', '/api/register', { body: { playerName: 'Dana Duplicate' } })
    const r2 = await request('POST', '/api/register', { body: { playerName: 'dana DUPLICATE' } })
    expect(r1.status).toBe(200)
    expect(r1.body.token).toBeTruthy()
    expect(r2.status).toBe(409)
    expect(r2.body.token).toBeUndefined()
    const addCalls = vi.mocked(dispatchToRenderer).mock.calls.filter(
      c => (c[0] as { type: string }).type === 'ADD_PLAYER'
    )
    expect(addCalls).toHaveLength(1)
  })

  it('rejects claiming a name that another device already holds a session for', async () => {
    const r1 = await request('POST', '/api/register', { body: { playerName: 'Alice Alpha' } })
    expect(r1.status).toBe(200)
    const r2 = await request('POST', '/api/register', { body: { playerName: 'ALICE alpha' } })
    expect(r2.status).toBe(409)
    expect(r2.body.code).toBe('claimed')
    expect(r2.body.token).toBeUndefined()
  })

  it('rejects claiming a player the TO already issued a QR token for', async () => {
    createPlayerSession(BOUND_ID, 'p1', 'Alice Alpha')
    const res = await request('POST', '/api/register', { body: { playerName: 'Alice Alpha' } })
    expect(res.status).toBe(409)
    expect(res.body.code).toBe('claimed')
  })

  it('still blocks the claim after the session was bound and the player renamed', async () => {
    const token = await registerToken('Alice Alpha')
    // bind the session to p1 via an authorized read
    await request('GET', '/api/my-decklist', { token })
    // TO renames Alice; the bound session follows the player id
    const renamed = makeState()
    renamed.tournaments[BOUND_ID].players[0].name = 'Alice Omega'
    vi.mocked(getCurrentState).mockReturnValue(renamed)
    const res = await request('POST', '/api/register', { body: { playerName: 'Alice Omega' } })
    expect(res.status).toBe(409)
    expect(res.body.code).toBe('claimed')
  })
})

describe('GET /api/me', () => {
  it('resolves a registered session to its player', async () => {
    const token = await registerToken('Alice Alpha')
    const res = await request('GET', '/api/me', { token })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ playerId: 'p1', playerName: 'Alice Alpha' })
  })

  it('resolves a TO-issued token without any prior request from the device', async () => {
    const token = createPlayerSession(BOUND_ID, 'p2', 'Bob Beta')
    const res = await request('GET', '/api/me', { token })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ playerId: 'p2', playerName: 'Bob Beta' })
  })

  it('rejects unknown tokens', async () => {
    expect((await request('GET', '/api/me', { token: 'nope' })).status).toBe(401)
    expect((await request('GET', '/api/me')).status).toBe(401)
  })
})

describe('rate limiting', () => {
  it('returns 429 once an IP exceeds the POST budget and recovers after reset', async () => {
    // Burn the budget with cheap invalid requests — the limiter sits in front
    // of all POST routing, so even 400s count.
    let firstLimited = 0
    for (let i = 1; i <= 31; i++) {
      const res = await request('POST', '/api/judge-call', { body: {} })
      if (res.status === 429) { firstLimited = i; break }
      expect(res.status).toBe(400)
    }
    expect(firstLimited).toBe(31)
    // GETs stay unaffected while the IP is limited
    expect((await request('GET', '/api/state')).status).toBe(200)
    resetRateLimits()
    expect((await request('POST', '/api/judge-call', { body: {} })).status).toBe(400)
  })
})

describe('session survives a TO rename (F12)', () => {
  it('still authorizes self-service writes for the bound player after a rename', async () => {
    const token = await registerToken('Alice Alpha')
    // First authorized use binds the session to p1.
    expect((await request('GET', '/api/my-decklist', { token })).status).toBe(200)

    const renamed = makeState()
    renamed.tournaments[BOUND_ID].players[0].name = 'Alicia Renamed'
    vi.mocked(getCurrentState).mockReturnValue(renamed)

    // Name matching alone would fail now — the id binding keeps the session alive.
    const res = await request('POST', '/api/players/p1/drop', { token })
    expect(res.status).toBe(200)
    expect((await request('GET', '/api/my-decklist', { token })).status).toBe(200)
  })

  it('a never-used session does not survive a rename', async () => {
    const token = await registerToken('Bob Beta')

    const renamed = makeState()
    renamed.tournaments[BOUND_ID].players[1].name = 'Robert Renamed'
    vi.mocked(getCurrentState).mockReturnValue(renamed)

    const res = await request('POST', '/api/players/p2/drop', { token })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/my-decklist', () => {
  it('returns the own decklist for a valid token', async () => {
    const token = await registerToken('Alice Alpha')
    const res = await request('GET', '/api/my-decklist', { token })
    expect(res.status).toBe(200)
    expect(res.body.playerId).toBe('p1')
    expect(res.body.decklist).toEqual([{ cardName: 'Blue-Eyes White Dragon', quantity: 3 }])
  })

  it('rejects missing or invalid tokens', async () => {
    expect((await request('GET', '/api/my-decklist')).status).toBe(401)
    expect((await request('GET', '/api/my-decklist', { token: 'forged' })).status).toBe(401)
  })
})

describe('POST /api/players/:id/decklist', () => {
  it('accepts a decklist for the token owner', async () => {
    const token = await registerToken('Alice Alpha')
    vi.mocked(dispatchToRenderer).mockClear()
    const res = await request('POST', '/api/players/p1/decklist', { token, body: { decklistText: '3x Blue-Eyes White Dragon' } })
    expect(res.status).toBe(200)
    expect(dispatchToRenderer).toHaveBeenCalledWith({
      type: 'UPDATE_PLAYER',
      payload: {
        tournamentId: BOUND_ID,
        playerId: 'p1',
        decklist: [expect.objectContaining({ cardName: 'Blue-Eyes White Dragon', quantity: 3 })],
      },
    })
  })

  it('does not flag a submission to the TO before the tournament starts', async () => {
    const token = await registerToken('Alice Alpha') // default state is registration
    vi.mocked(sendDecklistSubmitted).mockClear()
    await request('POST', '/api/players/p1/decklist', { token, body: { decklistText: '3x Blue-Eyes White Dragon' } })
    expect(sendDecklistSubmitted).not.toHaveBeenCalled()
  })

  it('flags a submission to the TO once the tournament is running', async () => {
    const token = await registerToken('Alice Alpha')
    vi.mocked(getCurrentState).mockReturnValue(makeState('in_progress'))
    vi.mocked(sendDecklistSubmitted).mockClear()
    await request('POST', '/api/players/p1/decklist', { token, body: { decklistText: '3x Blue-Eyes White Dragon' } })
    expect(sendDecklistSubmitted).toHaveBeenCalledWith({
      tournamentId: BOUND_ID,
      playerId: 'p1',
      playerName: 'Alice Alpha',
      entries: expect.arrayContaining([expect.objectContaining({ cardName: 'Blue-Eyes White Dragon', quantity: 3 })]),
    })

    // An empty/cleared list is not a submission worth flagging.
    vi.mocked(sendDecklistSubmitted).mockClear()
    await request('POST', '/api/players/p1/decklist', { token, body: { decklistText: '   ' } })
    expect(sendDecklistSubmitted).not.toHaveBeenCalled()
  })

  it('rejects writing another player\'s decklist', async () => {
    const token = await registerToken('Alice Alpha')
    vi.mocked(dispatchToRenderer).mockClear()
    const res = await request('POST', '/api/players/p2/decklist', { token, body: { decklistText: '3x Pot of Greed' } })
    expect(res.status).toBe(401)
    expect(dispatchToRenderer).not.toHaveBeenCalled()
  })

  it('rejects without a token', async () => {
    const res = await request('POST', '/api/players/p1/decklist', { body: { decklistText: '3x Pot of Greed' } })
    expect(res.status).toBe(401)
    expect(dispatchToRenderer).not.toHaveBeenCalled()
  })
})

describe('POST /api/players/:id/drop', () => {
  it('drops the token owner', async () => {
    const token = await registerToken('Alice Alpha')
    vi.mocked(dispatchToRenderer).mockClear()
    const res = await request('POST', '/api/players/p1/drop', { token })
    expect(res.status).toBe(200)
    expect(dispatchToRenderer).toHaveBeenCalledWith({
      type: 'DROP_PLAYER',
      payload: { tournamentId: BOUND_ID, playerId: 'p1' },
    })
  })

  it('rejects dropping another player', async () => {
    const token = await registerToken('Bob Beta')
    vi.mocked(dispatchToRenderer).mockClear()
    const res = await request('POST', '/api/players/p1/drop', { token })
    expect(res.status).toBe(401)
    expect(dispatchToRenderer).not.toHaveBeenCalled()
  })
})

describe('GET /api/decklists', () => {
  it('refuses while decklists are not public', async () => {
    expect((await request('GET', '/api/decklists')).status).toBe(403)
  })

  it('lists decklists of active players when public', async () => {
    vi.mocked(getCurrentState).mockReturnValue(makeState('in_progress', 'public'))
    const res = await request('GET', '/api/decklists')
    expect(res.status).toBe(200)
    const lists = res.body.decklists as Array<{ playerId: string }>
    expect(lists).toHaveLength(1) // only Alice has a decklist
    expect(lists[0].playerId).toBe('p1')
  })
})

describe('POST /api/matches/:id/report', () => {
  it('forwards a valid report to TO confirmation', async () => {
    const res = await request('POST', '/api/matches/m1/report', { body: { result: 'player1_win', reporterName: 'Alice Alpha' } })
    expect(res.status).toBe(200)
    expect(sendMatchReport).toHaveBeenCalledWith({
      matchId: 'm1', result: 'player1_win', reporterName: 'Alice Alpha', tournamentId: BOUND_ID,
    })
  })

  it('rejects invalid results', async () => {
    const res = await request('POST', '/api/matches/m1/report', { body: { result: 'both_lose' } })
    expect(res.status).toBe(400)
    expect(sendMatchReport).not.toHaveBeenCalled()
  })
})

describe('unknown routes', () => {
  it('returns 404', async () => {
    expect((await request('GET', '/api/nope')).status).toBe(404)
  })
})

// State with a running round: p1 vs p2 pending on table 1.
function makeRunningState(phase = 'swiss', status = 'in_progress') {
  const state = makeState(status)
  state.tournaments[BOUND_ID].rounds = [{
    roundNumber: 1,
    matches: [{ id: 'm1', player1Id: 'p1', player2Id: 'p2', result: 'pending', tableNumber: 1, isBye: false }],
    isComplete: false,
    phase,
  }]
  state.tournaments[BOUND_ID].currentRound = 1
  return state
}

describe('judge endpoints', () => {
  function judgeToken(): string {
    return createJudgeSession(BOUND_ID)
  }

  it('rejects every /api/judge route without a judge token', async () => {
    const playerToken = createPlayerSession(BOUND_ID, 'p1', 'Alice Alpha')
    for (const token of [undefined, 'bogus', playerToken]) {
      expect((await request('GET', '/api/judge/me', { token })).status).toBe(401)
      expect((await request('POST', '/api/judge/matches/m1/result', { token, body: { result: 'player1_win' } })).status).toBe(401)
      expect((await request('POST', '/api/judge/players/p1/penalty', { token, body: { type: 'warning' } })).status).toBe(401)
    }
  })

  it('validates the judge token via /api/judge/me', async () => {
    const res = await request('GET', '/api/judge/me', { token: judgeToken() })
    expect(res.status).toBe(200)
    expect(res.body.role).toBe('judge')
  })

  it('judge token is bound to its tournament', () => {
    const token = createJudgeSession(BOUND_ID)
    expect(isJudgeSession(token, BOUND_ID)).toBe(true)
    expect(isJudgeSession(token, 'other')).toBe(false)
  })

  it('reissues the same token and revokes it for all judges at once', async () => {
    const token = judgeToken()
    expect(createJudgeSession(BOUND_ID)).toBe(token)
    revokeJudgeSession(BOUND_ID)
    expect((await request('GET', '/api/judge/me', { token })).status).toBe(401)
    expect(createJudgeSession(BOUND_ID)).not.toBe(token)
  })

  it('submits a match result directly (no TO confirmation)', async () => {
    vi.mocked(getCurrentState).mockReturnValue(makeRunningState())
    const res = await request('POST', '/api/judge/matches/m1/result', {
      token: judgeToken(), body: { result: 'player2_win', player1Games: 1, player2Games: 2 },
    })
    expect(res.status).toBe(200)
    expect(dispatchToRenderer).toHaveBeenCalledWith({
      type: 'SUBMIT_MATCH_RESULT',
      payload: { tournamentId: BOUND_ID, matchId: 'm1', result: 'player2_win', player1Games: 1, player2Games: 2 },
    })
    expect(sendMatchReport).not.toHaveBeenCalled()
  })

  it('drops invalid game scores but keeps the result', async () => {
    vi.mocked(getCurrentState).mockReturnValue(makeRunningState())
    const res = await request('POST', '/api/judge/matches/m1/result', {
      token: judgeToken(), body: { result: 'player1_win', player1Games: 99, player2Games: -1 },
    })
    expect(res.status).toBe(200)
    expect(dispatchToRenderer).toHaveBeenCalledWith({
      type: 'SUBMIT_MATCH_RESULT',
      payload: { tournamentId: BOUND_ID, matchId: 'm1', result: 'player1_win' },
    })
  })

  it('rejects bad results, unknown matches, draws in knockout rounds, completed rounds', async () => {
    vi.mocked(getCurrentState).mockReturnValue(makeRunningState())
    const token = judgeToken()
    expect((await request('POST', '/api/judge/matches/m1/result', { token, body: { result: 'nonsense' } })).status).toBe(400)
    expect((await request('POST', '/api/judge/matches/nope/result', { token, body: { result: 'draw' } })).status).toBe(404)

    vi.mocked(getCurrentState).mockReturnValue(makeRunningState('top_cut', 'top_cut'))
    expect((await request('POST', '/api/judge/matches/m1/result', { token, body: { result: 'draw' } })).status).toBe(400)
    expect((await request('POST', '/api/judge/matches/m1/result', { token, body: { result: 'player1_win' } })).status).toBe(200)

    const done = makeRunningState()
    done.tournaments[BOUND_ID].rounds[0].isComplete = true
    vi.mocked(getCurrentState).mockReturnValue(done)
    expect((await request('POST', '/api/judge/matches/m1/result', { token, body: { result: 'player1_win' } })).status).toBe(409)

    vi.mocked(getCurrentState).mockReturnValue(makeState('registration'))
    expect((await request('POST', '/api/judge/matches/m1/result', { token, body: { result: 'player1_win' } })).status).toBe(409)
  })

  it('issues a penalty for an existing player while the tournament runs', async () => {
    vi.mocked(getCurrentState).mockReturnValue(makeRunningState())
    const token = judgeToken()
    const res = await request('POST', '/api/judge/players/p1/penalty', { token, body: { type: 'warning', reason: ' Slow play ' } })
    expect(res.status).toBe(200)
    expect(dispatchToRenderer).toHaveBeenCalledWith({
      type: 'ISSUE_PENALTY',
      payload: { tournamentId: BOUND_ID, playerId: 'p1', type: 'warning', reason: 'Slow play' },
    })
    expect((await request('POST', '/api/judge/players/p1/penalty', { token, body: { type: 'ban_forever' } })).status).toBe(400)
    expect((await request('POST', '/api/judge/players/ghost/penalty', { token, body: { type: 'warning' } })).status).toBe(404)

    vi.mocked(getCurrentState).mockReturnValue(makeState('registration'))
    expect((await request('POST', '/api/judge/players/p1/penalty', { token, body: { type: 'warning' } })).status).toBe(409)
  })

  it('accepts a valid catalog infractionId and rejects an unknown one', async () => {
    vi.mocked(getCurrentState).mockReturnValue(makeRunningState())
    const token = judgeToken()
    const ok = await request('POST', '/api/judge/players/p1/penalty', { token, body: { type: 'game_loss', reason: '', infractionId: 'mtg_slow_play' } })
    expect(ok.status).toBe(200)
    expect(dispatchToRenderer).toHaveBeenCalledWith({
      type: 'ISSUE_PENALTY',
      payload: { tournamentId: BOUND_ID, playerId: 'p1', type: 'game_loss', reason: '', infractionId: 'mtg_slow_play' },
    })
    expect((await request('POST', '/api/judge/players/p1/penalty', { token, body: { type: 'warning', infractionId: 'not_a_real_infraction' } })).status).toBe(400)
  })

  it('drops a player once', async () => {
    const state = makeRunningState()
    vi.mocked(getCurrentState).mockReturnValue(state)
    const token = judgeToken()
    expect((await request('POST', '/api/judge/players/p2/drop', { token })).status).toBe(200)
    expect(dispatchToRenderer).toHaveBeenCalledWith({
      type: 'DROP_PLAYER',
      payload: { tournamentId: BOUND_ID, playerId: 'p2' },
    })
    state.tournaments[BOUND_ID].players[1].droppedInRound = 1
    expect((await request('POST', '/api/judge/players/p2/drop', { token })).status).toBe(409)
  })

  it('serves any decklist to a judge regardless of visibility (deck checks)', async () => {
    vi.mocked(getCurrentState).mockReturnValue(makeState('in_progress', 'hidden'))
    const res = await request('GET', '/api/judge/players/p1/decklist', { token: judgeToken() })
    expect(res.status).toBe(200)
    expect(res.body.decklist).toEqual([{ cardName: 'Blue-Eyes White Dragon', quantity: 3 }])
  })

  it('exposes judge calls to judges only, capped and in order', async () => {
    vi.mocked(getCurrentState).mockReturnValue(makeRunningState())
    await request('POST', '/api/judge-call', { body: { playerName: 'Alice Alpha', tableNumber: 3 } })
    await request('POST', '/api/judge-call', { body: { playerName: 'Bob Beta', tableNumber: 7 } })
    expect((await request('GET', '/api/judge/calls')).status).toBe(401)
    const res = await request('GET', '/api/judge/calls', { token: judgeToken() })
    expect(res.status).toBe(200)
    const calls = res.body.calls as Array<{ playerName: string; tableNumber: number; at: number }>
    expect(calls.map(c => [c.playerName, c.tableNumber])).toEqual([['Alice Alpha', 3], ['Bob Beta', 7]])
    expect(calls.every(c => typeof c.at === 'number')).toBe(true)
  })

  it('lets one judge claim a call; other judges get a 409 with the claimer', async () => {
    vi.mocked(getCurrentState).mockReturnValue(makeRunningState())
    const token = judgeToken()
    await request('POST', '/api/judge-call', { body: { playerName: 'Alice Alpha', tableNumber: 3 } })
    const calls = (await request('GET', '/api/judge/calls', { token })).body.calls as Array<{ id: string; claimedBy: string | null }>
    expect(calls[0].claimedBy).toBeNull()
    const id = calls[0].id

    expect((await request('POST', `/api/judge/calls/${id}/claim`, { token, body: { judgeName: 'Max' } })).status).toBe(200)
    // Re-claiming by the same judge stays fine (idempotent retry)
    expect((await request('POST', `/api/judge/calls/${id}/claim`, { token, body: { judgeName: 'Max' } })).status).toBe(200)
    // A different judge is refused and learns who is on it
    const second = await request('POST', `/api/judge/calls/${id}/claim`, { token, body: { judgeName: 'Erika' } })
    expect(second.status).toBe(409)
    expect(second.body.claimedBy).toBe('Max')
    // The claim is visible to every polling judge device
    const after = (await request('GET', '/api/judge/calls', { token })).body.calls as Array<{ claimedBy: string | null }>
    expect(after[0].claimedBy).toBe('Max')
    // Validation and auth
    expect((await request('POST', `/api/judge/calls/${id}/claim`, { token, body: {} })).status).toBe(400)
    expect((await request('POST', '/api/judge/calls/nope/claim', { token, body: { judgeName: 'Max' } })).status).toBe(404)
    expect((await request('POST', `/api/judge/calls/${id}/claim`, { body: { judgeName: 'Mallory' } })).status).toBe(401)
  })

  it('exempts judge POSTs from the per-IP rate limit', async () => {
    vi.mocked(getCurrentState).mockReturnValue(makeRunningState())
    const token = judgeToken()
    // Burn the shared IP budget as an anonymous device.
    for (let i = 0; i < 30; i++) await request('POST', '/api/judge-call', { body: {} })
    expect((await request('POST', '/api/judge-call', { body: { playerName: 'Alice Alpha' } })).status).toBe(429)
    // The judge keeps working from the same IP.
    const res = await request('POST', '/api/judge/matches/m1/result', { token, body: { result: 'player1_win' } })
    expect(res.status).toBe(200)
  })
})
