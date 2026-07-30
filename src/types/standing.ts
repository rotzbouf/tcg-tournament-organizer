export interface Standing {
  playerId: string
  playerName: string
  rank: number
  matchPoints: number
  wins: number
  losses: number
  draws: number
  buchholz: number
  medianBuchholz: number
  sonnebornBerger: number
  opponentMatchWinPct: number
  gameWinPct: number
  opponentGameWinPct: number
  // Pod tournaments only: average match points of all pod opponents, the
  // second tiebreaker after match-win percentage.
  avgOpponentPoints?: number
  dropped: boolean
}
