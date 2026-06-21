import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTournamentContext } from '@/state/TournamentContext'
import { selectTournament, selectCurrentRound, selectStandings } from '@/state/selectors'
import { GAME_CONFIG } from '@/lib/gameConfig'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PlayerList } from './PlayerList'
import { RoundPanel } from './RoundPanel'
import { StandingsTable } from './StandingsTable'
import { RoundHistory } from './RoundHistory'
import { TimerDisplay } from './TimerDisplay'
import { cn } from '@/lib/utils'

type Tab = 'players' | 'round' | 'standings' | 'history'

const statusBadgeVariant = {
  registration: 'info' as const,
  in_progress: 'warning' as const,
  top_cut: 'warning' as const,
  completed: 'success' as const,
}

export function TournamentView() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { state, dispatch } = useTournamentContext()
  const tournament = id ? selectTournament(state, id) : undefined

  const [activeTab, setActiveTab] = useState<Tab>('players')

  if (!tournament) {
    return (
      <div className="text-center text-gray-500">
        <p>Tournament not found</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/')}>
          {t('nav.dashboard')}
        </Button>
      </div>
    )
  }

  const gameConfig = GAME_CONFIG[tournament.game]
  const currentRound = selectCurrentRound(tournament)
  const standings = selectStandings(tournament)

  const topCutRounds = tournament.rounds.filter(r => r.phase === 'top_cut')
  const isInSwiss = tournament.status === 'in_progress'
  const isInTopCut = tournament.status === 'top_cut'
  const swissComplete = isInSwiss && tournament.currentRound >= tournament.totalRounds && currentRound?.isComplete === true
  const hasTopCut = tournament.topCut > 0

  const isLastSwissRound = isInSwiss && tournament.currentRound >= tournament.totalRounds
  const canGenerateSwiss = isInSwiss && currentRound?.isComplete === true && !isLastSwissRound

  const isLastTopCutRound = isInTopCut && topCutRounds.length > 0 &&
    topCutRounds[topCutRounds.length - 1]?.matches.length === 1
  const canGenerateTopCut = isInTopCut && currentRound?.isComplete === true && !isLastTopCutRound

  const canGenerate = canGenerateSwiss || canGenerateTopCut
  const isLastRound = isInTopCut ? isLastTopCutRound : (isLastSwissRound && !hasTopCut)

  const handleStart = () => {
    dispatch({ type: 'START_TOURNAMENT', payload: { tournamentId: tournament.id } })
    setActiveTab('round')
  }

  const handleDelete = () => {
    dispatch({ type: 'DELETE_TOURNAMENT', payload: { tournamentId: tournament.id } })
    navigate('/')
  }

  const handleStartTopCut = () => {
    dispatch({ type: 'START_TOP_CUT', payload: { tournamentId: tournament.id } })
    setActiveTab('round')
  }

  const roundLabel = isInTopCut
    ? `${t('tournament.topCutLabel')} — ${t('tournament.topCutRound', { current: topCutRounds.length, total: Math.log2(tournament.topCut) })}`
    : `${t('dashboard.round')} ${tournament.currentRound}/${tournament.totalRounds}`

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'players', label: t('players.title'), show: true },
    { key: 'round', label: t('rounds.title'), show: tournament.status !== 'registration' },
    { key: 'standings', label: t('standings.title'), show: tournament.status !== 'registration' },
    { key: 'history', label: t('rounds.history'), show: tournament.rounds.some(r => r.isComplete) },
  ]

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{gameConfig.icon}</span>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{tournament.name}</h2>
              <p className="text-sm text-gray-500">{gameConfig.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={statusBadgeVariant[tournament.status]}>
              {t(`tournament.status.${tournament.status}`)}
            </Badge>
            {tournament.status !== 'registration' && (
              <Badge variant="default">
                {roundLabel}
              </Badge>
            )}
          </div>
        </div>
        {(tournament.status === 'in_progress' || tournament.status === 'top_cut') && (
          <div className="mt-3">
            <TimerDisplay
              tournamentId={tournament.id}
              durationMinutes={tournament.roundTimeMinutes}
            />
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          {tournament.status === 'registration' && (
            <>
              <Button
                onClick={handleStart}
                disabled={tournament.players.length < 2}
              >
                {t('tournament.start')}
              </Button>
              {tournament.players.length < 2 && (
                <span className="text-sm text-amber-600">{t('tournament.minPlayers')}</span>
              )}
            </>
          )}
          {swissComplete && hasTopCut && (
            <Button onClick={handleStartTopCut}>
              {t('tournament.startTopCut')}
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            {t('tournament.delete')}
          </Button>
        </div>
      </div>

      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {tabs
          .filter(tab => tab.show)
          .map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
      </div>

      <div className="mt-4">
        {activeTab === 'players' && (
          <PlayerList
            tournamentId={tournament.id}
            players={tournament.players}
            editable={tournament.status === 'registration'}
            inProgress={tournament.status === 'in_progress' || tournament.status === 'top_cut'}
          />
        )}
        {activeTab === 'round' && currentRound && (
          <RoundPanel
            round={currentRound}
            players={tournament.players}
            tournamentId={tournament.id}
            canGenerate={canGenerate}
            isLastRound={isLastRound}
            isTopCut={isInTopCut}
          />
        )}
        {activeTab === 'standings' && <StandingsTable standings={standings} />}
        {activeTab === 'history' && (
          <RoundHistory
            rounds={tournament.rounds}
            players={tournament.players}
            tournamentId={tournament.id}
          />
        )}
      </div>
    </div>
  )
}
