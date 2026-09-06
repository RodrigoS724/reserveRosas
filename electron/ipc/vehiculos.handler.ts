import { safeHandle } from './safeHandle'
import {
  obtenerVehiculos,
  obtenerHistorialVehiculo,
  obtenerVehiculoPorMatriculaMysql,
  obtenerVehiculosPorCedula,
  obtenerCatalogoVehiculos,
  actualizarVehiculoCliente
} from '../services/vehiculos.service'
import { withDbLock } from './withDBLock'

export function registrarHandlersVehiculos() {
  safeHandle('vehiculos:todos', async () => {
    return await withDbLock(() => obtenerVehiculos())
  })

  safeHandle('vehiculos:historial', async (_event, vehiculoId: number) => {
    return await withDbLock(() => obtenerHistorialVehiculo(vehiculoId))
  })

  safeHandle('vehiculos:mysql-by-matricula', async (_event, matricula: string) => {
    return await withDbLock(() => obtenerVehiculoPorMatriculaMysql(matricula))
  })

  safeHandle('vehiculos:por-cedula', async (_event, cedula: string) => {
    return await withDbLock(() => obtenerVehiculosPorCedula(cedula))
  })

  safeHandle('vehiculos:catalogo', async () => {
    return await withDbLock(() => obtenerCatalogoVehiculos())
  })

  safeHandle('vehiculos:actualizar', async (_event, data: any) => {
    return await withDbLock(() => actualizarVehiculoCliente(data || {}))
  })
}
