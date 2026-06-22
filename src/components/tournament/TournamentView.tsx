import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTournamentContext } from '@/state/TournamentContext'
import { selectTournament, selectCurrentRound, selectStandings, selectDivisionStandings } from '@/state/selectors'
import { GAME_CONFIG } from '@/lib/gameConfig'
import { DIVISION_LABELS, DIVISION_ORDER } from '@/lib/ageDivision'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EditTournamentDialog } from './EditTournamentDialog'
import { PhaseIndicator } from './PhaseIndicator'
import { PenaltyDialog } from './PenaltyDialog'
import { PenaltyList } from './PenaltyList'
import { PlayerList } from './PlayerList'
import { RoundPanel } from './RoundPanel'
import { StandingsTable } from './StandingsTable'
import { RoundHistory } from './RoundHistory'
import { TimerDisplay } from './TimerDisplay'
import { EloChangesPanel } from './EloChangesPanel'
import { DiscordSettings } from './DiscordSettings'
import { ServerPanel } from './ServerPanel'
import { cn } from '@/lib/utils'

type Tab = 'players' | 'round' | 'standings' | 'history' | 'penalties' | 'elo' | 'discord' | 'server'

const statusBadgeVariant = {
  registration: 'info' as const,
  in_progress: 'warning' as const,
  top_cut: 'warning' as const,
  completed: 'success' as const,
}

