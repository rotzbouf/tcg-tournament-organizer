import { Player } from '@/types/player'
import { Match, Round } from '@/types/round'
import { generateId } from '@/lib/utils'

// Multiplayer pod pairing (Commander). No official WotC structure exists —
// this follows the de-facto TopDeck.gg standard and the community Multiplayer
// Addendum where they agree: 4-player pods paired top-to-bottom by points,
// 3-player pods at the bottom instead of byes (a lone group of 5 only when
// nothing else fits), repeat podmates avoided, seating order randomized and
// recorded as the turn order.

export const POD_DRAW_POINTS = 1
export const DEFAULT_POD_WIN_POINTS = 5

export function podWinPointsOf(tournament: { podWinPoints?: number }): number {
  return tournament.podWinPoints ?? DEFAULT_POD_WIN_POINTS
}

export function calculatePodPoints(playerId: string, rounds: Round[], winPoints: number): number {
  let points = 0
  for (const round of rounds) {
    if (!round.isComplete) continue
    for (const match of round.matches) {
      if (!match.participantIds?.includes(playerId)) continue
      if (match.result === 'draw') points += POD_DRAW_POINTS
      else if (match.result !== 'pending' && match.podWinnerId === playerId) points += winPoints
    }
  }
  return points
}

// Pod sizes for n players, largest first. Remainders become 3-player pods at
// the bottom (Addendum and TopDeck agree: no byes in pod events); only n=5
// forces a single pod of five.
export function podSizes(n: number): number[] {
  if (n < 2) return []
  if (n <= 5) return [n]
  const r = n % 4
  if (r === 0) return Array(n / 4).fill(4)
  if (r === 3) return [...Array((n - 3) / 4).fill(4), 3]
  if (r === 2) return [...Array((n - 6) / 4).fill(4), 3, 3]
  return [...Array((n - 9) / 4).fill(4), 3, 3, 3]
}

function createPodMatch(participantIds: string[], roundNumber: number, tableNumber: number): Match {
  return {
    id: generateId(),
    roundNumber,
    tableNumber,
    player1Id: participantIds[0],
    player2Id: null,
    result: 'pending',
    isBye: false,
    participantIds,
    podWinnerId: null,
  }
}

function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function assignPods(orderedIds: string[], roundNumber: number): Match[] {
  const matches: Match[] = []
  let index = 0
  podSizes(orderedIds.length).forEach((size, i) => {
    matches.push(createPodMatch(orderedIds.slice(index, index + size), roundNumber, i + 1))
    index += size
  })
  return matches
}

export function generateFirstRoundPods(players: Player[]): Match[] {
  return assignPods(shuffle(players.map(p => p.id)), 1)
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

// How often each pair of players has already shared a pod.
function buildPairCounts(rounds: Round[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const round of rounds) {
    for (const match of round.matches) {
      const ids = match.participantIds
      if (!ids) continue
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const key = pairKey(ids[i], ids[j])
          counts.set(key, (counts.get(key) ?? 0) + 1)
        }
      }
    }
  }
  return counts
}

// A repeat pairing always outweighs any sum of point spreads within a pod —
// same lexicographic idea as the two-player swiss weights.
const REMATCH_PENALTY = 1_000_000

function podCost(pod: string[], points: Map<string, number>, pairCounts: Map<string, number>): number {
  let cost = 0
  for (let i = 0; i < pod.length; i++) {
    for (let j = i + 1; j < pod.length; j++) {
      cost += (pairCounts.get(pairKey(pod[i], pod[j])) ?? 0) * REMATCH_PENALTY
      const diff = (points.get(pod[i]) ?? 0) - (points.get(pod[j]) ?? 0)
      cost += diff * diff
    }
  }
  return cost
}

// Local search over cross-pod swaps (sizes stay fixed): keep swapping two
// players from different pods while it reduces total cost — first repeat
// podmates, then squared point spread. Pod events are a few hundred players
// at most, so the O(passes · n²) sweep is instant.
function optimizePods(pods: string[][], points: Map<string, number>, pairCounts: Map<string, number>): void {
  const MAX_PASSES = 8
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let improved = false
    for (let a = 0; a < pods.length; a++) {
      for (let b = a + 1; b < pods.length; b++) {
        for (let i = 0; i < pods[a].length; i++) {
          for (let j = 0; j < pods[b].length; j++) {
            const before = podCost(pods[a], points, pairCounts) + podCost(pods[b], points, pairCounts)
            ;[pods[a][i], pods[b][j]] = [pods[b][j], pods[a][i]]
            const after = podCost(pods[a], points, pairCounts) + podCost(pods[b], points, pairCounts)
            if (after < before) {
              improved = true
            } else {
              ;[pods[a][i], pods[b][j]] = [pods[b][j], pods[a][i]]
            }
          }
        }
      }
    }
    if (!improved) break
  }
}

// Swiss pod pairing: sort by points (random within equal points), slice
// top-to-bottom into pods, then swap players between pods to avoid repeat
// podmates. Seating within each pod is randomized last — the stored order is
// the turn order.
export function generatePodPairings(
  players: Player[],
  rounds: Round[],
  currentRoundNumber: number,
  winPoints: number
): Match[] {
  const active = players.filter(p => p.droppedInRound === null)
  if (active.length < 2) return []

  const points = new Map(active.map(p => [p.id, calculatePodPoints(p.id, rounds, winPoints)]))
  const order = shuffle(active.map(p => p.id))
  order.sort((a, b) => points.get(b)! - points.get(a)!)

  const pods: string[][] = []
  let index = 0
  for (const size of podSizes(order.length)) {
    pods.push(order.slice(index, index + size))
    index += size
  }
  optimizePods(pods, points, buildPairCounts(rounds))

  return pods.map((pod, i) => createPodMatch(shuffle(pod), currentRoundNumber, i + 1))
}

// TopDeck-style snake seeding for a Top 16: four pods of four — pod 1 holds
// seeds 1/8/9/16, pod 2 = 2/7/10/15, pod 3 = 3/6/11/14, pod 4 = 4/5/12/13.
// Works for any multiple of 4; a Top 4 is the single final pod.
export function snakeSeedPods(seededIds: string[]): string[][] {
  const podCount = Math.max(1, Math.floor(seededIds.length / 4))
  const pods: string[][] = Array.from({ length: podCount }, () => [])
  seededIds.forEach((id, idx) => {
    const row = Math.floor(idx / podCount)
    const col = row % 2 === 0 ? idx % podCount : podCount - 1 - (idx % podCount)
    pods[col].push(id)
  })
  return pods
}

// Cut pods keep their seed order in participantIds (turn order at the table
// is decided there, per common cEDH practice — higher seed gets the choice).
export function generatePodCutRound(pods: string[][], roundNumber: number): Match[] {
  return pods.map((pod, i) => createPodMatch(pod, roundNumber, i + 1))
}
