import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  useKeyboardShortcuts()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
