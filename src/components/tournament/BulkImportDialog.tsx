import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useTournamentContext } from '@/state/TournamentContext'

interface BulkImportDialogProps {
  open: boolean
  onClose: () => void
  tournamentId: string
}

export function BulkImportDialog({ open, onClose, tournamentId }: BulkImportDialogProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()
  const [text, setText] = useState('')

  const names = text.split('\n').map(s => s.trim()).filter(Boolean)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (names.length === 0) return
    dispatch({
      type: 'BULK_ADD_PLAYERS',
      payload: { tournamentId, playerNames: names },
    })
    setText('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('players.bulkImport')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="bulk-import" className="mb-1 block text-sm font-medium text-secondary-foreground">
            {t('players.bulkImportHint')}
          </label>
          <textarea
            id="bulk-import"
            className="w-full rounded-lg border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={8}
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />
          {names.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t('players.count', { count: names.length })}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={names.length === 0}>
            {t('players.add')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
