import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TimerDisplay } from '@/components/tournament/TimerDisplay'
import { Tournament } from '@/types/tournament'
import { GAME_CONFIG } from '@/lib/gameConfig'

interface TournamentCardProps {
  tournament: Tournament
}

const statusBadgeVariant = {
  registration: 'info' as const,
  in_progress: 'warning' as const,
  completed: 'success' as const,
}

export function TournamentCard({ tournament }: TournamentCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const gameConfig = GAME_CONFIG[tournament.game]

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => navigate(`/tournament/${tournament.id}`)}
      style={{ borderLeftColor: gameConfig.color, borderLeftWidth: 4 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{gameConfig.icon}</span>
            <h3 className="font-semibold text-gray-900">{tournament.name}</h3>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">{gameConfig.name}</p>
        </div>
        <Badge variant={statusBadgeVariant[tournament.status]}>
          {t(`tournament.status.${tournament.status}`)}
        </Badge>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <span>{t('dashboard.players')}: {tournament.players.length}</span>
          {tournament.status !== 'registration' && (
            <span>
              {t('dashboard.round')} {tournament.currentRound} {t('dashboard.of')} {tournament.totalRounds}
            </span>
          )}
        </div>
        {tournament.status === 'in_progress' && (
          <TimerDisplay
            tournamentId={tournament.id}
            durationMinutes={tournament.roundTimeMinutes}
            compact
          />
        )}
      </div>
    </Card>
  )
}
