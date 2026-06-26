import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useTournamentContext } from '@/state/TournamentContext'
import { GameType } from '@/types/tournament'
import { PointTier, DEFAULT_POINT_TIERS } from '@/types/season'
import { GAME_CONFIG } from '@/lib/gameConfig'

interface Props {
  open: boolean
  onClose: () => void
}

const GAME_OPTIONS: GameType[] = ['yugioh', 'pokemon', 'star_wars_unlimited', 'riftbound', 'lorcana', 'altered', 'mtg']

export function CreateSeasonDialog({ open, onClose }: Props) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()
  const [name, setName] = useState('')
  const [game, setGame] = useState<GameType>('yugioh')
  const [tiers, setTiers] = useState<PointTier[]>(DEFAULT_POINT_TIERS)

  const gameOptions = GAME_OPTIONS.map(g => ({ value: g, label: GAME_CONFIG[g].name }))

  const updateTier = (i: number, field: keyof PointTier, value: number) => {
    setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t))
  }

  const removeTier = (i: number) => setTiers(prev => prev.filter((_, idx) => idx !== i))

  const addTier = () => {
    const last = tiers[tiers.length - 1]
    const nextMin = last ? last.maxRank + 1 : 1
    setTiers(prev => [...prev, { minRank: nextMin, maxRank: nextMin, points: 1 }])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    dispatch({ type: 'CREATE_SEASON', payload: { name: name.trim(), game, pointTiers: tiers } })
    setName('')
    setGame('yugioh')
    setTiers(DEFAULT_POINT_TIERS)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('season.create')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input id="season-name" label={t('season.name')} value={name} onChange={e => setName(e.target.value)} autoFocus />
        <Select
          id="season-game"
          label={t('tournament.game')}
          options={gameOptions}
          value={game}
          onChange={e => setGame(e.target.value as GameType)}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-secondary-foreground">{t('season.pointStructure')}</p>
          <div className="space-y-1.5">
            {tiers.map((tier, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-8 text-right text-muted-foreground">#</span>
                <input
                  type="number" min={1} value={tier.minRank}
                  onChange={e => updateTier(i, 'minRank', Number(e.target.value))}
                  className="w-14 rounded border border-input bg-card px-2 py-1 text-center text-foreground focus:outline-none"
                />
                <span className="text-muted-foreground">–</span>
                <input
                  type="number" min={tier.minRank} value={tier.maxRank}
                  onChange={e => updateTier(i, 'maxRank', Number(e.target.value))}
                  className="w-14 rounded border border-input bg-card px-2 py-1 text-center text-foreground focus:outline-none"
                />
                <span className="flex-1 text-muted-foreground">=</span>
                <input
                  type="number" min={0} value={tier.points}
                  onChange={e => updateTier(i, 'points', Number(e.target.value))}
                  className="w-14 rounded border border-input bg-card px-2 py-1 text-center text-foreground focus:outline-none"
                />
                <span className="text-muted-foreground">{t('season.pointsLabel')}</span>
                <button type="button" onClick={() => removeTier(i)} className="text-muted-foreground hover:text-red-500">×</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addTier} className="mt-2 text-xs text-blue-600 hover:underline">
            + {t('season.addTier')}
          </button>
        </div>

        <div className="flex justify-end gap-2 border-t border-muted pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={!name.trim()}>{t('season.create')}</Button>
        </div>
      </form>
    </Dialog>
  )
}
