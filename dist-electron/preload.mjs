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
  obtenerReservasDia: (d) => invokeSafe("reservas:dia", d),
  obtenerTodasLasReservas: () => invokeSafe("reservas:todas"),
  actualizarNotasReserva: (id, notas) => invokeSafe("reservas:actualizar-notas", id, notas),
  obtenerCambiosReservas: (d) => invokeSafe("reservas:cambios", d),
  // Aprontes
  crearApronte: (d) => invokeSafe("aprontes:crear", d),
  obtenerApronte: (id) => invokeSafe("aprontes:obtener", id),
  borrarApronte: (id) => invokeSafe("aprontes:borrar", id),
  actualizarApronte: (d) => invokeSafe("aprontes:actualizar", d),
  obtenerAprontesFecha: (f) => invokeSafe("aprontes:fecha", f),
  obtenerAprontes: () => invokeSafe("aprontes:todas"),
  obtenerConfigAlertasAprontes: () => invokeSafe("aprontes:alertas:config:get"),
  guardarConfigAlertasAprontes: (d) => invokeSafe("aprontes:alertas:config:set", d),
  obtenerConfigResumenDiario: () => invokeSafe("resumen-diario:config:get"),
  guardarConfigResumenDiario: (d) => invokeSafe("resumen-diario:config:set", d),
  enviarResumenDiario: (d) => invokeSafe("resumen-diario:enviar", d),
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
  // Horarios Aprontes
  obtenerHorariosAprontesBase: () => invokeSafe("horarios-aprontes:base"),
  obtenerHorariosAprontesInactivos: () => invokeSafe("horarios-aprontes:inactivos"),
  obtenerHorariosAprontesDisponibles: (f) => invokeSafe("horarios-aprontes:disponibles", f),
  crearHorarioApronte: (d) => invokeSafe("horarios-aprontes:crear", d),
  actualizarCupoHorarioApronte: (d) => invokeSafe("horarios-aprontes:actualizar-cupo", d),
  desactivarHorarioApronte: (id) => invokeSafe("horarios-aprontes:desactivar", id),
  activarHorarioApronte: (id) => invokeSafe("horarios-aprontes:activar", id),
  borrarHorarioApronte: (id) => invokeSafe("horarios-aprontes:borrar", id),
  // Historial
  obtenerHistorial: (id) => invokeSafe("historial:obtener", id),
  // Vehiculos
  obtenerVehiculos: () => invokeSafe("vehiculos:todos"),
  obtenerHistorialVehiculo: (vehiculoId) => invokeSafe("vehiculos:historial", vehiculoId),
  obtenerVehiculoMysqlPorMatricula: (matricula) => invokeSafe("vehiculos:mysql-by-matricula", matricula),
  // Motos catalogo
  obtenerMarcasMoto: () => invokeSafe("motos:marcas"),
  obtenerModelosMoto: (marca) => invokeSafe("motos:modelos", marca),
  // Configuración
  obtenerEnvConfig: () => invokeSafe("config:env:get"),
  guardarEnvConfig: (text) => invokeSafe("config:env:set", text),
  probarConexionDB: () => invokeSafe("config:db:test"),
  probarConexionApi: () => invokeSafe("config:api:test"),
  // Usuarios / Auth
  obtenerUsuariosLogin: () => invokeSafe("usuarios:login-list"),
  login: (username, password) => invokeSafe("auth:login", username, password),
  cambiarPasswordPropia: (data) => invokeSafe("auth:change-password", data),
  listarUsuarios: () => invokeSafe("usuarios:list"),
  crearUsuario: (data) => invokeSafe("usuarios:create", data),
  actualizarUsuario: (data) => invokeSafe("usuarios:update", data),
  borrarUsuario: (data) => invokeSafe("usuarios:delete", data),
  actualizarPasswordUsuario: (data) => invokeSafe("usuarios:password", data),
  // Auditor�a
  obtenerAuditoriaUsuarios: () => invokeSafe("auditoria:list"),
  // Registros
  obtenerRegistroMensual: (d) => invokeSafe("registros:mensual", d)
});
