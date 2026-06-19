/// <reference types="vite/client" />

interface ElectronAPI {
  saveFile: (data: string, defaultName?: string) => Promise<string | null>
  openFile: () => Promise<string | null>
}

interface Window {
  electronAPI?: ElectronAPI
}
