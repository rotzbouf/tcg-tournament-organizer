import { describe, it, expect } from 'vitest'
import { generateMatchSlipsHtml, generatePairingsByNameHtml, generateStandingsPosterHtml } from '../exportResults'
import { Tournament, GameType } from '@/types/tournament'
import { Standing } from '@/types/standing'
import { Player } from '@/types/player'
import { Match, Round } from '@/types/round'

function mkPlayer(over: Partial<Player> & { id: string; name: string }): Player {
  return { playerId: null, dateOfBirth: null, deckName: null, decklist: null, hasBye: false, droppedInRound: null, ...over }
}
function mkMatch(over: Partial<Match> & { id: string; player1Id: string }): Match {
  return { roundNumber: 1, tableNumber: 1, player2Id: null, result: 'pending', isBye: false, ...over }
}
function mkRound(roundNumber: number, matches: Match[], isComplete = true): Round {
  return { roundNumber, matches, isComplete, phase: 'swiss', phaseIndex: 0 }
}
function mkTournament(game: GameType, players: Player[], rounds: Round[]): Tournament {
  return {
    id: 't1', name: 'Locals & Friends', game, gameFormat: null, format: 'swiss', status: 'in_progress',
    players, rounds, penalties: [], phases: [], currentPhaseIndex: 0, roundTimeMinutes: 50,
    totalRounds: 3, currentRound: rounds.length, topCut: 0, grandFinalReset: false,
    ageDivisionsEnabled: false, decklistVisibility: 'hidden', powerPairings: false, eloSeeding: false,
    discordWebhookUrl: null, eloApplied: false, archived: false, countForSeason: true,
    createdAt: '2026-07-06T10:00:00.000Z', updatedAt: '2026-07-06T10:00:00.000Z',
  }
}
function mkStanding(over: Partial<Standing> & { playerId: string; playerName: string; rank: number }): Standing {
  return {
    matchPoints: 0, wins: 0, losses: 0, draws: 0, buchholz: 0, medianBuchholz: 0,
    sonnebornBerger: 0, opponentMatchWinPct: 0, gameWinPct: 0, opponentGameWinPct: 0, dropped: false, ...over,
  }
}

const players = [
  mkPlayer({ id: 'a', name: 'Zoe', playerId: 'K-1' }),
  mkPlayer({ id: 'b', name: 'Amy' }),
  mkPlayer({ id: 'c', name: 'Max' }),
]
const round = mkRound(2, [
  mkMatch({ id: 'm1', roundNumber: 2, tableNumber: 1, player1Id: 'a', player2Id: 'b', result: 'player1_win' }),
  mkMatch({ id: 'm2', roundNumber: 2, tableNumber: 2, player1Id: 'c', isBye: true }),
])
const tournament = mkTournament('yugioh', players, [mkRound(1, []), round])

describe('generateMatchSlipsHtml', () => {
  const html = generateMatchSlipsHtml(tournament, 2)

  it('produces one slip per non-bye match', () => {
    expect(html.match(/class="slip"/g)).toHaveLength(1) // m1 only; the bye gets no slip
  })

  it('includes table, both players, a winner line and two signature lines', () => {
    expect(html).toContain('Tisch 1')
    expect(html).toContain('>Zoe')
    expect(html).toContain('>Amy<')
    expect(html).toContain('Sieger:')
    expect(html.match(/Unterschrift \d/g)).toHaveLength(2)
    expect(html).toContain('#K-1') // POP/Konami id tag when present
  })

  it('escapes the tournament name and avoids page breaks inside a slip', () => {
    expect(html).toContain('Locals &amp; Friends')
    expect(html).toContain('break-inside:avoid')
  })

  it('returns empty string for an unknown round', () => {
    expect(generateMatchSlipsHtml(tournament, 99)).toBe('')
  })
})

describe('generatePairingsByNameHtml', () => {
  const html = generatePairingsByNameHtml(tournament, 2)

  it('lists every player alphabetically with their table and opponent', () => {
    // First cell of each row is the player column; check that sequence is sorted.
    const playerColumn = [...html.matchAll(/<tr><td>([^<]+)<\/td>/g)].map(m => m[1])
    expect(playerColumn).toEqual(['Amy', 'Max', 'Zoe'])
  })

  it('marks a bye and pairs opponents both ways', () => {
    expect(html).toContain('Bye')                     // Max has a bye
    expect(html).toContain('<td>Zoe</td><td style="text-align:center;font-weight:700">1</td><td>Amy</td>')
    expect(html).toContain('<td>Amy</td><td style="text-align:center;font-weight:700">1</td><td>Zoe</td>')
  })
})

describe('generateStandingsPosterHtml', () => {
  const standings = [
    mkStanding({ playerId: 'a', playerName: 'Zoe', rank: 1, matchPoints: 6, wins: 2 }),
    mkStanding({ playerId: 'b', playerName: 'Amy', rank: 2, matchPoints: 3, wins: 1, losses: 1 }),
    mkStanding({ playerId: 'c', playerName: 'Max', rank: 3, matchPoints: 3, wins: 1, losses: 1, dropped: true }),
  ]
  const html = generateStandingsPosterHtml(tournament, standings, 2)

  it('labels the poster with the round and lists ranked players', () => {
    expect(html).toContain('Stand nach Runde 2')
    expect(html).toContain('Locals &amp; Friends')
    expect(html).toContain('>Zoe<')
    expect(html).toContain('2-0-0') // Zoe W-L-D
  })

  it('strikes through dropped players', () => {
    expect(html).toContain('<s>Max</s>')
  })
})
