import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useTournamentContext } from '@/state/TournamentContext'
import { GameType, TopCutSize, TournamentFormat } from '@/types/tournament'
import { GAME_CONFIG } from '@/lib/gameConfig'

interface CreateTournamentDialogProps {
  open: boolean
  onClose: () => void
}

const ROUND_TIME_OPTIONS = [20, 30, 40, 50, 60, 70, 80, 90]
const TOP_CUT_OPTIONS: TopCutSize[] = [4, 8, 16, 32]
const FORMAT_OPTIONS: TournamentFormat[] = ['swiss', 'swiss_topcut', 'double_elimination', 'round_robin']

export function CreateTournamentDialog({ open, onClose }: CreateTournamentDialogProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()
  const [name, setName] = useState('')
  const [game, setGame] = useState<GameType>('yugioh')
  const [format, setFormat] = useState<TournamentFormat>('swiss')
  const [roundTime, setRoundTime] = useState(50)
  const [topCut, setTopCut] = useState<TopCutSize>(8)

  const gameOptions = (Object.keys(GAME_CONFIG) as GameType[]).map(key => ({
    value: key,
    label: GAME_CONFIG[key].name,
  }))

  const formatOptions = FORMAT_OPTIONS.map(f => ({
    value: f,
    label: t(`tournament.formatOptions.${f}`),
  }))

  const roundTimeOptions = ROUND_TIME_OPTIONS.map(min => ({
    value: String(min),
    label: t('tournament.minutesValue', { count: min }),
  }))

  const topCutOptions = TOP_CUT_OPTIONS.map(size => ({
    value: String(size),
    label: t('tournament.topCutValue', { count: size }),
  }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    dispatch({
      type: 'CREATE_TOURNAMENT',
      payload: {
        name: name.trim(),
        game,
        format,
        roundTimeMinutes: roundTime,
        topCut: format === 'swiss_topcut' ? topCut : 0,
      },
    })
    setName('')
    setGame('yugioh')
    setFormat('swiss')
    setRoundTime(50)
    setTopCut(8)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('tournament.create')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="tournament-name"
          label={t('tournament.name')}
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
        <Select
          id="tournament-game"
          label={t('tournament.game')}
          options={gameOptions}
          value={game}
          onChange={e => setGame(e.target.value as GameType)}
        />
        <Select
          id="tournament-format"
          label={t('tournament.format')}
          options={formatOptions}
          value={format}
          onChange={e => setFormat(e.target.value as TournamentFormat)}
        />
        {format === 'swiss_topcut' && (
          <Select
            id="tournament-top-cut"
            label={t('tournament.topCut')}
            options={topCutOptions}
            value={String(topCut)}
            onChange={e => setTopCut(Number(e.target.value) as TopCutSize)}
          />
        )}
        <Select
          id="tournament-round-time"
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
            {t('tournament.create')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
