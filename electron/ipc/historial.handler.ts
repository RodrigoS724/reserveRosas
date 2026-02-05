// main/ipc/historial.handlers.ts
import { safeHandle } from './safeHandle'
import {
  obtenerHistorial,
  registrarEventoHistorial
} from '../services/historial.service'
import { withDbLock } from './withDBLock'

export function registrarHandlersHistorial() {

  safeHandle('historial:obtener', (_event, reservaId: number) =>
    obtenerHistorial(reservaId)
  )

  safeHandle('historial:registrar', async (_event, payload) =>
    await withDbLock(() =>
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
