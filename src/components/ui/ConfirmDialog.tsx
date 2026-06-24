import { Dialog } from './Dialog'
import { Button } from './Button'
import { useTranslation } from 'react-i18next'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel }: ConfirmDialogProps) {
  const { t } = useTranslation()

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="text-sm text-secondary-foreground">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="destructive" onClick={handleConfirm}>
          {confirmLabel ?? t('common.confirm')}
        </Button>
      </div>
    </Dialog>
  )
}
