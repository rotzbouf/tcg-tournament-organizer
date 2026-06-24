import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTournamentContext } from '@/state/TournamentContext'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
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

  const allGamePlayers = Object.values(state.playerDatabase)
    .filter(p => p.game === gameFilter)

  const players = allGamePlayers
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.elo - a.elo)

  const selectedPlayer = selectedPlayerId ? state.playerDatabase[selectedPlayerId] : null

  const avgElo = allGamePlayers.length > 0
    ? Math.round(allGamePlayers.reduce((s, p) => s + p.elo, 0) / allGamePlayers.length)
    : 0
  const mostActive = allGamePlayers.length > 0
    ? allGamePlayers.reduce((best, p) => p.tournamentsPlayed > best.tournamentsPlayed ? p : best, allGamePlayers[0])
    : null

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
      <h2 className="mb-4 text-2xl font-bold text-foreground">{t('rankings.title')}</h2>

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

      {allGamePlayers.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Card className="text-center">
            <p className="text-2xl font-bold text-foreground">{allGamePlayers.length}</p>
            <p className="text-xs text-muted-foreground">{t('stats.totalPlayers')}</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-foreground">{avgElo}</p>
            <p className="text-xs text-muted-foreground">{t('stats.avgElo')}</p>
          </Card>
          <Card className="text-center">
            <p className="text-lg font-bold text-foreground truncate">{mostActive?.name}</p>
            <p className="text-xs text-muted-foreground">{t('stats.mostActive')} ({mostActive?.tournamentsPlayed})</p>
          </Card>
        </div>
      )}

      {players.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">{t('rankings.noPlayers')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-3 py-2 text-left font-medium text-secondary-foreground">#</th>
                <th className="px-3 py-2 text-left font-medium text-secondary-foreground">{t('standings.player')}</th>
                <th className="px-3 py-2 text-left font-medium text-secondary-foreground">{t('rankings.playerId')}</th>
                <th className="px-3 py-2 text-center font-medium text-secondary-foreground">{t('rankings.elo')}</th>
                <th className="px-3 py-2 text-center font-medium text-secondary-foreground">{t('rankings.matches')}</th>
                <th className="px-3 py-2 text-center font-medium text-secondary-foreground">{t('rankings.tournaments')}</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, i) => (
                <tr
                  key={player.id}
                  className="cursor-pointer border-b border-muted last:border-0 hover:bg-background"
                  onClick={() => setSelectedPlayerId(player.id)}
                >
                  <td className="px-3 py-2 font-medium text-foreground">{i + 1}</td>
                  <td className="px-3 py-2 text-foreground">{player.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{player.playerId || '–'}</td>
                  <td className="px-3 py-2 text-center font-semibold text-foreground">{player.elo}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{player.matchesPlayed}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{player.tournamentsPlayed}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      className="text-muted-foreground hover:text-red-500"
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
