import { useState, useEffect, useCallback } from 'react'
import { BanlistData, BanlistStore } from '@/types/banlist'
import { GameType } from '@/types/tournament'

interface UseBanlistReturn {
  store: BanlistStore
  getBanlist: (game: GameType, format: string) => BanlistData | null
  fetchBanlist: (game: GameType, format: string) => Promise<void>
  deleteBanlist: (game: GameType, format: string) => Promise<void>
  fetching: Record<string, boolean>
  errors: Record<string, string>
}

export function useBanlist(): UseBanlistReturn {
  const [store, setStore] = useState<BanlistStore>({})
  const [fetching, setFetching] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (window.electronAPI?.loadBanlists) {
      window.electronAPI.loadBanlists().then((data: BanlistStore) => setStore(data ?? {}))
    }
  }, [])

  const getBanlist = useCallback((game: GameType, format: string): BanlistData | null => {
    return store[`${game}:${format}`] ?? null
  }, [store])

  const fetchBanlist = useCallback(async (game: GameType, format: string) => {
    const key = `${game}:${format}`
    setFetching(prev => ({ ...prev, [key]: true }))
    setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
    try {
      const data: BanlistData = await window.electronAPI!.fetchBanlist(game, format)
      setStore(prev => ({ ...prev, [key]: data }))
    } catch (err) {
      setErrors(prev => ({ ...prev, [key]: err instanceof Error ? err.message : 'Fehler beim Laden' }))
    } finally {
      setFetching(prev => ({ ...prev, [key]: false }))
    }
  }, [])

  const deleteBanlist = useCallback(async (game: GameType, format: string) => {
    const key = `${game}:${format}`
    await window.electronAPI?.deleteBanlist(game, format)
    setStore(prev => { const next = { ...prev }; delete next[key]; return next })
  }, [])

  return { store, getBanlist, fetchBanlist, deleteBanlist, fetching, errors }
}
