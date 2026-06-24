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
  const tournaments = selectAllTournaments(state)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h2>
        <Button onClick={() => setShowCreate(true)}>{t('nav.newTournament')}</Button>
      </div>

      {tournaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-input p-12 text-center">
          <p className="text-lg text-muted-foreground">{t('dashboard.empty')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.createFirst')}</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            {t('nav.newTournament')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map(t => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      )}

      <CreateTournamentDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
