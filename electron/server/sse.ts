import http from 'node:http'

const clients = new Set<http.ServerResponse>()
let keepaliveInterval: ReturnType<typeof setInterval> | null = null

export function addClient(res: http.ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })
  res.write(':ok\n\n')
  clients.add(res)
  res.on('close', () => clients.delete(res))

  if (!keepaliveInterval) {
    keepaliveInterval = setInterval(() => {
      for (const client of clients) {
        client.write(':ping\n\n')
      }
    }, 30000)
  }
}

export function broadcast(data: unknown): void {
  const message = `data: ${JSON.stringify(data)}\n\n`
  for (const client of clients) {
    client.write(message)
  }
}

export function getClientCount(): number {
  return clients.size
}

export function closeAll(): void {
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval)
    keepaliveInterval = null
  }
  for (const client of clients) {
    client.end()
  }
  clients.clear()
}
