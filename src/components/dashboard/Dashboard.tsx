import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTournamentContext } from '@/state/TournamentContext'
import { selectAllTournaments } from '@/state/selectors'
import { TournamentCard } from './TournamentCard'
import { CreateTournamentDialog } from './CreateTournamentDialog'
import { Button } from '@/components/ui/Button'

export function Dashboard() {
  const { t } = useTranslation()
  const { state } = useTournamentContext()
  const [showCreate, setShowCreate] = useState(false)
  const [showArchive, setShowArchive] = useState(false)

  const allTournaments = selectAllTournaments(state)
  const active = allTournaments.filter(t => !t.archived)
  const archived = allTournaments.filter(t => t.archived)
  const tournaments = showArchive ? archived : active

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h2>
          <div className="flex rounded-md border border-input overflow-hidden text-sm">
            <button
              onClick={() => setShowArchive(false)}
              className={`px-3 py-1 transition-colors ${!showArchive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
            >
              {t('dashboard.active')}
              {active.length > 0 && (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">{active.length}</span>
              )}
            </button>
            <button
              onClick={() => setShowArchive(true)}
              className={`px-3 py-1 transition-colors ${showArchive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
            >
              {t('dashboard.archive')}
              {archived.length > 0 && (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">{archived.length}</span>
              )}
            </button>
          </div>
        </div>
        {!showArchive && (
          <Button onClick={() => setShowCreate(true)}>{t('nav.newTournament')}</Button>
        )}
      </div>

      {tournaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-input p-12 text-center">
          {showArchive ? (
            <p className="text-lg text-muted-foreground">{t('dashboard.emptyArchive')}</p>
          ) : (
            <>
              <p className="text-lg text-muted-foreground">{t('dashboard.empty')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.createFirst')}</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                {t('nav.newTournament')}
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map(tournament => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>
      )}

      <CreateTournamentDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
