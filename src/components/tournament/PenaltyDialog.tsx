import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { useTournamentContext } from '@/state/TournamentContext'
import { Player } from '@/types/player'
import { PenaltyType } from '@/types/penalty'

interface PenaltyDialogProps {
  open: boolean
  onClose: () => void
  tournamentId: string
  players: Player[]
}

const PENALTY_TYPES: PenaltyType[] = ['warning', 'game_loss', 'match_loss', 'disqualification', 'note']

export function PenaltyDialog({ open, onClose, tournamentId, players }: PenaltyDialogProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()
  const [playerId, setPlayerId] = useState('')
  const [type, setType] = useState<PenaltyType>('warning')
  const [reason, setReason] = useState('')

  const activePlayers = players.filter(p => p.droppedInRound === null)

  const playerOptions = activePlayers.map(p => ({
    value: p.id,
    label: p.name,
  }))

  const typeOptions = PENALTY_TYPES.map(pt => ({
    value: pt,
    label: t(`penalties.type.${pt}`),
  }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerId || !reason.trim()) return
    dispatch({
      type: 'ISSUE_PENALTY',
      payload: { tournamentId, playerId, type, reason: reason.trim() },
    })
    setPlayerId('')
    setType('warning')
    setReason('')
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
          onChange={e => setPlayerId(e.target.value)}
        />
        <Select
          id="penalty-type"
          label={t('penalties.type.label')}
          options={typeOptions}
          value={type}
          onChange={e => setType(e.target.value as PenaltyType)}
        />
        <Input
          id="penalty-reason"
          label={t('penalties.reason')}
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="destructive" disabled={!playerId || !reason.trim()}>
            {t('penalties.issue')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
