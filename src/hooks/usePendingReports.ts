import { useEffect, useState, useCallback } from 'react'

export interface PendingReport {
  matchId: string
  result: string
  reporterName: string
  tournamentId: string
  receivedAt: number
}

export function usePendingReports() {
  const [reports, setReports] = useState<PendingReport[]>([])

  useEffect(() => {
    if (!window.electronAPI?.onMatchReport) return
    window.electronAPI.onMatchReport((raw) => {
      try {
        const data = JSON.parse(raw) as Omit<PendingReport, 'receivedAt'>
        setReports(prev => {
          // Replace existing report for same match if any
          const filtered = prev.filter(r => r.matchId !== data.matchId)
          return [...filtered, { ...data, receivedAt: Date.now() }]
        })
      } catch { /* ignore */ }
    })
  }, [])

  const dismiss = useCallback((matchId: string) => {
    setReports(prev => prev.filter(r => r.matchId !== matchId))
  }, [])

  const dismissForTournament = useCallback((tournamentId: string) => {
    setReports(prev => prev.filter(r => r.tournamentId !== tournamentId))
  }, [])

  return { reports, dismiss, dismissForTournament }
}
