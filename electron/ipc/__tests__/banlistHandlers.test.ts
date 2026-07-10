/** @vitest-environment node */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// The banlist store path is resolved once at module load, so the temp dir must
// exist before the import; individual tests reset the file, not the dir.
const testDir = vi.hoisted(() => {
  const fsx = require('node:fs') as typeof import('node:fs')
  const osx = require('node:os') as typeof import('node:os')
  const pathx = require('node:path') as typeof import('node:path')
  return { current: fsx.mkdtempSync(pathx.join(osx.tmpdir(), 'tcg-banlist-test-')) }
})

const ipc = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
}))

vi.mock('electron', () => ({
  app: { getPath: () => testDir.current },
  ipcMain: {
    handle: (channel: string, fn: (...args: unknown[]) => unknown) => { ipc.handlers.set(channel, fn) },
    on: vi.fn(),
  },
}))

// Fake HTTP layer: every test installs a handler that maps a URL to a canned
// response; the fake mimics the https.get(url, opts, cb) shape the module uses
// (statusCode/headers, data/end events, resume, req.setTimeout/destroy).
interface FakeResponse { status?: number; body?: string; headers?: Record<string, string> }
const http = vi.hoisted(() => ({
  handler: null as null | ((url: string) => FakeResponse),
  requests: [] as string[],
}))

vi.mock('node:https', async () => {
  const { EventEmitter } = await import('node:events')
  const get = (url: string, _opts: unknown, cb: (res: unknown) => void) => {
    const req = new EventEmitter() as InstanceType<typeof EventEmitter> & { setTimeout: () => unknown; destroy: () => void }
    req.setTimeout = () => req
    req.destroy = () => {}
    http.requests.push(url)
    process.nextTick(() => {
      if (!http.handler) { req.emit('error', new Error(`no fake route for ${url}`)); return }
      const r = http.handler(url)
      const res = new EventEmitter() as InstanceType<typeof EventEmitter> & { statusCode: number; headers: Record<string, string>; resume: () => void }
      res.statusCode = r.status ?? 200
      res.headers = r.headers ?? {}
      res.resume = () => {}
      cb(res)
      process.nextTick(() => {
        if (r.body !== undefined) res.emit('data', r.body)
        res.emit('end')
      })
    })
    return req
  }
  return { default: { get }, get }
})

import { registerBanlistHandlers } from '../banlistHandlers'

registerBanlistHandlers()

const storeFile = () => path.join(testDir.current, 'banlists.json')
const invoke = (channel: string, ...args: unknown[]) => ipc.handlers.get(channel)!(null, ...args)
const readStore = () => JSON.parse(fs.readFileSync(storeFile(), 'utf-8'))

beforeEach(() => {
  fs.rmSync(storeFile(), { force: true })
  http.handler = null
  http.requests = []
  vi.useRealTimers()
})

describe('banlist:load', () => {
  it('returns an empty store when no file exists', async () => {
    expect(await invoke('banlist:load')).toEqual({})
  })

  it('returns the parsed store file', async () => {
    fs.writeFileSync(storeFile(), JSON.stringify({ 'yugioh:advanced': { game: 'yugioh' } }))
    expect(await invoke('banlist:load')).toEqual({ 'yugioh:advanced': { game: 'yugioh' } })
  })

  it('starts fresh on a corrupt store file', async () => {
    fs.writeFileSync(storeFile(), '{not json')
    expect(await invoke('banlist:load')).toEqual({})
  })
})

describe('banlist:fetch — Yu-Gi-Oh! (ygoprodeck)', () => {
  const YGO_BODY = JSON.stringify({
    data: [
      { name: 'Pot of Greed', ban_tcg: 'Forbidden' },
      { name: 'Monster Reborn', ban_tcg: 'Limited' },
      { name: 'Lightning Storm', ban_tcg: 'Semi-Limited' },
      { name: 'Blue-Eyes White Dragon' },
    ],
  })

  it('partitions cards into forbidden/limited/semi-limited and persists the store', async () => {
    http.handler = () => ({ body: YGO_BODY })
    const data = await invoke('banlist:fetch', 'yugioh', 'advanced') as Record<string, unknown>
    expect(data.forbidden).toEqual(['Pot of Greed'])
    expect(data.limited).toEqual(['Monster Reborn'])
    expect(data.semiLimited).toEqual(['Lightning Storm'])
    expect(http.requests[0]).toContain('db.ygoprodeck.com')
    expect(readStore()['yugioh:advanced'].forbidden).toEqual(['Pot of Greed'])
  })

  it('traditional format folds forbidden cards into the limited list', async () => {
    http.handler = () => ({ body: YGO_BODY })
    const data = await invoke('banlist:fetch', 'yugioh', 'traditional') as Record<string, unknown>
    expect(data.forbidden).toEqual([])
    expect(data.limited).toEqual(['Pot of Greed', 'Monster Reborn'])
    expect(data.semiLimited).toEqual(['Lightning Storm'])
  })
})

