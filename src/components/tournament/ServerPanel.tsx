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

interface JudgeTokenEntry {
  token: string
  label: string
  createdAt: number
}

export function ServerPanel({ tournamentId, tournamentName }: ServerPanelProps) {
  const { t } = useTranslation()
  const [info, setInfo] = useState<ServerInfo>({ running: false })
  const [qrSvg, setQrSvg] = useState<string>('')
  const [judgeRevoked, setJudgeRevoked] = useState(false)
  const [judgeLabel, setJudgeLabel] = useState('')
  const [judgeTokens, setJudgeTokens] = useState<JudgeTokenEntry[]>([])

  const refreshJudgeTokens = useCallback(() => {
    window.electronAPI?.listJudgeTokens(tournamentId).then(list => setJudgeTokens(list ?? []))
  }, [tournamentId])

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
    refreshJudgeTokens()
  }, [tournamentId, updateQr, refreshJudgeTokens])

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
  const openJudgeQrWindow = async (token: string, label: string) => {
    if (!url) return
    try {
      const svg = await QRCode.toString(`${url}/#judge=${token}`, { type: 'svg' })
      window.electronAPI?.openQrWindow({
        tournamentName: `${tournamentName} — Judge${label ? ` ${label}` : ''}`,
        url,
        qrSvg: svg,
        hint: t('server.judgeQrHint'),
      })
    } catch { /* QR generation failed; nothing to show */ }
  }

  // One token per judge: the label is the audit identity shown on penalties,
  // results and drops entered from that device.
  const handleCreateJudge = async () => {
    if (!url) return
    const token = await window.electronAPI?.getJudgeToken(tournamentId, judgeLabel.trim())
    if (!token) return
    await openJudgeQrWindow(token, judgeLabel.trim())
    setJudgeLabel('')
    setJudgeRevoked(false)
    refreshJudgeTokens()
  }

  const handleRevokeJudge = async (token?: string) => {
    await window.electronAPI?.revokeJudgeToken(tournamentId, token)
    if (!token) setJudgeRevoked(true)
    refreshJudgeTokens()
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
              <input
                type="text"
                value={judgeLabel}
                onChange={e => setJudgeLabel(e.target.value)}
                placeholder={t('server.judgeLabelPh')}
                maxLength={60}
                className="w-48 rounded border border-border bg-card px-2 py-1 text-sm text-foreground focus:border-blue-500 focus:outline-none"
              />
              <Button variant="secondary" size="sm" onClick={handleCreateJudge}>
                {t('server.judgeCreate')}
              </Button>
            </div>
            {judgeTokens.length > 0 && (
              <div className="divide-y divide-muted rounded-lg border border-border">
                {judgeTokens.map(entry => (
                  <div key={entry.token} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <span className="text-sm font-medium text-foreground">⚖ {entry.label || t('server.judgeUnnamed')}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {t('server.judgeIssuedAt', { time: new Date(entry.createdAt).toLocaleTimeString() })}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openJudgeQrWindow(entry.token, entry.label)}>
                        {t('server.judgeShowQr')}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleRevokeJudge(entry.token)}>
                        {t('server.judgeRevokeOne')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {judgeTokens.length > 1 && (
              <Button variant="secondary" size="sm" onClick={() => handleRevokeJudge()}>
                {t('server.judgeRevokeAll')}
              </Button>
            )}
            {judgeRevoked && (
              <p className="text-xs text-green-600">{t('server.judgeRevoked')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
