import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/Button'

interface ServerPanelProps {
  tournamentId: string
  tournamentName: string
}

interface ServerInfo {
  running: boolean
  address?: string
  port?: number
  clientCount?: number
}

export function ServerPanel({ tournamentId, tournamentName }: ServerPanelProps) {
  const { t } = useTranslation()
  const [info, setInfo] = useState<ServerInfo>({ running: false })
  const [qrSvg, setQrSvg] = useState<string>('')
  const [judgeRevoked, setJudgeRevoked] = useState(false)

  const updateQr = useCallback(async (serverInfo: ServerInfo) => {
    if (serverInfo.running && serverInfo.address && serverInfo.port) {
      try {
        const svg = await QRCode.toString(`http://${serverInfo.address}:${serverInfo.port}`, { type: 'svg' })
        setQrSvg(svg)
      } catch {
        setQrSvg('')
      }
    }
  }, [])

  useEffect(() => {
    window.electronAPI?.getServerInfo(tournamentId).then(serverInfo => {
      setInfo(serverInfo)
      updateQr(serverInfo)
    })
  }, [tournamentId, updateQr])

  const handleStart = async () => {
    const result = await window.electronAPI?.startServer(tournamentId)
    if (result) {
      const serverInfo = { running: true, address: result.address, port: result.port }
      setInfo(serverInfo)
      updateQr(serverInfo)
    }
  }

  const handleStop = async () => {
    await window.electronAPI?.stopServer(tournamentId)
    setInfo({ running: false })
    setQrSvg('')
  }

  const handleOpenQrWindow = () => {
    if (!url || !qrSvg) return
    window.electronAPI?.openQrWindow({ tournamentName, url, qrSvg })
  }

  // The judge token travels only inside the QR code (URL fragment, never sent
  // to the server or logged); the window shows the plain URL without it.
  const handleJudgeQr = async () => {
    if (!url) return
    const token = await window.electronAPI?.getJudgeToken(tournamentId)
    if (!token) return
    try {
      const svg = await QRCode.toString(`${url}/#judge=${token}`, { type: 'svg' })
      window.electronAPI?.openQrWindow({
        tournamentName: `${tournamentName} — Judge`,
        url,
        qrSvg: svg,
        hint: t('server.judgeQrHint'),
      })
      setJudgeRevoked(false)
    } catch { /* QR generation failed; nothing to show */ }
  }

  const handleRevokeJudge = async () => {
    await window.electronAPI?.revokeJudgeToken(tournamentId)
    setJudgeRevoked(true)
  }

  useEffect(() => {
    if (!info.running) return
    const interval = setInterval(async () => {
      const updated = await window.electronAPI?.getServerInfo(tournamentId)
      if (updated) setInfo(updated)
    }, 5000)
    return () => clearInterval(interval)
  }, [info.running, tournamentId])

  const url = info.running && info.address ? `http://${info.address}:${info.port}` : null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {info.running ? (
          <Button variant="destructive" size="sm" onClick={handleStop}>{t('server.stop')}</Button>
        ) : (
          <Button onClick={handleStart}>{t('server.start')}</Button>
        )}
        {info.running && (
          <span className="text-sm font-medium text-green-600">{t('server.running')}</span>
        )}
        {!info.running && (
          <span className="text-sm text-muted-foreground">{t('server.stopped')}</span>
        )}
      </div>

      {info.running && url && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium text-secondary-foreground">{t('server.address')}</p>
            <p className="mt-1 font-mono text-lg text-blue-600">{url}</p>
          </div>

          <Button variant="secondary" size="sm" onClick={handleOpenQrWindow} disabled={!qrSvg}>
            {t('server.openQrWindow')}
          </Button>

          {info.clientCount !== undefined && info.clientCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {t('server.connectedClients', { count: info.clientCount })}
            </p>
          )}

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-sm font-medium text-secondary-foreground">{t('server.judgeAccess')}</p>
            <p className="text-xs text-muted-foreground">{t('server.judgeAccessHint')}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleJudgeQr}>
                {t('server.judgeQr')}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleRevokeJudge}>
                {t('server.judgeRevoke')}
              </Button>
            </div>
            {judgeRevoked && (
              <p className="text-xs text-green-600">{t('server.judgeRevoked')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
