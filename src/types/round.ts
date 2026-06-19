export type MatchResult = 'player1_win' | 'player2_win' | 'draw' | 'pending'

export interface Match {
  id: string
  roundNumber: number
  player1Id: string
  player2Id: string | null
  result: MatchResult
  isBye: boolean
}

export interface Round {
  roundNumber: number
  matches: Match[]
  isComplete: boolean
}
