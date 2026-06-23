export interface EloHistoryEntry {
  tournamentId: string
  tournamentName: string
  date: string
  eloBefore: number
  eloAfter: number
  placement: number
}

export interface DatabasePenalty {
  tournamentId: string
  tournamentName: string
  date: string
  type: string
  reason: string
}

export interface DatabasePlayer {
  id: string
  name: string
  game: string
  playerId: string | null
  elo: number
  matchesPlayed: number
  tournamentsPlayed: number
  history: EloHistoryEntry[]
  penalties: DatabasePenalty[]
  lastUpdated: string
}
