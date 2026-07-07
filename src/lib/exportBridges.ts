import { Tournament } from '@/types/tournament'
import { Standing } from '@/types/standing'
import { Player } from '@/types/player'
import { Round } from '@/types/round'

// Export bridges to the official tournament tools. Sanctioned events still have
// to be reported through the vendor software, so these files carry the raw
// results across:
//   • Pokémon → TDF (the XML that TOM / RK9Labs import)
//   • Magic   → EventLink-friendly per-round results (CSV, for transcription)
//   • Yu-Gi-Oh! → KTS-style per-round results (CSV, for transcription)
// The CSV bridges are transcription aids, not machine-imported formats — only
// the Pokémon TDF is read back by its vendor tool.

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

function xmlEscape(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ISO yyyy-mm-dd → mm/dd/yyyy (the date format TOM expects). Returns '' when the
// input is missing or not a plain date.
function toUsDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return ''
  return `${m[2]}/${m[3]}/${m[1]}`
}

function toUsDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}/${p(d.getDate())}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] }
}

// TOM identifies players by a numeric Play! Pokémon (POP) ID. Players without
// one get a stable temporary numeric id so the file stays internally consistent
// (match references resolve); the TO assigns real POP IDs on import.
function buildUseridMap(players: Player[]): Map<string, string> {
  const map = new Map<string, string>()
  let synthetic = 9000001
  for (const p of players) {
    const id = p.playerId?.trim()
    map.set(p.id, id && /^\d+$/.test(id) ? id : String(synthetic++))
  }
  return map
}

function matchOutcome(result: string): string | null {
  switch (result) {
    case 'player1_win': return '1'
    case 'player2_win': return '2'
    case 'draw': return '3'
    default: return null // pending — omit from the export
  }
}

/**
 * Pokémon Tournament Data File (.tdf) — the XML consumed by TOM and RK9Labs.
 * Emits a single pod with every Swiss and finals round. Byes are outcome 5.
 */
export function generatePokemonTdf(tournament: Tournament): string {
  const userid = buildUseridMap(tournament.players)
  const now = new Date().toISOString()

  const playerXml = tournament.players.map(p => {
    const { first, last } = splitName(p.name)
    return `    <player userid="${xmlEscape(userid.get(p.id)!)}">
      <firstname>${xmlEscape(first)}</firstname>
      <lastname>${xmlEscape(last)}</lastname>
      <birthdate>${toUsDate(p.dateOfBirth)}</birthdate>
      <creationdate>${toUsDateTime(now)}</creationdate>
      <lastmodifieddate>${toUsDateTime(now)}</lastmodifieddate>
    </player>`
  }).join('\n')

  const roundXml = tournament.rounds.map(round => {
    const matches = round.matches.map(m => {
      if (m.isBye) {
        return `          <match outcome="5">
            <player1 userid="${xmlEscape(userid.get(m.player1Id)!)}" />
          </match>`
      }
      const outcome = matchOutcome(m.result)
      if (outcome === null || !m.player2Id) return ''
      return `          <match outcome="${outcome}">
            <player1 userid="${xmlEscape(userid.get(m.player1Id)!)}" />
            <player2 userid="${xmlEscape(userid.get(m.player2Id)!)}" />
          </match>`
    }).filter(Boolean).join('\n')
    return `        <round number="${round.roundNumber}">
          <matches>
${matches}
          </matches>
        </round>`
  }).join('\n')

  return `<?xml version="1.0" encoding="utf-8"?>
<tournament type="2" stage="0" version="1.75" gametype="TRADING_CARD_GAME" mode="LIST">
  <data>
    <name>${xmlEscape(tournament.name)}</name>
    <id>${xmlEscape(tournament.id)}</id>
    <city></city>
    <state></state>
    <country></country>
    <roundtime>${tournament.roundTimeMinutes}</roundtime>
    <finalsroundtime>${tournament.roundTimeMinutes}</finalsroundtime>
    <organizer popid="" name="" />
    <startdate>${toUsDate(tournament.createdAt)}</startdate>
    <lessswiss>false</lessswiss>
    <autotablenumber>true</autotablenumber>
    <overflowtablestart>0</overflowtablestart>
  </data>
  <timeelapsed>0</timeelapsed>
  <players>
${playerXml}
  </players>
  <pods>
    <pod category="0">
      <rounds>
${roundXml}
      </rounds>
    </pod>
  </pods>
  <finalsoptions />
</tournament>
`
}

