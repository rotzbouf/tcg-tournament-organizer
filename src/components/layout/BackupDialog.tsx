import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useTournamentContext } from '@/state/useTournamentContext'
import { parseStoredState } from '@/lib/storage'

interface BackupEntry {
  name: string
  createdAt: number
  size: number
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} kB`
}

export function BackupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const { dispatch } = useTournamentContext()
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [confirmTarget, setConfirmTarget] = useState<BackupEntry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [encrypted, setEncrypted] = useState<boolean | null>(null)

  useEffect(() => {
    if (!open) return
    window.electronAPI?.listBackups().then(setBackups).catch(() => setBackups([]))
    window.electronAPI?.getEncryptionStatus().then(setEncrypted).catch(() => setEncrypted(null))
  }, [open])

  const handleClose = () => {
    setError(null)
    onClose()
  }

  const formatDate = (ms: number) =>
    new Date(ms).toLocaleString(i18n.language === 'de' ? 'de-DE' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  const restore = async (backup: BackupEntry) => {
    try {
      const raw = await window.electronAPI!.readBackup(backup.name)
      const state = parseStoredState(raw)
      if (!state) {
        setError(t('backup.restoreFailed'))
        return
      }
      dispatch({ type: 'LOAD_STATE', payload: state })
      handleClose()
    } catch {
      setError(t('backup.restoreFailed'))
    }
  }

  return (
    <>
      <Dialog open={open} onClose={handleClose} title={t('backup.title')}>
        <p className="text-sm text-secondary-foreground">{t('backup.description')}</p>
        {encrypted !== null && (
          <p className={`mt-2 text-xs ${encrypted ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400'}`}>
            {encrypted ? t('backup.encryptionOn') : t('backup.encryptionOff')}
          </p>
        )}
        {error && (
          <div className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}
        {backups.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t('backup.empty')}</p>
        ) : (
          <ul className="mt-4 max-h-72 space-y-1 overflow-y-auto">
            {backups.map(backup => (
              <li
                key={backup.name}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{formatDate(backup.createdAt)}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(backup.size)}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setConfirmTarget(backup)}>
                  {t('backup.restore')}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={handleClose}>
            {t('common.close')}
          </Button>
        </div>
      </Dialog>
      <ConfirmDialog
        open={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => confirmTarget && restore(confirmTarget)}
        title={t('backup.confirmTitle')}
        message={t('backup.confirmMessage', { date: confirmTarget ? formatDate(confirmTarget.createdAt) : '' })}
        confirmLabel={t('backup.restore')}
      />
    </>
  )
}
