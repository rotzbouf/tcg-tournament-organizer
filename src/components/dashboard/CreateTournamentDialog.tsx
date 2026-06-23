import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useTournamentContext } from '@/state/TournamentContext'
import { DecklistVisibility, GameType, TournamentFormat } from '@/types/tournament'
import { GAME_CONFIG } from '@/lib/gameConfig'

interface CreateTournamentDialogProps {
  open: boolean
  onClose: () => void
}

const ROUND_TIME_OPTIONS = [20, 30, 40, 50, 60, 70, 80, 90]
const FORMAT_OPTIONS: TournamentFormat[] = ['swiss', 'swiss_topcut', 'double_elimination', 'round_robin']

export function CreateTournamentDialog({ open, onClose }: CreateTournamentDialogProps) {
  const { t } = useTranslation()
  const { state, dispatch } = useTournamentContext()
  const [name, setName] = useState('')
  const [game, setGame] = useState<GameType>('yugioh')
  const [format, setFormat] = useState<TournamentFormat>('swiss')
  const [roundTime, setRoundTime] = useState(50)
  const [grandFinalReset, setGrandFinalReset] = useState(false)
  const [ageDivisions, setAgeDivisions] = useState(true)
  const [decklistVisibility, setDecklistVisibility] = useState<DecklistVisibility>('hidden')
  const [powerPairings, setPowerPairings] = useState(true)
  const [templateName, setTemplateName] = useState('')
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)

  const templates = state.templates ?? []

  const applyTemplate = (templateId: string) => {
    const tmpl = templates.find(t => t.id === templateId)
    if (!tmpl) return
    setGame(tmpl.game)
    setFormat(tmpl.format)
    setRoundTime(tmpl.roundTimeMinutes)
    setDecklistVisibility(tmpl.decklistVisibility)
    setGrandFinalReset(tmpl.grandFinalReset)
    setAgeDivisions(tmpl.ageDivisionsEnabled)
    setPowerPairings(tmpl.powerPairings ?? true)
  }

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return
    dispatch({
      type: 'SAVE_TEMPLATE',
      payload: {
        name: templateName.trim(),
        game,
        format,
        roundTimeMinutes: roundTime,
        decklistVisibility,
        grandFinalReset,
        ageDivisionsEnabled: GAME_CONFIG[game].hasAgeDivisions ? ageDivisions : false,
        powerPairings,
      },
    })
    setTemplateName('')
    setShowSaveTemplate(false)
  }

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
        topCut: 0,
        grandFinalReset: format === 'double_elimination' ? grandFinalReset : undefined,
        ageDivisionsEnabled: GAME_CONFIG[game].hasAgeDivisions ? ageDivisions : false,
        decklistVisibility,
        powerPairings,
      },
    })
    setName('')
    setGame('yugioh')
    setFormat('swiss')
    setRoundTime(50)
    setGrandFinalReset(false)
    setAgeDivisions(true)
    setDecklistVisibility('hidden')
    setPowerPairings(true)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('tournament.create')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {templates.length > 0 && (
          <Select
            id="tournament-template"
            label={t('template.title')}
            options={[
              { value: '', label: t('template.none') },
              ...templates.map(tmpl => ({ value: tmpl.id, label: tmpl.name })),
            ]}
            value=""
            onChange={e => { if (e.target.value) applyTemplate(e.target.value) }}
          />
        )}
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
          <p className="text-sm text-gray-500">{t('tournament.topCutAutoHint')}</p>
        )}
        {format === 'double_elimination' && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={grandFinalReset}
              onChange={e => setGrandFinalReset(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>{t('tournament.grandFinalReset')}</span>
          </label>
        )}
        {GAME_CONFIG[game].hasAgeDivisions && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={ageDivisions}
              onChange={e => setAgeDivisions(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>{t('tournament.ageDivisions')}</span>
          </label>
        )}
        <Select
          id="tournament-round-time"
          label={t('tournament.roundTime')}
          options={roundTimeOptions}
          value={String(roundTime)}
          onChange={e => setRoundTime(Number(e.target.value))}
        />
        {(format === 'swiss' || format === 'swiss_topcut') && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={powerPairings}
              onChange={e => setPowerPairings(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>{t('tournament.powerPairings')}</span>
          </label>
        )}
        <Select
          id="tournament-decklist-visibility"
          label={t('decklist.title')}
          options={[
            { value: 'hidden', label: t('decklist.visibility.hidden') },
            { value: 'to_only', label: t('decklist.visibility.toOnly') },
            { value: 'public', label: t('decklist.visibility.public') },
          ]}
          value={decklistVisibility}
          onChange={e => setDecklistVisibility(e.target.value as DecklistVisibility)}
        />
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          {showSaveTemplate ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t('template.name')}
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                className="w-40 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              />
              <Button type="button" size="sm" onClick={handleSaveTemplate} disabled={!templateName.trim()}>
                {t('common.save')}
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowSaveTemplate(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowSaveTemplate(true)}>
              {t('template.save')}
            </Button>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {t('tournament.create')}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
