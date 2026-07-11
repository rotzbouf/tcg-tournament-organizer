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
  // Display name of the judge who issued this from a judge device. Absent for
  // penalties entered on the TO desktop — all judges share one access token,
  // so this is the only attribution.
  issuedBy?: string
}
