import { Player } from '@/types/player'
import { Match, Round } from '@/types/round'
import { Standing } from '@/types/standing'
import { calculateMatchPoints } from './scoring'
import { maximumWeightMatching } from './matching'
import { generateId } from '@/lib/utils'

interface PairingCandidate {
  playerId: string
  matchPoints: number
  previousOpponents: Set<string>
  hasBye: boolean
}

export function generatePairings(
  players: Player[],
  rounds: Round[],
  currentRoundNumber: number
): Match[] {
  const activePlayers = players.filter(p => p.droppedInRound === null)
  if (activePlayers.length < 2) return []

  const candidates = buildCandidates(activePlayers, rounds)
  const matches: Match[] = []

  let pool = [...candidates]

  if (pool.length % 2 !== 0) {
    const byeMatch = assignBye(pool, currentRoundNumber)
    if (byeMatch) {
      matches.push(byeMatch.match)
      pool = pool.filter(c => c.playerId !== byeMatch.byePlayerId)
    }
  }

  const paired = pairPlayers(pool, currentRoundNumber)
  matches.push(...paired)

  return assignTableNumbers(matches)
}

function buildCandidates(players: Player[], rounds: Round[]): PairingCandidate[] {
  return players.map(player => ({
    playerId: player.id,
    matchPoints: calculateMatchPoints(player.id, rounds),
    previousOpponents: getPlayerOpponents(player.id, rounds),
    hasBye: player.hasBye,
  }))
}

function getPlayerOpponents(playerId: string, rounds: Round[]): Set<string> {
  const opponents = new Set<string>()
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.isBye) continue
      if (match.player1Id === playerId && match.player2Id) {
        opponents.add(match.player2Id)
      } else if (match.player2Id === playerId) {
        opponents.add(match.player1Id)
      }
    }
  }
  return opponents
}

function assignBye(
  candidates: PairingCandidate[],
  roundNumber: number
): { match: Match; byePlayerId: string } | null {
  if (candidates.length === 0) return null
  const sorted = [...candidates].sort((a, b) => a.matchPoints - b.matchPoints)
  // If every remaining player has already had a bye, a second bye for the
  // lowest-ranked player is unavoidable — better than leaving them unpaired.
  const byeCandidate = sorted.find(c => !c.hasBye) ?? sorted[0]

  return {
    match: createByeMatch(byeCandidate.playerId, roundNumber),
    byePlayerId: byeCandidate.playerId,
  }
}

function createByeMatch(playerId: string, roundNumber: number): Match {
  return {
    id: generateId(),
    roundNumber,
    tableNumber: 0,
    player1Id: playerId,
    player2Id: null,
    result: 'player1_win',
    isBye: true,
  }
}

// Weight tiers keep the pairing goals strictly lexicographic: avoiding a
// rematch always outweighs any sum of score mismatches, and a score mismatch
// always outweighs seating preferences within a score group.
const REMATCH_PENALTY = 1_000_000_000
const POINT_DIFF_SCALE = 10_000
const PAIR_WEIGHT_BASE = 2_000_000_000

// Exact maximum-weight matching over all possible pairings: minimizes the
// number of rematches globally, then the sum of squared match-point
// differences (one big pair-down is worse than two small ones), then prefers
// pairing neighbors in the sorted order (keeps power pairings rank-adjacent).
function pairPlayers(candidates: PairingCandidate[], roundNumber: number): Match[] {
  if (candidates.length < 2) return []

  candidates.sort((a, b) => b.matchPoints - a.matchPoints)

  const edges: [number, number, number][] = []
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const diff = candidates[i].matchPoints - candidates[j].matchPoints
      let weight = PAIR_WEIGHT_BASE - diff * diff * POINT_DIFF_SCALE - (j - i)
      if (candidates[i].previousOpponents.has(candidates[j].playerId)) {
        weight -= REMATCH_PENALTY
      }
      edges.push([i, j, weight])
    }
  }

  const mate = maximumWeightMatching(edges, true)

  const matches: Match[] = []
  for (let i = 0; i < candidates.length; i++) {
    const j = mate[i]
    if (j > i) {
      matches.push(createMatch(candidates[i].playerId, candidates[j].playerId, roundNumber))
    }
  }

  return [...matches, ...byesForUnpaired(candidates, matches, roundNumber)]
}

