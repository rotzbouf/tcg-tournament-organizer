import { Player } from '../types/player'
import { Round } from '../types/round'
import { Standing } from '../types/standing'
import { GameType } from '../types/tournament'
import { calculateMatchPoints, getPlayerRecord } from './scoring'
import { GAME_CONFIG, TiebreakerConfig } from '../lib/gameConfig'

export function calculateStandings(players: Player[], rounds: Round[], game?: GameType, playerFilter?: Set<string>): Standing[] {
  const filteredPlayers = playerFilter ? players.filter(p => playerFilter.has(p.id)) : players
  const completedRounds = rounds.filter(r => r.isComplete)

  const swissRounds = completedRounds.filter(r => r.phase === 'swiss' || r.phase === 'round_robin')
  const bracketPhases = new Set(['top_cut', 'winners_bracket', 'losers_bracket', 'grand_final'])
  const topCutRounds = completedRounds.filter(r => bracketPhases.has(r.phase))

  const config: TiebreakerConfig = game ? GAME_CONFIG[game].tiebreakers : { system: 'chess', opponentWinFloor: 0, useGameWinPct: false, useHeadToHead: false }

  const standings: Standing[] = filteredPlayers.map(player => {
    const matchPoints = calculateMatchPoints(player.id, swissRounds)
    const record = getPlayerRecord(player.id, swissRounds)
    const opponents = getOpponentIds(player.id, swissRounds)
    const buchholz = calculateBuchholz(opponents, swissRounds)
    const medianBuchholz = calculateMedianBuchholz(opponents, swissRounds)
    const sonnebornBerger = calculateSonnebornBerger(player.id, swissRounds)
    const opponentMatchWinPct = calculateOpponentMatchWinPct(player.id, swissRounds, config.opponentWinFloor)
    const gameWinPct = calculateGameWinPct(player.id, swissRounds, config.opponentWinFloor)
    const opponentGameWinPct = calculateOpponentGameWinPct(player.id, swissRounds, config.opponentWinFloor)

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
      opponentMatchWinPct,
      gameWinPct,
      opponentGameWinPct,
      dropped: player.droppedInRound !== null,
    }
  })

  if (config.system === 'tcg') {
    standings.sort((a, b) => {
      if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints
      if (b.opponentMatchWinPct !== a.opponentMatchWinPct) return b.opponentMatchWinPct - a.opponentMatchWinPct
      if (config.useGameWinPct) {
        if (b.gameWinPct !== a.gameWinPct) return b.gameWinPct - a.gameWinPct
        if (b.opponentGameWinPct !== a.opponentGameWinPct) return b.opponentGameWinPct - a.opponentGameWinPct
      }
      if (config.useHeadToHead) {
        const h2h = checkHeadToHead(a.playerId, b.playerId, swissRounds)
        if (h2h !== 0) return h2h
      }
      return 0
    })
  } else {
    standings.sort((a, b) => {
      if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz
      if (b.medianBuchholz !== a.medianBuchholz) return b.medianBuchholz - a.medianBuchholz
      if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger
      return 0
    })
  }

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

function calculateOpponentMatchWinPct(playerId: string, rounds: Round[], floor: number): number {
  const opponents = getOpponentIds(playerId, rounds)
  if (opponents.length === 0) return 0

  const pcts = opponents.map(oppId => {
    const record = getPlayerRecord(oppId, rounds)
    const total = record.wins + record.losses + record.draws
    if (total === 0) return floor
    return Math.max(floor, record.wins / total)
  })

  return pcts.reduce((sum, p) => sum + p, 0) / pcts.length
}

function calculateGameWinPct(playerId: string, rounds: Round[], floor: number): number {
  let gameWins = 0
  let totalGames = 0

  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.isBye || match.result === 'pending') continue

      if (match.player1Id === playerId) {
        if (match.player1Games !== undefined && match.player2Games !== undefined) {
          gameWins += match.player1Games
          totalGames += match.player1Games + match.player2Games
        } else {
          gameWins += match.result === 'player1_win' ? 1 : match.result === 'draw' ? 0.5 : 0
          totalGames += 1
        }
      } else if (match.player2Id === playerId) {
        if (match.player1Games !== undefined && match.player2Games !== undefined) {
          gameWins += match.player2Games
          totalGames += match.player1Games + match.player2Games
        } else {
          gameWins += match.result === 'player2_win' ? 1 : match.result === 'draw' ? 0.5 : 0
          totalGames += 1
        }
      }
    }
  }

  if (totalGames === 0) return floor
  return Math.max(floor, gameWins / totalGames)
}

function calculateOpponentGameWinPct(playerId: string, rounds: Round[], floor: number): number {
  const opponents = getOpponentIds(playerId, rounds)
  if (opponents.length === 0) return 0

  const pcts = opponents.map(oppId => calculateGameWinPct(oppId, rounds, floor))
  return pcts.reduce((sum, p) => sum + p, 0) / pcts.length
}

function checkHeadToHead(playerAId: string, playerBId: string, rounds: Round[]): number {
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.isBye || match.result === 'pending') continue
      if (match.player1Id === playerAId && match.player2Id === playerBId) {
        if (match.result === 'player1_win') return -1
        if (match.result === 'player2_win') return 1
      }
      if (match.player1Id === playerBId && match.player2Id === playerAId) {
        if (match.result === 'player1_win') return 1
        if (match.result === 'player2_win') return -1
      }
    }
  }
  return 0
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
