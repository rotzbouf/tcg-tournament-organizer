import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTimerManager } from '@/hooks/useTimerManager'
import { formatTime } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface TimerDisplayProps {
  tournamentId: string
  durationMinutes: number
  compact?: boolean
  tournamentName?: string
}

export function TimerDisplay({ tournamentId, durationMinutes, compact, tournamentName }: TimerDisplayProps) {
  const { t } = useTranslation()
  const { timers, startTimer, pauseTimer, resetTimer, setTournamentName, soundEnabled, toggleSound } = useTimerManager()

  useEffect(() => {
    if (tournamentName) setTournamentName(tournamentId, tournamentName)
  }, [tournamentId, tournamentName, setTournamentName])

  const timer = timers[tournamentId]
  const remaining = timer?.remainingSeconds ?? durationMinutes * 60
  const isRunning = timer?.isRunning ?? false
  const isExpired = remaining <= 0

  const timerColor = isExpired
    ? 'text-red-600 animate-pulse'
    : remaining <= 60
      ? 'text-red-500'
      : remaining <= 300
        ? 'text-amber-500'
        : 'text-foreground'

  if (compact) {
    return (
      <span className={cn('font-mono text-sm font-semibold', timerColor)}>
        {isExpired ? t('timer.expired') : formatTime(remaining)}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className={cn('font-mono text-3xl font-bold tabular-nums', timerColor)}>
        {formatTime(remaining)}
      </span>
      <div className="flex gap-1">
        {isRunning ? (
          <Button size="sm" variant="secondary" onClick={() => pauseTimer(tournamentId)}>
            {t('timer.pause')}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => startTimer(tournamentId, durationMinutes)}
            disabled={isExpired}
          >
            {t('timer.start')}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => resetTimer(tournamentId, durationMinutes)}
        >
          {t('timer.reset')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleSound}
          title={soundEnabled ? t('timer.soundOn') : t('timer.soundOff')}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </Button>
      </div>
      {isExpired && (
        <span className="text-sm font-medium text-red-600">{t('timer.expired')}</span>
      )}
    </div>
  )
}
