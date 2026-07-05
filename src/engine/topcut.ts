import { Match } from '@/types/round'
import { generateId } from '@/lib/utils'

// Standard single-elimination seeding (official Pokémon/MTG/Yu-Gi-Oh top cut):
// seed 1 meets the lowest qualifier, every round-1 pairing sums to size+1,
// and seeds 1 and 2 sit in opposite halves so they can only meet in the
// final. Returns 1-based seeds in bracket order, e.g. size 8 → [1,8,4,5,2,7,3,6].
// generateTopCutRound pairs sequentially, so feeding it this order makes the
// sequential winner pairing of later rounds collapse the bracket correctly.
export function bracketSeedOrder(size: number): number[] {
  let order = [1]
  while (order.length < size) {
    const opponentSum = order.length * 2 + 1
    order = order.flatMap(seed => [seed, opponentSum - seed])
  }
  return order
}

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
