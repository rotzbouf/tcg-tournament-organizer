import { createContext, useContext } from 'react'
import { AppState, TournamentAction } from './actions'

export interface TournamentContextType {
  state: AppState
  dispatch: (action: TournamentAction) => void
  undo: () => void
  canUndo: boolean
}

export const TournamentContext = createContext<TournamentContextType | null>(null)

export function useTournamentContext() {
  const context = useContext(TournamentContext)
  if (!context) {
    throw new Error('useTournamentContext must be used within TournamentProvider')
  }
  return context
}
