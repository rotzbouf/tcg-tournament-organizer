import { createContext, useContext, useReducer, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { AppState, TournamentAction } from './actions'
import { tournamentReducer, initialState } from './tournamentReducer'
import { loadState, saveState } from '@/lib/storage'
import { sendDiscordMessage, formatPairingsMessage, formatStandingsMessage, formatCompletionMessage } from '@/lib/discord'
import { selectCurrentRound, selectStandings } from './selectors'

const MAX_HISTORY = 20

interface TournamentContextType {
  state: AppState
  dispatch: (action: TournamentAction) => void
  undo: () => void
  canUndo: boolean
}

const TournamentContext = createContext<TournamentContextType | null>(null)

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(tournamentReducer, initialState, () => loadState() ?? initialState)
  const [history, setHistory] = useState<AppState[]>([])

  const pendingDiscord = useRef<{ type: TournamentAction['type']; tournamentId: string; url: string } | null>(null)

  const dispatch = useCallback((action: TournamentAction) => {
    if (action.type !== 'LOAD_STATE') {
      setHistory(prev => [...prev.slice(-(MAX_HISTORY - 1)), state])
    }

    // Queue a Discord notification to be sent from the *resulting* state (handled
    // in the effect below). Building it here would require re-running the reducer,
    // which is non-deterministic — first-round pairings are shuffled — so the
    // posted pairings would differ from what actually gets stored.
    if ('payload' in action && action.payload && typeof action.payload === 'object' && 'tournamentId' in action.payload) {
      const tournamentId = action.payload.tournamentId as string
      const url = state.tournaments[tournamentId]?.discordWebhookUrl
      const notifies = action.type === 'START_TOURNAMENT' || action.type === 'GENERATE_ROUND' ||
        action.type === 'COMPLETE_ROUND' || action.type === 'COMPLETE_TOURNAMENT'
      if (url && notifies) pendingDiscord.current = { type: action.type, tournamentId, url }
    }

    rawDispatch(action)
  }, [state])

  const undo = useCallback(() => {
    setHistory(prev => {
      const next = [...prev]
      const last = next.pop()
      if (last) rawDispatch({ type: 'LOAD_STATE', payload: last })
      return next
    })
  }, [])

  const canUndo = history.length > 0

  useEffect(() => {
    const pending = pendingDiscord.current
    if (!pending) return
    pendingDiscord.current = null
    const t = state.tournaments[pending.tournamentId]
    if (!t) return
    switch (pending.type) {
      case 'START_TOURNAMENT':
      case 'GENERATE_ROUND': {
        const round = selectCurrentRound(t)
        if (round) sendDiscordMessage(pending.url, formatPairingsMessage(t, round, t.players))
        break
      }
      case 'COMPLETE_ROUND':
        sendDiscordMessage(pending.url, formatStandingsMessage(t, selectStandings(t)))
        break
      case 'COMPLETE_TOURNAMENT':
        if (t.status === 'completed') sendDiscordMessage(pending.url, formatCompletionMessage(t, selectStandings(t)))
        break
    }
  }, [state])

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      saveState(state)
      window.electronAPI?.syncState(JSON.stringify(state))
    }, 500)
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
  }, [state])

  useEffect(() => {
    window.electronAPI?.onDispatchAction((actionJson: string) => {
      try {
        const action = JSON.parse(actionJson) as TournamentAction
        rawDispatch(action)
      } catch { /* ignore malformed actions */ }
    })
  }, [])

  return (
    <TournamentContext.Provider value={{ state, dispatch, undo, canUndo }}>
      {children}
    </TournamentContext.Provider>
  )
}

export function useTournamentContext() {
  const context = useContext(TournamentContext)
  if (!context) {
    throw new Error('useTournamentContext must be used within TournamentProvider')
  }
  return context
}
