import { safeHandle } from './safeHandle'
import { withDbLock } from './withDBLock'
import { listarIngresos, obtenerIngresosPorCliente, obtenerIngreso, crearIngreso, actualizarIngreso, registrarEgreso } from '../services/ingresos.service'

export function registrarHandlersIngresos() {
  safeHandle('ingresos:list', async () => {
    return await withDbLock(() => listarIngresos())
  })

  safeHandle('ingresos:por-cliente', async (_event, cliente: number | string) => {
    return await withDbLock(() => obtenerIngresosPorCliente(cliente))
  })

  safeHandle('ingresos:obtener', async (_event, id: number) => {
    return await withDbLock(() => obtenerIngreso(id))
  })

  safeHandle('ingresos:crear', async (_event, payload: any) => {
    return await withDbLock(() => crearIngreso(payload || {}))
  })

  safeHandle('ingresos:actualizar', async (_event, payload: any) => {
    return await withDbLock(() => actualizarIngreso(payload || {}))
  })

  safeHandle('ingresos:egreso', async (_event, payload: any) => {
    return await withDbLock(() => registrarEgreso(payload || {}))
  })
}