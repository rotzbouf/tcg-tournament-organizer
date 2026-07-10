import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useTournamentContext } from '@/state/useTournamentContext'
import { GAME_CONFIG } from '@/lib/gameConfig'
import { cutRuleKey, recommendedTopCut } from '@/lib/cutRules'
import { Tournament, TopCutSize, TournamentFormat } from '@/types/tournament'

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
  const [topCut, setTopCut] = useState<TopCutSize>(tournament.topCut)
  const [roundTime, setRoundTime] = useState(tournament.roundTimeMinutes)
  const [countForSeason, setCountForSeason] = useState(tournament.countForSeason !== false)
  const gameFormats = GAME_CONFIG[tournament.game].formats
  const [gameFormat, setGameFormat] = useState(tournament.gameFormat ?? gameFormats[0]?.id ?? '')

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
        topCut: format === 'swiss_topcut' ? topCut : 0,
        gameFormat: gameFormat || null,
        countForSeason,
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
        {gameFormats.length > 1 && (
          <Select
            id="edit-tournament-game-format"
            label={t('tournament.gameFormat')}
            options={gameFormats.map(f => ({ value: f.id, label: f.name }))}
            value={gameFormat}
            onChange={e => setGameFormat(e.target.value)}
          />
        )}
        <Select
          id="edit-tournament-format"
          label={t('tournament.format')}
          options={formatOptions}
          value={format}
          onChange={e => setFormat(e.target.value as TournamentFormat)}
        />
        {format === 'swiss_topcut' && (
          <>
            <Select
              id="edit-tournament-top-cut"
              label={t('tournament.topCut')}
              options={[
                { value: '0', label: t('tournament.topCutAuto') },
                ...[4, 8, 16, 32].map(n => ({ value: String(n), label: `Top ${n}` })),
              ]}
              value={String(topCut)}
              onChange={e => setTopCut(Number(e.target.value) as TopCutSize)}
            />
            {(() => {
              // With enough registered players the official size is concrete —
              // point out a deviation instead of showing the abstract rule.
              const official = recommendedTopCut(tournament.game, tournament.players.length)
              if (tournament.players.length >= 2 && topCut !== 0 && topCut !== official) {
                return (
                  <p className="text-sm text-amber-600">
                    ℹ {t('tournament.topCutOfficialHint', {
                      count: tournament.players.length,
                      cut: official === 0 ? t('tournament.topCutNone') : `Top ${official}`,
                    })}
                  </p>
                )
              }
              return (
                <p className="text-sm text-muted-foreground">
                  {t(`tournament.topCutRule.${cutRuleKey(tournament.game)}`)}
                </p>
              )
            })()}
          </>
        )}
        <Select
          id="edit-tournament-round-time"
          label={t('tournament.roundTime')}
          options={roundTimeOptions}
          value={String(roundTime)}
          onChange={e => setRoundTime(Number(e.target.value))}
        />
        <label className="flex items-center gap-2 text-sm text-secondary-foreground">
          <input
            type="checkbox"
            checked={countForSeason}
            onChange={e => setCountForSeason(e.target.checked)}
            className="rounded border-input"
          />
          <span>{t('season.countForSeason')}</span>
        </label>
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
