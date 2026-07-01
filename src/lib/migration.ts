// Shared schema migrations applied both when loading from localStorage
// (storage.ts) and when importing a file (serialization.ts), so the two paths
// can never drift apart. Each function mutates the raw parsed object in place.

const VALID_FORMATS = ['swiss', 'swiss_topcut', 'double_elimination', 'round_robin']

export function migrateTournament(t: Record<string, unknown>): void {
  if (!t.format || !VALID_FORMATS.includes(t.format as string)) {
    const topCut = typeof t.topCut === 'number' ? t.topCut : 0
    t.format = topCut > 0 ? 'swiss_topcut' : 'swiss'
  }
  if (!Array.isArray(t.penalties)) t.penalties = []
  if (!Array.isArray(t.phases)) t.phases = []
  if (typeof t.currentPhaseIndex !== 'number') t.currentPhaseIndex = 0
  if (Array.isArray(t.rounds)) {
    for (const r of t.rounds as Record<string, unknown>[]) {
      if (typeof r.phaseIndex !== 'number') r.phaseIndex = 0
    }
  }
  if (typeof t.grandFinalReset !== 'boolean') t.grandFinalReset = false
  if (typeof t.ageDivisionsEnabled !== 'boolean') t.ageDivisionsEnabled = false
  if (t.discordWebhookUrl === undefined) t.discordWebhookUrl = null
  if (t.gameFormat === undefined) t.gameFormat = null
  if (typeof t.eloApplied !== 'boolean') t.eloApplied = t.status === 'completed'
  if (typeof t.archived !== 'boolean') t.archived = false
  if (Array.isArray(t.players)) {
    for (const p of t.players as Record<string, unknown>[]) {
      if (p.decklist === undefined) p.decklist = null
      if (p.playerId === undefined) p.playerId = null
      if (p.dateOfBirth === undefined) p.dateOfBirth = null
    }
  }
}

export function migrateDatabasePlayer(p: Record<string, unknown>): void {
  if (!p.game) p.game = 'yugioh'
  if (p.playerId === undefined) p.playerId = null
}
