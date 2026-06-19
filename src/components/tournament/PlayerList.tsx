import { useTranslation } from 'react-i18next'
import { Player } from '@/types/player'
import { Button } from '@/components/ui/Button'
import { useTournamentContext } from '@/state/TournamentContext'
import { AddPlayerForm } from './AddPlayerForm'

interface PlayerListProps {
  tournamentId: string
  players: Player[]
  editable: boolean
}

export function PlayerList({ tournamentId, players, editable }: PlayerListProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()

  return (
    <div className="space-y-4">
      {editable && <AddPlayerForm tournamentId={tournamentId} />}

      <p className="text-sm text-gray-500">
        {t('players.count', { count: players.length })}
      </p>

      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {players.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-400">{t('dashboard.empty')}</p>
        ) : (
          players.map((player, index) => (
            <div
              key={player.id}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-right text-sm text-gray-400">{index + 1}</span>
                <span className="text-sm font-medium text-gray-900">{player.name}</span>
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
            </div>
          ))
        )}
      </div>
    </div>
  )
}
