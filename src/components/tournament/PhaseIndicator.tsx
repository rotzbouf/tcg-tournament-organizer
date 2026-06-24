import { useTranslation } from 'react-i18next'
import { TournamentPhase } from '@/types/phase'
import { cn } from '@/lib/utils'

interface PhaseIndicatorProps {
  phases: TournamentPhase[]
  currentPhaseIndex: number
}

export function PhaseIndicator({ phases, currentPhaseIndex }: PhaseIndicatorProps) {
  const { t } = useTranslation()

  if (phases.length === 0) return null

  return (
    <div className="flex items-center gap-1">
      {phases.map((phase, i) => (
        <div key={phase.id} className="flex items-center">
          {i > 0 && <span className="mx-1 text-muted-foreground">→</span>}
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              i === currentPhaseIndex
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : i < currentPhaseIndex
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-muted text-muted-foreground'
            )}
          >
            {phase.name || t(`tournament.formatOptions.${phase.format}`)}
          </span>
        </div>
      ))}
    </div>
  )
}
