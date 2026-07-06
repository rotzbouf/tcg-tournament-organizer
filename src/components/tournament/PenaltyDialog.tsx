import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { useTournamentContext } from '@/state/useTournamentContext'
import { Player } from '@/types/player'
import { Penalty, PenaltyType } from '@/types/penalty'
import { GameType } from '@/types/tournament'
import {
  CATEGORY_ORDER,
  getInfraction,
  getInfractionCatalog,
  priorOffenseCount,
  suggestPenaltyLevel,
} from '@/lib/penaltyCatalog'

interface PenaltyDialogProps {
  open: boolean
  onClose: () => void
  tournamentId: string
  game: GameType
  players: Player[]
  penalties: Penalty[]
}

const PENALTY_TYPES: PenaltyType[] = ['warning', 'game_loss', 'match_loss', 'disqualification', 'note']
const CUSTOM = ''

export function PenaltyDialog({ open, onClose, tournamentId, game, players, penalties }: PenaltyDialogProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()
  const activePlayers = players.filter(p => p.droppedInRound === null)
  const [playerId, setPlayerId] = useState(activePlayers[0]?.id ?? '')
  const [infractionId, setInfractionId] = useState<string>(CUSTOM)
  const [type, setType] = useState<PenaltyType>('warning')
  // True once the TO overrides the auto-suggested level, so we stop steering it.
  const [levelTouched, setLevelTouched] = useState(false)
  const [reason, setReason] = useState('')

  const catalog = useMemo(() => getInfractionCatalog(game), [game])

  const playerOptions = activePlayers.map(p => ({ value: p.id, label: p.name }))
  const typeOptions = PENALTY_TYPES.map(pt => ({ value: pt, label: t(`penalties.type.${pt}`) }))

  const infraction = getInfraction(infractionId)
  const priorCount = infraction ? priorOffenseCount(penalties, playerId, infraction.id) : 0
  const suggestion = infraction ? suggestPenaltyLevel(infraction, priorCount) : null

  // The level the dropdown should show: the escalated suggestion until the TO
  // takes manual control, then whatever they picked.
  const effectiveType = suggestion && !levelTouched ? suggestion.level : type

  const selectInfraction = (id: string) => {
    setInfractionId(id)
    setLevelTouched(false)
    const inf = getInfraction(id)
    if (inf) setType(suggestPenaltyLevel(inf, priorOffenseCount(penalties, playerId, inf.id)).level)
  }

  const selectPlayer = (id: string) => {
    setPlayerId(id)
    // Prior-offence count is player-specific, so re-derive the suggested level.
    setLevelTouched(false)
    if (infraction) setType(suggestPenaltyLevel(infraction, priorOffenseCount(penalties, id, infraction.id)).level)
  }

  const reset = () => {
    setPlayerId(activePlayers[0]?.id ?? '')
    setInfractionId(CUSTOM)
    setType('warning')
    setLevelTouched(false)
    setReason('')
  }

  const canSubmit = !!playerId && (!!infraction || !!reason.trim())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    dispatch({
      type: 'ISSUE_PENALTY',
      payload: {
        tournamentId,
        playerId,
        type: effectiveType,
        reason: reason.trim(),
        ...(infraction ? { infractionId: infraction.id } : {}),
      },
    })
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('penalties.issue')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          id="penalty-player"
          label={t('standings.player')}
          options={playerOptions}
          value={playerId}
          onChange={e => selectPlayer(e.target.value)}
        />

        <div>
          <label htmlFor="penalty-infraction" className="mb-1 block text-sm font-medium text-secondary-foreground">
            {t('penalties.infractionLabel')}
          </label>
          <select
            id="penalty-infraction"
            value={infractionId}
            onChange={e => selectInfraction(e.target.value)}
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value={CUSTOM}>{t('penalties.customInfraction')}</option>
            {CATEGORY_ORDER.map(cat => {
              const group = catalog.filter(inf => inf.category === cat)
              if (group.length === 0) return null
              return (
                <optgroup key={cat} label={t(`penalties.category.${cat}`)}>
                  {group.map(inf => (
                    <option key={inf.id} value={inf.id}>{t(`penalties.infraction.${inf.id}`)}</option>
                  ))}
                </optgroup>
              )
            })}
          </select>
        </div>

        {suggestion && (
          <div className={suggestion.escalated
            ? 'rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200'
            : 'rounded-lg border border-border bg-muted px-3 py-2 text-sm text-secondary-foreground'}>
            {suggestion.escalated
              ? t('penalties.escalated', {
                  count: suggestion.offenseNumber,
                  level: t(`penalties.type.${suggestion.level}`),
                })
              : t('penalties.firstOffense', { level: t(`penalties.type.${suggestion.level}`) })}
          </div>
        )}

        <Select
          id="penalty-type"
          label={t('penalties.type.label')}
          options={typeOptions}
          value={effectiveType}
          onChange={e => { setLevelTouched(true); setType(e.target.value as PenaltyType) }}
        />
        <Input
          id="penalty-reason"
          label={infraction ? t('penalties.reasonOptional') : t('penalties.reason')}
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="destructive" disabled={!canSubmit}>
            {t('penalties.issue')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
