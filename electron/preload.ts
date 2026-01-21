import { contextBridge, ipcRenderer } from 'electron'

console.log('✅ PRELOAD CARGADO OK')

contextBridge.exposeInMainWorld('api', {
  /* =========================
   * RESERVAS
   * ========================= */
  guardarReserva: (datos: any) =>
    ipcRenderer.invoke('reservas:guardar', datos),

  obtenerReservasSemana: (fechaBase?: string) =>
    ipcRenderer.invoke('reservas:semana', fechaBase),

  moverReserva: (payload: {
    id: number
    nuevaFecha: string
    nuevaHora?: string
  }) =>
    ipcRenderer.invoke('reservas:mover', payload),

  actualizarReserva: (payload: any) =>
    ipcRenderer.invoke('reservas:actualizar', payload),

  /* =========================
   * HORARIOS
   * ========================= */
  obtenerHorariosBase: () =>
    ipcRenderer.invoke('horarios:base'),

  obtenerHorariosDisponibles: (fecha: string) =>
    ipcRenderer.invoke('horarios:disponibles', fecha),

  crearHorario: (hora: string) =>
    ipcRenderer.invoke('horarios:crear', hora),

  desactivarHorario: (id: number) =>
    ipcRenderer.invoke('horarios:desactivar', id),

  bloquearHorario: (payload: {
    fecha: string
    hora: string
    motivo?: string
  }) =>
    ipcRenderer.invoke('horarios:bloquear', payload),

  /* =========================
   * HISTORIAL
   * ========================= */
  obtenerHistorialReserva: (reservaId: number) =>
    ipcRenderer.invoke('historial:reserva', reservaId),
})
