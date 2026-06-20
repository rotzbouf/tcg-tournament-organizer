import { useTranslation } from 'react-i18next'
import { Player } from '@/types/player'
import { Button } from '@/components/ui/Button'
import { useTournamentContext } from '@/state/TournamentContext'
import { AddPlayerForm } from './AddPlayerForm'
import { cn } from '@/lib/utils'

interface PlayerListProps {
  tournamentId: string
  players: Player[]
  editable: boolean
  inProgress?: boolean
}

export function PlayerList({ tournamentId, players, editable, inProgress }: PlayerListProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()

  const activePlayers = players.filter(p => p.droppedInRound === null)

  return (
    <div className="space-y-4">
      {editable && <AddPlayerForm tournamentId={tournamentId} />}

      <p className="text-sm text-gray-500">
        {inProgress
          ? t('players.activeCount', { active: activePlayers.length, total: players.length })
          : t('players.count', { count: players.length })}
      </p>

      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {players.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-400">{t('dashboard.empty')}</p>
        ) : (
          players.map((player, index) => (
            <div
              key={player.id}
              className={cn(
                'flex items-center justify-between px-4 py-2.5',
                player.droppedInRound !== null && 'opacity-50'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-right text-sm text-gray-400">{index + 1}</span>
                <span className={cn(
                  'text-sm font-medium',
                  player.droppedInRound !== null ? 'text-gray-400 line-through' : 'text-gray-900'
                )}>
                  {player.name}
                </span>
                {player.droppedInRound !== null && (
                  <span className="text-xs text-red-500">
                    {t('players.droppedInRound', { round: player.droppedInRound })}
                  </span>
                )}
              </div>
              {editable && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    dispatch({
                      type: 'REMOVE_PLAYER',
                      payload: { tournamentId, playerId: player.id },
                    })
                  }
                >
                  {t('players.remove')}
                </Button>
              )}
              {inProgress && player.droppedInRound === null && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() =>
                    dispatch({
                      type: 'DROP_PLAYER',
                      payload: { tournamentId, playerId: player.id },
                    })
                  }
                >
                  {t('players.drop')}
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
