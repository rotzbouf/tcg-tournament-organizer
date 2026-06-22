import { ipcMain, BrowserWindow } from 'electron'
import { createRequire } from 'node:module'
import { startServer, stopServer, getServerInfo, stopAllServers } from '../server/index'
import { broadcast, getClientCount } from '../server/sse'

let currentState: string | null = null
let currentTimers: string | null = null
let mainWindowRef: BrowserWindow | null = null
const stateListeners: Array<() => void> = []

export function registerStateSyncHandlers(mainWindow: BrowserWindow) {
  mainWindowRef = mainWindow

  ipcMain.on('state:sync', (_event, state: string) => {
    currentState = state
    stateListeners.forEach(fn => fn())
    try {
      broadcast({ type: 'state', state: JSON.parse(state), timers: currentTimers ? JSON.parse(currentTimers) : null })
    } catch { /* ignore */ }
  })

  ipcMain.on('timer:sync', (_event, timers: string) => {
    currentTimers = timers
    try {
      broadcast({ type: 'timers', timers: JSON.parse(timers) })
    } catch { /* ignore */ }
  })

  ipcMain.handle('server:start', async (_event, tournamentId: string) => {
    const { address, port } = await startServer(tournamentId)
    const url = `http://${address}:${port}`
    let qrCodeSvg = ''
    try {
      const req = createRequire(__filename)
      const QRCode = req('qrcode')
      qrCodeSvg = await QRCode.toString(url, { type: 'svg' })
    } catch (err) {
      console.error('QR code generation failed:', err)
    }
    return { address, port, qrCodeSvg }
  })

  ipcMain.handle('server:stop', async (_event, tournamentId: string) => {
    await stopServer(tournamentId)
  })

  ipcMain.handle('server:getInfo', (_event, tournamentId: string) => {
    const info = getServerInfo(tournamentId)
    return { ...info, clientCount: getClientCount() }
  })
}

export function registerCleanup() {
  stopAllServers()
}

export function getCurrentState(): unknown | null {
  if (!currentState) return null
  try {
    return JSON.parse(currentState)
  } catch {
    return null
  }
}

export function getCurrentTimers(): Record<string, unknown> | null {
  if (!currentTimers) return null
  try {
    return JSON.parse(currentTimers)
  } catch {
    return null
  }
}

export function onStateChange(callback: () => void): () => void {
  stateListeners.push(callback)
  return () => {
    const idx = stateListeners.indexOf(callback)
    if (idx !== -1) stateListeners.splice(idx, 1)
  }
}

export function dispatchToRenderer(action: unknown): void {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('action:dispatch', JSON.stringify(action))
  }
}

export { getClientCount } from '../server/sse'