// Safety net: anyone the pairing algorithms could not seat still gets a bye —
// even a repeat bye — so no player is ever left without a match.
function byesForUnpaired(candidates: PairingCandidate[], matches: Match[], roundNumber: number): Match[] {
  const pairedIds = new Set(matches.flatMap(m => [m.player1Id, m.player2Id].filter(Boolean)))
  return candidates
    .filter(c => !pairedIds.has(c.playerId))
    .map(c => createByeMatch(c.playerId, roundNumber))
}

function createMatch(player1Id: string, player2Id: string, roundNumber: number): Match {
  return {
    id: generateId(),
    roundNumber,
    tableNumber: 0,
    player1Id,
    player2Id,
    result: 'pending',
    isBye: false,
  }
}

function assignTableNumbers(matches: Match[]): Match[] {
  let table = 1
  return matches.map(m => ({ ...m, tableNumber: m.isBye ? 0 : table++ }))
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function generatePowerPairings(
  players: Player[],
  rounds: Round[],
  currentRoundNumber: number,
  standings: Standing[]
): Match[] {
  const activePlayers = players.filter(p => p.droppedInRound === null)
  if (activePlayers.length < 2) return []

  const standingsRank = new Map(standings.map(s => [s.playerId, s.rank]))
  const candidates = buildCandidates(activePlayers, rounds)
  candidates.sort((a, b) => {
    if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints
    return (standingsRank.get(a.playerId) ?? 999) - (standingsRank.get(b.playerId) ?? 999)
  })

  const matches: Match[] = []
  let pool = [...candidates]

  if (pool.length % 2 !== 0) {
    const byeMatch = assignBye(pool, currentRoundNumber)
    if (byeMatch) {
      matches.push(byeMatch.match)
      pool = pool.filter(c => c.playerId !== byeMatch.byePlayerId)
    }
  }

  const paired = pairPlayers(pool, currentRoundNumber)
  matches.push(...paired)

  return assignTableNumbers(matches)
}

export function generateFirstRoundPairings(players: Player[]): Match[] {
  if (players.length < 2) return []

  const shuffled = shuffleArray(players)
  const matches: Match[] = []

  let pool = [...shuffled]

  if (pool.length % 2 !== 0) {
    const byePlayer = pool[pool.length - 1]
    matches.push(createByeMatch(byePlayer.id, 1))
    pool = pool.slice(0, -1)
  }

  for (let i = 0; i < pool.length; i += 2) {
    matches.push(createMatch(pool[i].id, pool[i + 1].id, 1))
  }

  return assignTableNumbers(matches)
}

// S-curve seeding: rank players by Elo, then pair #1 vs #(N/2+1), #2 vs #(N/2+2), etc.
// Players without a DB entry get DEFAULT_ELO (1500).
export function generateEloSeededPairings(players: Player[], eloMap: Map<string, number>): Match[] {
  if (players.length < 2) return []

  const sorted = [...players].sort((a, b) => (eloMap.get(b.id) ?? 1500) - (eloMap.get(a.id) ?? 1500))
  const matches: Match[] = []

  let pool = sorted

  if (pool.length % 2 !== 0) {
    // Lowest Elo gets the bye
    const byePlayer = pool[pool.length - 1]
    matches.push(createByeMatch(byePlayer.id, 1))
    pool = pool.slice(0, -1)
  }

  const half = pool.length / 2
  for (let i = 0; i < half; i++) {
    matches.push(createMatch(pool[i].id, pool[half + i].id, 1))
  }

  return assignTableNumbers(matches)
}
