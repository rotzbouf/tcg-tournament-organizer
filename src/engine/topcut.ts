import { Match } from '@/types/round'
import { generateId } from '@/lib/utils'

export function generateTopCutRound(playerIds: string[], roundNumber: number): Match[] {
  if (playerIds.length < 2 || !isPowerOfTwo(playerIds.length)) return []

  const matches: Match[] = []

  for (let i = 0; i < playerIds.length; i += 2) {
    matches.push({
      id: generateId(),
      roundNumber,
      tableNumber: (i / 2) + 1,
      player1Id: playerIds[i],
      player2Id: playerIds[i + 1],
      result: 'pending',
      isBye: false,
    })
  }

  return matches
}

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0
}
