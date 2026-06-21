import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Round } from '@/types/round'
import { Player } from '@/types/player'
import { MatchCard } from './MatchCard'
import { cn } from '@/lib/utils'

interface RoundHistoryProps {
  rounds: Round[]
  players: Player[]
  tournamentId: string
}

export function RoundHistory({ rounds, players, tournamentId }: RoundHistoryProps) {
  const { t } = useTranslation()
  const [expandedRound, setExpandedRound] = useState<number | null>(null)

  const completedRounds = rounds.filter(r => r.isComplete)

  if (completedRounds.length === 0) return null

  return (
    <div className="space-y-2">
      {completedRounds.map(round => (
        <div key={round.roundNumber} className="rounded-lg border border-gray-200">
          <button
            className={cn(
              'flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium',
              expandedRound === round.roundNumber ? 'bg-gray-50' : 'hover:bg-gray-50'
            )}
            aria-expanded={expandedRound === round.roundNumber}
            aria-controls={`round-${round.roundNumber}-panel`}
            onClick={() =>
              setExpandedRound(
                expandedRound === round.roundNumber ? null : round.roundNumber
              )
            }
          >
            <span>
              {t('dashboard.round')} {round.roundNumber}
              {round.phase === 'top_cut' && ` (${t('tournament.topCutLabel')})`}
            </span>
            <span className="text-gray-400">
              {expandedRound === round.roundNumber ? '▲' : '▼'}
            </span>
          </button>
          {expandedRound === round.roundNumber && (
            <div id={`round-${round.roundNumber}-panel`} className="space-y-2 border-t border-gray-200 p-3">
              {round.matches.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  players={players}
                  tournamentId={tournamentId}
                  readonly
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
