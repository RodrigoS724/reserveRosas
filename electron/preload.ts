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

contextBridge.exposeInMainWorld('api', {
  // Reservas
  crearReserva: (d: any) => ipcRenderer.invoke('reservas:crear', d),
  obtenerReserva: (id: number) => ipcRenderer.invoke('reservas:obtener', id),
  borrarReserva: (id: number) => ipcRenderer.invoke('reservas:borrar', id),
  moverReserva: (d: any) => ipcRenderer.invoke('reservas:mover', d),
  actualizarReserva: (d: any) => ipcRenderer.invoke('reservas:actualizar', d),
  obtenerReservasSemana: (d: any) => ipcRenderer.invoke('reservas:semana', d),
  obtenerTodasLasReservas: () => ipcRenderer.invoke('reservas:todas'),
  actualizarNotasReserva: (id: number, notas: string) => ipcRenderer.invoke('reservas:actualizar-notas', id, notas),

  // Horarios
  obtenerHorariosBase: () => ipcRenderer.invoke('horarios:base'),
  obtenerHorariosInactivos: () => ipcRenderer.invoke('horarios:inactivos'),
  obtenerHorariosDisponibles: (f: string) => ipcRenderer.invoke('horarios:disponibles', f),
  crearHorario: (h: string) => ipcRenderer.invoke('horarios:crear', h),
  desactivarHorario: (id: number) => ipcRenderer.invoke('horarios:desactivar', id),
  activarHorario: (id: number) => ipcRenderer.invoke('horarios:activar', id),
  bloquearHorario: (d: any) => ipcRenderer.invoke('horarios:bloquear', d),
  desbloquearHorario: (d: any) => ipcRenderer.invoke('horarios:desbloquear', d),
  obtenerHorariosBloqueados: (f: string) => ipcRenderer.invoke('horarios:bloqueados', f),

  // Historial
  obtenerHistorial: (id: number) => ipcRenderer.invoke('historial:obtener', id)
})
