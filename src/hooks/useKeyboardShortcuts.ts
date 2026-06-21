import { useEffect } from 'react'
import { useFileIO } from './useFileIO'
import { useTournamentContext } from '@/state/TournamentContext'

export function useKeyboardShortcuts() {
  const { exportState, importState } = useFileIO()
  const { undo, canUndo } = useTournamentContext()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return

      switch (e.key.toLowerCase()) {
        case 'e':
          e.preventDefault()
          exportState()
          break
        case 'i':
          e.preventDefault()
          importState()
          break
        case 'z':
          e.preventDefault()
          if (canUndo) undo()
          break
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [exportState, importState, undo, canUndo])
}
