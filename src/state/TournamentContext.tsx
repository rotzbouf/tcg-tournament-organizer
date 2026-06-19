import { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react'
import { AppState, TournamentAction } from './actions'
import { tournamentReducer, initialState } from './tournamentReducer'

interface TournamentContextType {
  state: AppState
  dispatch: Dispatch<TournamentAction>
}

const TournamentContext = createContext<TournamentContextType | null>(null)

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tournamentReducer, initialState)

  return (
    <TournamentContext.Provider value={{ state, dispatch }}>
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
