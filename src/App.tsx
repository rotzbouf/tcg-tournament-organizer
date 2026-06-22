import { Routes, Route } from 'react-router-dom'
import { TournamentProvider } from './state/TournamentContext'
import { TimerProvider } from './hooks/TimerProvider'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './components/dashboard/Dashboard'
import { TournamentView } from './components/tournament/TournamentView'
import { RankingsView } from './components/rankings/RankingsView'
import { JudgeCallNotification } from './components/ui/JudgeCallNotification'

export default function App() {
  return (
    <TournamentProvider>
      <TimerProvider>
        <JudgeCallNotification />
        <AppShell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tournament/:id" element={<TournamentView />} />
            <Route path="/rankings" element={<RankingsView />} />
          </Routes>
        </AppShell>
      </TimerProvider>
    </TournamentProvider>
  )
}
