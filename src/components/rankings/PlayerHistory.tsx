import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DatabasePlayer } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useTournamentContext } from '@/state/TournamentContext'
import { cn } from '@/lib/utils'

interface PlayerHistoryProps {
  player: DatabasePlayer
  onBack: () => void
}

export function PlayerHistory({ player, onBack }: PlayerHistoryProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()
  const [editingId, setEditingId] = useState(false)
  const [playerIdValue, setPlayerIdValue] = useState(player.playerId ?? '')

  const handleSavePlayerId = () => {
    dispatch({
      type: 'UPDATE_DATABASE_PLAYER',
      payload: { databasePlayerId: player.id, playerId: playerIdValue.trim() || null },
    })
    setEditingId(false)
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onBack}>
          ← {t('rankings.title')}
        </Button>
        <h2 className="text-2xl font-bold text-gray-900">{player.name}</h2>
        <span className="text-lg font-semibold text-gray-500">{player.elo} Elo</span>
      </div>

      <div className="mb-4 rounded-lg border border-gray-200 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">{t('rankings.profile')}</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-24 text-sm text-gray-500">{t('rankings.playerId')}:</span>
            {editingId ? (
              <>
                <Input
                  id="player-id-edit"
                  value={playerIdValue}
                  onChange={e => setPlayerIdValue(e.target.value)}
                  placeholder={t('players.playerIdPlaceholder')}
                  className="w-48"
                />
                <Button size="sm" onClick={handleSavePlayerId}>{t('common.save')}</Button>
                <Button variant="secondary" size="sm" onClick={() => { setEditingId(false); setPlayerIdValue(player.playerId ?? '') }}>{t('common.cancel')}</Button>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-900">{player.playerId || '–'}</span>
                <Button variant="ghost" size="sm" onClick={() => setEditingId(true)}>{t('rankings.editProfile')}</Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 text-sm text-gray-500">{t('rankings.matches')}:</span>
            <span className="text-sm text-gray-900">{player.matchesPlayed}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 text-sm text-gray-500">{t('rankings.tournaments')}:</span>
            <span className="text-sm text-gray-900">{player.tournamentsPlayed}</span>
          </div>
        </div>
      </div>

      {player.history.length === 0 ? (
        <p className="text-center text-sm text-gray-400">{t('rankings.noHistory')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-gray-600">{t('tournament.name')}</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">{t('standings.rank')}</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">{t('elo.before')}</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">{t('elo.after')}</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">{t('elo.change')}</th>
              </tr>
            </thead>
            <tbody>
              {[...player.history].reverse().map((entry, i) => {
                const delta = entry.eloAfter - entry.eloBefore
                return (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 text-gray-900">{entry.tournamentName}</td>
                    <td className="px-3 py-2 text-center text-gray-500">#{entry.placement}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{entry.eloBefore}</td>
                    <td className="px-3 py-2 text-center font-semibold text-gray-900">{entry.eloAfter}</td>
                    <td className={cn(
                      'px-3 py-2 text-center font-medium',
                      delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'
                    )}>
                      {delta > 0 ? '+' : ''}{delta}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
