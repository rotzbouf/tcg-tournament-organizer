export type MatchResult = 'player1_win' | 'player2_win' | 'draw' | 'pending'

export interface Match {
  id: string
  roundNumber: number
  tableNumber: number
  player1Id: string
  player2Id: string | null
  result: MatchResult
  isBye: boolean
}

export type RoundPhase = 'swiss' | 'top_cut' | 'winners_bracket' | 'losers_bracket' | 'grand_final' | 'round_robin'

export interface Round {
  roundNumber: number
  matches: Match[]
  isComplete: boolean
  phase: RoundPhase
}
