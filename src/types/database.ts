export interface EloHistoryEntry {
  tournamentId: string
  tournamentName: string
  date: string
  eloBefore: number
  eloAfter: number
  placement: number
}

export interface DatabasePlayer {
  id: string
  name: string
  elo: number
  matchesPlayed: number
  tournamentsPlayed: number
  history: EloHistoryEntry[]
  lastUpdated: string
}
