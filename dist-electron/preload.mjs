"use strict";
const electron = require("electron");
console.log("✅ PRELOAD CARGADO OK");
electron.contextBridge.exposeInMainWorld("api", {
  /* =========================
   * RESERVAS
   * ========================= */
  guardarReserva: (datos) => electron.ipcRenderer.invoke("reservas:guardar", datos),
  obtenerReservasSemana: (fechaBase) => electron.ipcRenderer.invoke("reservas:semana", fechaBase),
  moverReserva: (payload) => electron.ipcRenderer.invoke("reservas:mover", payload),
  actualizarReserva: (payload) => electron.ipcRenderer.invoke("reservas:actualizar", payload),
  /* =========================
   * HORARIOS
   * ========================= */
  obtenerHorariosBase: () => electron.ipcRenderer.invoke("horarios:base"),
  obtenerHorariosDisponibles: (fecha) => electron.ipcRenderer.invoke("horarios:disponibles", fecha),
  crearHorario: (hora) => electron.ipcRenderer.invoke("horarios:crear", hora),
  desactivarHorario: (id) => electron.ipcRenderer.invoke("horarios:desactivar", id),
  bloquearHorario: (payload) => electron.ipcRenderer.invoke("horarios:bloquear", payload),
  /* =========================
   * HISTORIAL
   * ========================= */
  obtenerHistorialReserva: (reservaId) => electron.ipcRenderer.invoke("historial:reserva", reservaId)
});