export function TournamentView() {
  const { id } = useParams<{ id: string }>()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { state, dispatch, undo, canUndo } = useTournamentContext()
  const tournament = id ? selectTournament(state, id) : undefined

  const [activeTab, setActiveTab] = useState<Tab>('players')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showPenaltyDialog, setShowPenaltyDialog] = useState(false)
  const [standingsView, setStandingsView] = useState<'divisions' | 'global'>('divisions')

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
  const hasTopCut = tournament.format === 'swiss_topcut' && tournament.topCut > 0
  const isDoubleElim = tournament.format === 'double_elimination'
  const isRoundRobin = tournament.format === 'round_robin'
  const isElimFormat = isInTopCut || isDoubleElim

  const swissComplete = isInSwiss && !isDoubleElim && !isRoundRobin &&
    tournament.currentRound >= tournament.totalRounds && currentRound?.isComplete === true

  const isGrandFinalComplete = currentRound?.phase === 'grand_final' && currentRound?.isComplete
  const isLastSwissRound = isInSwiss && !isDoubleElim && !isRoundRobin &&
    tournament.currentRound >= tournament.totalRounds
  const isLastTopCutRound = isInTopCut && topCutRounds.length > 0 &&
    topCutRounds[topCutRounds.length - 1]?.matches.length === 1
  const isLastRoundRobin = isRoundRobin && tournament.currentRound >= tournament.totalRounds

  const canGenerate = currentRound?.isComplete === true && !isGrandFinalComplete &&
    !(isLastSwissRound && !hasTopCut) && !isLastTopCutRound && !isLastRoundRobin

  const isLastRound = isInTopCut ? isLastTopCutRound :
    isGrandFinalComplete ? true :
    isLastRoundRobin ? true :
    (isLastSwissRound && !hasTopCut)

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

  const hasMultiPhase = tournament.phases.length > 0
  const hasNextPhase = hasMultiPhase && tournament.currentPhaseIndex < tournament.phases.length - 1
  const canAdvancePhase = hasNextPhase && isLastRound && currentRound?.isComplete === true

  const currentPhaseLabel = currentRound?.phase === 'winners_bracket' ? t('tournament.winnersBracket') :
    currentRound?.phase === 'losers_bracket' ? t('tournament.losersBracket') :
    currentRound?.phase === 'grand_final' ? t('tournament.grandFinal') : null

  const roundLabel = isInTopCut
    ? `${t('tournament.topCutLabel')} — ${t('tournament.topCutRound', { current: topCutRounds.length, total: Math.log2(tournament.topCut) })}`
    : currentPhaseLabel
      ? `${currentPhaseLabel} — ${t('dashboard.round')} ${tournament.currentRound}`
      : `${t('dashboard.round')} ${tournament.currentRound}/${tournament.totalRounds}`

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'players', label: t('players.title'), show: true },
    { key: 'round', label: t('rounds.title'), show: tournament.status !== 'registration' },
    { key: 'standings', label: t('standings.title'), show: tournament.status !== 'registration' },
    { key: 'history', label: t('rounds.history'), show: tournament.rounds.some(r => r.isComplete) },
    { key: 'penalties', label: `${t('penalties.title')}${tournament.penalties.length > 0 ? ` (${tournament.penalties.length})` : ''}`, show: tournament.status !== 'registration' },
    { key: 'elo', label: t('elo.title'), show: tournament.status === 'completed' },
    { key: 'discord', label: `Discord${tournament.discordWebhookUrl ? ' ✓' : ''}`, show: true },
    { key: 'server', label: t('server.title'), show: true },
  ]

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{gameConfig.icon}</span>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{tournament.name}</h2>
              <p className="text-sm text-gray-500">
                {gameConfig.name} — {t(`tournament.formatOptions.${tournament.format}`)}
                {tournament.format === 'swiss_topcut' && tournament.topCut > 0 && ` (Top ${tournament.topCut})`}
                {tournament.ageDivisionsEnabled && ` — ${t('tournament.ageDivisions')}`}
              </p>
              {hasMultiPhase && (
                <PhaseIndicator phases={tournament.phases} currentPhaseIndex={tournament.currentPhaseIndex} />
              )}
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
              <Button variant="secondary" size="sm" onClick={() => setShowEditDialog(true)}>
                {t('tournament.edit')}
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
          {canAdvancePhase && (
            <Button onClick={() => { dispatch({ type: 'ADVANCE_PHASE', payload: { tournamentId: tournament.id } }); setActiveTab('round') }}>
              {t('phase.advance')}
            </Button>
          )}
          {(tournament.status === 'in_progress' || tournament.status === 'top_cut') && (
            <Button variant="secondary" size="sm" onClick={() => setShowPenaltyDialog(true)}>
              {t('penalties.issue')}
            </Button>
          )}
          {tournament.status === 'completed' && (
            <Button variant="secondary" size="sm" onClick={() => { dispatch({ type: 'UPDATE_ELO_RATINGS', payload: { tournamentId: tournament.id } }); setActiveTab('elo') }}>
              {t('elo.update')}
            </Button>
          )}
          {canUndo && (
            <Button variant="secondary" size="sm" onClick={undo}>
              {t('common.undo')}
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            {t('tournament.delete')}
          </Button>
        </div>
      </div>

      <PenaltyDialog
        open={showPenaltyDialog}
        onClose={() => setShowPenaltyDialog(false)}
        tournamentId={tournament.id}
        players={tournament.players}
      />

      {showEditDialog && (
        <EditTournamentDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          tournament={tournament}
        />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('confirm.deleteTournament')}
        message={t('confirm.deleteTournamentMessage')}
      />

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
            game={tournament.game}
            ageDivisionsEnabled={tournament.ageDivisionsEnabled}
            createdAt={tournament.createdAt}
          />
        )}
        {activeTab === 'round' && currentRound && (
          <RoundPanel
            round={currentRound}
            players={tournament.players}
            tournamentId={tournament.id}
            canGenerate={canGenerate}
            isLastRound={isLastRound}
            isTopCut={isElimFormat}
          />
        )}
        {activeTab === 'standings' && (
          <>
            {tournament.ageDivisionsEnabled && (
              <div className="mb-4 flex gap-2">
                <Button
                  variant={standingsView === 'divisions' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setStandingsView('divisions')}
                >
                  {t('standings.byDivision')}
                </Button>
                <Button
                  variant={standingsView === 'global' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setStandingsView('global')}
                >
                  {t('standings.global')}
                </Button>
              </div>
            )}
            {tournament.ageDivisionsEnabled && standingsView === 'divisions' ? (
              <div className="space-y-6">
                {DIVISION_ORDER.map(div => {
                  const divStandings = selectDivisionStandings(tournament, div)
                  if (divStandings.length === 0) return null
                  return (
                    <div key={div}>
                      <h3 className="mb-2 text-lg font-bold text-gray-800">{DIVISION_LABELS[div][i18n.language === 'de' ? 'de' : 'en']}</h3>
                      <StandingsTable standings={divStandings} game={tournament.game} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <StandingsTable standings={standings} game={tournament.game} />
            )}
          </>
        )}
        {activeTab === 'history' && (
          <RoundHistory
            rounds={tournament.rounds}
            players={tournament.players}
            tournamentId={tournament.id}
          />
        )}
        {activeTab === 'elo' && (
          <EloChangesPanel tournament={tournament} />
        )}
        {activeTab === 'server' && <ServerPanel tournamentId={tournament.id} tournamentName={tournament.name} />}
        {activeTab === 'discord' && (
          <DiscordSettings
            tournamentId={tournament.id}
            webhookUrl={tournament.discordWebhookUrl}
          />
        )}
        {activeTab === 'penalties' && (
          <PenaltyList
            tournamentId={tournament.id}
            penalties={tournament.penalties}
            players={tournament.players}
          />
        )}
      </div>
    </div>
  )
}
