import { getSession, normalizeRole } from '../auth'

const EMBEDDED_API_BASE = 'https://rosas.uy/api-server'
const EMBEDDED_API_TOKEN = 'gh2t2oNre50TR4ZucrkssNPFb8LnDhD5JT9gM89ERy4'

const RAW_BASE = String(import.meta.env.VITE_API_URL || EMBEDDED_API_BASE).trim()
const BASE_URL = RAW_BASE.replace(/\/+$/, '')
const IPC_ENDPOINT = BASE_URL ? `${BASE_URL}/api/admin/ipc` : '/api/admin/ipc'
const API_TOKEN = String(import.meta.env.VITE_API_TOKEN || EMBEDDED_API_TOKEN).trim()

function encodeIpcArgs(args: any[]) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(Array.isArray(args) ? args : []))))
  } catch {
    return ''
  }
}

async function invoke(channel: string, ...args: any[]) {
  const fetchFn = globalThis.fetch
  if (typeof fetchFn !== 'function') {
    throw new Error('Fetch no disponible')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (API_TOKEN) {
    headers.Authorization = `Bearer ${API_TOKEN}`
    headers['X-API-KEY'] = API_TOKEN
  }

  const safeChannel = String(channel || '')
  const encodedArgs = encodeIpcArgs(args)
  headers['X-RR-IPC-Channel'] = safeChannel
  if (encodedArgs) {
    headers['X-RR-IPC-Args'] = encodedArgs
  }

  const endpoint = `${IPC_ENDPOINT}?channel=${encodeURIComponent(safeChannel)}`

  const response = await fetchFn(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ channel, args })
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
    throw new Error(message)
  }

  if (payload && typeof payload === 'object') {
    if (payload.__ipc_error) {
      const err = new Error(payload.message || 'IPC error')
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
}

function getActor() {
  const session = getSession()
  return {
    username: session?.username || '',
    role: normalizeRole(session?.role || '')
  }
}

function withActor<T extends Record<string, any>>(payload: T | null | undefined): T & { actor: { username: string; role: string } } {
  return {
    ...(payload || {} as T),
    actor: getActor()
  }
}

export const api = {
  // Reservas
  crearReserva: (d: any) => invoke('reservas:crear', withActor(d)),
  obtenerReserva: (id: number) => invoke('reservas:obtener', id),
  borrarReserva: (id: number) => invoke('reservas:borrar', { id, actor: getActor() }),
  moverReserva: (d: any) => invoke('reservas:mover', withActor(d)),
  actualizarEstadoReserva: (id: number, estado: string) => invoke('reservas:estado', withActor({ id, estado })),
  actualizarReserva: (d: any) => invoke('reservas:actualizar', withActor(d)),
  obtenerReservasSemana: (d: any) => invoke('reservas:semana', d),
  obtenerReservasDia: (d: any) => invoke('reservas:dia', d),
  obtenerTodasLasReservas: () => invoke('reservas:todas'),
  actualizarNotasReserva: (id: number, notas: string) => invoke('reservas:actualizar-notas', { id, notas, actor: getActor() }),
  obtenerCambiosReservas: (d: any) => invoke('reservas:cambios', d),

  // Registros
  obtenerRegistroMensual: (d: any) => invoke('registros:mensual', d),

  // Aprontes
  crearApronte: (d: any) => invoke('aprontes:crear', withActor(d)),
  obtenerApronte: (id: number) => invoke('aprontes:obtener', id),
  borrarApronte: (id: number) => invoke('aprontes:borrar', { id, actor: getActor() }),
  actualizarApronte: (d: any) => invoke('aprontes:actualizar', withActor(d)),
  obtenerAprontesFecha: (f: string) => invoke('aprontes:fecha', f),
  obtenerAprontes: () => invoke('aprontes:todas'),
  obtenerConfigAlertasAprontes: () => invoke('aprontes:alertas:config:get'),
  guardarConfigAlertasAprontes: (d: any) => invoke('aprontes:alertas:config:set', d),
  obtenerConfigResumenDiario: () => invoke('resumen-diario:config:get'),
  guardarConfigResumenDiario: (d: any) => invoke('resumen-diario:config:set', d),
  enviarResumenDiario: (d: any) => invoke('resumen-diario:enviar', d),

  // Horarios
  obtenerHorariosBase: () => invoke('horarios:base'),
  obtenerHorariosInactivos: () => invoke('horarios:inactivos'),
  obtenerHorariosDisponibles: (f: string) => invoke('horarios:disponibles', f),
  crearHorario: (h: string) => invoke('horarios:crear', h),
  desactivarHorario: (id: number) => invoke('horarios:desactivar', id),
  activarHorario: (id: number) => invoke('horarios:activar', id),
  bloquearHorario: (d: any) => invoke('horarios:bloquear', d),
  desbloquearHorario: (d: any) => invoke('horarios:desbloquear', d),
  obtenerHorariosBloqueados: (f: string) => invoke('horarios:bloqueados', f),
  borrarHorarioPermanente: (id: number) => invoke('horarios:borrar', id),

  // Horarios Aprontes
  obtenerHorariosAprontesBase: () => invoke('horarios-aprontes:base'),
  obtenerHorariosAprontesInactivos: () => invoke('horarios-aprontes:inactivos'),
  obtenerHorariosAprontesDisponibles: (f: string) => invoke('horarios-aprontes:disponibles', f),
  crearHorarioApronte: (d: { hora: string; cupo?: number }) => invoke('horarios-aprontes:crear', d),
  actualizarCupoHorarioApronte: (d: { id: number; cupo: number }) => invoke('horarios-aprontes:actualizar-cupo', d),
  desactivarHorarioApronte: (id: number) => invoke('horarios-aprontes:desactivar', id),
  activarHorarioApronte: (id: number) => invoke('horarios-aprontes:activar', id),
  borrarHorarioApronte: (id: number) => invoke('horarios-aprontes:borrar', id),

  // Historial
  obtenerHistorial: (id: number) => invoke('historial:obtener', id),

  // Vehiculos
  obtenerVehiculos: () => invoke('vehiculos:todos'),
  obtenerHistorialVehiculo: (vehiculoId: number) => invoke('vehiculos:historial', vehiculoId),
  obtenerVehiculoMysqlPorMatricula: (matricula: string) => invoke('vehiculos:mysql-by-matricula', matricula),

  // Motos catalogo
  obtenerMarcasMoto: () => invoke('motos:marcas'),
  obtenerModelosMoto: (marca?: string) => invoke('motos:modelos', marca),

  // Configuracion
  obtenerEnvConfig: () => invoke('config:env:get'),
  guardarEnvConfig: (text: string) => invoke('config:env:set', text),
  probarConexionDB: () => invoke('config:db:test'),
  probarConexionApi: async () => {
    if (!BASE_URL) {
      return { ok: false, error: 'VITE_API_URL no configurada' }
    }

    const fetchFn = globalThis.fetch
    if (typeof fetchFn !== 'function') {
      return { ok: false, error: 'Fetch no disponible' }
    }

    const headers: Record<string, string> = {}
    if (API_TOKEN) {
      headers.Authorization = `Bearer ${API_TOKEN}`
      headers['X-API-KEY'] = API_TOKEN
    }

    const response = await fetchFn(`${BASE_URL}/api/health`, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      return { ok: false, error: `Health check fallo (${response.status})` }
    }

    return { ok: true, error: '' }
  },

  // Usuarios / Auth
  obtenerUsuariosLogin: () => invoke('usuarios:login-list'),
  login: (username: string, password: string) => invoke('auth:login', username, password),
  cambiarPasswordPropia: (data: { username: string; currentPassword: string; newPassword: string }) => invoke('auth:change-password', data),
  listarUsuarios: () => invoke('usuarios:list'),
  crearUsuario: (data: any) => invoke('usuarios:create', data),
  actualizarUsuario: (data: any) => invoke('usuarios:update', data),
  borrarUsuario: (data: { id: number; actor: { username: string; role: string } }) => invoke('usuarios:delete', data),
  actualizarPasswordUsuario: (data: { id: number; password: string; actor: { username: string; role: string } }) => invoke('usuarios:password', data),

  // Auditoria
  obtenerAuditoriaUsuarios: () => invoke('auditoria:list')
}



