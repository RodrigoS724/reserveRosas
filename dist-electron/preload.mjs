"use strict";
const electron = require("electron");
console.log("✅ PRELOAD CARGADO OK");
electron.contextBridge.exposeInMainWorld("api", {
  // Reservas
  crearReserva: (d) => electron.ipcRenderer.invoke("reservas:crear", d),
  obtenerReserva: (id) => electron.ipcRenderer.invoke("reservas:obtener", id),
  borrarReserva: (id) => electron.ipcRenderer.invoke("reservas:borrar", id),
  moverReserva: (d) => electron.ipcRenderer.invoke("reservas:mover", d),
  actualizarReserva: (d) => electron.ipcRenderer.invoke("reservas:actualizar", d),
  obtenerReservasSemana: (d) => electron.ipcRenderer.invoke("reservas:semana", d),
  // Horarios
  obtenerHorariosBase: () => electron.ipcRenderer.invoke("horarios:base"),
  obtenerHorariosDisponibles: (f) => electron.ipcRenderer.invoke("horarios:disponibles", f),
  crearHorario: (h) => electron.ipcRenderer.invoke("horarios:crear", h),
  desactivarHorario: (id) => electron.ipcRenderer.invoke("horarios:desactivar", id),
  bloquearHorario: (d) => electron.ipcRenderer.invoke("horarios:bloquear", d),
  // Historial
  obtenerHistorial: (id) => electron.ipcRenderer.invoke("historial:obtener", id)
});
