import { useTranslation } from 'react-i18next'
import { Round } from '@/types/round'
import { Player } from '@/types/player'
import { MatchCard } from './MatchCard'
import { Button } from '@/components/ui/Button'
import { useTournamentContext } from '@/state/TournamentContext'

interface RoundPanelProps {
  round: Round
  players: Player[]
  tournamentId: string
  canGenerate: boolean
  isLastRound: boolean
  isTopCut?: boolean
}

export function RoundPanel({
  round,
  players,
  tournamentId,
  canGenerate,
  isLastRound,
  isTopCut = false,
}: RoundPanelProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()

  const allResultsIn = round.matches.every(m => m.result !== 'pending')

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
      <div className="space-y-3">
        {round.matches.map(match => (
          <MatchCard
            key={match.id}
            match={match}
            players={players}
            tournamentId={tournamentId}
            readonly={round.isComplete}
            hideDrawOption={isTopCut}
          />
        ))}
      </div>

      <div className="flex gap-2 print:hidden">
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          {t('rounds.print')}
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
