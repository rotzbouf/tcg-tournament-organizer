import { Player } from '@/types/player'
import { Round } from '@/types/round'
import { Standing } from '@/types/standing'
import { calculateMatchPoints, getPlayerRecord } from './scoring'

export function calculateStandings(players: Player[], rounds: Round[]): Standing[] {
  const completedRounds = rounds.filter(r => r.isComplete)

  const swissRounds = completedRounds.filter(r => r.phase === 'swiss')
  const topCutRounds = completedRounds.filter(r => r.phase === 'top_cut')

  const standings: Standing[] = players.map(player => {
    const matchPoints = calculateMatchPoints(player.id, swissRounds)
    const record = getPlayerRecord(player.id, swissRounds)
    const opponents = getOpponentIds(player.id, swissRounds)
    const buchholz = calculateBuchholz(opponents, swissRounds)
    const medianBuchholz = calculateMedianBuchholz(opponents, swissRounds)
    const sonnebornBerger = calculateSonnebornBerger(player.id, swissRounds)

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

  if (topCutRounds.length > 0) {
    const bracketRanking = calculateBracketRanking(topCutRounds)
    const topCutPlayerIds = new Set(bracketRanking.map(r => r.playerId))

    const nonTopCutStandings = standings.filter(s => !topCutPlayerIds.has(s.playerId))
    const topCutStandings = bracketRanking.map(({ playerId, rank }) => {
      const s = standings.find(s => s.playerId === playerId)!
      return { ...s, rank }
    })

    let nextRank = topCutStandings.length + 1
    nonTopCutStandings.forEach(s => { s.rank = nextRank++ })

    return [...topCutStandings, ...nonTopCutStandings]
  }

  standings.forEach((s, i) => { s.rank = i + 1 })

  return standings
}

function calculateBracketRanking(topCutRounds: Round[]): { playerId: string; rank: number }[] {
  const allTopCutPlayerIds = new Set<string>()
  for (const round of topCutRounds) {
    for (const match of round.matches) {
      allTopCutPlayerIds.add(match.player1Id)
      if (match.player2Id) allTopCutPlayerIds.add(match.player2Id)
    }
  }

  const eliminatedInRound = new Map<string, number>()

  for (const round of topCutRounds) {
    for (const match of round.matches) {
      if (match.result === 'pending') continue
      const loserId = match.result === 'player1_win' ? match.player2Id : match.player1Id
      if (loserId) {
        eliminatedInRound.set(loserId, round.roundNumber)
      }
    }
  }

  const lastRound = topCutRounds[topCutRounds.length - 1]
  const lastRoundComplete = lastRound?.isComplete && lastRound.matches.length === 1
  let winnerId: string | null = null
  if (lastRoundComplete) {
    const finalMatch = lastRound.matches[0]
    winnerId = finalMatch.result === 'player1_win' ? finalMatch.player1Id :
               finalMatch.result === 'player2_win' ? finalMatch.player2Id : null
  }

  const ranking: { playerId: string; rank: number }[] = []
  let currentRank = 1

  if (winnerId) {
    ranking.push({ playerId: winnerId, rank: currentRank++ })
    const finalistId = lastRound.matches[0].result === 'player1_win'
      ? lastRound.matches[0].player2Id!
      : lastRound.matches[0].player1Id
    ranking.push({ playerId: finalistId, rank: currentRank++ })
    eliminatedInRound.delete(finalistId)
  }

  const roundNumbers = [...new Set(eliminatedInRound.values())].sort((a, b) => b - a)

  for (const roundNum of roundNumbers) {
    const eliminatedThisRound = [...eliminatedInRound.entries()]
      .filter(([, r]) => r === roundNum)
      .map(([id]) => id)

    for (const playerId of eliminatedThisRound) {
      if (ranking.some(r => r.playerId === playerId)) continue
      ranking.push({ playerId, rank: currentRank })
    }
    currentRank += eliminatedThisRound.length
  }

  for (const playerId of allTopCutPlayerIds) {
    if (!ranking.some(r => r.playerId === playerId)) {
      ranking.push({ playerId, rank: currentRank++ })
    }
  }

  return ranking
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
