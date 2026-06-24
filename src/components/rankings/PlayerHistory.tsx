import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DatabasePlayer } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EloChart } from '@/components/ui/EloChart'
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
        <h2 className="text-2xl font-bold text-foreground">{player.name}</h2>
        <span className="text-lg font-semibold text-muted-foreground">{player.elo} Elo</span>
      </div>

      <div className="mb-4 rounded-lg border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold text-secondary-foreground">{t('rankings.profile')}</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-24 text-sm text-muted-foreground">{t('rankings.playerId')}:</span>
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
                <span className="text-sm text-foreground">{player.playerId || '–'}</span>
                <Button variant="ghost" size="sm" onClick={() => setEditingId(true)}>{t('rankings.editProfile')}</Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 text-sm text-muted-foreground">{t('rankings.matches')}:</span>
            <span className="text-sm text-foreground">{player.matchesPlayed}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 text-sm text-muted-foreground">{t('rankings.tournaments')}:</span>
            <span className="text-sm text-foreground">{player.tournamentsPlayed}</span>
          </div>
        </div>
      </div>

      {(player.penalties?.length ?? 0) > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <h3 className="mb-3 text-sm font-semibold text-red-700">{t('penalties.history')}</h3>
          <div className="space-y-2">
            {[...(player.penalties ?? [])].reverse().map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                  {t(`penalties.type.${p.type}`)}
                </span>
                <span className="text-secondary-foreground">{p.reason}</span>
                <span className="ml-auto text-xs text-muted-foreground">{p.tournamentName} — {new Date(p.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {player.history.length >= 2 && (
        <div className="mb-4 rounded-lg border border-border p-4">
          <h3 className="mb-2 text-sm font-semibold text-secondary-foreground">{t('stats.eloProgression')}</h3>
          <EloChart
            data={player.history.map(e => ({
              label: e.tournamentName,
              value: e.eloAfter,
              sublabel: `#${e.placement} — ${e.tournamentName}`,
            }))}
          />
        </div>
      )}

      {player.history.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">{t('rankings.noHistory')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-3 py-2 text-left font-medium text-secondary-foreground">{t('tournament.name')}</th>
                <th className="px-3 py-2 text-center font-medium text-secondary-foreground">{t('standings.rank')}</th>
                <th className="px-3 py-2 text-center font-medium text-secondary-foreground">{t('elo.before')}</th>
                <th className="px-3 py-2 text-center font-medium text-secondary-foreground">{t('elo.after')}</th>
                <th className="px-3 py-2 text-center font-medium text-secondary-foreground">{t('elo.change')}</th>
              </tr>
            </thead>
            <tbody>
              {[...player.history].reverse().map((entry, i) => {
                const delta = entry.eloAfter - entry.eloBefore
                return (
                  <tr key={i} className="border-b border-muted last:border-0">
                    <td className="px-3 py-2 text-foreground">{entry.tournamentName}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">#{entry.placement}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">{entry.eloBefore}</td>
                    <td className="px-3 py-2 text-center font-semibold text-foreground">{entry.eloAfter}</td>
                    <td className={cn(
                      'px-3 py-2 text-center font-medium',
                      delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-muted-foreground'
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
