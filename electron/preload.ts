import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (data: string, defaultName?: string) =>
    ipcRenderer.invoke('file:save', data, defaultName),
  openFile: () => ipcRenderer.invoke('file:open'),
  saveCsv: (data: string, defaultName?: string) => ipcRenderer.invoke('file:saveCsv', data, defaultName),
  saveTextFile: (data: string, defaultName: string, filter: { name: string; extensions: string[] }) => ipcRenderer.invoke('file:saveText', data, defaultName, filter),
  savePdf: (html: string, defaultName?: string) => ipcRenderer.invoke('file:savePdf', html, defaultName),
  syncState: (state: string) => ipcRenderer.send('state:sync', state),
  loadStorageState: () => ipcRenderer.sendSync('storage:load'),
  flushStorageState: (state: string) => ipcRenderer.sendSync('storage:flush', state),
  listBackups: () => ipcRenderer.invoke('storage:listBackups'),
  readBackup: (name: string) => ipcRenderer.invoke('storage:readBackup', name),
  getEncryptionStatus: () => ipcRenderer.invoke('storage:encryptionStatus'),
  syncTimerState: (timers: string) => ipcRenderer.send('timer:sync', timers),
  onDispatchAction: (callback: (action: string) => void) => {
    ipcRenderer.on('action:dispatch', (_event, action: string) => callback(action))
  },
  startServer: (tournamentId: string) => ipcRenderer.invoke('server:start', tournamentId),
  stopServer: (tournamentId: string) => ipcRenderer.invoke('server:stop', tournamentId),
  getServerInfo: (tournamentId: string) => ipcRenderer.invoke('server:getInfo', tournamentId),
  getPlayerToken: (tournamentId: string, playerId: string) => ipcRenderer.invoke('server:playerToken', tournamentId, playerId),
  getJudgeToken: (tournamentId: string) => ipcRenderer.invoke('server:judgeToken', tournamentId),
  revokeJudgeToken: (tournamentId: string) => ipcRenderer.invoke('server:revokeJudgeToken', tournamentId),
  openQrWindow: (opts: { tournamentName: string; url: string; qrSvg: string; hint?: string }) => ipcRenderer.invoke('window:openQr', opts),
  onJudgeCall: (callback: (data: string) => void) => {
    ipcRenderer.on('judge:call', (_event, data: string) => callback(data))
  },
  onMatchReport: (callback: (data: string) => void) => {
    ipcRenderer.on('match:report', (_event, data: string) => callback(data))
  },
  onDecklistSubmitted: (callback: (data: string) => void) => {
    ipcRenderer.on('decklist:submitted', (_event, data: string) => callback(data))
  },
  loadBanlists: () => ipcRenderer.invoke('banlist:load'),
  fetchBanlist: (game: string, format: string) => ipcRenderer.invoke('banlist:fetch', game, format),
  deleteBanlist: (game: string, format: string) => ipcRenderer.invoke('banlist:delete', game, format),
})
