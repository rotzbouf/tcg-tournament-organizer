export type PenaltyType = 'warning' | 'game_loss' | 'match_loss' | 'disqualification' | 'note'

export interface Penalty {
  id: string
  playerId: string
  roundNumber: number
  type: PenaltyType
  // Catalog infraction key (penaltyCatalog). Absent for legacy/freetext-only
  // penalties. Drives escalation and the localized offence label.
  infractionId?: string
  reason: string
  issuedAt: string
}
