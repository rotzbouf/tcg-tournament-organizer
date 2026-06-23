import { AppState } from '@/state/actions'
import { Tournament, GameType, TournamentStatus, TournamentFormat } from '@/types/tournament'

interface ExportData {
  version: string
  exportedAt: string
  appName: string
  data: AppState
}

const CURRENT_VERSION = '1.2.0'
const APP_NAME = 'TCG Tournament Organizer'

const VALID_GAMES: GameType[] = ['yugioh', 'pokemon', 'star_wars_unlimited', 'riftbound', 'lorcana', 'altered', 'mtg']
const VALID_STATUSES: TournamentStatus[] = ['registration', 'in_progress', 'top_cut', 'completed']
const VALID_FORMATS: TournamentFormat[] = ['swiss', 'swiss_topcut', 'double_elimination', 'round_robin']

export function serializeState(state: AppState): string {
  const exportData: ExportData = {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    appName: APP_NAME,
    data: state,
  }
  return JSON.stringify(exportData, null, 2)
}

export function deserializeState(json: string): AppState {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Invalid JSON format')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid file structure')
  }

  const data = parsed as Record<string, unknown>

  if (!data.version || typeof data.version !== 'string') {
    throw new Error('Missing version field')
  }

  if (!data.data || typeof data.data !== 'object') {
    throw new Error('Missing data field')
  }

  const appState = data.data as Record<string, unknown>
  if (!appState.tournaments || typeof appState.tournaments !== 'object') {
    throw new Error('Missing tournaments field')
  }

  const tournaments = appState.tournaments as Record<string, unknown>
  for (const [id, value] of Object.entries(tournaments)) {
    validateTournament(id, value)
    migrateTournament(value as unknown as Record<string, unknown>)
  }

  if (!appState.playerDatabase || typeof appState.playerDatabase !== 'object') {
    appState.playerDatabase = {}
  }

  return appState as unknown as AppState
}

function validateTournament(id: string, value: unknown): asserts value is Tournament {
  if (!value || typeof value !== 'object') {
    throw new Error(`Tournament ${id}: invalid format`)
  }

  const t = value as Record<string, unknown>

  if (typeof t.id !== 'string' || typeof t.name !== 'string') {
    throw new Error(`Tournament ${id}: missing id or name`)
  }

  if (!VALID_GAMES.includes(t.game as GameType)) {
    throw new Error(`Tournament ${id}: invalid game type "${t.game}"`)
  }

  if (!VALID_STATUSES.includes(t.status as TournamentStatus)) {
    throw new Error(`Tournament ${id}: invalid status "${t.status}"`)
  }

  if (!Array.isArray(t.players)) {
    throw new Error(`Tournament ${id}: players must be an array`)
  }

  if (!Array.isArray(t.rounds)) {
    throw new Error(`Tournament ${id}: rounds must be an array`)
  }
}

function migrateTournament(t: Record<string, unknown> & { format?: unknown; penalties?: unknown; topCut?: unknown }): void {
  if (!t.format || !VALID_FORMATS.includes(t.format as TournamentFormat)) {
    const topCut = typeof t.topCut === 'number' ? t.topCut : 0
    t.format = topCut > 0 ? 'swiss_topcut' : 'swiss'
  }

  if (!Array.isArray(t.penalties)) {
    t.penalties = []
  }
  if (!Array.isArray(t.phases)) {
    t.phases = []
  }
  if (typeof t.currentPhaseIndex !== 'number') {
    t.currentPhaseIndex = 0
  }
  if (typeof t.grandFinalReset !== 'boolean') {
    t.grandFinalReset = false
  }
  if (t.discordWebhookUrl === undefined) {
    t.discordWebhookUrl = null
  }
  if (typeof t.eloApplied !== 'boolean') {
    t.eloApplied = t.status === 'completed'
  }
}
