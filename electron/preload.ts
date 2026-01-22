import { contextBridge, ipcRenderer } from 'electron'

console.log('✅ PRELOAD CARGADO OK')

contextBridge.exposeInMainWorld('api', {
  // Reservas
  crearReserva: (d) => ipcRenderer.invoke('reservas:crear', d),
  obtenerReserva: (id) => ipcRenderer.invoke('reservas:obtener', id),
  borrarReserva: (id) => ipcRenderer.invoke('reservas:borrar', id),
  moverReserva: (d) => ipcRenderer.invoke('reservas:mover', d),
  actualizarReserva: (d) => ipcRenderer.invoke('reservas:actualizar', d),
  obtenerReservasSemana: (d) => ipcRenderer.invoke('reservas:semana', d),

  // Horarios
  obtenerHorariosBase: () => ipcRenderer.invoke('horarios:base'),
  obtenerHorariosDisponibles: (f) => ipcRenderer.invoke('horarios:disponibles', f),
  crearHorario: (h) => ipcRenderer.invoke('horarios:crear', h),
  desactivarHorario: (id) => ipcRenderer.invoke('horarios:desactivar', id),
  bloquearHorario: (d) => ipcRenderer.invoke('horarios:bloquear', d),

  // Historial
  obtenerHistorial: (id) => ipcRenderer.invoke('historial:obtener', id)
})
