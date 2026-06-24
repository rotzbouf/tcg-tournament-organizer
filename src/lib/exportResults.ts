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

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
