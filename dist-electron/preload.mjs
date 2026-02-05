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
const invokeSafe = async (...args) => {
  const result = await electron.ipcRenderer.invoke(...args);
  if (result && typeof result === "object" && result.__ipc_error) {
    const err = new Error(result.message || "IPC error");
    if (result.stack) {
      err.stack = result.stack;
    }
    throw err;
  }
  return result;
};
electron.contextBridge.exposeInMainWorld("api", {
  // Reservas
  crearReserva: (d) => invokeSafe("reservas:crear", d),
  obtenerReserva: (id) => invokeSafe("reservas:obtener", id),
  borrarReserva: (id) => invokeSafe("reservas:borrar", id),
  moverReserva: (d) => invokeSafe("reservas:mover", d),
  actualizarReserva: (d) => invokeSafe("reservas:actualizar", d),
  obtenerReservasSemana: (d) => invokeSafe("reservas:semana", d),
  obtenerTodasLasReservas: () => invokeSafe("reservas:todas"),
  actualizarNotasReserva: (id, notas) => invokeSafe("reservas:actualizar-notas", id, notas),
  // Horarios
  obtenerHorariosBase: () => invokeSafe("horarios:base"),
  obtenerHorariosInactivos: () => invokeSafe("horarios:inactivos"),
  obtenerHorariosDisponibles: (f) => invokeSafe("horarios:disponibles", f),
  crearHorario: (h) => invokeSafe("horarios:crear", h),
  desactivarHorario: (id) => invokeSafe("horarios:desactivar", id),
  activarHorario: (id) => invokeSafe("horarios:activar", id),
  bloquearHorario: (d) => invokeSafe("horarios:bloquear", d),
  desbloquearHorario: (d) => invokeSafe("horarios:desbloquear", d),
  obtenerHorariosBloqueados: (f) => invokeSafe("horarios:bloqueados", f),
  borrarHorarioPermanente: (id) => invokeSafe("horarios:borrar", id),
  // Historial
  obtenerHistorial: (id) => invokeSafe("historial:obtener", id),
  // Vehiculos
  obtenerVehiculos: () => invokeSafe("vehiculos:todos"),
  obtenerHistorialVehiculo: (vehiculoId) => invokeSafe("vehiculos:historial", vehiculoId),
  // Configuración
  obtenerEnvConfig: () => invokeSafe("config:env:get"),
  guardarEnvConfig: (text) => invokeSafe("config:env:set", text),
  probarConexionDB: () => invokeSafe("config:db:test"),
  // Usuarios / Auth
  obtenerUsuariosLogin: () => invokeSafe("usuarios:login-list"),
  login: (username, password) => invokeSafe("auth:login", username, password),
  listarUsuarios: () => invokeSafe("usuarios:list"),
  crearUsuario: (data) => invokeSafe("usuarios:create", data),
  actualizarUsuario: (data) => invokeSafe("usuarios:update", data),
  borrarUsuario: (data) => invokeSafe("usuarios:delete", data),
  actualizarPasswordUsuario: (data) => invokeSafe("usuarios:password", data),
  // Auditoría
  obtenerAuditoriaUsuarios: () => invokeSafe("auditoria:list")
});
