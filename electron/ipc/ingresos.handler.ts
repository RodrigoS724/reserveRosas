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
    console.debug('[IPC:ingresos:crear] payload:', {
      cliente_id: payload?.cliente_id,
      vehiculo_id: payload?.vehiculo_id,
      fecha_actual: payload?.fecha_actual,
      fecha_salida: payload?.fecha_salida,
      monto: payload?.monto,
      marca: payload?.marca,
      modelo: payload?.modelo,
      color: payload?.color,
      matricula: payload?.matricula,
      numero_motor: payload?.numero_motor,
      numero_servicios: payload?.numero_servicios
    })
    try {
      const result = await withDbLock(() => crearIngreso(payload || {}))
      console.debug('[IPC:ingresos:crear] ok:', { id: (result as any)?.id ?? null })
      return result
    } catch (error) {
      console.error('[IPC:ingresos:crear] error:', error)
      throw error
    }
  })

  safeHandle('ingresos:actualizar', async (_event, payload: any) => {
    console.debug('[IPC:ingresos:actualizar] payload:', {
      id: payload?.id,
      cliente_id: payload?.cliente_id,
      vehiculo_id: payload?.vehiculo_id,
      fecha_actual: payload?.fecha_actual,
      fecha_salida: payload?.fecha_salida,
      fecha_egreso: payload?.fecha_egreso,
      monto: payload?.monto,
      marca: payload?.marca,
      modelo: payload?.modelo,
      color: payload?.color,
      matricula: payload?.matricula,
      numero_motor: payload?.numero_motor,
      numero_servicios: payload?.numero_servicios
    })
    try {
      const result = await withDbLock(() => actualizarIngreso(payload || {}))
      console.debug('[IPC:ingresos:actualizar] ok:', { id: (result as any)?.id ?? null })
      return result
    } catch (error) {
      console.error('[IPC:ingresos:actualizar] error:', error)
      throw error
    }
  })

  safeHandle('ingresos:egreso', async (_event, payload: any) => {
    console.debug('[IPC:ingresos:egreso] payload:', {
      id: payload?.id,
      monto: payload?.monto,
      fecha_egreso: payload?.fecha_egreso
    })
    try {
      const result = await withDbLock(() => registrarEgreso(payload || {}))
      console.debug('[IPC:ingresos:egreso] ok:', { id: (result as any)?.id ?? null })
      return result
    } catch (error) {
      console.error('[IPC:ingresos:egreso] error:', error)
      throw error
    }
  })
}