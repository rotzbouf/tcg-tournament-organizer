import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTournamentContext } from '@/state/TournamentContext'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { GameType } from '@/types/tournament'
import { GAME_CONFIG } from '@/lib/gameConfig'
import { PlayerHistory } from './PlayerHistory'

const GAME_OPTIONS: GameType[] = ['yugioh', 'pokemon', 'star_wars_unlimited', 'riftbound', 'lorcana', 'altered', 'mtg']

export function RankingsView() {
  const { t } = useTranslation()
  const { state, dispatch } = useTournamentContext()
  const [search, setSearch] = useState('')
  const [gameFilter, setGameFilter] = useState<GameType>('yugioh')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState<'full' | 'points' | null>(null)
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null)

  const players = Object.values(state.playerDatabase)
    .filter(p => p.game === gameFilter)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.elo - a.elo)

  const selectedPlayer = selectedPlayerId ? state.playerDatabase[selectedPlayerId] : null

  const gameOptions = GAME_OPTIONS.map(g => ({
    value: g,
    label: GAME_CONFIG[g].name,
  }))

  const handleReset = () => {
    if (showResetConfirm === 'full') {
      dispatch({ type: 'RESET_PLAYER_DATABASE', payload: { game: gameFilter } })
    } else if (showResetConfirm === 'points') {
      dispatch({ type: 'RESET_PLAYER_DATABASE', payload: { game: gameFilter, keepNames: true } })
    }
    setShowResetConfirm(null)
  }

  if (selectedPlayer) {
    return <PlayerHistory player={selectedPlayer} onBack={() => setSelectedPlayerId(null)} />
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold text-gray-900">{t('rankings.title')}</h2>

      <div className="mb-4 flex gap-2">
        <div className="flex-1">
          <Select
            id="rankings-game"
            options={gameOptions}
            value={gameFilter}
            onChange={e => setGameFilter(e.target.value as GameType)}
          />
        </div>
        <Input
          id="rankings-search"
          placeholder={t('rankings.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1"
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
                <th className="px-3 py-2 text-left font-medium text-gray-600">{t('rankings.playerId')}</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">{t('rankings.elo')}</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">{t('rankings.matches')}</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">{t('rankings.tournaments')}</th>
                <th className="w-10 px-3 py-2"></th>
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
                  <td className="px-3 py-2 text-gray-400">{player.playerId || '–'}</td>
                  <td className="px-3 py-2 text-center font-semibold text-gray-900">{player.elo}</td>
                  <td className="px-3 py-2 text-center text-gray-500">{player.matchesPlayed}</td>
                  <td className="px-3 py-2 text-center text-gray-500">{player.tournamentsPlayed}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      className="text-gray-300 hover:text-red-500"
                      onClick={e => { e.stopPropagation(); setDeletePlayerId(player.id) }}
                      title={t('players.remove')}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => setShowResetConfirm('points')}>
          {t('rankings.resetPoints')}
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setShowResetConfirm('full')}>
          {t('rankings.resetFull')}
        </Button>
      </div>

      <ConfirmDialog
        open={showResetConfirm !== null}
        onClose={() => setShowResetConfirm(null)}
        onConfirm={handleReset}
        title={showResetConfirm === 'full' ? t('rankings.resetFull') : t('rankings.resetPoints')}
        message={showResetConfirm === 'full' ? t('rankings.resetFullMessage') : t('rankings.resetPointsMessage')}
      />

      <ConfirmDialog
        open={deletePlayerId !== null}
        onClose={() => setDeletePlayerId(null)}
        onConfirm={() => {
          if (deletePlayerId) dispatch({ type: 'DELETE_DATABASE_PLAYER', payload: { databasePlayerId: deletePlayerId } })
          setDeletePlayerId(null)
        }}
        title={t('rankings.deletePlayer')}
        message={t('rankings.deletePlayerMessage', { name: deletePlayerId ? state.playerDatabase[deletePlayerId]?.name : '' })}
      />
    </div>
  )
}
