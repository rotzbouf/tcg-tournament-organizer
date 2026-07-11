import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Round, Match } from '@/types/round'
import { Player } from '@/types/player'
import { MatchCard } from './MatchCard'
import { DecklistDialog } from './DecklistDialog'
import { PenaltyDialog } from './PenaltyDialog'
import { Button } from '@/components/ui/Button'
import { useTournamentContext } from '@/state/useTournamentContext'
import { generatePairingsPdfHtml, generatePairingsByNameHtml, generateMatchSlipsHtml } from '@/lib/exportResults'
import { usePendingReports } from '@/hooks/usePendingReports'
import { MatchResult } from '@/types/round'
import { matchesSearch } from '@/lib/search'
import { cn, formatTime } from '@/lib/utils'

const SEARCH_THRESHOLD = 8

interface RoundPanelProps {
  round: Round
  players: Player[]
  tournamentId: string
  tournamentName?: string
  canGenerate: boolean
  isLastRound: boolean
  isTopCut?: boolean
  showGameScores?: boolean
}

export function RoundPanel({
  round,
  players,
  tournamentId,
  tournamentName,
  canGenerate,
  isLastRound,
  isTopCut = false,
  showGameScores = true,
}: RoundPanelProps) {
  const { t } = useTranslation()
  const { state, dispatch } = useTournamentContext()
  const [selectedPlayer, setSelectedPlayer] = useState<{ matchId: string; playerId: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { reports, reportsByMatch, conflictedMatchIds, dismiss } = usePendingReports()

  const tournament = state.tournaments[tournamentId]
  const deckChecks = tournament?.deckChecks ?? []
  const roundChecks = deckChecks.filter(c => c.roundNumber === round.roundNumber)
  const openChecks = roundChecks.filter(c => c.result === null)
  const completedChecks = deckChecks.filter(c => c.result !== null)
  const [deckCheckPlayer, setDeckCheckPlayer] = useState<Player | null>(null)
  const [penaltyPlayerId, setPenaltyPlayerId] = useState<string | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    if (openChecks.length === 0) return
    const interval = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [openChecks.length])

  // Search by player name/ID, or by table number if the query is numeric —
  // Konami IDs are numeric too, so a numeric query checks both.
  const playerById = new Map(players.map(p => [p.id, p]))
  const query = searchQuery.trim()
  const queryAsTable = /^\d+$/.test(query) ? parseInt(query, 10) : null
  const matchIsVisible = (m: Match): boolean => {
    if (query === '') return true
    if (queryAsTable !== null && m.tableNumber === queryAsTable) return true
    const p1 = playerById.get(m.player1Id)
    const p2 = m.player2Id ? playerById.get(m.player2Id) : undefined
    return matchesSearch(query, p1?.name, p1?.playerId, p2?.name, p2?.playerId)
  }
  const visibleCount = round.matches.filter(matchIsVisible).length

  const checkedMatchIds = new Set(roundChecks.map(c => c.matchId))
  const eligibleForCheck = round.matches.filter(m => !m.isBye && m.result === 'pending' && !checkedMatchIds.has(m.id))
  const startRandomDeckCheck = () => {
    const match = eligibleForCheck[Math.floor(Math.random() * eligibleForCheck.length)]
    if (match) dispatch({ type: 'START_DECK_CHECK', payload: { tournamentId, matchId: match.id } })
  }

  const pendingMatchIds = [...new Set(
    reports
      .filter(r => r.tournamentId === tournamentId && round.matches.some(m => m.id === r.matchId))
      .map(r => r.matchId)
  )]

  const allResultsIn = round.matches.every(m => m.result !== 'pending')
  const swapEnabled = !round.isComplete && !isTopCut

  const handlePlayerClick = useCallback((matchId: string, playerId: string) => {
    if (!swapEnabled) return
    if (!selectedPlayer) {
      setSelectedPlayer({ matchId, playerId })
      return
    }
    if (selectedPlayer.playerId === playerId) {
      setSelectedPlayer(null)
      return
    }
    dispatch({
      type: 'SWAP_PLAYERS',
      payload: {
        tournamentId,
        matchId1: selectedPlayer.matchId,
        playerId1: selectedPlayer.playerId,
        matchId2: matchId,
        playerId2: playerId,
      },
    })
    setSelectedPlayer(null)
  }, [swapEnabled, selectedPlayer, dispatch, tournamentId])

  useEffect(() => {
    if (!selectedPlayer) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPlayer(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPlayer])

  const handleComplete = () => {
    dispatch({ type: 'COMPLETE_ROUND', payload: { tournamentId } })
  }

  const handleGenerate = () => {
    dispatch({ type: 'GENERATE_ROUND', payload: { tournamentId } })
  }

  const handleFinishTournament = () => {
    dispatch({ type: 'COMPLETE_TOURNAMENT', payload: { tournamentId } })
  }

  function submitAndDismiss(matchId: string, result: MatchResult) {
    dispatch({ type: 'SUBMIT_MATCH_RESULT', payload: { tournamentId, matchId, result } })
    dismiss(matchId)
  }

  return (
    <div className="space-y-4">
      {pendingMatchIds.length > 0 && !round.isComplete && (
        <div className="space-y-2">
          {pendingMatchIds.map(matchId => {
            const match = round.matches.find(m => m.id === matchId)
            if (!match) return null

            const p1 = players.find(p => p.id === match.player1Id)?.name ?? '?'
            const p2 = match.player2Id ? players.find(p => p.id === match.player2Id)?.name ?? '?' : null
            const matchReports = reportsByMatch[matchId] ?? []
            const isConflict = conflictedMatchIds.has(matchId)

            if (isConflict) {
              const r1 = matchReports[0]
              const r2 = matchReports[1]
              const labelFor = (r: typeof r1) => {
                if (r.result === 'draw') return t('selfReport.claimsDraw', { reporter: r.reporterName })
                const winner = r.result === 'player1_win' ? p1 : p2
                return t('selfReport.claimsWin', { reporter: r.reporterName, winner })
              }

              return (
                <div key={matchId} className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm dark:border-red-800 dark:bg-red-950">
                  <p className="font-semibold text-red-800 dark:text-red-300 mb-1">
                    ⚠ {t('selfReport.conflict')}
                  </p>
                  <p className="text-red-700 dark:text-red-400 mb-2">
                    {labelFor(r1)} · {labelFor(r2)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => submitAndDismiss(matchId, 'player1_win')}>
                      {t('match.player1Win', { name: p1 })}
                    </Button>
                    {p2 && (
                      <Button size="sm" onClick={() => submitAndDismiss(matchId, 'player2_win')}>
                        {t('match.player2Win', { name: p2 })}
                      </Button>
                    )}
                    {!isTopCut && (
                      <Button size="sm" variant="secondary" onClick={() => submitAndDismiss(matchId, 'draw')}>
                        {t('match.draw')}
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => dismiss(matchId)}>
                      {t('common.dismiss')}
                    </Button>
                  </div>
                </div>
              )
            }

            // Normal: 1 report or 2 agreeing reports
            const report = matchReports[0]
            const bothAgree = matchReports.length >= 2
            const winnerName = report.result === 'player1_win' ? p1 : report.result === 'player2_win' ? p2 : null

            let resultLabel: string
            if (bothAgree) {
              resultLabel = winnerName
                ? t('selfReport.bothAgreeWin', { winner: winnerName })
                : t('selfReport.bothAgreeDraw')
            } else {
              resultLabel = winnerName
                ? t('selfReport.claimsWin', { winner: winnerName, reporter: report.reporterName })
                : t('selfReport.claimsDraw', { reporter: report.reporterName })
            }

            return (
              <div key={matchId} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950">
                <span className="text-amber-900 dark:text-amber-200">
                  <span className="font-semibold">{t('selfReport.title')}:</span> {resultLabel}
                </span>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" onClick={() => submitAndDismiss(matchId, report.result as MatchResult)}>
                    {t('common.confirm')}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => dismiss(matchId)}>
                    {t('common.dismiss')}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {openChecks.map(check => {
        const p1 = playerById.get(check.playerIds[0])
        const p2 = check.playerIds[1] ? playerById.get(check.playerIds[1]) : undefined
        const elapsed = Math.max(0, Math.floor((nowTick - new Date(check.startedAt).getTime()) / 1000))
        return (
          <div key={check.id} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950 print:hidden">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-900 dark:text-amber-200">
                🔍 {t('deckCheck.title')} · {t('match.table', { number: check.tableNumber })}
              </span>
              <span className="text-amber-800 dark:text-amber-300">
                {p1?.name}{p2 ? ` ${t('match.vs')} ${p2.name}` : ''}
              </span>
              {check.startedBy && (
                <span className="text-xs text-amber-700 dark:text-amber-400">⚖ {check.startedBy}</span>
              )}
              <span className="ml-auto font-mono tabular-nums text-amber-700 dark:text-amber-400">{formatTime(elapsed)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[p1, p2].map(p => p && (
                <Button key={p.id} size="sm" variant="secondary" onClick={() => setDeckCheckPlayer(p)}>
                  {t('deckCheck.viewDecklist', { name: p.name })}
                </Button>
              ))}
              <Button size="sm" onClick={() => dispatch({ type: 'COMPLETE_DECK_CHECK', payload: { tournamentId, checkId: check.id, result: 'ok' } })}>
                {t('deckCheck.ok')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  dispatch({ type: 'COMPLETE_DECK_CHECK', payload: { tournamentId, checkId: check.id, result: 'issue' } })
                  setPenaltyPlayerId(check.playerIds[0])
                }}
              >
                {t('deckCheck.issue')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'CANCEL_DECK_CHECK', payload: { tournamentId, checkId: check.id } })}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )
      })}
      {tournamentName && (
        <div className="hidden print:block mb-4">
          <h2 className="text-xl font-bold">{tournamentName}</h2>
          <p className="text-sm">{t('dashboard.round')} {round.roundNumber}</p>
        </div>
      )}
      {selectedPlayer && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <span>{t('rounds.swapHint')}</span>
          <button
            onClick={() => setSelectedPlayer(null)}
            className="ml-auto text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}
      {round.matches.length >= SEARCH_THRESHOLD && (
        <div className="flex items-center gap-3 print:hidden">
          <input
            type="search"
            placeholder={t('rounds.search')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-64 rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {query !== '' && (
            <span className="text-sm text-muted-foreground">
              {t('rounds.searchResults', { shown: visibleCount, total: round.matches.length })}
            </span>
          )}
        </div>
      )}
      {query !== '' && visibleCount === 0 && (
        <p className="p-4 text-center text-sm text-muted-foreground print:hidden">
          {t('rounds.searchNoResults')}
        </p>
      )}
      <div className="space-y-3">
        {/* Hidden (not unmounted) when filtered, so printing always yields the full pairing list */}
        {round.matches.map(match => (
          <div key={match.id} className={cn(!matchIsVisible(match) && 'hidden print:block')}>
            <MatchCard
              match={match}
              players={players}
              tournamentId={tournamentId}
              readonly={round.isComplete}
              hideDrawOption={isTopCut}
              showGameScores={showGameScores}
              selectedPlayerId={selectedPlayer?.playerId ?? null}
              onPlayerClick={swapEnabled ? handlePlayerClick : undefined}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        {!round.isComplete && eligibleForCheck.length > 0 && (
          <Button variant="secondary" size="sm" onClick={startRandomDeckCheck}>
            🎲 {t('deckCheck.random')}
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          {t('rounds.print')}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => {
          const tournament = state.tournaments[tournamentId]
          if (tournament) {
            const html = generatePairingsPdfHtml(tournament, round.roundNumber)
            window.electronAPI?.savePdf(html, `${(tournamentName ?? 'pairings').replace(/\s+/g, '-')}-R${round.roundNumber}.pdf`)
          }
        }}>
          {t('export.pairings')}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => {
          const tournament = state.tournaments[tournamentId]
          if (tournament) {
            const html = generatePairingsByNameHtml(tournament, round.roundNumber)
            window.electronAPI?.savePdf(html, `${(tournamentName ?? 'pairings').replace(/\s+/g, '-')}-R${round.roundNumber}-name.pdf`)
          }
        }}>
          {t('export.pairingsByName')}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => {
          const tournament = state.tournaments[tournamentId]
          if (tournament) {
            const html = generateMatchSlipsHtml(tournament, round.roundNumber)
            window.electronAPI?.savePdf(html, `${(tournamentName ?? 'slips').replace(/\s+/g, '-')}-R${round.roundNumber}-slips.pdf`)
          }
        }}>
          {t('export.matchSlips')}
        </Button>
        {!round.isComplete && (
          <Button onClick={handleComplete} disabled={!allResultsIn}>
            {t('rounds.complete')}
          </Button>
        )}
        {round.isComplete && canGenerate && (
          <Button onClick={handleGenerate}>{t('rounds.generate')}</Button>
        )}
        {round.isComplete && isLastRound && (
          <Button onClick={handleFinishTournament} variant="secondary">
            {t('tournament.complete')}
          </Button>
        )}
        {!round.isComplete && !allResultsIn && (
          <p className="flex items-center text-sm text-amber-600">
            {t('rounds.allResultsRequired')}
          </p>
        )}
      </div>

      {completedChecks.length > 0 && (
        <details className="print:hidden">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            {t('deckCheck.log', { count: completedChecks.length })}
          </summary>
          <ul className="mt-2 space-y-1 text-sm">
            {[...completedChecks].reverse().map(c => {
              const names = c.playerIds.map(id => playerById.get(id)?.name ?? '?').join(` ${t('match.vs')} `)
              const when = new Date(c.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              return (
                <li key={c.id} className="text-muted-foreground">
                  R{c.roundNumber} · {t('match.table', { number: c.tableNumber })} · {names} · {when} ·{' '}
                  <span className={c.result === 'issue' ? 'font-semibold text-red-600' : 'font-semibold text-green-700'}>
                    {c.result === 'issue' ? t('deckCheck.resultIssue') : t('deckCheck.resultOk')}
                  </span>
                  {c.startedBy ? ` · ⚖ ${c.startedBy}` : ''}
                </li>
              )
            })}
          </ul>
        </details>
      )}

      {deckCheckPlayer && tournament && (
        <DecklistDialog
          open
          onClose={() => setDeckCheckPlayer(null)}
          tournamentId={tournamentId}
          player={deckCheckPlayer}
          readonly
          game={tournament.game}
          gameFormat={tournament.gameFormat}
        />
      )}
      {penaltyPlayerId && tournament && (
        <PenaltyDialog
          open
          onClose={() => setPenaltyPlayerId(null)}
          tournamentId={tournamentId}
          game={tournament.game}
          players={tournament.players}
          penalties={tournament.penalties}
          initialPlayerId={penaltyPlayerId}
        />
      )}
    </div>
  )
}
