import { ipcMain, BrowserWindow, screen } from 'electron'
import { startServer, stopServer, getServerInfo, stopAllServers } from '../server/index'
import { broadcastState, broadcastTimers } from '../server/sse'

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
      broadcastState(JSON.parse(state), currentTimers ? JSON.parse(currentTimers) : null)
    } catch { /* ignore */ }
  })

  ipcMain.on('timer:sync', (_event, timers: string) => {
    currentTimers = timers
    try {
      broadcastTimers(JSON.parse(timers))
    } catch { /* ignore */ }
  })

  ipcMain.handle('server:start', async (_event, tournamentId: string) => {
    const { address, port } = await startServer(tournamentId)
    return { address, port }
  })

  ipcMain.handle('window:openQr', (_event, opts: { tournamentName: string; url: string; qrSvg: string }) => {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
    const winWidth = 420
    const winHeight = 570
    const qrWindows = BrowserWindow.getAllWindows().filter(w => w.getTitle().startsWith('QR:'))
    const offsetIndex = qrWindows.length
    const x = Math.min(100 + offsetIndex * 40, screenWidth - winWidth)
    const y = Math.min(100 + offsetIndex * 40, screenHeight - winHeight)

    const win = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      x,
      y,
      resizable: false,
      minimizable: true,
      maximizable: false,
      alwaysOnTop: true,
      title: `QR: ${opts.tournamentName}`,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })
    win.setMenuBarVisibility(false)

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; }
  h1 { font-size: 24px; color: #111; margin: 0 0 8px; text-align: center; padding: 0 16px; }
  .url { font-size: 14px; color: #2563eb; margin-bottom: 16px; font-family: monospace; }
  .qr { padding: 12px; background: #fff; border-radius: 12px; }
  .qr svg { width: 280px; height: 280px; }
  .hint { font-size: 13px; color: #888; margin-top: 16px; }
  .print-btn { margin-top: 12px; padding: 8px 24px; font-size: 14px; font-weight: 500; color: #fff;
    background: #2563eb; border: none; border-radius: 6px; cursor: pointer; }
  .print-btn:hover { background: #1d4ed8; }
  @media print { .print-btn { display: none; } }
</style></head><body>
  <h1>${opts.tournamentName.replace(/</g, '&lt;')}</h1>
  <div class="url">${opts.url}</div>
  <div class="qr">${opts.qrSvg}</div>
  <div class="hint">QR-Code scannen zum Anmelden</div>
  <button class="print-btn" onclick="window.print()">Drucken</button>
</body></html>`

    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  })

  ipcMain.handle('server:stop', async (_event, tournamentId: string) => {
    await stopServer(tournamentId)
  })

  ipcMain.handle('server:getInfo', (_event, tournamentId: string) => {
    return getServerInfo(tournamentId)
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

export function sendJudgeCall(data: { playerName: string; tableNumber: number }): void {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('judge:call', JSON.stringify(data))
  }
}

export function sendMatchReport(data: { matchId: string; result: string; reporterName: string; tournamentId: string }): void {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('match:report', JSON.stringify(data))
  }
}

export { getClientCount } from '../server/sse'
