import { ipcMain } from 'electron';
import { ReservaController } from './controllers/reserva.controller';

export function setupHandlers() {
  // Vue dirá: window.api.guardarReserva(datos)
  ipcMain.handle('guardar-reserva', async (_event, datos) => {
    return await ReservaController.crearNueva(datos);
  });

  // Vue dirá: window.api.obtenerDisponibilidad(fecha)
  ipcMain.handle('obtener-disponibilidad', async (_event, fecha) => {
    return await ReservaController.consultarOcupados(fecha);
  });
}