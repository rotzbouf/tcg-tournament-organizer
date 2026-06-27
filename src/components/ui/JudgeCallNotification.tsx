import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'

interface JudgeCall {
  playerName: string
  tableNumber: number
  timestamp: number
}

export function JudgeCallNotification() {
  const { t } = useTranslation()
  const [calls, setCalls] = useState<JudgeCall[]>([])

  const dismiss = useCallback((timestamp: number) => {
    setCalls(prev => prev.filter(c => c.timestamp !== timestamp))
  }, [])

  useEffect(() => {
    window.electronAPI?.onJudgeCall((dataJson: string) => {
      try {
        const data = JSON.parse(dataJson) as { playerName: string; tableNumber: number }
        setCalls(prev => [
          ...prev.filter(c => c.playerName !== data.playerName),
          { ...data, timestamp: Date.now() },
        ])
      } catch { /* ignore */ }
    })
  }, [])

  if (calls.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm space-y-3 rounded-xl bg-card p-6 shadow-2xl">
        <h2 className="text-center text-lg font-bold text-red-600">{t('judge.callTitle')}</h2>
        {calls.map(call => (
          <div key={call.timestamp} className="rounded-lg border-2 border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{call.playerName}</p>
              {call.tableNumber > 0 && (
                <p className="mt-1 text-3xl font-black text-red-600">
                  {t('match.table', { number: call.tableNumber })}
                </p>
              )}
            </div>
            <Button
              className="mt-3 w-full"
              size="sm"
              onClick={() => dismiss(call.timestamp)}
            >
              {t('judge.dismiss')}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
