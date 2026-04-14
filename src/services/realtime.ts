import { io, type Socket } from 'socket.io-client'

function resolveSocketConfig() {
  const envUrl = String(import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
  const fallbackUrl = envUrl || 'https://rosas.uy/api-socket-io'

  try {
    const parsed = new URL(fallbackUrl)
    const basePath = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.replace(/\/+$/, '') : ''
    return {
      origin: parsed.origin,
      path: `${basePath}/socket.io`,
    }
  } catch {
    return {
      origin: 'https://rosas.uy',
      path: '/api-socket-io/socket.io',
    }
  }
}

let socket: Socket | null = null
let initialized = false

export function initRealtime() {
  const socketConfig = resolveSocketConfig()

  if (initialized || !socketConfig.origin || typeof window === 'undefined') {
    return socket
  }

  initialized = true
  socket = io(socketConfig.origin, {
    path: socketConfig.path,
    transports: ['websocket', 'polling'],
    reconnection: true,
    timeout: 6000,
  })

  socket.on('connect', () => {
    window.dispatchEvent(
      new CustomEvent('rr:socket-status', {
        detail: { connected: true, at: new Date().toISOString() },
      })
    )
  })

  socket.on('disconnect', () => {
    window.dispatchEvent(
      new CustomEvent('rr:socket-status', {
        detail: { connected: false, at: new Date().toISOString() },
      })
    )
  })

  socket.on('rr:sync', (payload) => {
    window.dispatchEvent(new CustomEvent('rr:sync', { detail: payload || {} }))
  })

  return socket
}

export function stopRealtime() {
  socket?.disconnect()
  socket = null
  initialized = false
}
