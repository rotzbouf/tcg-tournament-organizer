import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Player } from '@/types/player'
import { DecklistVisibility } from '@/types/tournament'
import { formatDecklistText, getDecklistStats } from '@/lib/decklistParser'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { useTournamentContext } from '@/state/TournamentContext'

interface DecklistOverviewProps {
  tournamentId: string
  players: Player[]
  visibility: DecklistVisibility
}

export function DecklistOverview({ tournamentId, players, visibility }: DecklistOverviewProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)

  const playersWithDecklist = players.filter(p => p.decklist && p.decklist.length > 0)
  const playersWithoutDecklist = players.filter(p => !p.decklist || p.decklist.length === 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {t('decklist.submitted', { count: playersWithDecklist.length, total: players.length })}
        </p>
        <Select
          value={visibility}
          onChange={e => dispatch({
            type: 'UPDATE_TOURNAMENT',
            payload: { tournamentId, decklistVisibility: e.target.value as DecklistVisibility },
          })}
          options={[
            { value: 'hidden', label: t('decklist.visibility.hidden') },
            { value: 'to_only', label: t('decklist.visibility.toOnly') },
            { value: 'public', label: t('decklist.visibility.public') },
          ]}
          className="w-48"
        />
      </div>

      {playersWithDecklist.length === 0 ? (
        <p className="py-8 text-center text-gray-400">{t('decklist.noDecklists')}</p>
      ) : (
        <div className="space-y-2">
          {playersWithDecklist.map(player => {
            const stats = getDecklistStats(player.decklist!)
            const isExpanded = expandedPlayer === player.id
            return (
              <Card key={player.id} className="cursor-pointer" onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{player.name}</span>
                    {player.deckName && <span className="text-sm text-gray-500">{player.deckName}</span>}
                  </div>
                  <span className="text-xs text-gray-400">
                    {stats.totalCards} {t('decklist.totalCards').toLowerCase()} — {stats.uniqueCards} {t('decklist.uniqueCards').toLowerCase()}
                  </span>
                </div>
                {isExpanded && (
                  <pre className="mt-3 max-h-64 overflow-auto rounded bg-gray-50 p-3 font-mono text-xs text-gray-700">
                    {formatDecklistText(player.decklist!)}
                  </pre>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {playersWithoutDecklist.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-gray-400">{t('decklist.missing')}</p>
          <div className="flex flex-wrap gap-2">
            {playersWithoutDecklist.map(player => (
              <span key={player.id} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500">
                {player.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
