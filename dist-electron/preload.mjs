"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
});
electron.contextBridge.exposeInMainWorld("api", {
  // Reservas
  crearReserva: (d) => electron.ipcRenderer.invoke("reservas:crear", d),
  obtenerReserva: (id) => electron.ipcRenderer.invoke("reservas:obtener", id),
  borrarReserva: (id) => electron.ipcRenderer.invoke("reservas:borrar", id),
  moverReserva: (d) => electron.ipcRenderer.invoke("reservas:mover", d),
  actualizarReserva: (d) => electron.ipcRenderer.invoke("reservas:actualizar", d),
  obtenerReservasSemana: (d) => electron.ipcRenderer.invoke("reservas:semana", d),
  obtenerTodasLasReservas: () => electron.ipcRenderer.invoke("reservas:todas"),
  actualizarNotasReserva: (id, notas) => electron.ipcRenderer.invoke("reservas:actualizar-notas", id, notas),
  // Horarios
  obtenerHorariosBase: () => electron.ipcRenderer.invoke("horarios:base"),
  obtenerHorariosInactivos: () => electron.ipcRenderer.invoke("horarios:inactivos"),
  obtenerHorariosDisponibles: (f) => electron.ipcRenderer.invoke("horarios:disponibles", f),
  crearHorario: (h) => electron.ipcRenderer.invoke("horarios:crear", h),
  desactivarHorario: (id) => electron.ipcRenderer.invoke("horarios:desactivar", id),
  activarHorario: (id) => electron.ipcRenderer.invoke("horarios:activar", id),
  bloquearHorario: (d) => electron.ipcRenderer.invoke("horarios:bloquear", d),
  desbloquearHorario: (d) => electron.ipcRenderer.invoke("horarios:desbloquear", d),
  obtenerHorariosBloqueados: (f) => electron.ipcRenderer.invoke("horarios:bloqueados", f),
  borrarHorarioPermanente: (id) => electron.ipcRenderer.invoke("horarios:borrar", id),
  // Historial
  obtenerHistorial: (id) => electron.ipcRenderer.invoke("historial:obtener", id)
});
