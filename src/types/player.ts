export interface DecklistEntry {
  quantity: number
  cardName: string
  setCode?: string
  section?: 'pokemon' | 'trainer' | 'energy'
  sideboard?: boolean
}

export interface Player {
  id: string
  name: string
  playerId: string | null
  dateOfBirth: string | null
  deckName: string | null
  decklist: DecklistEntry[] | null
  hasBye: boolean
  droppedInRound: number | null
  // Judge display name when the drop came from a judge device (drop action or
  // DQ penalty); absent for TO-side drops and player self-drops.
  droppedBy?: string
}
