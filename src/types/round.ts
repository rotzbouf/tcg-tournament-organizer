export type MatchResult = 'player1_win' | 'player2_win' | 'draw' | 'pending'

export interface Match {
  id: string
  roundNumber: number
  tableNumber: number
  player1Id: string
  player2Id: string | null
  result: MatchResult
  isBye: boolean
  player1Games?: number
  player2Games?: number
  // Time extension in minutes granted to this table (judge ruling, deck
  // check, …) — counts down after the round timer expires.
  extraTimeMinutes?: number
  // Judge display name when the result came from a judge device; absent when
  // the TO entered (or corrected) it on the desktop.
  resultEnteredBy?: string
}

export type RoundPhase = 'swiss' | 'top_cut' | 'winners_bracket' | 'losers_bracket' | 'grand_final' | 'round_robin'

export interface Round {
  roundNumber: number
  matches: Match[]
  isComplete: boolean
  phase: RoundPhase
  phaseIndex: number
}
