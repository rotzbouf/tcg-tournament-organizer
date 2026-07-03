import { Match } from '@/types/round'
import { generateId } from '@/lib/utils'

// `playerIds` must be the full list the schedule was originally computed over
// (the circle method is order-sensitive); dropped players are passed via
// `droppedIds` so the schedule stays stable and their scheduled opponents
// receive a bye instead of a dead pairing.
export function generateRoundRobinRound(playerIds: string[], roundIndex: number, roundNumber: number, droppedIds?: Set<string>): Match[] {
  const schedule = computeSchedule(playerIds)
  if (roundIndex >= schedule.length) return []

  const pairings = schedule[roundIndex]
  const isOut = (id: string) => droppedIds?.has(id) ?? false
  let tableNumber = 1

  const byeFor = (id: string): Match => ({
    id: generateId(),
    roundNumber,
    tableNumber: 0,
    player1Id: id,
    player2Id: null,
    result: 'player1_win',
    isBye: true,
  })

  const matches: Match[] = []
  for (const [p1, p2] of pairings) {
    if (p2 === null) {
      if (!isOut(p1)) matches.push(byeFor(p1))
    } else if (isOut(p1) && isOut(p2)) {
      // both gone — nothing to play
    } else if (isOut(p2)) {
      matches.push(byeFor(p1))
    } else if (isOut(p1)) {
      matches.push(byeFor(p2))
    } else {
      matches.push({
        id: generateId(),
        roundNumber,
        tableNumber: tableNumber++,
        player1Id: p1,
        player2Id: p2,
        result: 'pending',
        isBye: false,
      })
    }
  }

  return matches
}

export function getRoundRobinTotalRounds(playerCount: number): number {
  if (playerCount <= 1) return 0
  return playerCount % 2 === 0 ? playerCount - 1 : playerCount
}

function computeSchedule(playerIds: string[]): [string, string | null][][] {
  const ids = [...playerIds]
  const hasGhost = ids.length % 2 !== 0
  if (hasGhost) ids.push('__bye__')

  const n = ids.length
  const totalRounds = n - 1
  const schedule: [string, string | null][][] = []

  const fixed = ids[0]
  const rotating = ids.slice(1)

  for (let round = 0; round < totalRounds; round++) {
    const pairings: [string, string | null][] = []
    const current = [fixed, ...rotating]

    for (let i = 0; i < n / 2; i++) {
      const p1 = current[i]
      const p2 = current[n - 1 - i]

      if (p1 === '__bye__') {
        pairings.push([p2, null])
      } else if (p2 === '__bye__') {
        pairings.push([p1, null])
      } else {
        pairings.push([p1, p2])
      }
    }

    schedule.push(pairings)
    rotating.push(rotating.shift()!)
  }

  return schedule
}
