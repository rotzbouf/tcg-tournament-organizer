import { ipcMain, BrowserWindow } from 'electron'
import { startServer, stopServer, getServerInfo } from '../server/index'
import { broadcast, getClientCount } from '../server/sse'
import QRCode from 'qrcode'

let currentState: string | null = null
let currentTimers: string | null = null
let mainWindowRef: BrowserWindow | null = null
const stateListeners: Array<() => void> = []

export function registerStateSyncHandlers(mainWindow: BrowserWindow) {
  mainWindowRef = mainWindow

  ipcMain.on('state:sync', (_event, state: string) => {
    currentState = state
    stateListeners.forEach(fn => fn())
    broadcast({ type: 'state', state: JSON.parse(state), timers: currentTimers ? JSON.parse(currentTimers) : null })
  })

  ipcMain.on('timer:sync', (_event, timers: string) => {
    currentTimers = timers
    broadcast({ type: 'timers', timers: JSON.parse(timers) })
  })

  ipcMain.handle('server:start', async () => {
    const { address, port } = await startServer()
    const url = `http://${address}:${port}`
    const qrCodeSvg = await QRCode.toString(url, { type: 'svg' })
    return { address, port, qrCodeSvg }
  })

  ipcMain.handle('server:stop', async () => {
    await stopServer()
  })

  ipcMain.handle('server:getInfo', () => {
    const info = getServerInfo()
    return { ...info, clientCount: getClientCount() }
  })
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
