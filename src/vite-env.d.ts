/// <reference types="vite/client" />

interface ElectronAPI {
  saveFile: (data: string, defaultName?: string) => Promise<string | null>
  openFile: () => Promise<string | null>
  saveCsv: (data: string, defaultName?: string) => Promise<string | null>
  savePdf: (html: string, defaultName?: string) => Promise<string | null>
  syncState: (state: string) => void
  syncTimerState: (timers: string) => void
  onDispatchAction: (callback: (action: string) => void) => void
  startServer: (tournamentId: string) => Promise<{ address: string; port: number }>
  stopServer: (tournamentId: string) => Promise<void>
  getServerInfo: (tournamentId: string) => Promise<{ running: boolean; address?: string; port?: number; clientCount?: number }>
  openQrWindow: (opts: { tournamentName: string; url: string; qrSvg: string }) => Promise<void>
  onJudgeCall: (callback: (data: string) => void) => void
  onMatchReport: (callback: (data: string) => void) => void
  loadBanlists: () => Promise<import('./types/banlist').BanlistStore>
  fetchBanlist: (game: string, format: string) => Promise<import('./types/banlist').BanlistData>
  deleteBanlist: (game: string, format: string) => Promise<void>
}

interface Window {
  electronAPI?: ElectronAPI
}
