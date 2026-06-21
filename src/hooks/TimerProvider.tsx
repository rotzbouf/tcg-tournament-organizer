import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { TimerContext, TimerState } from './useTimerManager'

export function TimerProvider({ children }: { children: ReactNode }) {
  const [timers, setTimers] = useState<Record<string, TimerState>>({})
  const timersRef = useRef(timers)
  useEffect(() => {
    timersRef.current = timers
    window.electronAPI?.syncTimerState(JSON.stringify(timers))
  }, [timers])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      let hasChanges = false
      const updated = { ...timersRef.current }

      for (const [id, timer] of Object.entries(updated)) {
        if (!timer.isRunning || !timer.endTimestamp) continue
        const remaining = Math.max(0, Math.ceil((timer.endTimestamp - now) / 1000))
        if (remaining !== timer.remainingSeconds) {
          hasChanges = true
          updated[id] = {
            ...timer,
            remainingSeconds: remaining,
            isRunning: remaining > 0,
            endTimestamp: remaining > 0 ? timer.endTimestamp : null,
          }
        }
      }

      if (hasChanges) setTimers(updated)
    }, 200)

    return () => clearInterval(interval)
  }, [])

  const startTimer = useCallback((id: string, durationMinutes: number) => {
    setTimers(prev => {
      const existing = prev[id]
      const totalSeconds = durationMinutes * 60
      const remainingSeconds = existing ? existing.remainingSeconds : totalSeconds

      if (remainingSeconds <= 0) return prev

      return {
        ...prev,
        [id]: {
          totalSeconds,
          remainingSeconds,
          isRunning: true,
          endTimestamp: Date.now() + remainingSeconds * 1000,
        },
      }
    })
  }, [])

  const pauseTimer = useCallback((id: string) => {
    setTimers(prev => {
      const timer = prev[id]
      if (!timer || !timer.isRunning) return prev
      const now = Date.now()
      const remaining = timer.endTimestamp
        ? Math.max(0, Math.ceil((timer.endTimestamp - now) / 1000))
        : timer.remainingSeconds
      return {
        ...prev,
        [id]: {
          ...timer,
          remainingSeconds: remaining,
          isRunning: false,
          endTimestamp: null,
        },
      }
    })
  }, [])

  const resetTimer = useCallback((id: string, durationMinutes: number) => {
    setTimers(prev => ({
      ...prev,
      [id]: {
        totalSeconds: durationMinutes * 60,
        remainingSeconds: durationMinutes * 60,
        isRunning: false,
        endTimestamp: null,
      },
    }))
  }, [])

  return (
    <TimerContext.Provider value={{ timers, startTimer, pauseTimer, resetTimer }}>
      {children}
    </TimerContext.Provider>
  )
}
