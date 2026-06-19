import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useTournamentContext } from '@/state/TournamentContext'

interface AddPlayerFormProps {
  tournamentId: string
}

export function AddPlayerForm({ tournamentId }: AddPlayerFormProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    dispatch({
      type: 'ADD_PLAYER',
      payload: { tournamentId, playerName: name.trim() },
    })
    setName('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        id="player-name"
        placeholder={t('players.name')}
        value={name}
        onChange={e => setName(e.target.value)}
        className="flex-1"
      />
      <Button type="submit" disabled={!name.trim()} size="md">
        {t('players.add')}
      </Button>
    </form>
  )
}