describe('banlist:fetch — Pokémon (pokemontcg.io)', () => {
  it('pages through banned cards and dedupes (expanded: no set rotation)', async () => {
    http.handler = url => {
      if (url.includes('page=1')) return { body: JSON.stringify({ data: [{ name: 'Lysandre’s Trump Card' }, { name: 'Shiftry' }], page: 1, pageSize: 2, count: 2, totalCount: 3 }) }
      return { body: JSON.stringify({ data: [{ name: 'Shiftry' }, { name: 'Forest of Giant Plants' }], page: 2, pageSize: 2, count: 2, totalCount: 3 }) }
    }
    const data = await invoke('banlist:fetch', 'pokemon', 'expanded') as Record<string, unknown>
    expect(data.forbidden).toEqual(['Lysandre’s Trump Card', 'Shiftry', 'Forest of Giant Plants'])
    expect(data.legalSetCodes).toBeUndefined()
    expect(http.requests.filter(u => u.includes('legalities.expanded:Banned'))).toHaveLength(2)
  })

  it('standard additionally fetches legal set codes (uppercased, missing codes skipped)', async () => {
    http.handler = url => {
      if (url.includes(':Banned')) return { body: JSON.stringify({ data: [], page: 1, pageSize: 250, count: 0, totalCount: 0 }) }
      return { body: JSON.stringify({ data: [{ ptcgoCode: 'sv1' }, {}, { ptcgoCode: 'PAL' }], page: 1, pageSize: 250, count: 3, totalCount: 3 }) }
    }
    const data = await invoke('banlist:fetch', 'pokemon', 'standard') as Record<string, unknown>
    expect(data.legalSetCodes).toEqual(['SV1', 'PAL'])
  })
})

describe('banlist:fetch — MTG (Scryfall)', () => {
  it('banned-list formats collect names across pages (next_page)', async () => {
    http.handler = url => {
      if (url.includes('next')) return { body: JSON.stringify({ data: [{ name: 'Uro, Titan of Nature’s Wrath' }], has_more: false }) }
      return { body: JSON.stringify({ data: [{ name: 'Splinter Twin' }], has_more: true, next_page: 'https://api.scryfall.com/next' }) }
    }
    const data = await invoke('banlist:fetch', 'mtg', 'modern') as Record<string, unknown>
    expect(data.forbidden).toEqual(['Splinter Twin', 'Uro, Titan of Nature’s Wrath'])
    expect(data.limited).toEqual([])
    expect(http.requests[0]).toContain(encodeURIComponent('banned:modern'))
  })

  it('vintage fetches banned and restricted lists', async () => {
    http.handler = url => {
      if (url.includes(encodeURIComponent('banned:vintage'))) return { body: JSON.stringify({ data: [{ name: 'Shahrazad' }], has_more: false }) }
      return { body: JSON.stringify({ data: [{ name: 'Black Lotus' }], has_more: false }) }
    }
    const data = await invoke('banlist:fetch', 'mtg', 'vintage') as Record<string, unknown>
    expect(data.forbidden).toEqual(['Shahrazad'])
    expect(data.limited).toEqual(['Black Lotus'])
  })

  it('rotating formats store the full legal-card whitelist', async () => {
    http.handler = () => ({ body: JSON.stringify({ data: [{ name: 'Llanowar Elves' }, { name: 'Shock' }], has_more: false }) })
    const data = await invoke('banlist:fetch', 'mtg', 'standard') as Record<string, unknown>
    expect(data.legalCards).toEqual(['Llanowar Elves', 'Shock'])
    expect(data.forbidden).toEqual([])
    expect(http.requests[0]).toContain(encodeURIComponent('legal:standard'))
  })

  it('retries once after a 429 rate limit and then succeeds', async () => {
    vi.useFakeTimers()
    let calls = 0
    http.handler = () => {
      calls++
      if (calls === 1) return { status: 429, body: 'slow down' }
      return { body: JSON.stringify({ data: [{ name: 'Splinter Twin' }], has_more: false }) }
    }
    const pending = invoke('banlist:fetch', 'mtg', 'modern') as Promise<Record<string, unknown>>
    await vi.advanceTimersByTimeAsync(66000)
    const data = await pending
    expect(data.forbidden).toEqual(['Splinter Twin'])
    expect(calls).toBe(2)
  })
})

describe('banlist:fetch — transport errors', () => {
  it('follows a redirect', async () => {
    http.handler = url => {
      if (!url.includes('moved')) return { status: 302, headers: { location: 'https://db.ygoprodeck.com/moved' } }
      return { body: JSON.stringify({ data: [{ name: 'Pot of Greed', ban_tcg: 'Forbidden' }] }) }
    }
    const data = await invoke('banlist:fetch', 'yugioh', 'advanced') as Record<string, unknown>
    expect(data.forbidden).toEqual(['Pot of Greed'])
  })

  it('propagates HTTP errors and leaves the store untouched', async () => {
    http.handler = () => ({ status: 500, body: 'oops' })
    await expect(invoke('banlist:fetch', 'yugioh', 'advanced')).rejects.toThrow('HTTP 500')
    expect(fs.existsSync(storeFile())).toBe(false)
  })

  it('rejects games without a banlist API', async () => {
    await expect(invoke('banlist:fetch', 'lorcana', 'core')).rejects.toThrow('No banlist API configured')
  })
})

describe('banlist:delete', () => {
  it('removes only the addressed entry', async () => {
    fs.writeFileSync(storeFile(), JSON.stringify({
      'yugioh:advanced': { game: 'yugioh' },
      'mtg:modern': { game: 'mtg' },
    }))
    await invoke('banlist:delete', 'yugioh', 'advanced')
    expect(readStore()).toEqual({ 'mtg:modern': { game: 'mtg' } })
  })
})
