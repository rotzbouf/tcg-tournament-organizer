/// <reference types="vite/client" />

interface ElectronAPI {
  saveFile: (data: string, defaultName?: string) => Promise<string | null>
  openFile: () => Promise<string | null>
  syncState: (state: string) => void
  syncTimerState: (timers: string) => void
  onDispatchAction: (callback: (action: string) => void) => void
  startServer: () => Promise<{ address: string; port: number; qrCodeSvg: string }>
  stopServer: () => Promise<void>
  getServerInfo: () => Promise<{ running: boolean; address?: string; port?: number; clientCount?: number }>
}

interface Window {
  electronAPI?: ElectronAPI
}
