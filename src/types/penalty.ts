export type PenaltyType = 'warning' | 'game_loss' | 'match_loss' | 'disqualification'

export interface Penalty {
  id: string
  playerId: string
  roundNumber: number
  type: PenaltyType
  reason: string
  issuedAt: string
}
