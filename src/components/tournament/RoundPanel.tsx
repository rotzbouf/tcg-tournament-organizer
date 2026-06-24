import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Round } from '@/types/round'
import { Player } from '@/types/player'
import { MatchCard } from './MatchCard'
import { Button } from '@/components/ui/Button'
import { useTournamentContext } from '@/state/TournamentContext'
import { generatePairingsPdfHtml } from '@/lib/exportResults'

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
