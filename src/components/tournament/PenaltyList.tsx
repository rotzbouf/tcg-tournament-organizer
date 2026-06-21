import { useTranslation } from 'react-i18next'
import { Penalty } from '@/types/penalty'
import { Player } from '@/types/player'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useTournamentContext } from '@/state/TournamentContext'

interface PenaltyListProps {
  tournamentId: string
  penalties: Penalty[]
  players: Player[]
}

const penaltyBadgeVariant = {
  warning: 'warning' as const,
  game_loss: 'info' as const,
  match_loss: 'default' as const,
  disqualification: 'success' as const,
}

export function PenaltyList({ tournamentId, penalties, players }: PenaltyListProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()

  if (penalties.length === 0) {
    return <p className="text-center text-sm text-gray-400">{t('penalties.noPenalties')}</p>
  }

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name ?? '?'

  return (
    <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
      {penalties.map(penalty => (
        <div key={penalty.id} className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{getPlayerName(penalty.playerId)}</span>
              <Badge variant={penaltyBadgeVariant[penalty.type]}>
                {t(`penalties.type.${penalty.type}`)}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {t('penalties.issuedInRound', { round: penalty.roundNumber })} — {penalty.reason}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: 'REMOVE_PENALTY', payload: { tournamentId, penaltyId: penalty.id } })}
          >
            {t('penalties.remove')}
          </Button>
        </div>
      ))}
    </div>
  )
}
