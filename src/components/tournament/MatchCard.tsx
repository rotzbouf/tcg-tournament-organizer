import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Match, MatchResult } from '@/types/round'
import { Player } from '@/types/player'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useTournamentContext } from '@/state/useTournamentContext'
import { useTimerManager } from '@/hooks/useTimerManager'
import { cn, formatTime } from '@/lib/utils'

interface MatchCardProps {
  match: Match
  players: Player[]
  tournamentId: string
  readonly?: boolean
  hideDrawOption?: boolean
  showGameScores?: boolean
  selectedPlayerId?: string | null
  onPlayerClick?: (matchId: string, playerId: string) => void
}

export function MatchCard({ match, players, tournamentId, readonly, hideDrawOption, showGameScores = true, selectedPlayerId, onPlayerClick }: MatchCardProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()
  const { timers } = useTimerManager()
  const [p1Games, setP1Games] = useState<string>(match.player1Games?.toString() ?? '')
  const [p2Games, setP2Games] = useState<string>(match.player2Games?.toString() ?? '')

  const timer = timers[tournamentId]
  const extraMinutes = match.extraTimeMinutes ?? 0
  // After the round timer expires, a table with a time extension keeps its own
  // countdown, anchored at the moment the round clock hit zero.
  const extensionDeadline = timer?.expiredAt && extraMinutes > 0 ? timer.expiredAt + extraMinutes * 60000 : null
  const showCountdown = extensionDeadline !== null && match.result === 'pending' && !readonly
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!showCountdown) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [showCountdown])

  const player1 = players.find(p => p.id === match.player1Id)
  const player2 = match.player2Id ? players.find(p => p.id === match.player2Id) : null

  if (match.isBye) {
    return (
      <Card className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{player1?.name}</span>
          <Badge variant="info">{t('rounds.bye')}</Badge>
        </div>
        <Badge variant="success">3 {t('standings.points').toLowerCase()}</Badge>
      </Card>
    )
  }

  const submitResult = (result: MatchResult) => {
    const payload: { tournamentId: string; matchId: string; result: MatchResult; player1Games?: number; player2Games?: number } = {
      tournamentId, matchId: match.id, result,
    }
    if (p1Games !== '' && p2Games !== '') {
      payload.player1Games = parseInt(p1Games, 10)
      payload.player2Games = parseInt(p2Games, 10)
    }
    dispatch({ type: 'SUBMIT_MATCH_RESULT', payload })
  }

  const hasGameScores = match.player1Games !== undefined && match.player2Games !== undefined

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {match.tableNumber > 0 && (
              <span className="text-xs font-semibold text-muted-foreground">{t('match.table', { number: match.tableNumber })}</span>
            )}
            <span
              className={cn(
                'font-medium',
                match.result === 'player1_win' ? 'text-green-700' : 'text-foreground',
                onPlayerClick && 'cursor-pointer rounded px-1 -mx-1 hover:bg-muted',
                selectedPlayerId === match.player1Id && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30'
              )}
              onClick={onPlayerClick ? (e) => { e.stopPropagation(); onPlayerClick(match.id, match.player1Id) } : undefined}
            >
              {player1?.name}
            </span>
            {showGameScores && hasGameScores && (
              <span className="text-xs font-semibold text-muted-foreground">{match.player1Games}-{match.player2Games}</span>
            )}
            <span className="text-sm text-muted-foreground">{t('match.vs')}</span>
            <span
              className={cn(
                'font-medium',
                match.result === 'player2_win' ? 'text-green-700' : 'text-foreground',
                onPlayerClick && match.player2Id && 'cursor-pointer rounded px-1 -mx-1 hover:bg-muted',
                selectedPlayerId === match.player2Id && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30'
              )}
              onClick={onPlayerClick && match.player2Id ? (e) => { e.stopPropagation(); onPlayerClick(match.id, match.player2Id!) } : undefined}
            >
              {player2?.name}
            </span>
          </div>
        </div>

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
        {match.result === 'pending' && (
          <Badge variant="default">{t('match.pending')}</Badge>
        )}
        {match.result === 'draw' && (
          <Badge variant="warning">{t('match.draw')}</Badge>
        )}
        {match.result === 'player1_win' && (
          <Badge variant="success">{t('match.player1Win', { name: player1?.name })}</Badge>
        )}
        {match.result === 'player2_win' && (
          <Badge variant="success">{t('match.player2Win', { name: player2?.name })}</Badge>
        )}
        {match.result !== 'pending' && match.resultEnteredBy && (
          <span
            className="ml-2 text-xs text-muted-foreground whitespace-nowrap"
            title={t('match.enteredBy', { name: match.resultEnteredBy })}
          >
            ⚖ {match.resultEnteredBy}
          </span>
        )}
      </div>

      {!readonly && (
        <div className="mt-3 space-y-2">
          {showGameScores && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">{t('match.games')}:</label>
              <input
                type="number"
                min={0}
                max={9}
                value={p1Games}
                onChange={e => setP1Games(e.target.value)}
                className="w-10 rounded border border-border bg-card text-foreground px-1.5 py-0.5 text-center text-xs focus:border-blue-500 focus:outline-none"
                placeholder="0"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <input
                type="number"
                min={0}
                max={9}
                value={p2Games}
                onChange={e => setP2Games(e.target.value)}
                className="w-10 rounded border border-border bg-card text-foreground px-1.5 py-0.5 text-center text-xs focus:border-blue-500 focus:outline-none"
                placeholder="0"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={match.result === 'player1_win' ? 'primary' : 'secondary'}
              onClick={() => submitResult('player1_win')}
            >
              {player1?.name}
            </Button>
            {!hideDrawOption && (
              <Button
                size="sm"
                variant={match.result === 'draw' ? 'primary' : 'secondary'}
                onClick={() => submitResult('draw')}
              >
                {t('match.draw')}
              </Button>
            )}
            <Button
              size="sm"
              variant={match.result === 'player2_win' ? 'primary' : 'secondary'}
              onClick={() => submitResult('player2_win')}
            >
              {player2?.name}
            </Button>
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
