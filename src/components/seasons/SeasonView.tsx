import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTournamentContext } from '@/state/TournamentContext'
import { Season } from '@/types/season'
import { Button } from '@/components/ui/Button'
import { GAME_CONFIG } from '@/lib/gameConfig'
import { CreateSeasonDialog } from './CreateSeasonDialog'
import { SeasonDetail } from './SeasonDetail'

export function SeasonView() {
  const { t } = useTranslation()
  const { state, dispatch } = useTournamentContext()
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const seasons: Season[] = state.seasons ?? []
  const activeSeason = seasons.find(s => s.id === selected) ?? null

  const deleteSeason = (id: string) => {
    dispatch({ type: 'DELETE_SEASON', payload: { seasonId: id } })
    if (selected === id) setSelected(null)
  }

  return (
    <div className="flex h-full gap-0">
      {/* Season list */}
      <aside className="w-56 flex-shrink-0 border-r border-border bg-card flex flex-col">
        <div className="flex items-center justify-between border-b border-border p-3">
          <h2 className="text-sm font-semibold text-foreground">{t('season.title')}</h2>
          <Button size="sm" onClick={() => setCreating(true)}>+</Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {seasons.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">{t('season.noSeasons')}</p>
          ) : (
            seasons.map(season => {
              const gameConfig = GAME_CONFIG[season.game]
              return (
                <button
                  key={season.id}
                  onClick={() => setSelected(season.id)}
                  className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                    selected === season.id
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-secondary-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span>{gameConfig.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{season.name}</span>
                </button>
              )
            })
          )}
        </nav>
      </aside>

      {/* Detail pane */}
      <main className="flex-1 overflow-y-auto p-6">
        {activeSeason ? (
          <SeasonDetail
            key={activeSeason.id}
            season={activeSeason}
            onDelete={() => deleteSeason(activeSeason.id)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="mb-4 text-muted-foreground">{t('season.noSeasons')}</p>
              <Button onClick={() => setCreating(true)}>{t('season.create')}</Button>
            </div>
          </div>
        )}
      </main>

      <CreateSeasonDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
