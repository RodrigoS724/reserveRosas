// main/ipc/historial.handlers.ts
import { ipcMain } from 'electron'
import {
  obtenerHistorial,
  registrarEventoHistorial
} from '../services/historial.service'
import { withDbLock } from './withDBLock'

export function registrarHandlersHistorial() {

  ipcMain.handle('historial:obtener', (_, reservaId: number) =>
    obtenerHistorial(reservaId)
  )

  ipcMain.handle('historial:registrar', (_, payload) =>
    withDbLock(() =>
      registrarEventoHistorial(
        payload.reservaId,
        payload.campo,
        payload.anterior,
        payload.nuevo,
        payload.usuario
      )
    )
  )
}
