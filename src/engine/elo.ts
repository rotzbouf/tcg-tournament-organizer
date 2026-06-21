import { Round } from '@/types/round'
import { DatabasePlayer } from '@/types/database'

const DEFAULT_ELO = 1500
const K_NEW = 32
const K_ESTABLISHED = 16
const ESTABLISHED_THRESHOLD = 30

export interface EloUpdate {
  playerId: string
  eloBefore: number
  eloAfter: number
  delta: number
}

export function calculateEloChanges(
  playerIds: string[],
  rounds: Round[],
  playerDatabase: Record<string, DatabasePlayer>,
  playerNameMap: Record<string, string>,
  game?: string
): EloUpdate[] {
  const eloMap = new Map<string, number>()
  const matchCount = new Map<string, number>()

  for (const playerId of playerIds) {
    const name = playerNameMap[playerId]?.toLowerCase()
    const dbPlayer = name ? Object.values(playerDatabase).find(p => p.name.toLowerCase() === name && (!game || p.game === game)) : null
    eloMap.set(playerId, dbPlayer?.elo ?? DEFAULT_ELO)
    matchCount.set(playerId, dbPlayer?.matchesPlayed ?? 0)
  }

  const completedRounds = rounds.filter(r => r.isComplete)
  const deltas = new Map<string, number>()
  playerIds.forEach(id => deltas.set(id, 0))

  for (const round of completedRounds) {
    for (const match of round.matches) {
      if (match.isBye || match.result === 'pending' || !match.player2Id) continue
      if (!eloMap.has(match.player1Id) || !eloMap.has(match.player2Id)) continue

      const elo1 = eloMap.get(match.player1Id)! + (deltas.get(match.player1Id) ?? 0)
      const elo2 = eloMap.get(match.player2Id)! + (deltas.get(match.player2Id) ?? 0)

      const expected1 = expectedScore(elo1, elo2)
      const expected2 = 1 - expected1

      let actual1: number
      let actual2: number
      if (match.result === 'player1_win') {
        actual1 = 1
        actual2 = 0
      } else if (match.result === 'player2_win') {
        actual1 = 0
        actual2 = 1
      } else {
        actual1 = 0.5
        actual2 = 0.5
      }

      const k1 = getKFactor(matchCount.get(match.player1Id) ?? 0)
      const k2 = getKFactor(matchCount.get(match.player2Id) ?? 0)

      deltas.set(match.player1Id, (deltas.get(match.player1Id) ?? 0) + Math.round(k1 * (actual1 - expected1)))
      deltas.set(match.player2Id, (deltas.get(match.player2Id) ?? 0) + Math.round(k2 * (actual2 - expected2)))
    }
  }

  return playerIds.map(id => {
    const before = eloMap.get(id)!
    const delta = deltas.get(id) ?? 0
    return {
      playerId: id,
      eloBefore: before,
      eloAfter: before + delta,
      delta,
    }
  })
}

function expectedScore(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400))
}

function getKFactor(matchesPlayed: number): number {
  return matchesPlayed < ESTABLISHED_THRESHOLD ? K_NEW : K_ESTABLISHED
}

export { DEFAULT_ELO }
