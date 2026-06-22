import { ipcMain, dialog, BrowserWindow } from 'electron'
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

  ipcMain.handle('file:saveCsv', async (_event, data: string, defaultName?: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: defaultName ?? `tournament-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (canceled || !filePath) return null
    fs.writeFileSync(filePath, '﻿' + data, 'utf-8')
    return filePath
  })

  ipcMain.handle('file:savePdf', async (_event, html: string, defaultName?: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: defaultName ?? `tournament-${new Date().toISOString().slice(0, 10)}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (canceled || !filePath) return null

    const win = new BrowserWindow({ show: false, width: 800, height: 600 })
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      margins: { marginType: 'default' },
    })
    win.close()
    fs.writeFileSync(filePath, pdfData)
    return filePath
  })
}
