import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Match } from '@/types/round'
import { Player } from '@/types/player'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useTournamentContext } from '@/state/useTournamentContext'
import { useTimerManager } from '@/hooks/useTimerManager'
import { cn, formatTime } from '@/lib/utils'

interface PodCardProps {
  match: Match
  players: Player[]
  tournamentId: string
  readonly?: boolean
  hideDrawOption?: boolean
}

// Multiplayer pod table: 3–5 players, seat order = turn order. The result is
// one winner (or a pod draw), picked by tapping the player.
export function PodCard({ match, players, tournamentId, readonly, hideDrawOption }: PodCardProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()
  const { timers } = useTimerManager()

  const timer = timers[tournamentId]
  const extraMinutes = match.extraTimeMinutes ?? 0
  const extensionDeadline = timer?.expiredAt && extraMinutes > 0 ? timer.expiredAt + extraMinutes * 60000 : null
  const showCountdown = extensionDeadline !== null && match.result === 'pending' && !readonly
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!showCountdown) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [showCountdown])

  const participantIds = match.participantIds ?? []
  const playerById = new Map(players.map(p => [p.id, p]))
  const winner = match.podWinnerId ? playerById.get(match.podWinnerId) : null
  const decided = match.result !== 'pending'

  const submitWinner = (winnerId: string | null) => {
    dispatch({ type: 'SUBMIT_POD_RESULT', payload: { tournamentId, matchId: match.id, winnerId } })
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {match.tableNumber > 0 && (
              <span className="text-xs font-semibold text-muted-foreground">{t('match.table', { number: match.tableNumber })}</span>
            )}
            <Badge variant="info">{t('pod.title')} · {t('pod.playerCount', { count: participantIds.length })}</Badge>
            <span className="text-xs text-muted-foreground" title={t('pod.turnOrderHint')}>↻</span>
          </div>
          <ul className="mt-2 space-y-1">
            {participantIds.map((id, i) => {
              const player = playerById.get(id)
              const isWinner = decided && match.podWinnerId === id
              return (
                <li key={id} className="flex items-center gap-2">
                  <span className="w-5 text-center text-xs text-muted-foreground" title={t('pod.seat', { number: i + 1 })}>{i + 1}.</span>
                  <span className={cn('font-medium', isWinner ? 'text-green-700' : 'text-foreground', player?.droppedInRound !== null && player?.droppedInRound !== undefined && 'line-through opacity-60')}>
                    {player?.name ?? '?'}
                  </span>
                  {isWinner && <span aria-hidden>🏆</span>}
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex items-center">
          {extraMinutes > 0 && (
            showCountdown ? (
              <Badge
                variant="warning"
                className={cn('mr-2 font-mono tabular-nums', extensionDeadline !== null && extensionDeadline - now <= 0 && 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 animate-pulse')}
              >
                ⏱ {formatTime(Math.max(0, Math.ceil(((extensionDeadline ?? 0) - now) / 1000)))}
              </Badge>
            ) : (
              <Badge variant="info" className="mr-2">⏱ +{extraMinutes} min</Badge>
            )
          )}
          {match.result === 'pending' && <Badge variant="default">{t('match.pending')}</Badge>}
          {match.result === 'draw' && <Badge variant="warning">{t('match.draw')}</Badge>}
          {decided && match.result !== 'draw' && (
            <Badge variant="success">{t('pod.winner', { name: winner?.name ?? '?' })}</Badge>
          )}
          {decided && match.resultEnteredBy && (
            <span
              className="ml-2 text-xs text-muted-foreground whitespace-nowrap"
              title={t('match.enteredBy', { name: match.resultEnteredBy })}
            >
              ⚖ {match.resultEnteredBy}
            </span>
          )}
        </div>
      </div>

      {!readonly && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('pod.selectWinner')}</span>
            {participantIds.map(id => (
              <Button
                key={id}
                size="sm"
                variant={decided && match.podWinnerId === id ? 'primary' : 'secondary'}
                onClick={() => submitWinner(id)}
              >
                {playerById.get(id)?.name ?? '?'}
              </Button>
            ))}
            {!hideDrawOption && (
              <Button
                size="sm"
                variant={match.result === 'draw' ? 'primary' : 'secondary'}
                onClick={() => submitWinner(null)}
              >
                {t('match.draw')}
              </Button>
            )}
          </div>
          {timer && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-1">⏱ {t('match.extraTime')}:</span>
              {[1, 3, 5].map(m => (
                <Button
                  key={m}
                  size="sm"
                  variant="ghost"
                  className="px-2 py-0.5 text-xs"
                  onClick={() => dispatch({ type: 'ADD_MATCH_EXTRA_TIME', payload: { tournamentId, matchId: match.id, minutes: m } })}
                >
                  +{m}
                </Button>
              ))}
              {extraMinutes > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-2 py-0.5 text-xs text-red-600"
                  title={t('match.extraTimeClear')}
                  onClick={() => dispatch({ type: 'ADD_MATCH_EXTRA_TIME', payload: { tournamentId, matchId: match.id, minutes: -extraMinutes } })}
                >
                  ✕
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
