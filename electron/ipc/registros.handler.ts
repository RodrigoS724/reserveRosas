import { safeHandle } from './safeHandle'
import { obtenerRegistroMensual } from '../services/registros.service'
import { fetchLegacyRegistroMensual } from './remote-proxy'

export function registrarHandlersRegistros() {
  safeHandle('registros:mensual', async (_event, payload) =>
    obtenerRegistroMensual(payload?.mes || payload)
  )

  safeHandle('registros:legacy-mensual', async (_event, payload) =>
    fetchLegacyRegistroMensual(payload?.mes || payload)
  )
}

