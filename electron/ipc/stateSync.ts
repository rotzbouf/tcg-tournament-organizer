import { ipcMain, BrowserWindow } from 'electron'

let currentState: string | null = null
let currentTimers: string | null = null
let mainWindowRef: BrowserWindow | null = null
const stateListeners: Array<() => void> = []

export function registerStateSyncHandlers(mainWindow: BrowserWindow) {
  mainWindowRef = mainWindow

  ipcMain.on('state:sync', (_event, state: string) => {
    currentState = state
    stateListeners.forEach(fn => fn())
  })

  ipcMain.on('timer:sync', (_event, timers: string) => {
    currentTimers = timers
    stateListeners.forEach(fn => fn())
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

export function getClientCount(): number {
  return 0
}
