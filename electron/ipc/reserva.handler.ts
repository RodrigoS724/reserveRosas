import { ipcMain } from 'electron'
import {
  moverReserva,
  actualizarDetalles,
  obtenerReservasSemana
} from '../services/reserva.service'

export function setupReservasHandlers() {
  ipcMain.handle('reservas:semana', (_e, rango) =>
    obtenerReservasSemana(rango.desde, rango.hasta)
  )

  ipcMain.handle('reservas:mover', (_e, data) => {
    moverReserva(data.id, data.nuevaFecha)
    return { success: true }
  })

  ipcMain.handle('reservas:detalles', (_e, data) => {
    actualizarDetalles(data.id, data.detalles)
    return { success: true }
  })
}

