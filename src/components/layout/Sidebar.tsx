import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useTournamentContext } from '@/state/TournamentContext'
import { selectAllTournaments } from '@/state/selectors'
import { useFileIO } from '@/hooks/useFileIO'
import { useTheme } from '@/hooks/useTheme'
import { GAME_CONFIG } from '@/lib/gameConfig'
import { Button } from '@/components/ui/Button'
import { TimerDisplay } from '@/components/tournament/TimerDisplay'

export function Sidebar() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { state } = useTournamentContext()
  const tournaments = selectAllTournaments(state)
  const { exportState, importState, error, clearError } = useFileIO()

  const { theme, cycleTheme } = useTheme()
  const themeLabel = theme === 'light' ? '☀' : theme === 'dark' ? '☾' : '◐'

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'de' ? 'en' : 'de')
  }

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-4">
        <h1 className="text-lg font-bold text-foreground">{t('app.title')}</h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <Link
          to="/"
          className={cn(
            'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            location.pathname === '/'
              ? 'bg-muted text-foreground'
              : 'text-secondary-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {t('nav.dashboard')}
        </Link>

        <Link
          to="/rankings"
          className={cn(
            'mt-1 flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            location.pathname === '/rankings'
              ? 'bg-muted text-foreground'
              : 'text-secondary-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {t('rankings.title')}
        </Link>

        {tournaments.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('dashboard.title')}
            </p>
            {tournaments.map(tournament => {
              const gameConfig = GAME_CONFIG[tournament.game]
              const isActive = location.pathname === `/tournament/${tournament.id}`
              const isRunning = tournament.status === 'in_progress' || tournament.status === 'top_cut'
              return (
                <Link
                  key={tournament.id}
                  to={`/tournament/${tournament.id}`}
                  className={cn(
                    'mt-0.5 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-secondary-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span>{gameConfig.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{tournament.name}</span>
                  {isRunning && (
                    <TimerDisplay
                      tournamentId={tournament.id}
                      durationMinutes={tournament.roundTimeMinutes}
                      compact
                    />
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      <div className="border-t border-border p-3 space-y-2">
        {error && (
          <div className="rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
            <button onClick={clearError} className="ml-2 underline">x</button>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={exportState}>
            {t('nav.export')}
          </Button>
          <Button variant="secondary" size="sm" className="flex-1" onClick={importState}>
            {t('nav.import')}
          </Button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleLanguage}
            className="flex flex-1 items-center rounded-lg px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t('nav.language')}: {i18n.language.toUpperCase()}
          </button>
          <button
            onClick={cycleTheme}
            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={theme}
          >
            {themeLabel}
          </button>
        </div>
      </div>
    </aside>
  )
}
