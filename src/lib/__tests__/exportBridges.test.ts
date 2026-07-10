import { describe, it, expect } from 'vitest'
import { generatePokemonTdf, generateMatchResultsCsv, playerIdLabel } from '../exportBridges'
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

function mkRound(roundNumber: number, matches: Match[], phase: Round['phase'] = 'swiss'): Round {
  return { roundNumber, matches, isComplete: true, phase, phaseIndex: 0 }
}

function mkTournament(game: GameType, players: Player[], rounds: Round[]): Tournament {
  return {
    id: 't1', name: 'Locals', game, gameFormat: null, format: 'swiss', status: 'in_progress',
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

describe('generatePokemonTdf', () => {
  const players = [
    mkPlayer({ id: 'a', name: 'Ash Ketchum', playerId: '123456', dateOfBirth: '2005-03-01' }),
    mkPlayer({ id: 'b', name: 'Misty', playerId: '654321' }),
    mkPlayer({ id: 'c', name: 'A&B', playerId: null }), // no POP ID + ampersand to exercise escaping
  ]
  const rounds = [
    mkRound(1, [
      mkMatch({ id: 'm1', player1Id: 'a', player2Id: 'b', result: 'player1_win' }),
      mkMatch({ id: 'm2', player1Id: 'c', isBye: true }),
    ]),
    mkRound(2, [
      mkMatch({ id: 'm3', player1Id: 'a', player2Id: 'c', result: 'player2_win' }),
      mkMatch({ id: 'm4', player1Id: 'b', player2Id: 'b', result: 'draw' }),
    ]),
  ]
  const tdf = generatePokemonTdf(mkTournament('pokemon', players, rounds))

  it('emits a well-formed TDF envelope', () => {
    expect(tdf.startsWith('<?xml version="1.0"')).toBe(true)
    expect(tdf).toContain('<tournament type="2" stage="0" version="1.75" gametype="TRADING_CARD_GAME"')
    expect(tdf.match(/<player userid=/g)).toHaveLength(3)
    expect(tdf).toContain('<roundtime>50</roundtime>')
  })

  it('uses POP IDs as userids and converts dates to US format', () => {
    expect(tdf).toContain('<player userid="123456">')
    expect(tdf).toContain('<firstname>Ash</firstname>')
    expect(tdf).toContain('<lastname>Ketchum</lastname>')
    expect(tdf).toContain('<birthdate>03/01/2005</birthdate>')
    expect(tdf).toContain('<startdate>07/06/2026</startdate>')
  })

  it('assigns a synthetic numeric id and escapes XML for players without a POP ID', () => {
    expect(tdf).toContain('<player userid="9000001">')
    expect(tdf).toContain('<firstname>A&amp;B</firstname>')
  })

  it('maps results to outcome codes and byes to outcome 5', () => {
    expect(tdf).toContain('<match outcome="1">')  // player1 win
    expect(tdf).toContain('<match outcome="2">')  // player2 win
    expect(tdf).toContain('<match outcome="3">')  // draw
    expect(tdf).toContain('<match outcome="5">')  // bye
    // The bye match references only player1
    const byeBlock = tdf.slice(tdf.indexOf('<match outcome="5">'))
    expect(byeBlock.slice(0, byeBlock.indexOf('</match>'))).not.toContain('player2')
    // Balanced match tags
    expect(tdf.match(/<match /g)).toHaveLength(4)
    expect(tdf.match(/<\/match>/g)).toHaveLength(4)
  })

  it('omits pending matches from the export', () => {
    const t = mkTournament('pokemon', players, [mkRound(1, [mkMatch({ id: 'x', player1Id: 'a', player2Id: 'b', result: 'pending' })])])
    const out = generatePokemonTdf(t)
    expect(out).not.toContain('<match ')
  })
})

describe('generateMatchResultsCsv', () => {
  const players = [
    mkPlayer({ id: 'a', name: 'Yugi', playerId: 'K-111' }),
    mkPlayer({ id: 'b', name: 'Kaiba', playerId: 'K-222' }),
    mkPlayer({ id: 'c', name: 'Joey' }),
  ]
  const rounds = [
    mkRound(1, [
      mkMatch({ id: 'm1', player1Id: 'a', player2Id: 'b', result: 'player1_win', player1Games: 2, player2Games: 1 }),
      mkMatch({ id: 'm2', player1Id: 'c', isBye: true }),
    ]),
    mkRound(2, [
      mkMatch({ id: 'm3', player1Id: 'a', player2Id: 'c', result: 'draw' }),
      mkMatch({ id: 'm4', player1Id: 'b', player2Id: 'b', result: 'pending' }), // skipped
    ]),
  ]
  const standings = [
    mkStanding({ playerId: 'a', playerName: 'Yugi', rank: 1, matchPoints: 4, wins: 1, draws: 1 }),
    mkStanding({ playerId: 'b', playerName: 'Kaiba', rank: 2, matchPoints: 0, losses: 1 }),
    mkStanding({ playerId: 'c', playerName: 'Joey', rank: 3, matchPoints: 4, wins: 1, draws: 1 }),
  ]
  const csv = generateMatchResultsCsv(mkTournament('yugioh', players, rounds), standings)
  const lines = csv.split('\n')

  it('labels the ID column per game and lists both players with their IDs', () => {
    expect(lines[0]).toBe('Runde,Phase,Tisch,Spieler 1,KONAMI ID 1,Spieler 2,KONAMI ID 2,Spiele,Ergebnis')
    expect(csv).toContain('1,R1,1,Yugi,K-111,Kaiba,K-222,2-1,Yugi')
  })

  it('marks byes and skips pending matches', () => {
    expect(csv).toContain('Bye')
    expect(csv).toContain(',Unentschieden') // the draw in round 2
    expect(csv.match(/^2,R2,/gm)?.length).toBe(1) // only the decided round-2 match, pending omitted
  })

  it('appends a final standings block', () => {
    expect(csv).toContain('Endstand')
    expect(csv).toContain('Rang,Spieler,KONAMI ID,Punkte,S-N-U')
    expect(csv).toContain('1,Yugi,K-111,4,1-0-1')
  })
})

describe('playerIdLabel', () => {
  it('returns the vendor-specific identifier label', () => {
    expect(playerIdLabel('pokemon')).toBe('POP ID')
    expect(playerIdLabel('yugioh')).toBe('KONAMI ID')
    expect(playerIdLabel('mtg')).toBe('DCI / Account')
    expect(playerIdLabel('flesh_and_blood')).toBe('GEM ID')
    expect(playerIdLabel('one_piece')).toBe('Bandai TCG+ ID')
    expect(playerIdLabel('dragonball_fusion_world')).toBe('Bandai TCG+ ID')
    expect(playerIdLabel('lorcana')).toBe('Spieler-ID')
  })
})
