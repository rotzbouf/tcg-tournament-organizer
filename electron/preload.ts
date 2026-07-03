import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (data: string, defaultName?: string) =>
    ipcRenderer.invoke('file:save', data, defaultName),
  openFile: () => ipcRenderer.invoke('file:open'),
  saveCsv: (data: string, defaultName?: string) => ipcRenderer.invoke('file:saveCsv', data, defaultName),
  savePdf: (html: string, defaultName?: string) => ipcRenderer.invoke('file:savePdf', html, defaultName),
  syncState: (state: string) => ipcRenderer.send('state:sync', state),
  syncTimerState: (timers: string) => ipcRenderer.send('timer:sync', timers),
  onDispatchAction: (callback: (action: string) => void) => {
    ipcRenderer.on('action:dispatch', (_event, action: string) => callback(action))
  },
  startServer: (tournamentId: string) => ipcRenderer.invoke('server:start', tournamentId),
  stopServer: (tournamentId: string) => ipcRenderer.invoke('server:stop', tournamentId),
  getServerInfo: (tournamentId: string) => ipcRenderer.invoke('server:getInfo', tournamentId),
  openQrWindow: (opts: { tournamentName: string; url: string; qrSvg: string }) => ipcRenderer.invoke('window:openQr', opts),
  onJudgeCall: (callback: (data: string) => void) => {
    ipcRenderer.on('judge:call', (_event, data: string) => callback(data))
  },
  onMatchReport: (callback: (data: string) => void) => {
    ipcRenderer.on('match:report', (_event, data: string) => callback(data))
  },
  loadBanlists: () => ipcRenderer.invoke('banlist:load'),
  fetchBanlist: (game: string, format: string) => ipcRenderer.invoke('banlist:fetch', game, format),
  deleteBanlist: (game: string, format: string) => ipcRenderer.invoke('banlist:delete', game, format),
})
