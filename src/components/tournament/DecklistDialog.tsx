import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useTournamentContext } from '@/state/TournamentContext'
import { Player } from '@/types/player'
import { parseDecklistText, formatDecklistText, getDecklistStats } from '@/lib/decklistParser'

interface DecklistDialogProps {
  open: boolean
  onClose: () => void
  tournamentId: string
  player: Player
  readonly?: boolean
}

export function DecklistDialog({ open, onClose, tournamentId, player, readonly }: DecklistDialogProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()
  const [text, setText] = useState(player.decklist ? formatDecklistText(player.decklist) : '')

  const entries = parseDecklistText(text)
  const stats = getDecklistStats(entries)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    dispatch({
      type: 'UPDATE_PLAYER',
      payload: {
        tournamentId,
        playerId: player.id,
        decklist: entries.length > 0 ? entries : null,
      },
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={`${t('decklist.title')} — ${player.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="decklist-text" className="mb-1 block text-sm font-medium text-gray-700">
            {t('decklist.paste')}
          </label>
          <textarea
            id="decklist-text"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={10}
            value={text}
            onChange={e => setText(e.target.value)}
            readOnly={readonly}
            autoFocus
          />
          {entries.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              {t('decklist.totalCards')}: {stats.totalCards} — {t('decklist.uniqueCards')}: {stats.uniqueCards}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {readonly ? t('common.close') : t('common.cancel')}
          </Button>
          {!readonly && (
            <Button type="submit">
              {t('common.save')}
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  )
}
