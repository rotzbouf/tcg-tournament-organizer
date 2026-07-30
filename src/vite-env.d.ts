/// <reference types="vite/client" />

interface ElectronAPI {
  saveFile: (data: string, defaultName?: string) => Promise<string | null>
  openFile: () => Promise<string | null>
  saveCsv: (data: string, defaultName?: string) => Promise<string | null>
  saveTextFile: (data: string, defaultName: string, filter: { name: string; extensions: string[] }) => Promise<string | null>
  savePdf: (html: string, defaultName?: string) => Promise<string | null>
  syncState: (state: string) => void
  loadStorageState: () => { state: string; recoveredFrom: string | null; recoveredAt: number | null } | null
  flushStorageState: (state: string) => boolean
  listBackups: () => Promise<{ name: string; createdAt: number; size: number }[]>
  readBackup: (name: string) => Promise<string>
  getEncryptionStatus: () => Promise<boolean>
  syncTimerState: (timers: string) => void
  onDispatchAction: (callback: (action: string) => void) => void
  startServer: (tournamentId: string) => Promise<{ address: string; port: number }>
  stopServer: (tournamentId: string) => Promise<void>
  getServerInfo: (tournamentId: string) => Promise<{ running: boolean; address?: string; port?: number; clientCount?: number }>
  getPlayerToken: (tournamentId: string, playerId: string) => Promise<string | null>
  getJudgeToken: (tournamentId: string, label?: string) => Promise<string | null>
  listJudgeTokens: (tournamentId: string) => Promise<Array<{ token: string; label: string; createdAt: number }>>
  revokeJudgeToken: (tournamentId: string, token?: string) => Promise<void>
  openQrWindow: (opts: { tournamentName: string; url: string; qrSvg: string; hint?: string }) => Promise<void>
  onJudgeCall: (callback: (data: string) => void) => void
  onMatchReport: (callback: (data: string) => void) => void
  onDecklistSubmitted: (callback: (data: string) => void) => void
  loadBanlists: () => Promise<import('./types/banlist').BanlistStore>
  fetchBanlist: (game: string, format: string) => Promise<import('./types/banlist').BanlistData>
  deleteBanlist: (game: string, format: string) => Promise<void>
}

interface Window {
  electronAPI?: ElectronAPI
}
