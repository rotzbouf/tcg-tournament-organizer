import { Tournament } from '@/types/tournament'
import { Standing } from '@/types/standing'
import { GAME_CONFIG } from './gameConfig'

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

export function generateCsv(tournament: Tournament, standings: Standing[]): string {
  const config = GAME_CONFIG[tournament.game].tiebreakers
  const isTcg = config.system === 'tcg'
  const players = tournament.players

  const headers = ['Rang', 'Name', 'Spieler-ID', 'Punkte', 'Siege', 'Niederlagen', 'Unentschieden']
  if (isTcg) {
    headers.push('OMW%')
    if (config.useGameWinPct) headers.push('GW%', 'OGW%')
  } else {
    headers.push('Buchholz', 'Median-BH', 'SB')
  }

  const rows = standings.map(s => {
    const player = players.find(p => p.id === s.playerId)
    const row = [
      String(s.rank),
      csvEscape(s.playerName),
      csvEscape(player?.playerId ?? ''),
      String(s.matchPoints),
      String(s.wins),
      String(s.losses),
      String(s.draws),
    ]
    if (isTcg) {
      row.push((s.opponentMatchWinPct * 100).toFixed(2) + '%')
      if (config.useGameWinPct) {
        row.push((s.gameWinPct * 100).toFixed(2) + '%')
        row.push((s.opponentGameWinPct * 100).toFixed(2) + '%')
      }
    } else {
      row.push(String(s.buchholz), String(s.medianBuchholz), String(s.sonnebornBerger))
    }
    return row.join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

export function generatePdfHtml(tournament: Tournament, standings: Standing[]): string {
  const config = GAME_CONFIG[tournament.game]
  const tiebreakers = config.tiebreakers
  const isTcg = tiebreakers.system === 'tcg'
  const players = tournament.players
  const date = new Date(tournament.createdAt).toLocaleDateString('de-CH')

  const tbHeaders = isTcg
    ? `<th>OMW%</th>${tiebreakers.useGameWinPct ? '<th>GW%</th><th>OGW%</th>' : ''}`
    : '<th>Buchholz</th><th>Median-BH</th><th>SB</th>'

  const rows = standings.map(s => {
    const player = players.find(p => p.id === s.playerId)
    const dropped = s.dropped ? ' style="opacity:.5"' : ''
    const nameCell = s.dropped ? `<s>${esc(s.playerName)}</s>` : esc(s.playerName)
    const tbCells = isTcg
      ? `<td>${(s.opponentMatchWinPct * 100).toFixed(2)}%</td>${tiebreakers.useGameWinPct ? `<td>${(s.gameWinPct * 100).toFixed(2)}%</td><td>${(s.opponentGameWinPct * 100).toFixed(2)}%</td>` : ''}`
      : `<td>${s.buchholz}</td><td>${s.medianBuchholz}</td><td>${s.sonnebornBerger}</td>`
    return `<tr${dropped}><td>${s.rank}</td><td>${nameCell}</td><td>${esc(player?.playerId ?? '')}</td><td><b>${s.matchPoints}</b></td><td>${s.wins}</td><td>${s.losses}</td><td>${s.draws}</td>${tbCells}</tr>`
  }).join('')

  const formatLabel = tournament.format === 'swiss_topcut' && tournament.topCut > 0
    ? `Swiss + Top ${tournament.topCut}`
    : tournament.format === 'swiss' ? 'Swiss'
    : tournament.format === 'double_elimination' ? 'Double Elimination'
    : 'Round Robin'

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,system-ui,sans-serif;margin:32px;color:#1e293b}
h1{font-size:22px;margin:0 0 4px}
.meta{font-size:13px;color:#64748b;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{text-align:left;padding:6px 8px;background:#f1f5f9;font-weight:600;color:#475569;border-bottom:2px solid #cbd5e1}
td{padding:5px 8px;border-bottom:1px solid #e2e8f0}
tr:last-child td{border-bottom:none}
b{font-weight:700}
s{color:#94a3b8}
</style></head><body>
<h1>${esc(tournament.name)}</h1>
<div class="meta">${esc(config.name)} — ${formatLabel} — ${date} — ${players.length} Spieler</div>
<table><thead><tr><th>#</th><th>Spieler</th><th>ID</th><th>Pkt</th><th>S</th><th>N</th><th>U</th>${tbHeaders}</tr></thead><tbody>${rows}</tbody></table>
</body></html>`
}

export function generatePairingsPdfHtml(tournament: Tournament, roundNumber: number): string {
  const config = GAME_CONFIG[tournament.game]
  const round = tournament.rounds.find(r => r.roundNumber === roundNumber)
  if (!round) return ''
  const date = new Date(tournament.createdAt).toLocaleDateString('de-CH')
  const getName = (id: string) => tournament.players.find(p => p.id === id)?.name ?? '?'

  const rows = round.matches.map(m => {
    if (m.isBye) {
      return `<tr><td style="text-align:center">—</td><td>${esc(getName(m.player1Id))}</td><td colspan="2" style="text-align:center;color:#64748b">Bye</td></tr>`
    }
    const result = m.result === 'player1_win' ? esc(getName(m.player1Id))
      : m.result === 'player2_win' ? esc(getName(m.player2Id!))
      : m.result === 'draw' ? 'Draw' : '—'
    return `<tr><td style="text-align:center;font-weight:800">${m.tableNumber}</td><td>${esc(getName(m.player1Id))}</td><td>${esc(getName(m.player2Id!))}</td><td style="text-align:center">${result}</td></tr>`
  }).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,system-ui,sans-serif;margin:32px;color:#1e293b}
h1{font-size:22px;margin:0 0 4px}
.meta{font-size:13px;color:#64748b;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:8px;background:#f1f5f9;font-weight:600;color:#475569;border-bottom:2px solid #cbd5e1}
td{padding:6px 8px;border-bottom:1px solid #e2e8f0}
</style></head><body>
<h1>${esc(tournament.name)}</h1>
<div class="meta">${esc(config.name)} — Runde ${roundNumber} — ${date} — ${tournament.players.length} Spieler</div>
<table><thead><tr><th style="width:60px;text-align:center">Tisch</th><th>Spieler 1</th><th>Spieler 2</th><th style="width:120px;text-align:center">Ergebnis</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`
}

// Printable result slips, one per match, with game-win boxes and a signature
// line for each player — the paper record judges hand out at each table. Byes
// need no slip and are skipped. Slips flow two per row and never split across a
// page break.
export function generateMatchSlipsHtml(tournament: Tournament, roundNumber: number): string {
  const round = tournament.rounds.find(r => r.roundNumber === roundNumber)
  if (!round) return ''
  const date = new Date(tournament.createdAt).toLocaleDateString('de-CH')
  const getName = (id: string | null) => (id ? tournament.players.find(p => p.id === id)?.name ?? '?' : '')
  const getPid = (id: string | null) => (id ? tournament.players.find(p => p.id === id)?.playerId ?? '' : '')

  const slips = round.matches.filter(m => !m.isBye).map(m => {
    const p1 = getName(m.player1Id), p2 = getName(m.player2Id)
    const id1 = getPid(m.player1Id), id2 = getPid(m.player2Id)
    const pidTag = (id: string) => (id ? ` <span class="pid">#${esc(id)}</span>` : '')
    return `<div class="slip">
  <div class="shead"><span class="stitle">${esc(tournament.name)}</span><span class="sround">Runde ${roundNumber}</span></div>
  <div class="stable">Tisch ${m.tableNumber}</div>
  <table class="players"><tbody>
    <tr><td class="plabel">Spieler 1</td><td class="pname">${esc(p1)}${pidTag(id1)}</td><td class="wlabel">Siege</td><td class="wbox"></td></tr>
    <tr><td class="plabel">Spieler 2</td><td class="pname">${esc(p2)}${pidTag(id2)}</td><td class="wlabel">Siege</td><td class="wbox"></td></tr>
    <tr><td class="plabel"></td><td></td><td class="wlabel">Unent.</td><td class="wbox"></td></tr>
  </tbody></table>
  <div class="winner">Sieger: <span class="fill"></span></div>
  <div class="signs"><span>Unterschrift 1<span class="fill"></span></span><span>Unterschrift 2<span class="fill"></span></span></div>
</div>`
  }).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@page{margin:10mm}
body{font-family:-apple-system,system-ui,sans-serif;margin:0;color:#1e293b}
.grid{display:flex;flex-wrap:wrap;gap:6mm}
.slip{box-sizing:border-box;width:calc(50% - 3mm);border:1px dashed #94a3b8;border-radius:6px;padding:10px 12px;break-inside:avoid;page-break-inside:avoid}
.shead{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
.stitle{font-weight:700;font-size:13px}
.sround{font-size:12px;color:#64748b}
.stable{font-size:20px;font-weight:800;margin:6px 0}
.players{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px}
.players td{padding:4px 2px;vertical-align:bottom}
.plabel{color:#64748b;font-size:11px;width:56px}
.pname{font-weight:600;border-bottom:1px solid #cbd5e1}
.pid{color:#94a3b8;font-weight:400;font-size:11px}
.wlabel{font-size:11px;color:#64748b;text-align:right;width:44px;padding-right:6px}
.wbox{width:28px;height:20px;border:1px solid #94a3b8;border-radius:3px}
.winner{font-size:13px;margin:6px 0}
.signs{display:flex;gap:12px;font-size:11px;color:#64748b;margin-top:10px}
.signs span{flex:1;display:flex;flex-direction:column;gap:2px}
.fill{display:block;flex:1;min-width:60px;border-bottom:1px solid #94a3b8;height:16px;margin-left:4px}
.winner .fill{display:inline-block;width:60%;vertical-align:bottom}
</style></head><body>
<div class="grid">${slips}</div>
<div style="font-size:10px;color:#94a3b8;margin-top:8px">${esc(GAME_CONFIG[tournament.game].name)} — Runde ${roundNumber} — ${date}</div>
</body></html>`
}

// Pairings sorted alphabetically by player name, so a player can find their own
// table quickly (the by-table PDF is for the caller). Each player appears once
// with their table and opponent; byes are marked.
export function generatePairingsByNameHtml(tournament: Tournament, roundNumber: number): string {
  const config = GAME_CONFIG[tournament.game]
  const round = tournament.rounds.find(r => r.roundNumber === roundNumber)
  if (!round) return ''
  const date = new Date(tournament.createdAt).toLocaleDateString('de-CH')
  const getName = (id: string) => tournament.players.find(p => p.id === id)?.name ?? '?'

  const entries: { name: string; table: string; opponent: string }[] = []
  for (const m of round.matches) {
    if (m.isBye) {
      entries.push({ name: getName(m.player1Id), table: '—', opponent: 'Bye' })
      continue
    }
    if (!m.player2Id) continue
    entries.push({ name: getName(m.player1Id), table: String(m.tableNumber), opponent: getName(m.player2Id) })
    entries.push({ name: getName(m.player2Id), table: String(m.tableNumber), opponent: getName(m.player1Id) })
  }
  entries.sort((a, b) => a.name.localeCompare(b.name, 'de'))

  const rows = entries.map(e =>
    `<tr><td>${esc(e.name)}</td><td style="text-align:center;font-weight:700">${esc(e.table)}</td><td>${esc(e.opponent)}</td></tr>`
  ).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,system-ui,sans-serif;margin:32px;color:#1e293b}
h1{font-size:22px;margin:0 0 4px}
.meta{font-size:13px;color:#64748b;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:8px;background:#f1f5f9;font-weight:600;color:#475569;border-bottom:2px solid #cbd5e1}
td{padding:6px 8px;border-bottom:1px solid #e2e8f0}
</style></head><body>
<h1>${esc(tournament.name)}</h1>
<div class="meta">${esc(config.name)} — Runde ${roundNumber} (nach Name) — ${date} — ${tournament.players.length} Spieler</div>
<table><thead><tr><th>Spieler</th><th style="width:60px;text-align:center">Tisch</th><th>Gegner</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`
}

// A standings sheet to post after a round — the current standings with a
// round-labelled header and print-friendly sizing.
export function generateStandingsPosterHtml(tournament: Tournament, standings: Standing[], roundNumber: number): string {
  const config = GAME_CONFIG[tournament.game]
  const tiebreakers = config.tiebreakers
  const isTcg = tiebreakers.system === 'tcg'
  const players = tournament.players

  const tbHeaders = isTcg
    ? `<th>OMW%</th>${tiebreakers.useGameWinPct ? '<th>GW%</th><th>OGW%</th>' : ''}`
    : '<th>Buchholz</th><th>Median</th><th>SB</th>'

  const rows = standings.map(s => {
    const player = players.find(p => p.id === s.playerId)
    const nameCell = s.dropped ? `<s>${esc(s.playerName)}</s>` : esc(s.playerName)
    const tbCells = isTcg
      ? `<td>${(s.opponentMatchWinPct * 100).toFixed(2)}%</td>${tiebreakers.useGameWinPct ? `<td>${(s.gameWinPct * 100).toFixed(2)}%</td><td>${(s.opponentGameWinPct * 100).toFixed(2)}%</td>` : ''}`
      : `<td>${s.buchholz}</td><td>${s.medianBuchholz}</td><td>${s.sonnebornBerger}</td>`
    return `<tr${s.dropped ? ' style="opacity:.5"' : ''}><td class="rk">${s.rank}</td><td>${nameCell}</td><td>${esc(player?.playerId ?? '')}</td><td><b>${s.matchPoints}</b></td><td>${s.wins}-${s.losses}-${s.draws}</td>${tbCells}</tr>`
  }).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@page{margin:12mm}
body{font-family:-apple-system,system-ui,sans-serif;margin:0;color:#1e293b}
h1{font-size:26px;margin:0 0 2px;text-align:center}
.meta{font-size:15px;color:#475569;margin-bottom:18px;text-align:center;font-weight:600}
table{width:100%;border-collapse:collapse;font-size:15px}
th{text-align:left;padding:8px 10px;background:#f1f5f9;font-weight:700;color:#334155;border-bottom:2px solid #cbd5e1}
td{padding:7px 10px;border-bottom:1px solid #e2e8f0}
.rk{text-align:center;font-weight:800;width:40px}
b{font-weight:800}
s{color:#94a3b8}
</style></head><body>
<h1>${esc(tournament.name)}</h1>
<div class="meta">Stand nach Runde ${roundNumber} — ${esc(config.name)}</div>
<table><thead><tr><th class="rk">#</th><th>Spieler</th><th>ID</th><th>Pkt</th><th>S-N-U</th>${tbHeaders}</tr></thead><tbody>${rows}</tbody></table>
</body></html>`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
