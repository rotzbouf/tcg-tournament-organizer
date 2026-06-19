import { useCallback, useState } from 'react'
import { useTournamentContext } from '@/state/TournamentContext'
import { serializeState, deserializeState } from '@/lib/serialization'

interface FileIOResult {
  exportState: () => Promise<boolean>
  importState: () => Promise<boolean>
  error: string | null
  clearError: () => void
}

export function useFileIO(): FileIOResult {
  const { state, dispatch } = useTournamentContext()
  const [error, setError] = useState<string | null>(null)

  const exportState = useCallback(async () => {
    try {
      const json = serializeState(state)
      if (window.electronAPI) {
        const result = await window.electronAPI.saveFile(json)
        return result !== null
      }
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tcg-tournaments-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
      return false
    }
  }, [state])

  const importState = useCallback(async () => {
    try {
      let json: string | null = null
      if (window.electronAPI) {
        json = await window.electronAPI.openFile()
      } else {
        json = await browserFilePickerRead()
      }
      if (!json) return false
      const newState = deserializeState(json)
      dispatch({ type: 'LOAD_STATE', payload: newState })
      setError(null)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
      return false
    }
  }, [dispatch])

  const clearError = useCallback(() => setError(null), [])

  return { exportState, importState, error, clearError }
}

function browserFilePickerRead(): Promise<string | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsText(file)
    }
    input.click()
  })
}
