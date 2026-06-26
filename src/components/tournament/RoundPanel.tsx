import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Round } from '@/types/round'
import { Player } from '@/types/player'
import { MatchCard } from './MatchCard'
import { Button } from '@/components/ui/Button'
import { useTournamentContext } from '@/state/TournamentContext'
import { generatePairingsPdfHtml } from '@/lib/exportResults'
import { usePendingReports } from '@/hooks/usePendingReports'

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
  const { reports, dismiss } = usePendingReports()
  const pendingForRound = reports.filter(r =>
    r.tournamentId === tournamentId && round.matches.some(m => m.id === r.matchId)
  )

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

  return (
    <div className="space-y-4">
      {pendingForRound.length > 0 && !round.isComplete && (
        <div className="space-y-2">
          {pendingForRound.map(report => {
            const match = round.matches.find(m => m.id === report.matchId)
            if (!match) return null
            const p1 = players.find(p => p.id === match.player1Id)?.name ?? '?'
            const p2 = match.player2Id ? players.find(p => p.id === match.player2Id)?.name ?? '?' : null
            const winnerName = report.result === 'player1_win' ? p1 : report.result === 'player2_win' ? p2 : null
            const resultLabel = winnerName
              ? t('selfReport.claimsWin', { winner: winnerName, reporter: report.reporterName })
              : t('selfReport.claimsDraw', { reporter: report.reporterName })
            return (
              <div key={report.matchId} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950">
                <span className="text-amber-900 dark:text-amber-200">
                  <span className="font-semibold">{t('selfReport.title')}:</span> {resultLabel}
                </span>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" onClick={() => {
                    dispatch({ type: 'SUBMIT_MATCH_RESULT', payload: { tournamentId, matchId: report.matchId, result: report.result as never } })
                    dismiss(report.matchId)
                  }}>
                    {t('common.confirm')}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => dismiss(report.matchId)}>
                    {t('common.dismiss')}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
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
      <div className="space-y-3">
        {round.matches.map(match => (
          <MatchCard
            key={match.id}
            match={match}
            players={players}
            tournamentId={tournamentId}
            readonly={round.isComplete}
            hideDrawOption={isTopCut}
            showGameScores={showGameScores}
            selectedPlayerId={selectedPlayer?.playerId ?? null}
            onPlayerClick={swapEnabled ? handlePlayerClick : undefined}
          />
        ))}
      </div>

      <div className="flex gap-2 print:hidden">
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
    </div>
  )
}
