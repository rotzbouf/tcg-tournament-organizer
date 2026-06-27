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
          // Replace if same reporter updates their report, otherwise append
          const withoutSameReporter = prev.filter(
            r => !(r.matchId === data.matchId && r.reporterName === data.reporterName)
          )
          return [...withoutSameReporter, { ...data, receivedAt: Date.now() }]
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

  const reportsByMatch = reports.reduce<Record<string, PendingReport[]>>((acc, r) => {
    if (!acc[r.matchId]) acc[r.matchId] = []
    acc[r.matchId].push(r)
    return acc
  }, {})

  // A conflict exists when both players reported but disagree on the result
  const conflictedMatchIds = new Set(
    Object.entries(reportsByMatch)
      .filter(([, rs]) => rs.length >= 2 && rs[0].result !== rs[1].result)
      .map(([matchId]) => matchId)
  )

  return { reports, reportsByMatch, conflictedMatchIds, dismiss, dismissForTournament }
}
