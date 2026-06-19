import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useTournamentContext } from '@/state/TournamentContext'
import { selectAllTournaments } from '@/state/selectors'
import { useFileIO } from '@/hooks/useFileIO'
import { GAME_CONFIG } from '@/lib/gameConfig'
import { Button } from '@/components/ui/Button'

export function Sidebar() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { state } = useTournamentContext()
  const tournaments = selectAllTournaments(state)
  const { exportState, importState, error, clearError } = useFileIO()

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'de' ? 'en' : 'de')
  }

  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <h1 className="text-lg font-bold text-gray-900">{t('app.title')}</h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <Link
          to="/"
          className={cn(
            'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            location.pathname === '/'
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          )}
        >
          {t('nav.dashboard')}
        </Link>

        {tournaments.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {t('dashboard.title')}
            </p>
            {tournaments.map(tournament => {
              const gameConfig = GAME_CONFIG[tournament.game]
              const isActive = location.pathname === `/tournament/${tournament.id}`
              return (
                <Link
                  key={tournament.id}
                  to={`/tournament/${tournament.id}`}
                  className={cn(
                    'mt-0.5 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-gray-100 font-medium text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <span>{gameConfig.icon}</span>
                  <span className="truncate">{tournament.name}</span>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      <div className="border-t border-gray-200 p-3 space-y-2">
        {error && (
          <div className="rounded-lg bg-red-50 p-2 text-xs text-red-600">
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
        <button
          onClick={toggleLanguage}
          className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          {t('nav.language')}: {i18n.language.toUpperCase()}
        </button>
      </div>
    </aside>
  )
}
