import { ipcMain, dialog } from 'electron'
import fs from 'node:fs'

export function registerFileHandlers() {
  ipcMain.handle('file:save', async (_event, data: string, defaultName?: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: defaultName ?? `tcg-tournaments-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (canceled || !filePath) return null
    fs.writeFileSync(filePath, data, 'utf-8')
    return filePath
  })

  ipcMain.handle('file:open', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (canceled || filePaths.length === 0) return null
    return fs.readFileSync(filePaths[0], 'utf-8')
  })
}
