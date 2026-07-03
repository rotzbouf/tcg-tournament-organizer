import { Match, Round } from '@/types/round'
import { Tournament } from '@/types/tournament'
import { generateId } from '@/lib/utils'

function nextPowerOfTwo(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
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

// Pads the field up to the next power of two with byes for the top seeds
// (players arrive in seeding order) — never cut anyone from the bracket.
export function generateDoubleElimFirstRound(playerIds: string[], roundNumber: number): Match[] {
  if (playerIds.length < 2) return []
  const size = nextPowerOfTwo(playerIds.length)
  const byes = size - playerIds.length
  const matches: Match[] = playerIds.slice(0, byes).map(id => createByeMatch(id, roundNumber))
  const rest = playerIds.slice(byes)
  let table = 1

  for (let i = 0; i < rest.length; i += 2) {
    matches.push({
      id: generateId(),
      roundNumber,
      tableNumber: table++,
      player1Id: rest[i],
      player2Id: rest[i + 1],
      result: 'pending',
      isBye: false,
    })
  }

  return matches
}

interface AdvanceResult {
  matches: Match[]
  phase: 'winners_bracket' | 'losers_bracket' | 'grand_final'
  isComplete: boolean
}

export function advanceDoubleElimBracket(tournament: Tournament): AdvanceResult | null {
  const wbRounds = tournament.rounds.filter(r => r.phase === 'winners_bracket')
  const lbRounds = tournament.rounds.filter(r => r.phase === 'losers_bracket')
  const gfRounds = tournament.rounds.filter(r => r.phase === 'grand_final')

  if (gfRounds.length > 0) {
    if (!tournament.grandFinalReset) return null
    if (gfRounds.length >= 2) return null
    const gf1 = gfRounds[0]
    if (!gf1.isComplete) return null
    const lbChampionWon = gf1.matches[0].result === 'player2_win'
    if (!lbChampionWon) return null
    const nextRound = tournament.currentRound + 1
    return {
      matches: [{
        id: generateId(),
        roundNumber: nextRound,
        tableNumber: 1,
        player1Id: gf1.matches[0].player1Id,
        player2Id: gf1.matches[0].player2Id!,
        result: 'pending',
        isBye: false,
      }],
      phase: 'grand_final',
      isComplete: false,
    }
  }

  const lastWb = wbRounds[wbRounds.length - 1]
  const lastLb = lbRounds[lbRounds.length - 1]

  const wbWinners = lastWb ? getWinners(lastWb) : []
  const wbLosers = lastWb ? getLosers(lastWb) : []

  if (wbWinners.length === 1 && lbRounds.length > 0 && lastLb) {
    const lbWinners = getWinners(lastLb)
    if (lbWinners.length === 1) {
      const nextRound = tournament.currentRound + 1
      return {
        matches: [{
          id: generateId(),
          roundNumber: nextRound,
          tableNumber: 1,
          player1Id: wbWinners[0],
          player2Id: lbWinners[0],
          result: 'pending',
          isBye: false,
        }],
        phase: 'grand_final',
        isComplete: false,
      }
    }
  }

  if (wbWinners.length >= 2) {
    const nextRound = tournament.currentRound + 1
    return {
      matches: pairSequential(wbWinners, nextRound),
      phase: 'winners_bracket',
      isComplete: false,
    }
  }

  const allWbLosers = wbRounds.flatMap(r => getLosers(r))
  const eliminatedInLb = new Set(lbRounds.flatMap(r => getLosers(r)))
  const activeLbPlayers = allWbLosers.filter(id => !eliminatedInLb.has(id))

  if (lastLb) {
    const lbWinners = getWinners(lastLb)
    const newDropIns = wbLosers.filter(id => !eliminatedInLb.has(id) && !lbWinners.includes(id))
    const lbPool = [...lbWinners, ...newDropIns]

    if (lbPool.length >= 2) {
      const nextRound = tournament.currentRound + 1
      return {
        matches: pairAvoidRematches(lbPool, nextRound, tournament.rounds),
        phase: 'losers_bracket',
        isComplete: false,
      }
    }

    if (lbPool.length === 1 && wbWinners.length === 1) {
      const nextRound = tournament.currentRound + 1
      return {
        matches: [{
          id: generateId(),
          roundNumber: nextRound,
          tableNumber: 1,
          player1Id: wbWinners[0],
          player2Id: lbPool[0],
          result: 'pending',
          isBye: false,
        }],
        phase: 'grand_final',
        isComplete: false,
      }
    }
  }

  if (activeLbPlayers.length >= 2 && lbRounds.length === 0) {
    const nextRound = tournament.currentRound + 1
    return {
      matches: pairAvoidRematches(activeLbPlayers, nextRound, tournament.rounds),
      phase: 'losers_bracket',
      isComplete: false,
    }
  }

  // 2-player bracket: the sole WB loser goes straight to the grand final.
  if (lbRounds.length === 0 && activeLbPlayers.length === 1 && wbWinners.length === 1) {
    const nextRound = tournament.currentRound + 1
    return {
      matches: [{
        id: generateId(),
        roundNumber: nextRound,
        tableNumber: 1,
        player1Id: wbWinners[0],
        player2Id: activeLbPlayers[0],
        result: 'pending',
        isBye: false,
      }],
      phase: 'grand_final',
      isComplete: false,
    }
  }

  return null
}

export function calculateDoubleElimTotalRounds(playerCount: number): number {
  if (playerCount <= 1) return 0
  const size = nextPowerOfTwo(playerCount)
  const wbRounds = Math.log2(size)
  // The losers bracket runs as one pool (all WB losers), halving each round.
  const lbRounds = size > 2 ? Math.ceil(Math.log2(size - 1)) : 0
  return wbRounds + lbRounds + 1
}

// Byes count as wins for player1, so bye recipients advance like any winner.
function getWinners(round: Round): string[] {
  return round.matches
    .filter(m => m.result !== 'pending')
    .map(m => m.result === 'player1_win' ? m.player1Id : m.player2Id!)
    .filter(Boolean)
}

function getLosers(round: Round): string[] {
  return round.matches
    .filter(m => m.result !== 'pending' && !m.isBye)
    .map(m => m.result === 'player1_win' ? m.player2Id! : m.player1Id)
    .filter(Boolean)
}

function pairSequential(playerIds: string[], roundNumber: number): Match[] {
  const matches: Match[] = []
  for (let i = 0; i < playerIds.length; i += 2) {
    if (i + 1 < playerIds.length) {
      matches.push({
        id: generateId(),
        roundNumber,
        tableNumber: (i / 2) + 1,
        player1Id: playerIds[i],
        player2Id: playerIds[i + 1],
        result: 'pending',
        isBye: false,
      })
    } else {
      // Odd pool: the leftover player advances with a bye instead of silently
      // vanishing from the bracket.
      matches.push(createByeMatch(playerIds[i], roundNumber))
    }
  }
  return matches
}

function pairAvoidRematches(playerIds: string[], roundNumber: number, allRounds: Round[]): Match[] {
  const previousOpponents = new Map<string, Set<string>>()
  for (const id of playerIds) {
    previousOpponents.set(id, new Set())
  }
  for (const round of allRounds) {
    for (const match of round.matches) {
      if (match.isBye || !match.player2Id) continue
      previousOpponents.get(match.player1Id)?.add(match.player2Id)
      previousOpponents.get(match.player2Id)?.add(match.player1Id)
    }
  }

  const paired = new Set<string>()
  const matches: Match[] = []
  let table = 1

  for (const id of playerIds) {
    if (paired.has(id)) continue
    const opponent = playerIds.find(
      opp => opp !== id && !paired.has(opp) && !previousOpponents.get(id)?.has(opp)
    ) ?? playerIds.find(opp => opp !== id && !paired.has(opp))

    if (opponent) {
      matches.push({
        id: generateId(),
        roundNumber,
        tableNumber: table++,
        player1Id: id,
        player2Id: opponent,
        result: 'pending',
        isBye: false,
      })
      paired.add(id)
      paired.add(opponent)
    }
  }

  // Odd pool (e.g. all WB losers enter at once): the leftover player gets a
  // bye — previously they were silently dropped from the bracket.
  const leftover = playerIds.find(id => !paired.has(id))
  if (leftover) matches.push(createByeMatch(leftover, roundNumber))

  return matches
}
