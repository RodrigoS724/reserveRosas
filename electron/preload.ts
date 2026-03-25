import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

const invokeSafe = async (...args: Parameters<typeof ipcRenderer.invoke>) => {
  const result = await ipcRenderer.invoke(...args)
  if (result && typeof result === 'object' && result.__ipc_error) {
    const err = new Error(result.message || 'IPC error')
    if (result.stack) {
      err.stack = result.stack
    }
    throw err
  }
  return result
}

contextBridge.exposeInMainWorld('api', {
  // Reservas
  crearReserva: (d: any) => invokeSafe('reservas:crear', d),
  obtenerReserva: (id: number) => invokeSafe('reservas:obtener', id),
  borrarReserva: (id: number) => invokeSafe('reservas:borrar', id),
  moverReserva: (d: any) => invokeSafe('reservas:mover', d), actualizarReserva: (d: any) => invokeSafe('reservas:actualizar', d),
  obtenerReservasSemana: (d: any) => invokeSafe('reservas:semana', d),
  obtenerReservasDia: (d: any) => invokeSafe('reservas:dia', d),
  obtenerTodasLasReservas: () => invokeSafe('reservas:todas'), actualizarNotasReserva: (id: number, notas: string) => invokeSafe('reservas:actualizar-notas', id, notas),
  obtenerCambiosReservas: (d: any) => invokeSafe('reservas:cambios', d),

  // Aprontes
  crearApronte: (d: any) => invokeSafe('aprontes:crear', d),
  obtenerApronte: (id: number) => invokeSafe('aprontes:obtener', id),
  borrarApronte: (id: number) => invokeSafe('aprontes:borrar', id),
  actualizarApronte: (d: any) => invokeSafe('aprontes:actualizar', d),
  obtenerAprontesFecha: (f: string) => invokeSafe('aprontes:fecha', f),
  obtenerAprontes: () => invokeSafe('aprontes:todas'),
  obtenerConfigResumenDiario: () => invokeSafe('resumen-diario:config:get'),
  guardarConfigResumenDiario: (d: any) => invokeSafe('resumen-diario:config:set', d),
  enviarResumenDiario: (d: any) => invokeSafe('resumen-diario:enviar', d),

  // Horarios
  obtenerHorariosBase: () => invokeSafe('horarios:base'),
  obtenerHorariosInactivos: () => invokeSafe('horarios:inactivos'),
  obtenerHorariosDisponibles: (f: string) => invokeSafe('horarios:disponibles', f),
  crearHorario: (h: string) => invokeSafe('horarios:crear', h),
  desactivarHorario: (id: number) => invokeSafe('horarios:desactivar', id), activarHorario: (id: number) => invokeSafe('horarios:activar', id),
  bloquearHorario: (d: any) => invokeSafe('horarios:bloquear', d),
  desbloquearHorario: (d: any) => invokeSafe('horarios:desbloquear', d),
  obtenerHorariosBloqueados: (f: string) => invokeSafe('horarios:bloqueados', f),
  borrarHorarioPermanente: (id: number) => invokeSafe('horarios:borrar', id),

  // Horarios Aprontes
  obtenerHorariosAprontesBase: () => invokeSafe('horarios-aprontes:base'),
  obtenerHorariosAprontesInactivos: () => invokeSafe('horarios-aprontes:inactivos'),
  obtenerHorariosAprontesDisponibles: (f: string) => invokeSafe('horarios-aprontes:disponibles', f),
  crearHorarioApronte: (d: { hora: string; cupo?: number }) => invokeSafe('horarios-aprontes:crear', d),
  actualizarCupoHorarioApronte: (d: { id: number; cupo: number }) => invokeSafe('horarios-aprontes:actualizar-cupo', d),
  desactivarHorarioApronte: (id: number) => invokeSafe('horarios-aprontes:desactivar', id),
  activarHorarioApronte: (id: number) => invokeSafe('horarios-aprontes:activar', id),
  borrarHorarioApronte: (id: number) => invokeSafe('horarios-aprontes:borrar', id),

  // Historial
  obtenerHistorial: (id: number) => invokeSafe('historial:obtener', id),

  // Vehiculos
  obtenerVehiculos: () => invokeSafe('vehiculos:todos'),
  obtenerHistorialVehiculo: (vehiculoId: number) => invokeSafe('vehiculos:historial', vehiculoId),
  obtenerVehiculoMysqlPorMatricula: (matricula: string) => invokeSafe('vehiculos:mysql-by-matricula', matricula),

  // Configuración
  obtenerEnvConfig: () => invokeSafe('config:env:get'),
  guardarEnvConfig: (text: string) => invokeSafe('config:env:set', text),
  probarConexionDB: () => invokeSafe('config:db:test'),

  // Usuarios / Auth
  obtenerUsuariosLogin: () => invokeSafe('usuarios:login-list'),
  login: (username: string, password: string) => invokeSafe('auth:login', username, password),
  listarUsuarios: () => invokeSafe('usuarios:list'),
  crearUsuario: (data: any) => invokeSafe('usuarios:create', data), actualizarUsuario: (data: any) => invokeSafe('usuarios:update', data),
  borrarUsuario: (data: { id: number; actor: { username: string; role: string } }) => invokeSafe('usuarios:delete', data), actualizarPasswordUsuario: (data: { id: number; password: string; actor: { username: string; role: string } }) => invokeSafe('usuarios:password', data),

  // Auditoría
  obtenerAuditoriaUsuarios: () => invokeSafe('auditoria:list')
})


