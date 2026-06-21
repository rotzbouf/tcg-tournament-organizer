import { Match, Round } from '@/types/round'
import { Tournament } from '@/types/tournament'
import { generateId, nearestPowerOfTwo } from '@/lib/utils'

export function generateDoubleElimFirstRound(playerIds: string[], roundNumber: number): Match[] {
  const size = nearestPowerOfTwo(playerIds.length)
  const seeded = playerIds.slice(0, size)
  const matches: Match[] = []

  for (let i = 0; i < seeded.length; i += 2) {
    matches.push({
      id: generateId(),
      roundNumber,
      tableNumber: (i / 2) + 1,
      player1Id: seeded[i],
      player2Id: seeded[i + 1],
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

  if (gfRounds.length > 0) return null

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
    const matches = pairSequential(wbWinners, nextRound)

    if (lbRounds.length === 0 && wbLosers.length >= 2) {
      return {
        matches,
        phase: 'winners_bracket',
        isComplete: false,
      }
    }

    return {
      matches,
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
        matches: pairSequential(lbPool, nextRound),
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
      matches: pairSequential(activeLbPlayers, nextRound),
      phase: 'losers_bracket',
      isComplete: false,
    }
  }

  return null
}

export function calculateDoubleElimTotalRounds(playerCount: number): number {
  if (playerCount <= 1) return 0
  const size = nearestPowerOfTwo(playerCount)
  const wbRounds = Math.log2(size)
  const lbRounds = wbRounds * 2 - 1
  return wbRounds + lbRounds + 1
}

function getWinners(round: Round): string[] {
  return round.matches
    .filter(m => m.result !== 'pending' && !m.isBye)
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
    }
  }
  return matches
}
