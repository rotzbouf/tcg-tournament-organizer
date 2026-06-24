import { createContext, useContext } from 'react'

export interface TimerState {
  totalSeconds: number
  remainingSeconds: number
  isRunning: boolean
  endTimestamp: number | null
  notified: boolean
}

export interface TimerManager {
  timers: Record<string, TimerState>
  startTimer: (id: string, durationMinutes: number) => void
  pauseTimer: (id: string) => void
  resetTimer: (id: string, durationMinutes: number) => void
  setTournamentName: (id: string, name: string) => void
  soundEnabled: boolean
  toggleSound: () => void
}

export const TimerContext = createContext<TimerManager | null>(null)

export function useTimerManager(): TimerManager {
  const context = useContext(TimerContext)
  if (!context) {
    throw new Error('useTimerManager must be used within TimerProvider')
  }
  return context
}
