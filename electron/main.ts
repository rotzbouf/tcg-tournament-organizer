import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { registerFileHandlers } from './ipc/fileHandlers'
import { registerStateSyncHandlers } from './ipc/stateSync'
import { registerBanlistHandlers } from './ipc/banlistHandlers'
import { stopAllServers } from './server/index'

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

let mainWindow: BrowserWindow | null = null
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

// Applies to every window (main, QR popups): the app never opens child
// windows itself, and navigation may only stay on the app's own origin
// (dev server in dev, local files in production).
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
  contents.on('will-navigate', (event, url) => {
    const allowed = VITE_DEV_SERVER_URL
      ? url.startsWith(VITE_DEV_SERVER_URL)
      : url.startsWith('file://')
    if (!allowed) event.preventDefault()
  })
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'TCG Tournament Organizer',
  })

  registerStateSyncHandlers(mainWindow)

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(process.env.DIST!, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  stopAllServers()
  if (process.platform !== 'darwin') {
    app.quit()
    mainWindow = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  registerFileHandlers()
  registerBanlistHandlers()
  createWindow()
})
