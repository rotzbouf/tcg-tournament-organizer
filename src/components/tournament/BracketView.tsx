import { useTranslation } from 'react-i18next'
import { Tournament } from '@/types/tournament'
import { Match } from '@/types/round'
import { cn } from '@/lib/utils'

const CELL_H = 52   // px height of one match cell
const BASE_GAP = 12 // px gap between cells in round 1

interface BracketViewProps {
  tournament: Tournament
}

function playerName(tournament: Tournament, id: string | null): string {
  if (!id) return '—'
  return tournament.players.find(p => p.id === id)?.name ?? '?'
}

function winnerId(match: Match): string | null {
  if (match.result === 'player1_win') return match.player1Id
  if (match.result === 'player2_win') return match.player2Id ?? null
  return null
}

function roundLabel(idx: number, total: number, t: (k: string, o?: Record<string, unknown>) => string): string {
  const fromEnd = total - idx
  if (fromEnd === 1) return t('bracket.final')
  if (fromEnd === 2) return t('bracket.semifinal')
  return t('bracket.roundOf', { n: Math.pow(2, fromEnd) })
}

function MatchBox({ match, tournament }: { match: Match; tournament: Tournament }) {
  const winner = winnerId(match)
  const rows: [string | null, boolean][] = [
    [match.player1Id, winner === match.player1Id],
    [match.player2Id ?? null, winner === (match.player2Id ?? null) && winner !== null],
  ]
  return (
    <div className="w-40 rounded border border-border bg-card shadow-sm overflow-hidden">
      {rows.map(([pid, isWinner], i) => (
        <div
          key={i}
          className={cn(
            'px-2 py-1.5 text-xs truncate',
            i === 0 ? 'border-b border-border' : '',
            isWinner ? 'font-bold text-foreground' : 'text-muted-foreground'
          )}
        >
          {playerName(tournament, pid)}
        </div>
      ))}
    </div>
  )
}

export function BracketView({ tournament }: BracketViewProps) {
  const { t } = useTranslation()
  const rounds = tournament.rounds.filter(r => r.phase === 'top_cut')

  if (rounds.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('bracket.tbd')}</p>
  }

  const totalRounds = rounds.length
  const firstRoundMatches = rounds[0].matches.length

  // Slot height for each round: doubles each time so matches stay centered between feeders
  // Round 0: slot = CELL_H + BASE_GAP
  // Round r: slot = (CELL_H + BASE_GAP) * 2^r
  const slotH = (r: number) => (CELL_H + BASE_GAP) * Math.pow(2, r)
  const totalH = firstRoundMatches * slotH(0)

  const champion = winnerId(rounds[rounds.length - 1]?.matches[0])

  return (
    <div className="overflow-x-auto">
      {champion && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-800 dark:bg-amber-950">
          <span className="text-lg">🏆</span>
          <span className="font-bold text-foreground">
            {t('bracket.champion')}: {playerName(tournament, champion)}
          </span>
        </div>
      )}

      <div className="flex gap-4 items-start">
        {rounds.map((round, rIdx) => {
          const sh = slotH(rIdx)

          return (
            <div key={round.roundNumber} style={{ width: 176 }}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {roundLabel(rIdx, totalRounds, t)}
              </div>
              {/* relative container sized to match round 0 total height for alignment */}
              <div className="relative" style={{ height: totalH }}>
                {round.matches.map((match, mIdx) => {
                  // Center match within its slot
                  const top = mIdx * sh + sh / 2 - CELL_H / 2
                  return (
                    <div key={match.id} className="absolute left-0" style={{ top, right: 0 }}>
                      <div className="flex items-center gap-1">
                        <MatchBox match={match} tournament={tournament} />
                        {/* right connector stub */}
                        {rIdx < totalRounds - 1 && (
                          <div className="h-px w-4 bg-border flex-shrink-0" />
                        )}
                      </div>
                      {/* vertical connector on the left (for rounds > 0) */}
                      {rIdx > 0 && mIdx % 2 === 0 && (
                        <div
                          className="absolute left-0 border-l border-t border-b border-border"
                          style={{
                            top: CELL_H / 2,
                            height: sh - CELL_H,
                            width: 8,
                            transform: 'translateX(-12px)',
                          }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
