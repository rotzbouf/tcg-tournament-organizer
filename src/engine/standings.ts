import { Player } from '../types/player'
import { Round } from '../types/round'
import { Standing } from '../types/standing'
import { GameType } from '../types/tournament'
import { WIN_POINTS, DRAW_POINTS, BYE_POINTS } from './scoring'
import { GAME_CONFIG, TiebreakerConfig } from '../lib/gameConfig'

// Per-player aggregates collected in a single pass over all completed swiss
// rounds. Every tiebreaker below is derived from these maps instead of
// re-scanning the rounds per player (the old O(n²·matches) approach made
// 500-player standings take seconds).
interface PlayerAggregate {
  matchPoints: number
  wins: number
  losses: number
  draws: number
  // Tiebreaker record: byes excluded per official Pokémon/MTG rules.
  tbWins: number
  tbLosses: number
  tbDraws: number
  gameWins: number
  totalGames: number
  opponents: string[]
  decided: { oppId: string; won: boolean; draw: boolean }[]
}

function emptyAggregate(): PlayerAggregate {
  return { matchPoints: 0, wins: 0, losses: 0, draws: 0, tbWins: 0, tbLosses: 0, tbDraws: 0, gameWins: 0, totalGames: 0, opponents: [], decided: [] }
}

function buildAggregates(rounds: Round[]): { aggregates: Map<string, PlayerAggregate>; headToHead: Map<string, string> } {
  const aggregates = new Map<string, PlayerAggregate>()
  // Unordered pair key → winner of the FIRST decisive encounter (draws skipped),
  // mirroring the scan order of the old checkHeadToHead.
  const headToHead = new Map<string, string>()
  const get = (id: string): PlayerAggregate => {
    let agg = aggregates.get(id)
    if (!agg) { agg = emptyAggregate(); aggregates.set(id, agg) }
    return agg
  }

  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.isBye) {
        if (match.result === 'pending') continue
        const a = get(match.player1Id)
        a.matchPoints += BYE_POINTS
        a.wins++ // byes show as wins in the record but stay out of tiebreakers
        continue
      }
      if (!match.player2Id) continue
      const a = get(match.player1Id)
      const b = get(match.player2Id)
      // Opponents count even while a result is pending (matches the old
      // getOpponentIds); everything score-related requires a decided match.
      a.opponents.push(match.player2Id)
      b.opponents.push(match.player1Id)
      if (match.result === 'pending') continue

      const p1Won = match.result === 'player1_win'
      const p2Won = match.result === 'player2_win'
      const draw = match.result === 'draw'
      a.matchPoints += p1Won ? WIN_POINTS : draw ? DRAW_POINTS : 0
      b.matchPoints += p2Won ? WIN_POINTS : draw ? DRAW_POINTS : 0
      if (p1Won) { a.wins++; a.tbWins++; b.losses++; b.tbLosses++ }
      else if (p2Won) { b.wins++; b.tbWins++; a.losses++; a.tbLosses++ }
      else { a.draws++; a.tbDraws++; b.draws++; b.tbDraws++ }

      if (match.player1Games !== undefined && match.player2Games !== undefined) {
        const total = match.player1Games + match.player2Games
        a.gameWins += match.player1Games
        a.totalGames += total
        b.gameWins += match.player2Games
        b.totalGames += total
      } else {
        a.gameWins += p1Won ? 1 : draw ? 0.5 : 0
        b.gameWins += p2Won ? 1 : draw ? 0.5 : 0
        a.totalGames += 1
        b.totalGames += 1
      }

      a.decided.push({ oppId: match.player2Id, won: p1Won, draw })
      b.decided.push({ oppId: match.player1Id, won: p2Won, draw })

      if (!draw && (p1Won || p2Won)) {
        const key = match.player1Id < match.player2Id
          ? `${match.player1Id}|${match.player2Id}`
          : `${match.player2Id}|${match.player1Id}`
        if (!headToHead.has(key)) headToHead.set(key, p1Won ? match.player1Id : match.player2Id)
      }
    }
  }

  return { aggregates, headToHead }
}

export function calculateStandings(players: Player[], rounds: Round[], game?: GameType, playerFilter?: Set<string>): Standing[] {
  const filteredPlayers = playerFilter ? players.filter(p => playerFilter.has(p.id)) : players
  const completedRounds = rounds.filter(r => r.isComplete)

  const swissRounds = completedRounds.filter(r => r.phase === 'swiss' || r.phase === 'round_robin')
  const bracketPhases = new Set(['top_cut', 'winners_bracket', 'losers_bracket', 'grand_final'])
  const topCutRounds = completedRounds.filter(r => bracketPhases.has(r.phase))

  const config: TiebreakerConfig = game ? GAME_CONFIG[game].tiebreakers : { system: 'chess', opponentWinFloor: 0, useGameWinPct: false, useHeadToHead: false }

  const { aggregates, headToHead } = buildAggregates(swissRounds)
  const zero = emptyAggregate()
  const aggOf = (id: string): PlayerAggregate => aggregates.get(id) ?? zero

  const tiebreakerWinPct = (id: string): number => {
    const agg = aggOf(id)
    const total = agg.tbWins + agg.tbLosses + agg.tbDraws
    if (total === 0) return config.opponentWinFloor
    return Math.max(config.opponentWinFloor, agg.tbWins / total)
  }

  const gameWinPct = (id: string): number => {
    const agg = aggOf(id)
    if (agg.totalGames === 0) return config.opponentWinFloor
    return Math.max(config.opponentWinFloor, agg.gameWins / agg.totalGames)
  }

  const checkHeadToHead = (aId: string, bId: string): number => {
    const key = aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`
    const winner = headToHead.get(key)
    if (winner === aId) return -1
    if (winner === bId) return 1
    return 0
  }

  const standings: Standing[] = filteredPlayers.map(player => {
    const agg = aggOf(player.id)
    const opponentPoints = agg.opponents.map(oppId => aggOf(oppId).matchPoints)
    const buchholz = opponentPoints.reduce((sum, p) => sum + p, 0)
    const medianBuchholz = opponentPoints.length <= 2
      ? buchholz
      : [...opponentPoints].sort((a, b) => a - b).slice(1, -1).reduce((sum, p) => sum + p, 0)
    const sonnebornBerger = agg.decided.reduce((sum, d) => {
      if (d.won) return sum + aggOf(d.oppId).matchPoints
      if (d.draw) return sum + aggOf(d.oppId).matchPoints * 0.5
      return sum
    }, 0)
    const opponentMatchWinPct = agg.opponents.length === 0
      ? 0
      : agg.opponents.reduce((sum, oppId) => sum + tiebreakerWinPct(oppId), 0) / agg.opponents.length
    const opponentGameWinPct = agg.opponents.length === 0
      ? 0
      : agg.opponents.reduce((sum, oppId) => sum + gameWinPct(oppId), 0) / agg.opponents.length

    return {
      playerId: player.id,
      playerName: player.name,
      rank: 0,
      matchPoints: agg.matchPoints,
      wins: agg.wins,
      losses: agg.losses,
      draws: agg.draws,
      buchholz,
      medianBuchholz,
      sonnebornBerger,
      opponentMatchWinPct,
      gameWinPct: gameWinPct(player.id),
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
        const h2h = checkHeadToHead(a.playerId, b.playerId)
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
