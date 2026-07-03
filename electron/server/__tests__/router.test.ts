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
}))

import { handleRequest } from '../router'
import { getCurrentState, dispatchToRenderer, sendMatchReport } from '../../ipc/stateSync'

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
    // real server inside the debounced sync window.
    const r1 = await request('POST', '/api/register', { body: { playerName: 'Dana Duplicate' } })
    const r2 = await request('POST', '/api/register', { body: { playerName: 'dana DUPLICATE' } })
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    expect(r1.body.token).toBeTruthy()
    expect(r2.body.token).toBeTruthy()
    const addCalls = vi.mocked(dispatchToRenderer).mock.calls.filter(
      c => (c[0] as { type: string }).type === 'ADD_PLAYER'
    )
    expect(addCalls).toHaveLength(1)
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
