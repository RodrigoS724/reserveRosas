import { ipcMain } from 'electron'
import { obtenerHistorial } from '../services/historial.service'

export function setupHistorialHandlers() {
  ipcMain.handle('historial:reserva', (_e, id) =>
    obtenerHistorial(id)
  )
}
