import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { useTournamentContext } from '@/state/TournamentContext'
import { GameType } from '@/types/tournament'
import { Player } from '@/types/player'
import { DatabasePlayer } from '@/types/database'

interface AddPlayerFormProps {
  tournamentId: string
  game?: GameType
  existingPlayers: Player[]
}

export function AddPlayerForm({ tournamentId, game, existingPlayers }: AddPlayerFormProps) {
  const { t } = useTranslation()
  const { state, dispatch } = useTournamentContext()
  const [name, setName] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const suggestions: DatabasePlayer[] = name.length >= 1 && game
    ? Object.values(state.playerDatabase)
        .filter(p =>
          p.game === game &&
          p.name.toLowerCase().includes(name.toLowerCase()) &&
          !existingPlayers.some(ep => ep.name.toLowerCase() === p.name.toLowerCase())
        )
        .slice(0, 8)
    : []

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addFromDatabase = (dbPlayer: DatabasePlayer) => {
    dispatch({ type: 'ADD_FROM_DATABASE', payload: { tournamentId, databasePlayerId: dbPlayer.id } })
    setName('')
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }

  const addNewPlayer = () => {
    if (!name.trim()) return
    dispatch({ type: 'ADD_PLAYER', payload: { tournamentId, playerName: name.trim() } })
    setName('')
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      addFromDatabase(suggestions[selectedIndex])
      return
    }
    addNewPlayer()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, -1))
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            id="player-name"
            type="text"
            placeholder={t('players.name')}
            value={name}
            onChange={e => { setName(e.target.value); setShowSuggestions(true); setSelectedIndex(-1) }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
              {suggestions.map((p, i) => (
                <li
                  key={p.id}
                  className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm ${i === selectedIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  onMouseDown={() => addFromDatabase(p)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-gray-400">{p.elo} Elo</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button type="submit" disabled={!name.trim()} size="md">
          {t('players.add')}
        </Button>
      </form>
    </div>
  )
}
