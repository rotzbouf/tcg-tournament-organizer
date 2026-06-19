import { Routes, Route } from 'react-router-dom'
import { TournamentProvider } from './state/TournamentContext'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './components/dashboard/Dashboard'
import { TournamentView } from './components/tournament/TournamentView'

export default function App() {
  return (
    <TournamentProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tournament/:id" element={<TournamentView />} />
        </Routes>
      </AppShell>
    </TournamentProvider>
  )
}
