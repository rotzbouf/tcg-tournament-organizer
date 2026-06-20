import { Player } from '@/types/player'
import { Round } from '@/types/round'
import { Standing } from '@/types/standing'
import { calculateMatchPoints, getPlayerRecord } from './scoring'

export function calculateStandings(players: Player[], rounds: Round[]): Standing[] {
  const completedRounds = rounds.filter(r => r.isComplete)

  const standings: Standing[] = players.map(player => {
    const matchPoints = calculateMatchPoints(player.id, completedRounds)
    const record = getPlayerRecord(player.id, completedRounds)
    const opponents = getOpponentIds(player.id, completedRounds)
    const buchholz = calculateBuchholz(opponents, completedRounds)
    const medianBuchholz = calculateMedianBuchholz(opponents, completedRounds)
    const sonnebornBerger = calculateSonnebornBerger(player.id, completedRounds)

    return {
      playerId: player.id,
      playerName: player.name,
      rank: 0,
      matchPoints,
      wins: record.wins,
      losses: record.losses,
      draws: record.draws,
      buchholz,
      medianBuchholz,
      sonnebornBerger,
      dropped: player.droppedInRound !== null,
    }
  })

  standings.sort((a, b) => {
    if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz
    if (b.medianBuchholz !== a.medianBuchholz) return b.medianBuchholz - a.medianBuchholz
    if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger
    return 0
  })

  standings.forEach((s, i) => { s.rank = i + 1 })

  return standings
}

function getOpponentIds(playerId: string, rounds: Round[]): string[] {
  const opponents: string[] = []
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.isBye) continue
      if (match.player1Id === playerId && match.player2Id) {
        opponents.push(match.player2Id)
      } else if (match.player2Id === playerId) {
        opponents.push(match.player1Id)
      }
    }
  }
  return opponents
}

function calculateBuchholz(opponentIds: string[], rounds: Round[]): number {
  return opponentIds.reduce((sum, oppId) => {
    return sum + calculateMatchPoints(oppId, rounds)
  }, 0)
}

function calculateMedianBuchholz(opponentIds: string[], rounds: Round[]): number {
  if (opponentIds.length <= 2) {
    return calculateBuchholz(opponentIds, rounds)
  }

  const opponentPoints = opponentIds
    .map(oppId => calculateMatchPoints(oppId, rounds))
    .sort((a, b) => a - b)

  const trimmed = opponentPoints.slice(1, -1)
  return trimmed.reduce((sum, pts) => sum + pts, 0)
}

function calculateSonnebornBerger(playerId: string, rounds: Round[]): number {
  let score = 0

  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.isBye || match.result === 'pending') continue

      let opponentId: string | null = null
      let playerWon = false
      let isDraw = false

      if (match.player1Id === playerId && match.player2Id) {
        opponentId = match.player2Id
        playerWon = match.result === 'player1_win'
        isDraw = match.result === 'draw'
      } else if (match.player2Id === playerId) {
        opponentId = match.player1Id
        playerWon = match.result === 'player2_win'
        isDraw = match.result === 'draw'
      }

      if (opponentId) {
        const oppPoints = calculateMatchPoints(opponentId, rounds)
        if (playerWon) score += oppPoints
        else if (isDraw) score += oppPoints * 0.5
      }
    }
  }

  return score
}
