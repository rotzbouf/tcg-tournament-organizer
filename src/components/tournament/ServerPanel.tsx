import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'

interface ServerInfo {
  running: boolean
  address?: string
  port?: number
  clientCount?: number
  qrCodeSvg?: string
}

export function ServerPanel() {
  const { t } = useTranslation()
  const [info, setInfo] = useState<ServerInfo>({ running: false })
  const [qrSvg, setQrSvg] = useState<string>('')

  useEffect(() => {
    window.electronAPI?.getServerInfo().then(setInfo)
  }, [])

  const handleStart = async () => {
    const result = await window.electronAPI?.startServer()
    if (result) {
      setInfo({ running: true, address: result.address, port: result.port })
      setQrSvg(result.qrCodeSvg)
    }
  }

  const handleStop = async () => {
    await window.electronAPI?.stopServer()
    setInfo({ running: false })
    setQrSvg('')
  }

  useEffect(() => {
    if (!info.running) return
    const interval = setInterval(async () => {
      const updated = await window.electronAPI?.getServerInfo()
      if (updated) setInfo(updated)
    }, 5000)
    return () => clearInterval(interval)
  }, [info.running])

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
          <span className="text-sm text-green-600 font-medium">{t('server.running')}</span>
        )}
        {!info.running && (
          <span className="text-sm text-gray-400">{t('server.stopped')}</span>
        )}
      </div>

      {info.running && url && (
        <div className="rounded-lg border border-gray-200 p-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700">{t('server.address')}</p>
            <p className="mt-1 font-mono text-lg text-blue-600">{url}</p>
          </div>

          {qrSvg && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{t('server.scanQR')}</p>
              <div
                className="inline-block rounded-lg bg-white p-3 border border-gray-200"
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
