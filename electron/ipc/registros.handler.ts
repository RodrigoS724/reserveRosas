import { safeHandle } from './safeHandle'
import { obtenerRegistroMensual } from '../services/registros.service'

export function registrarHandlersRegistros() {
  safeHandle('registros:mensual', async (_event, payload) =>
    obtenerRegistroMensual(payload?.mes || payload)
  )
}

