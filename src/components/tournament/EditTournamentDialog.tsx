import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useTournamentContext } from '@/state/TournamentContext'
import { Tournament, TournamentFormat } from '@/types/tournament'

interface EditTournamentDialogProps {
  open: boolean
  onClose: () => void
  tournament: Tournament
}

const ROUND_TIME_OPTIONS = [20, 30, 40, 50, 60, 70, 80, 90]
const FORMAT_OPTIONS: TournamentFormat[] = ['swiss', 'swiss_topcut', 'double_elimination', 'round_robin']

export function EditTournamentDialog({ open, onClose, tournament }: EditTournamentDialogProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()
  const [name, setName] = useState(tournament.name)
  const [format, setFormat] = useState<TournamentFormat>(tournament.format)
  const [roundTime, setRoundTime] = useState(tournament.roundTimeMinutes)

  const formatOptions = FORMAT_OPTIONS.map(f => ({
    value: f,
    label: t(`tournament.formatOptions.${f}`),
  }))

  const roundTimeOptions = ROUND_TIME_OPTIONS.map(min => ({
    value: String(min),
    label: t('tournament.minutesValue', { count: min }),
  }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    dispatch({
      type: 'UPDATE_TOURNAMENT',
      payload: {
        tournamentId: tournament.id,
        name: name.trim(),
        format,
        roundTimeMinutes: roundTime,
        topCut: 0,
      },
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
          id="edit-tournament-format"
          label={t('tournament.format')}
          options={formatOptions}
          value={format}
          onChange={e => setFormat(e.target.value as TournamentFormat)}
        />
        {format === 'swiss_topcut' && (
          <p className="text-sm text-gray-500">{t('tournament.topCutAutoHint')}</p>
        )}
        <Select
          id="edit-tournament-round-time"
          label={t('tournament.roundTime')}
          options={roundTimeOptions}
          value={String(roundTime)}
          onChange={e => setRoundTime(Number(e.target.value))}
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
