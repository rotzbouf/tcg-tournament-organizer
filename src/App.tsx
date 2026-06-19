import { Routes, Route } from 'react-router-dom'
import { TournamentProvider } from './state/TournamentContext'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './components/dashboard/Dashboard'

export default function App() {
  return (
    <TournamentProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </AppShell>
    </TournamentProvider>
  )
}
