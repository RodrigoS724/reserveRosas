import { safeHandle } from './safeHandle'
import { obtenerVehiculos, obtenerHistorialVehiculo } from '../services/vehiculos.service'
import { withDbLock } from './withDBLock'

export function registrarHandlersVehiculos() {
  safeHandle('vehiculos:todos', async () => {
    return await withDbLock(() => obtenerVehiculos())
  })

  safeHandle('vehiculos:historial', async (_event, vehiculoId: number) => {
    return await withDbLock(() => obtenerHistorialVehiculo(vehiculoId))
  })
}
