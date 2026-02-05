// main/ipc/reservas.handlers.ts
import { safeHandle } from './safeHandle'
import {
  crearReserva,
  obtenerReserva,
  borrarReserva,
  moverReserva, actualizarReserva,
  obtenerReservasSemana,
  obtenerTodasLasReservas, actualizarNotasReserva
} from '../services/reserva.service'
import { withDbLock } from './withDBLock'

export function registrarHandlersReservas() {

  safeHandle('reservas:crear', async (_event, data) => {
    const startTime = Date.now()
    console.log("\n" + "=".repeat(50))
    console.log("[IPC] Recibiendo solicitud de reserva:")
    console.log(data)
    console.log("=".repeat(50))
    
    console.log('[IPC] Esperando lock...')
    const result = await withDbLock( async () => {
      console.log('[IPC] Lock adquirido, ejecutando crearReserva')
      return await crearReserva(data)
    })
    
    const elapsed = Date.now() - startTime
    console.log(`[IPC] Reserva creada exitosamente en ${elapsed}ms, retornando ID:`, result)
    console.log("=".repeat(50) + "\n")
    return result
  })

  safeHandle('reservas:obtener', (_event, id: number) => {
    console.log('[IPC] Obteniendo reserva:', id)
    return obtenerReserva(id)
  })

  safeHandle('reservas:borrar', async (_event, id: number) => {
    console.log('[IPC] Borrando reserva:', id)
    const result = await withDbLock(() => borrarReserva(id))
    console.log('[IPC] Reserva borrada exitosamente')
    return result
  })

  safeHandle('reservas:mover', async (_event, payload) => {
    console.log('[IPC] Moviendo reserva:', payload)
    const result = await withDbLock(() =>
      moverReserva(payload.id, payload.nuevaFecha, payload.nuevaHora)
    )
    console.log('[IPC] Reserva movida exitosamente')
    return result
  })

  safeHandle('reservas:actualizar', async (_event, payload) => {
    console.log('[IPC] Actualizando reserva:', payload)
    const result = await withDbLock(() =>
      actualizarReserva(payload.id, payload)
    )
    console.log('[IPC] Reserva actualizada exitosamente')
    return result
  })

  safeHandle('reservas:semana', async (_event, payload) => {
    console.log('[IPC] Obteniendo reservas de semana:', payload)
    const result = await withDbLock(() => 
      obtenerReservasSemana(payload.desde, payload.hasta)
    )
    console.log('[IPC] Reservas de semana obtenidas:', result.length, 'registros')
    return result
  })

  safeHandle('reservas:todas', async () => {
    console.log('[IPC] Obteniendo TODAS las reservas')
    const result = await withDbLock(() => obtenerTodasLasReservas())
    console.log('[IPC] Total de reservas obtenidas:', result.length)
    return result
  })

  safeHandle('reservas:actualizar-notas', async (_event, id: number, notas: string) => {
    console.log('[IPC] Actualizando notas para reserva:', id)
    const result = await withDbLock(() => actualizarNotasReserva(id, notas))
    console.log('[IPC] Notas actualizadas exitosamente')
    return result
  })
}
