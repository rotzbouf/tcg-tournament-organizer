import { createContext, useContext, useReducer, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { AppState, TournamentAction } from './actions'
import { tournamentReducer, initialState } from './tournamentReducer'
import { loadState, saveState } from '@/lib/storage'

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

  const dispatch = useCallback((action: TournamentAction) => {
    if (action.type !== 'LOAD_STATE') {
      setHistory(prev => [...prev.slice(-(MAX_HISTORY - 1)), state])
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

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => saveState(state), 500)
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
  }, [state])

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
