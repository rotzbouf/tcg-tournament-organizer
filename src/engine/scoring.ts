import { Match, Round } from '@/types/round'

export const WIN_POINTS = 3
export const DRAW_POINTS = 1
export const LOSS_POINTS = 0
export const BYE_POINTS = 3

export function calculateMatchPoints(playerId: string, rounds: Round[]): number {
  let points = 0
  for (const round of rounds) {
    if (!round.isComplete) continue
    for (const match of round.matches) {
      points += getMatchPointsForPlayer(playerId, match)
    }
  }
  return points
}

export function getMatchPointsForPlayer(playerId: string, match: Match): number {
  if (match.result === 'pending') return 0

  if (match.isBye && match.player1Id === playerId) {
    return BYE_POINTS
  }

  if (match.player1Id === playerId) {
    if (match.result === 'player1_win') return WIN_POINTS
    if (match.result === 'draw') return DRAW_POINTS
    return LOSS_POINTS
  }

  if (match.player2Id === playerId) {
    if (match.result === 'player2_win') return WIN_POINTS
    if (match.result === 'draw') return DRAW_POINTS
    return LOSS_POINTS
  }

  return 0
}

export function getPlayerRecord(playerId: string, rounds: Round[]): { wins: number; losses: number; draws: number } {
  let wins = 0
  let losses = 0
  let draws = 0

  for (const round of rounds) {
    if (!round.isComplete) continue
    for (const match of round.matches) {
      if (match.result === 'pending') continue

      if (match.isBye && match.player1Id === playerId) {
        wins++
        continue
      }

      if (match.player1Id === playerId) {
        if (match.result === 'player1_win') wins++
        else if (match.result === 'draw') draws++
        else losses++
      } else if (match.player2Id === playerId) {
        if (match.result === 'player2_win') wins++
        else if (match.result === 'draw') draws++
        else losses++
      }
    }
  }

  return { wins, losses, draws }
}

export function calculateTotalRounds(playerCount: number, minRounds = 0): number {
  if (playerCount <= 1) return 0
  return Math.max(Math.ceil(Math.log2(playerCount)), minRounds)
}

export function calculateTopCutSize(playerCount: number): 0 | 4 | 8 | 16 | 32 {
  if (playerCount < 9) return 0
  if (playerCount <= 16) return 4
  if (playerCount <= 32) return 8
  if (playerCount <= 64) return 16
  return 32
}