// The per-game label for the player identifier column in the results CSV.
export function playerIdLabel(game: string): string {
  switch (game) {
    case 'pokemon': return 'POP ID'
    case 'yugioh': return 'KONAMI ID'
    case 'mtg': return 'DCI / Account'
    case 'flesh_and_blood': return 'GEM ID'
    case 'one_piece':
    case 'dragonball_fusion_world': return 'Bandai TCG+ ID'
    default: return 'Spieler-ID'
  }
}

function phaseLabel(round: Round): string {
  switch (round.phase) {
    case 'top_cut': return 'Top Cut'
    case 'winners_bracket': return 'Winners'
    case 'losers_bracket': return 'Losers'
    case 'grand_final': return 'Finale'
    default: return `R${round.roundNumber}`
  }
}

/**
 * Per-round match results as CSV. Used as the transcription bridge for MTG
 * (EventLink) and Yu-Gi-Oh! (KTS): table, both players with their game IDs,
 * the game score, and the winner. Byes and drops are marked; pending matches
 * are skipped.
 */
export function generateMatchResultsCsv(tournament: Tournament, standings: Standing[]): string {
  const idLabel = playerIdLabel(tournament.game)
  const byId = new Map(tournament.players.map(p => [p.id, p]))
  const rankById = new Map(standings.map(s => [s.playerId, s.rank]))
  const name = (id: string | null) => (id ? byId.get(id)?.name ?? '?' : '')
  const pid = (id: string | null) => (id ? byId.get(id)?.playerId ?? '' : '')

  const headers = ['Runde', 'Phase', 'Tisch', 'Spieler 1', `${idLabel} 1`, 'Spieler 2', `${idLabel} 2`, 'Spiele', 'Ergebnis']
  const rows: string[] = []

  for (const round of tournament.rounds) {
    for (const m of round.matches) {
      if (m.isBye) {
        rows.push([String(round.roundNumber), phaseLabel(round), String(m.tableNumber), csvEscape(name(m.player1Id)), csvEscape(pid(m.player1Id)), '', '', '', 'Bye'].join(','))
        continue
      }
      if (m.result === 'pending') continue
      const games = (m.player1Games !== undefined && m.player2Games !== undefined) ? `${m.player1Games}-${m.player2Games}` : ''
      const result = m.result === 'player1_win' ? name(m.player1Id)
        : m.result === 'player2_win' ? name(m.player2Id)
        : 'Unentschieden'
      rows.push([
        String(round.roundNumber), phaseLabel(round), String(m.tableNumber),
        csvEscape(name(m.player1Id)), csvEscape(pid(m.player1Id)),
        csvEscape(name(m.player2Id)), csvEscape(pid(m.player2Id)),
        games, csvEscape(result),
      ].join(','))
    }
  }

  // Trailing standings block so the file doubles as a final-results record.
  const standingsLines = ['', 'Endstand', ['Rang', 'Spieler', idLabel, 'Punkte', 'S-N-U'].join(',')]
  for (const s of standings) {
    const player = byId.get(s.playerId)
    const rank = rankById.get(s.playerId) ?? s.rank
    standingsLines.push([
      String(rank), csvEscape(s.playerName), csvEscape(player?.playerId ?? ''),
      String(s.matchPoints), `${s.wins}-${s.losses}-${s.draws}`,
    ].join(','))
  }

  return [headers.join(','), ...rows, ...standingsLines].join('\n')
}
