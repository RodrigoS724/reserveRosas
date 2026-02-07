// main/ipc/reservas.handlers.ts
import { BrowserWindow } from 'electron'
import { safeHandle } from './safeHandle'
import {
  crearReserva,
  obtenerReserva,
  borrarReserva,
  moverReserva, actualizarReserva,
  obtenerReservasSemana,
  obtenerTodasLasReservas, actualizarNotasReserva,
  obtenerCambiosReservas
} from '../services/reserva.service'
import { withDbLock } from './withDBLock'

export function registrarHandlersReservas() {
  const broadcast = (channel: string, payload: unknown) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, payload)
      }
    }
  }

  const notifyReserva = async (
    accion: 'creada' | 'modificada',
    id: number,
    fallback?: Record<string, unknown>
  ) => {
    let reserva: any = null
    try {
      reserva = await obtenerReserva(id)
    } catch {
      reserva = null
    }

    const resumen = reserva
      ? {
          id: reserva.id,
          nombre: reserva.nombre,
          fecha: reserva.fecha,
          hora: reserva.hora,
          tipo_turno: reserva.tipo_turno,
        }
      : { id, ...(fallback || {}) }

    broadcast('reservas:notify', {
      accion,
      reserva: resumen,
    })
  }

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
    if (typeof result === 'number') {
      await notifyReserva('creada', result, {
        nombre: data?.nombre,
        fecha: data?.fecha,
        hora: data?.hora,
        tipo_turno: data?.tipo_turno,
      })
    }
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
    if (payload?.id) {
      await notifyReserva('modificada', payload.id, {
        fecha: payload.nuevaFecha,
        hora: payload.nuevaHora,
      })
    }
    return result
  })

  safeHandle('reservas:actualizar', async (_event, payload) => {
    console.log('[IPC] Actualizando reserva:', payload)
    const result = await withDbLock(() =>
      actualizarReserva(payload.id, payload)
    )
    console.log('[IPC] Reserva actualizada exitosamente')
    if (payload?.id) {
      await notifyReserva('modificada', payload.id, {
        nombre: payload?.nombre,
        fecha: payload?.fecha,
        hora: payload?.hora,
        tipo_turno: payload?.tipo_turno,
      })
    }
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
    if (id) {
      await notifyReserva('modificada', id)
    }
    return result
  })

  safeHandle('reservas:cambios', async (_event, payload) => {
    const since = payload?.since || new Date(0).toISOString()
    const lastId = Number(payload?.lastId || 0)
    const limit = Number(payload?.limit || 200)
    return obtenerCambiosReservas(since, lastId, limit)
  })
}
