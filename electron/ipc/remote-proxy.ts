import { app } from 'electron'

const EMBEDDED_REMOTE_URL = 'https://rosas.uy/api-server'
const EMBEDDED_REMOTE_TOKEN = 'gh2t2oNre50TR4ZucrkssNPFb8LnDhD5JT9gM89ERy4'

const LOCAL_ONLY_CHANNELS = new Set<string>([
  'config:env:get',
  'config:env:set',
  'config:api:test'
])

function getRemoteBaseUrl() {
  return String(process.env.API_REMOTE_URL || EMBEDDED_REMOTE_URL).trim().replace(/\/+$/, '')
}

function getRemoteToken() {
  return String(process.env.API_REMOTE_TOKEN || EMBEDDED_REMOTE_TOKEN).trim()
}

function buildAuthHeaders(token: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
    headers['X-API-KEY'] = token
  }
  return headers
}

function encodeIpcArgs(args: any[]) {
  try {
    return Buffer.from(JSON.stringify(Array.isArray(args) ? args : []), 'utf-8').toString('base64')
  } catch {
    return ''
  }
}

export function isRemoteBackendEnabled() {
  const base = getRemoteBaseUrl()
  if (!base) return false

  // En desarrollo preferimos backend local, salvo opt-in explícito.
  const allowInDev = String(process.env.API_REMOTE_IN_DEV || '0').trim().toLowerCase()
  if (!app.isPackaged && !['1', 'true', 'on', 'yes'].includes(allowInDev)) {
    return false
  }

  return true
}

export function shouldProxyChannel(channel: string) {
  if (!isRemoteBackendEnabled()) return false
  return !LOCAL_ONLY_CHANNELS.has(channel)
}

export async function proxyIpcToRemote(channel: string, args: any[]) {
  const baseUrl = getRemoteBaseUrl()
  if (!baseUrl) {
    throw new Error('API remota no configurada (API_REMOTE_URL).')
  }

  const encodedChannel = encodeURIComponent(String(channel || ''))
  const endpoint = `${baseUrl}/api/admin/ipc?channel=${encodedChannel}`
  const token = getRemoteToken()
  const headers = buildAuthHeaders(token)
  headers['X-RR-IPC-Channel'] = String(channel || '')
  const encodedArgs = encodeIpcArgs(args)
  if (encodedArgs) {
    headers['X-RR-IPC-Args'] = encodedArgs
  }

  const fetchFn = (globalThis as any).fetch
  if (typeof fetchFn !== 'function') {
    throw new Error('Fetch no disponible en este entorno.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetchFn(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ channel, args }),
      signal: controller.signal
    })

    const raw = await response.text()
    let payload: any = null
    try {
      payload = raw ? JSON.parse(raw) : null
    } catch {
      payload = null
    }

    if (!response.ok) {
      const message = payload?.error || payload?.message || raw || `HTTP ${response.status}`
      throw new Error(`API remota error (${response.status}): ${message}`)
    }

    if (payload && typeof payload === 'object') {
      if (payload.__ipc_error) {
        const err = new Error(payload.message || 'Error remoto')
        ;(err as any).stack = payload.stack || err.stack
        throw err
      }
      if (payload.ok === false) {
        throw new Error(payload.error || payload.message || 'Operacion remota rechazada')
      }
      if ('data' in payload) {
        return payload.data
      }
    }

    return payload
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Timeout llamando API remota (20s)')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function testRemoteApiConnection() {
  const baseUrl = getRemoteBaseUrl()
  if (!baseUrl) {
    return {
      ok: false,
      error: 'API remota no configurada (API_REMOTE_URL).'
    }
  }

  const token = getRemoteToken()
  const fetchFn = (globalThis as any).fetch
  if (typeof fetchFn !== 'function') {
    return {
      ok: false,
      error: 'Fetch no disponible en este entorno.'
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const pingHeaders = buildAuthHeaders(token)
    pingHeaders['X-RR-IPC-Channel'] = '__ping__'
    pingHeaders['X-RR-IPC-Args'] = encodeIpcArgs([])

    const healthResponse = await fetchFn(`${baseUrl}/api/health`, {
      method: 'GET',
      signal: controller.signal
    })
    if (!healthResponse.ok) {
      return {
        ok: false,
        error: `Health check fallo (${healthResponse.status}).`
      }
    }

    const authResponse = await fetchFn(`${baseUrl}/api/admin/ipc?channel=__ping__`, {
      method: 'POST',
      headers: pingHeaders,
      body: JSON.stringify({ channel: '__ping__', args: [] }),
      signal: controller.signal
    })

    if (authResponse.status === 401) {
      return {
        ok: false,
        error: 'Token API faltante o invalido (401).'
      }
    }

    if (!authResponse.ok) {
      return {
        ok: false,
        error: `API admin IPC no disponible (${authResponse.status}).`
      }
    }

    return {
      ok: true,
      error: ''
    }
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return {
        ok: false,
        error: 'Timeout validando API remota (15s).'
      }
    }
    return {
      ok: false,
      error: error?.message || 'Error validando API remota.'
    }
  } finally {
    clearTimeout(timeout)
  }
}

