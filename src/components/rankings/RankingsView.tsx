import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTournamentContext } from '@/state/TournamentContext'
import { Input } from '@/components/ui/Input'
import { PlayerHistory } from './PlayerHistory'

export function RankingsView() {
  const { t } = useTranslation()
  const { state } = useTournamentContext()
  const [search, setSearch] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const players = Object.values(state.playerDatabase)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.elo - a.elo)

  const selectedPlayer = selectedPlayerId ? state.playerDatabase[selectedPlayerId] : null

  if (selectedPlayer) {
    return <PlayerHistory player={selectedPlayer} onBack={() => setSelectedPlayerId(null)} />
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold text-gray-900">{t('rankings.title')}</h2>

      <div className="mb-4">
        <Input
          id="rankings-search"
          placeholder={t('rankings.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {players.length === 0 ? (
        <p className="text-center text-sm text-gray-400">{t('rankings.noPlayers')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">{t('standings.player')}</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">{t('rankings.elo')}</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">{t('rankings.matches')}</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">{t('rankings.tournaments')}</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, i) => (
                <tr
                  key={player.id}
                  className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  onClick={() => setSelectedPlayerId(player.id)}
                >
                  <td className="px-3 py-2 font-medium text-gray-900">{i + 1}</td>
                  <td className="px-3 py-2 text-gray-900">{player.name}</td>
                  <td className="px-3 py-2 text-center font-semibold text-gray-900">{player.elo}</td>
                  <td className="px-3 py-2 text-center text-gray-500">{player.matchesPlayed}</td>
                  <td className="px-3 py-2 text-center text-gray-500">{player.tournamentsPlayed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
