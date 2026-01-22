// main/ipc/reservas.handlers.ts
import { ipcMain } from 'electron'
import {
  crearReserva,
  obtenerReserva,
  borrarReserva,
  moverReserva,
  actualizarReserva,
  obtenerReservasSemana
} from '../services/reserva.service'
import { withDbLock } from './withDBLock'

export function registrarHandlersReservas() {

  ipcMain.handle('reservas:crear', (_, data) =>
    withDbLock(() => crearReserva(data))
  )

  ipcMain.handle('reservas:obtener', (_, id: number) =>
    obtenerReserva(id)
  )

  ipcMain.handle('reservas:borrar', (_, id: number) =>
    withDbLock(() => borrarReserva(id))
  )

  ipcMain.handle('reservas:mover', (_, payload) =>
    withDbLock(() =>
      moverReserva(payload.id, payload.nuevaFecha, payload.nuevaHora)
    )
  )

  ipcMain.handle('reservas:actualizar', (_, payload) =>
    withDbLock(() =>
      actualizarReserva(payload.id, payload)
    )
  )

  ipcMain.handle('reservas:semana', (_, payload) =>
    obtenerReservasSemana(payload.desde, payload.hasta)
  )
}
