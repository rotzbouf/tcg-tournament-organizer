import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'

interface ServerPanelProps {
  tournamentId: string
}

interface ServerInfo {
  running: boolean
  address?: string
  port?: number
  clientCount?: number
}

export function ServerPanel({ tournamentId }: ServerPanelProps) {
  const { t } = useTranslation()
  const [info, setInfo] = useState<ServerInfo>({ running: false })
  const [qrSvg, setQrSvg] = useState<string>('')

  useEffect(() => {
    window.electronAPI?.getServerInfo(tournamentId).then(setInfo)
  }, [tournamentId])

  const handleStart = async () => {
    const result = await window.electronAPI?.startServer(tournamentId)
    if (result) {
      setInfo({ running: true, address: result.address, port: result.port })
      setQrSvg(result.qrCodeSvg)
    }
  }

  const handleStop = async () => {
    await window.electronAPI?.stopServer(tournamentId)
    setInfo({ running: false })
    setQrSvg('')
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
          <span className="text-sm text-gray-400">{t('server.stopped')}</span>
        )}
      </div>

      {info.running && url && (
        <div className="space-y-4 rounded-lg border border-gray-200 p-4">
          <div>
            <p className="text-sm font-medium text-gray-700">{t('server.address')}</p>
            <p className="mt-1 font-mono text-lg text-blue-600">{url}</p>
          </div>

          {qrSvg && (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">{t('server.scanQR')}</p>
              <div
                className="inline-block rounded-lg border border-gray-200 bg-white p-3"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            </div>
          )}

          {info.clientCount !== undefined && info.clientCount > 0 && (
            <p className="text-sm text-gray-500">
              {t('server.connectedClients', { count: info.clientCount })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
