/// <reference types="vite/client" />

interface ElectronAPI {
  saveFile: (data: string, defaultName?: string) => Promise<string | null>
  openFile: () => Promise<string | null>
  syncState: (state: string) => void
  syncTimerState: (timers: string) => void
  onDispatchAction: (callback: (action: string) => void) => void
  startServer: (tournamentId: string) => Promise<{ address: string; port: number; qrCodeSvg: string }>
  stopServer: (tournamentId: string) => Promise<void>
  getServerInfo: (tournamentId: string) => Promise<{ running: boolean; address?: string; port?: number; clientCount?: number }>
}

interface Window {
  electronAPI?: ElectronAPI
}
