import { useTranslation } from 'react-i18next'
import { useTournamentContext } from '@/state/TournamentContext'
import { Tournament } from '@/types/tournament'
import { calculateEloChanges } from '@/engine/elo'
import { cn } from '@/lib/utils'

interface EloChangesPanelProps {
  tournament: Tournament
}

export function EloChangesPanel({ tournament }: EloChangesPanelProps) {
  const { t } = useTranslation()
  const { state } = useTournamentContext()

  const playerNameMap: Record<string, string> = {}
  tournament.players.forEach(p => { playerNameMap[p.id] = p.name })

  const updates = calculateEloChanges(
    tournament.players.map(p => p.id),
    tournament.rounds,
    state.playerDatabase,
    playerNameMap,
    tournament.game
  ).sort((a, b) => b.eloAfter - a.eloAfter)

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-3 py-2 text-left font-medium text-gray-600">{t('standings.player')}</th>
            <th className="px-3 py-2 text-center font-medium text-gray-600">{t('elo.before')}</th>
            <th className="px-3 py-2 text-center font-medium text-gray-600">{t('elo.after')}</th>
            <th className="px-3 py-2 text-center font-medium text-gray-600">{t('elo.change')}</th>
          </tr>
        </thead>
        <tbody>
          {updates.map(update => (
            <tr key={update.playerId} className="border-b border-gray-100 last:border-0">
              <td className="px-3 py-2 text-gray-900">{playerNameMap[update.playerId]}</td>
              <td className="px-3 py-2 text-center text-gray-500">{update.eloBefore}</td>
              <td className="px-3 py-2 text-center font-semibold text-gray-900">{update.eloAfter}</td>
              <td className={cn(
                'px-3 py-2 text-center font-medium',
                update.delta > 0 ? 'text-green-600' : update.delta < 0 ? 'text-red-600' : 'text-gray-400'
              )}>
                {update.delta > 0 ? '+' : ''}{update.delta}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
