import http from 'node:http'
import os from 'node:os'
import { handleRequest } from './router'
import { closeAll, getClientCount } from './sse'

let server: http.Server | null = null
let serverAddress = ''
let serverPort = 0

export async function startServer(): Promise<{ address: string; port: number }> {
  if (server) return { address: serverAddress, port: serverPort }

  return new Promise((resolve, reject) => {
    const srv = http.createServer(handleRequest)

    srv.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        srv.listen(0)
      } else {
        reject(err)
      }
    })

    srv.on('listening', () => {
      const addr = srv.address()
      if (addr && typeof addr === 'object') {
        serverPort = addr.port
        serverAddress = getLocalIP()
        server = srv
        resolve({ address: serverAddress, port: serverPort })
      }
    })

    srv.listen(8080)
  })
}

export async function stopServer(): Promise<void> {
  closeAll()
  return new Promise((resolve) => {
    if (!server) { resolve(); return }
    server.close(() => {
      server = null
      serverAddress = ''
      serverPort = 0
      resolve()
    })
  })
}

export function getServerInfo(): { running: boolean; address?: string; port?: number; clientCount?: number } {
  if (!server) return { running: false }
  return { running: true, address: serverAddress, port: serverPort, clientCount: getClientCount() }
}

function getLocalIP(): string {
  const interfaces = os.networkInterfaces()
  for (const nets of Object.values(interfaces)) {
    if (!nets) continue
    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return '127.0.0.1'
}
