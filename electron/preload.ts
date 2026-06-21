import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (data: string, defaultName?: string) =>
    ipcRenderer.invoke('file:save', data, defaultName),
  openFile: () => ipcRenderer.invoke('file:open'),
  syncState: (state: string) => ipcRenderer.send('state:sync', state),
  syncTimerState: (timers: string) => ipcRenderer.send('timer:sync', timers),
  onDispatchAction: (callback: (action: string) => void) => {
    ipcRenderer.on('action:dispatch', (_event, action: string) => callback(action))
  },
  startServer: (tournamentId: string) => ipcRenderer.invoke('server:start', tournamentId),
  stopServer: (tournamentId: string) => ipcRenderer.invoke('server:stop', tournamentId),
  getServerInfo: (tournamentId: string) => ipcRenderer.invoke('server:getInfo', tournamentId),
})
