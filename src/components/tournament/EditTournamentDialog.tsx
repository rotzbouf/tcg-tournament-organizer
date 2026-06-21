import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useTournamentContext } from '@/state/TournamentContext'
import { Tournament, TopCutSize } from '@/types/tournament'

interface EditTournamentDialogProps {
  open: boolean
  onClose: () => void
  tournament: Tournament
}

const ROUND_TIME_OPTIONS = [20, 30, 40, 50, 60, 70, 80, 90]
const TOP_CUT_OPTIONS: TopCutSize[] = [0, 4, 8, 16, 32]

export function EditTournamentDialog({ open, onClose, tournament }: EditTournamentDialogProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()
  const [name, setName] = useState(tournament.name)
  const [roundTime, setRoundTime] = useState(tournament.roundTimeMinutes)
  const [topCut, setTopCut] = useState<TopCutSize>(tournament.topCut)

  const roundTimeOptions = ROUND_TIME_OPTIONS.map(min => ({
    value: String(min),
    label: t('tournament.minutesValue', { count: min }),
  }))

  const topCutOptions = TOP_CUT_OPTIONS.map(size => ({
    value: String(size),
    label: size === 0 ? t('tournament.swissOnly') : t('tournament.topCutValue', { count: size }),
  }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    dispatch({
      type: 'UPDATE_TOURNAMENT',
      payload: { tournamentId: tournament.id, name: name.trim(), roundTimeMinutes: roundTime, topCut },
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('tournament.edit')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="edit-tournament-name"
          label={t('tournament.name')}
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
        <Select
          id="edit-tournament-round-time"
          label={t('tournament.roundTime')}
          options={roundTimeOptions}
          value={String(roundTime)}
          onChange={e => setRoundTime(Number(e.target.value))}
        />
        <Select
          id="edit-tournament-top-cut"
          label={t('tournament.topCut')}
          options={topCutOptions}
          value={String(topCut)}
          onChange={e => setTopCut(Number(e.target.value) as TopCutSize)}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={!name.trim()}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
