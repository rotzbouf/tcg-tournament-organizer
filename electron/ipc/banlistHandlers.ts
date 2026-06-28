import { ipcMain, app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { BanlistData, BanlistStore } from '../../src/types/banlist'
import { GameType } from '../../src/types/tournament'

const BANLIST_FILE = path.join(app.getPath('userData'), 'banlists.json')

function loadStore(): BanlistStore {
  try {
    if (fs.existsSync(BANLIST_FILE)) {
      return JSON.parse(fs.readFileSync(BANLIST_FILE, 'utf-8')) as BanlistStore
    }
  } catch { /* corrupt file – start fresh */ }
  return {}
}

function saveStore(store: BanlistStore): void {
  fs.writeFileSync(BANLIST_FILE, JSON.stringify(store, null, 2), 'utf-8')
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'TCG-Tournament-Organizer/1.0', 'Accept': 'application/json' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const location = res.headers.location
        if (location) { resolve(httpsGet(location)); return }
      }
      let body = ''
      res.on('data', chunk => { body += chunk })
      res.on('end', () => resolve(body))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timed out')) })
  })
}

type ScryfallResponse = { object?: string; data?: { name: string; set?: string }[]; has_more?: boolean; next_page?: string }

async function scryfallPage(url: string): Promise<ScryfallResponse> {
  const body = await httpsGet(url)
  const json = JSON.parse(body) as ScryfallResponse
  if (!Array.isArray(json.data)) {
    throw new Error(`Scryfall error: ${body.slice(0, 200)}`)
  }
  return json
}

async function scryfallSearchAll(query: string): Promise<string[]> {
  const names: string[] = []
  let url: string | null = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=name&unique=cards`
  while (url) {
    const json = await scryfallPage(url)
    for (const card of json.data!) names.push(card.name)
    url = json.has_more && json.next_page ? json.next_page : null
  }
  return names
}

async function scryfallStandardLegalNames(): Promise<string[]> {
  const names: string[] = []
  let url: string | null = `https://api.scryfall.com/cards/search?q=${encodeURIComponent('legal:standard')}&unique=cards&order=name`
  while (url) {
    const json = await scryfallPage(url)
    for (const card of json.data!) names.push(card.name)
    url = json.has_more && json.next_page ? json.next_page : null
  }
  return names
}

async function fetchYgoprodeck(format: string): Promise<BanlistData> {
  const body = await httpsGet('https://db.ygoprodeck.com/api/v7/cardinfo.php?banlist=tcg')
  const json = JSON.parse(body) as { data: { name: string; ban_tcg?: string }[] }
  const forbidden: string[] = []
  const limited: string[] = []
  const semiLimited: string[] = []
  for (const card of json.data) {
    if (card.ban_tcg === 'Forbidden') forbidden.push(card.name)
    else if (card.ban_tcg === 'Limited') limited.push(card.name)
    else if (card.ban_tcg === 'Semi-Limited') semiLimited.push(card.name)
  }
  if (format === 'traditional') {
    // In Traditional Format all Forbidden cards become Limited (max 1)
    return { game: 'yugioh', format, lastUpdated: new Date().toISOString(), forbidden: [], limited: [...forbidden, ...limited], semiLimited }
  }
  return { game: 'yugioh', format, lastUpdated: new Date().toISOString(), forbidden, limited, semiLimited }
}

async function fetchPokemonLegalSetCodes(legality: 'standard' | 'expanded'): Promise<string[]> {
  const setCodes: string[] = []
  let url: string | null = `https://api.pokemontcg.io/v2/sets?q=legalities.${legality}:Legal&pageSize=250&page=1`
  while (url) {
    const body = await httpsGet(url)
    const json = JSON.parse(body) as { data: { ptcgoCode?: string }[]; page: number; pageSize: number; count: number; totalCount: number }
    for (const set of json.data) {
      if (set.ptcgoCode) setCodes.push(set.ptcgoCode.toUpperCase())
    }
    const fetched = json.page * json.pageSize
    url = fetched < json.totalCount ? url.replace(/page=\d+/, `page=${json.page + 1}`) : null
  }
  return setCodes
}

async function fetchPokemontcg(format: string): Promise<BanlistData> {
  const legality = format === 'standard' ? 'standard' : 'expanded'
  let url: string | null = `https://api.pokemontcg.io/v2/cards?q=legalities.${legality}:Banned&pageSize=250&page=1`
  const forbidden: string[] = []
  while (url) {
    const body = await httpsGet(url)
    const json = JSON.parse(body) as { data: { name: string }[]; page: number; pageSize: number; count: number; totalCount: number }
    for (const card of json.data) {
      const name = card.name
      if (!forbidden.includes(name)) forbidden.push(name)
    }
    const fetched = json.page * json.pageSize
    url = fetched < json.totalCount ? url.replace(/page=\d+/, `page=${json.page + 1}`) : null
  }

  let legalSetCodes: string[] | undefined
  if (format === 'standard') {
    legalSetCodes = await fetchPokemonLegalSetCodes('standard')
  }

  return { game: 'pokemon', format, lastUpdated: new Date().toISOString(), forbidden, limited: [], semiLimited: [], legalSetCodes }
}

async function fetchScryfall(game: GameType, format: string): Promise<BanlistData> {
  const forbidden: string[] = []
  const limited: string[] = []

  if (format === 'vintage') {
    const [banned, restricted] = await Promise.all([
      scryfallSearchAll('banned:vintage'),
      scryfallSearchAll('restricted:vintage'),
    ])
    forbidden.push(...banned)
    limited.push(...restricted)
  } else {
    const banned = await scryfallSearchAll(`banned:${format}`)
    forbidden.push(...banned)
  }

  let legalCardNames: string[] | undefined
  if (format === 'standard') {
    legalCardNames = await scryfallStandardLegalNames()
  }

  return { game, format, lastUpdated: new Date().toISOString(), forbidden, limited, semiLimited: [], legalCardNames }
}

export function registerBanlistHandlers() {
  ipcMain.handle('banlist:load', () => loadStore())

  ipcMain.handle('banlist:fetch', async (_event, game: GameType, format: string): Promise<BanlistData> => {
    let data: BanlistData

    if (game === 'yugioh') {
      data = await fetchYgoprodeck(format)
    } else if (game === 'pokemon') {
      data = await fetchPokemontcg(format)
    } else if (game === 'mtg') {
      data = await fetchScryfall(game, format)
    } else {
      throw new Error(`No banlist API configured for ${game}/${format}`)
    }

    const store = loadStore()
    store[`${game}:${format}`] = data
    saveStore(store)
    return data
  })

  ipcMain.handle('banlist:delete', (_event, game: GameType, format: string) => {
    const store = loadStore()
    delete store[`${game}:${format}`]
    saveStore(store)
  })
}
