export interface DecklistEntry {
  quantity: number
  cardName: string
}

export interface Player {
  id: string
  name: string
  playerId: string | null
  deckName: string | null
  decklist: DecklistEntry[] | null
  hasBye: boolean
  droppedInRound: number | null
}
