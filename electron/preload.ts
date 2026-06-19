import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (data: string, defaultName?: string) =>
    ipcRenderer.invoke('file:save', data, defaultName),
  openFile: () => ipcRenderer.invoke('file:open'),
})
