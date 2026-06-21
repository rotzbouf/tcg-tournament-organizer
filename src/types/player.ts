export interface Player {
  id: string
  name: string
  deckName: string | null
  hasBye: boolean
  droppedInRound: number | null
}
