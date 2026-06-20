import { Player } from '@/types/player'
import { Match, Round } from '@/types/round'
import { calculateMatchPoints } from './scoring'
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

  return matches
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
  const sorted = [...candidates].sort((a, b) => a.matchPoints - b.matchPoints)
  const byeCandidate = sorted.find(c => !c.hasBye)

  if (!byeCandidate) {
    const fallback = sorted[0]
    return {
      match: createByeMatch(fallback.playerId, roundNumber),
      byePlayerId: fallback.playerId,
    }
  }

  return {
    match: createByeMatch(byeCandidate.playerId, roundNumber),
    byePlayerId: byeCandidate.playerId,
  }
}

function createByeMatch(playerId: string, roundNumber: number): Match {
  return {
    id: generateId(),
    roundNumber,
    player1Id: playerId,
    player2Id: null,
    result: 'player1_win',
    isBye: true,
  }
}

function pairPlayers(candidates: PairingCandidate[], roundNumber: number): Match[] {
  if (candidates.length === 0) return []

  if (candidates.length === 2) {
    return [createMatch(candidates[0].playerId, candidates[1].playerId, roundNumber)]
  }

  candidates.sort((a, b) => b.matchPoints - a.matchPoints)

  const result = backtrackingPair(candidates, [], new Set(), roundNumber, 0)
  if (result) {
    const pairedIds = new Set(result.flatMap(m => [m.player1Id, m.player2Id].filter(Boolean)))
    const unpaired = candidates.filter(c => !pairedIds.has(c.playerId))
    const byes = unpaired.map(c => createByeMatch(c.playerId, roundNumber))
    return [...result, ...byes]
  }

  const greedy = greedyPairFallback(candidates, roundNumber)
  const pairedIds = new Set(greedy.flatMap(m => [m.player1Id, m.player2Id].filter(Boolean)))
  const unpaired = candidates.filter(c => !pairedIds.has(c.playerId))
  const byes = unpaired.map(c => createByeMatch(c.playerId, roundNumber))
  return [...greedy, ...byes]
}

function backtrackingPair(
  candidates: PairingCandidate[],
  matches: Match[],
  paired: Set<string>,
  roundNumber: number,
  depth: number
): Match[] | null {
  if (depth > 1000) return null

  if (paired.size === candidates.length) return [...matches]

  const unpaired = candidates.filter(c => !paired.has(c.playerId))
  if (unpaired.length === 0) return [...matches]
  if (unpaired.length === 1) return null

  const player = unpaired[0]
  const potentialOpponents = unpaired
    .slice(1)
    .filter(c => !player.previousOpponents.has(c.playerId))

  for (const opponent of potentialOpponents) {
    const match = createMatch(player.playerId, opponent.playerId, roundNumber)
    matches.push(match)
    paired.add(player.playerId)
    paired.add(opponent.playerId)

    const result = backtrackingPair(candidates, matches, paired, roundNumber, depth + 1)
    if (result) return result

    matches.pop()
    paired.delete(player.playerId)
    paired.delete(opponent.playerId)
  }

  if (potentialOpponents.length === 0) {
    const opponent = unpaired[1]
    const match = createMatch(player.playerId, opponent.playerId, roundNumber)
    matches.push(match)
    paired.add(player.playerId)
    paired.add(opponent.playerId)

    const result = backtrackingPair(candidates, matches, paired, roundNumber, depth + 1)
    if (result) return result

    matches.pop()
    paired.delete(player.playerId)
    paired.delete(opponent.playerId)
  }

  return null
}

function greedyPairFallback(candidates: PairingCandidate[], roundNumber: number): Match[] {
  const matches: Match[] = []
  const paired = new Set<string>()

  for (const candidate of candidates) {
    if (paired.has(candidate.playerId)) continue

    const opponent = candidates.find(
      c => !paired.has(c.playerId) && c.playerId !== candidate.playerId
    )

    if (opponent) {
      matches.push(createMatch(candidate.playerId, opponent.playerId, roundNumber))
      paired.add(candidate.playerId)
      paired.add(opponent.playerId)
    }
  }

  return matches
}

function createMatch(player1Id: string, player2Id: string, roundNumber: number): Match {
  return {
    id: generateId(),
    roundNumber,
    player1Id,
    player2Id,
    result: 'pending',
    isBye: false,
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
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

  return matches
}
