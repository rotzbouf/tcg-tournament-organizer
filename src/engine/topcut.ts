import { Match } from '@/types/round'
import { generateId } from '@/lib/utils'

export function generateTopCutRound(playerIds: string[], roundNumber: number): Match[] {
  const matches: Match[] = []

  for (let i = 0; i < playerIds.length; i += 2) {
    if (i + 1 < playerIds.length) {
      matches.push({
        id: generateId(),
        roundNumber,
        player1Id: playerIds[i],
        player2Id: playerIds[i + 1],
        result: 'pending',
        isBye: false,
      })
    }
  }

  return matches
}
