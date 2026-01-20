"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  guardarReserva: (datos) => electron.ipcRenderer.invoke("guardar-reserva", datos),
  obtenerOcupados: (fecha) => electron.ipcRenderer.invoke("obtener-ocupados", fecha),
  obtenerReservas: () => electron.ipcRenderer.invoke("obtener-reservas-semana")
});
