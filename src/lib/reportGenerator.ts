import { Tournament } from '@/types/tournament'
import { Standing } from '@/types/standing'
import { GAME_CONFIG } from './gameConfig'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function getName(tournament: Tournament, id: string | null): string {
  if (!id) return '—'
  return tournament.players.find(p => p.id === id)?.name ?? '?'
}

function resultLabel(tournament: Tournament, matchResult: string, p1Id: string, p2Id: string | null): string {
  if (matchResult === 'player1_win') return `${esc(getName(tournament, p1Id))} gewinnt`
  if (matchResult === 'player2_win') return `${esc(getName(tournament, p2Id))} gewinnt`
  if (matchResult === 'draw') return 'Unentschieden'
  return '—'
}

export function generateTournamentReport(tournament: Tournament, standings: Standing[]): string {
  const config = GAME_CONFIG[tournament.game]
  const tiebreakers = config.tiebreakers
  const isTcg = tiebreakers.system === 'tcg'
  const date = new Date(tournament.createdAt).toLocaleDateString('de-CH')
  const formatLabel = tournament.format === 'swiss_topcut' && tournament.topCut > 0
    ? `Swiss + Top ${tournament.topCut}`
    : tournament.format === 'swiss' ? 'Swiss'
    : tournament.format === 'double_elimination' ? 'Double Elimination'
    : 'Rundenturnier'

  // Champion and top finishers
  const top4 = standings.slice(0, 4)
  const champion = top4[0]

  // Standings table
  const tbHead = isTcg
    ? `<th>OMW%</th>${tiebreakers.useGameWinPct ? '<th>GW%</th><th>OGW%</th>' : ''}`
    : '<th>Buchholz</th><th>Median-BH</th><th>SB</th>'
  const tbRow = (s: Standing) => {
    const dropped = s.dropped ? ' style="opacity:.45"' : ''
    const name = s.dropped ? `<s>${esc(s.playerName)}</s>` : esc(s.playerName)
    const tb = isTcg
      ? `<td>${(s.opponentMatchWinPct * 100).toFixed(1)}%</td>${tiebreakers.useGameWinPct ? `<td>${(s.gameWinPct * 100).toFixed(1)}%</td><td>${(s.opponentGameWinPct * 100).toFixed(1)}%</td>` : ''}`
      : `<td>${s.buchholz}</td><td>${s.medianBuchholz}</td><td>${s.sonnebornBerger}</td>`
    return `<tr${dropped}><td>${s.rank}</td><td>${name}</td><td><b>${s.matchPoints}</b></td><td>${s.wins}</td><td>${s.losses}</td><td>${s.draws}</td>${tb}</tr>`
  }

  // Rounds
  const swissRounds = tournament.rounds.filter(r => r.phase === 'swiss' || r.phase === 'round_robin' || r.phase === undefined)
  const topCutRounds = tournament.rounds.filter(r => r.phase === 'top_cut' || r.phase === 'winners_bracket' || r.phase === 'losers_bracket' || r.phase === 'grand_final')

  const renderRound = (rounds: typeof tournament.rounds) =>
    rounds.map(round => {
      const rows = round.matches.map(m => {
        if (m.isBye) {
          return `<tr><td style="color:#94a3b8;text-align:center">—</td><td>${esc(getName(tournament, m.player1Id))}</td><td colspan="2" style="color:#94a3b8">Freilos</td></tr>`
        }
        const p1 = esc(getName(tournament, m.player1Id))
        const p2 = esc(getName(tournament, m.player2Id))
        const winner = resultLabel(tournament, m.result, m.player1Id, m.player2Id)
        const gameScore = tiebreakers.useGameWinPct && m.player1Games != null
          ? `${m.player1Games}–${m.player2Games}`
          : ''
        return `<tr><td style="color:#94a3b8;text-align:center">${m.tableNumber}</td><td>${p1}</td><td style="text-align:center;color:#94a3b8">${gameScore}</td><td>${p2}</td><td style="color:#2563eb;font-weight:600">${winner}</td></tr>`
      }).join('')
      const phaseLabel = round.phase === 'top_cut' ? 'Top Cut' : round.phase === 'winners_bracket' ? 'Winners Bracket' : round.phase === 'losers_bracket' ? 'Losers Bracket' : round.phase === 'grand_final' ? 'Grand Final' : 'Swiss'
      return `
        <div class="round-block">
          <h3>${phaseLabel} — Runde ${round.roundNumber}</h3>
          <table>
            <thead><tr><th style="width:32px">#</th><th>Spieler 1</th><th style="width:48px;text-align:center">Spiele</th><th>Spieler 2</th><th>Ergebnis</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`
    }).join('')

  const topFinishersHtml = top4.length > 1
    ? `<div class="top-finishers">
        ${top4.slice(1).map((s, i) => `<div class="finisher"><span class="place">${i + 2}.</span><span>${esc(s.playerName)}</span></div>`).join('')}
      </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Abschlussbericht — ${esc(tournament.name)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,system-ui,sans-serif;font-size:13px;color:#1e293b;background:#fff;padding:32px;max-width:900px;margin:0 auto}
h1{font-size:24px;font-weight:700;margin-bottom:4px}
.meta{font-size:12px;color:#64748b;margin-bottom:24px}
.champion-box{background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:24px;display:flex;align-items:center;gap:12px}
.trophy{font-size:28px}
.champion-name{font-size:18px;font-weight:700;color:#1e293b}
.champion-label{font-size:11px;color:#92400e;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
.top-finishers{display:flex;gap:12px;margin-top:8px}
.finisher{display:flex;align-items:center;gap:6px;font-size:12px;color:#475569}
.place{font-weight:700;color:#1e293b}
h2{font-size:16px;font-weight:700;color:#1e293b;margin:24px 0 8px;padding-bottom:4px;border-bottom:2px solid #e2e8f0}
h3{font-size:13px;font-weight:600;color:#475569;margin:16px 0 6px}
table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:4px}
th{text-align:left;padding:5px 8px;background:#f8fafc;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0}
td{padding:4px 8px;border-bottom:1px solid #f1f5f9}
tr:last-child td{border-bottom:none}
.round-block{margin-bottom:16px}
.stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
.stat-card{background:#f8fafc;border-radius:6px;padding:10px 12px;text-align:center}
.stat-val{font-size:20px;font-weight:700;color:#1e293b}
.stat-lbl{font-size:11px;color:#64748b;margin-top:2px}
@media print{body{padding:16px}h2{page-break-before:auto}}
</style>
</head>
<body>
<h1>${esc(tournament.name)}</h1>
<div class="meta">${esc(config.name)} · ${formatLabel} · ${date} · ${tournament.players.length} Spieler</div>

${champion ? `<div class="champion-box">
  <div class="trophy">🏆</div>
  <div>
    <div class="champion-label">Sieger</div>
    <div class="champion-name">${esc(champion.playerName)}</div>
    ${topFinishersHtml}
  </div>
</div>` : ''}

<div class="stats-grid">
  <div class="stat-card"><div class="stat-val">${tournament.players.length}</div><div class="stat-lbl">Spieler</div></div>
  <div class="stat-card"><div class="stat-val">${swissRounds.length}</div><div class="stat-lbl">Swiss-Runden</div></div>
  <div class="stat-card"><div class="stat-val">${tournament.rounds.reduce((s, r) => s + r.matches.filter(m => !m.isBye).length, 0)}</div><div class="stat-lbl">Matches gespielt</div></div>
</div>

<h2>Abschlussrangliste</h2>
<table>
  <thead><tr><th>#</th><th>Spieler</th><th>Pkt</th><th>S</th><th>N</th><th>U</th>${tbHead}</tr></thead>
  <tbody>${standings.map(tbRow).join('')}</tbody>
</table>

${swissRounds.length > 0 ? `<h2>Swiss-Runden</h2>${renderRound(swissRounds)}` : ''}
${topCutRounds.length > 0 ? `<h2>Top Cut</h2>${renderRound(topCutRounds)}` : ''}
</body>
</html>`
}
