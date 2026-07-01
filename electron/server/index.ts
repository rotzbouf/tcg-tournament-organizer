import http from 'node:http'
import os from 'node:os'
import { handleRequest } from './router'
import { closeAll, getClientCount } from './sse'

interface ServerInstance {
  server: http.Server
  address: string
  port: number
  tournamentId: string
}

const servers = new Map<string, ServerInstance>()
let nextPort = 8080

export async function startServer(tournamentId: string): Promise<{ address: string; port: number }> {
  const existing = servers.get(tournamentId)
  if (existing) return { address: existing.address, port: existing.port }

  const port = nextPort++

  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => handleRequest(req, res, tournamentId))

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
        const address = getLocalIP()
        servers.set(tournamentId, { server: srv, address, port: addr.port, tournamentId })
        resolve({ address, port: addr.port })
      }
    })

    srv.listen(port)
  })
}

export async function stopServer(tournamentId: string): Promise<void> {
  const instance = servers.get(tournamentId)
  if (!instance) return
  closeAll(tournamentId)
  return new Promise((resolve) => {
    instance.server.close(() => {
      servers.delete(tournamentId)
      resolve()
    })
  })
}

export async function stopAllServers(): Promise<void> {
  closeAll()
  const promises = [...servers.values()].map(inst =>
    new Promise<void>(resolve => inst.server.close(() => resolve()))
  )
  await Promise.all(promises)
  servers.clear()
}

export function getServerInfo(tournamentId: string): { running: boolean; address?: string; port?: number; clientCount?: number } {
  const instance = servers.get(tournamentId)
  if (!instance) return { running: false }
  return { running: true, address: instance.address, port: instance.port, clientCount: getClientCount(tournamentId) }
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
