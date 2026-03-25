const RAW_BASE = String(import.meta.env.VITE_API_URL || '').trim()
const BASE_URL = RAW_BASE.replace(/\/+$/, '')
const IPC_ENDPOINT = BASE_URL ? `${BASE_URL}/api/admin/ipc` : '/api/admin/ipc'
const API_TOKEN = String(import.meta.env.VITE_API_TOKEN || '').trim()

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
  }

  const response = await fetchFn(IPC_ENDPOINT, {
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

export const api = {
  // Reservas
  crearReserva: (d: any) => invoke('reservas:crear', d),
  obtenerReserva: (id: number) => invoke('reservas:obtener', id),
  borrarReserva: (id: number) => invoke('reservas:borrar', id),
  moverReserva: (d: any) => invoke('reservas:mover', d),
  actualizarReserva: (d: any) => invoke('reservas:actualizar', d),
  obtenerReservasSemana: (d: any) => invoke('reservas:semana', d),
  obtenerReservasDia: (d: any) => invoke('reservas:dia', d),
  obtenerTodasLasReservas: () => invoke('reservas:todas'),
  actualizarNotasReserva: (id: number, notas: string) => invoke('reservas:actualizar-notas', id, notas),
  obtenerCambiosReservas: (d: any) => invoke('reservas:cambios', d),

  // Aprontes
  crearApronte: (d: any) => invoke('aprontes:crear', d),
  obtenerApronte: (id: number) => invoke('aprontes:obtener', id),
  borrarApronte: (id: number) => invoke('aprontes:borrar', id),
  actualizarApronte: (d: any) => invoke('aprontes:actualizar', d),
  obtenerAprontesFecha: (f: string) => invoke('aprontes:fecha', f),
  obtenerAprontes: () => invoke('aprontes:todas'),
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

  // Configuracion
  obtenerEnvConfig: () => invoke('config:env:get'),
  guardarEnvConfig: (text: string) => invoke('config:env:set', text),
  probarConexionDB: () => invoke('config:db:test'),

  // Usuarios / Auth
  obtenerUsuariosLogin: () => invoke('usuarios:login-list'),
  login: (username: string, password: string) => invoke('auth:login', username, password),
  listarUsuarios: () => invoke('usuarios:list'),
  crearUsuario: (data: any) => invoke('usuarios:create', data),
  actualizarUsuario: (data: any) => invoke('usuarios:update', data),
  borrarUsuario: (data: { id: number; actor: { username: string; role: string } }) => invoke('usuarios:delete', data),
  actualizarPasswordUsuario: (data: { id: number; password: string; actor: { username: string; role: string } }) => invoke('usuarios:password', data),

  // Auditoria
  obtenerAuditoriaUsuarios: () => invoke('auditoria:list')
}


