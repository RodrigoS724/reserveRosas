// main/ipc/reservas.handlers.ts
import { BrowserWindow, Notification, shell } from 'electron'
import { getSettings } from '../settings'
import { safeHandle } from './safeHandle'
import {
  crearReserva,
  obtenerReserva,
  borrarReserva,
  moverReserva, actualizarReserva,
  obtenerReservasSemana,
  obtenerReservasPorFecha,
  obtenerTodasLasReservas, actualizarNotasReserva,
  obtenerCambiosReservas
} from '../services/reserva.service'
import { withDbLock } from './withDBLock'
import {
  getDailySummaryConfig,
  setDailySummaryConfig,
  sendDailySummaryNow
} from '../services/daily-summary.service'

export function registrarHandlersReservas() {
  const broadcast = (channel: string, payload: unknown) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, payload)
      }
    }
  }

  const notifyReserva = async (
    accion: 'creada' | 'modificada' | 'eliminada',
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

    const title = accion === 'creada'
      ? 'Nueva reserva'
      : accion === 'eliminada'
        ? 'Reserva eliminada'
        : 'Reserva modificada'
    const bodyParts = [
      resumen?.nombre ? String(resumen.nombre) : 'Cliente sin nombre',
      resumen?.fecha ? String(resumen.fecha) : '',
      resumen?.hora ? String(resumen.hora) : '',
      resumen?.tipo_turno ? String(resumen.tipo_turno) : '',
    ].filter(Boolean)
    const body = bodyParts.join(' · ')

    const settings = getSettings()
    if (Notification.isSupported()) {
      try {
        const notif = new Notification({
          title,
          body,
          silent: settings.soundEnabled === false,
        })
        notif.show()
        if (settings.soundEnabled !== false) {
          shell.beep()
        }
      } catch {
        // ignore native notification failures
      }
    }

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

  safeHandle('reservas:borrar', async (_event, payload) => {
    const reservaId = Number(payload?.id || payload)
    console.log('[IPC] Borrando reserva:', reservaId)
    let anterior: any = null
    try {
      anterior = await obtenerReserva(reservaId)
    } catch {
      anterior = null
    }
    const result = await withDbLock(() => borrarReserva(payload))
    console.log('[IPC] Reserva borrada exitosamente')
    await notifyReserva('eliminada', reservaId, {
      nombre: anterior?.nombre,
      fecha: anterior?.fecha,
      hora: anterior?.hora,
      tipo_turno: anterior?.tipo_turno,
    })
    return result
  })

  safeHandle('reservas:mover', async (_event, payload) => {
    console.log('[IPC] Moviendo reserva:', payload)
    const result = await withDbLock(() => moverReserva(payload))
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
    const result = await withDbLock(() => actualizarReserva(payload))
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
    // Lectura sin lock global para evitar congelar toda la cola
    // si una consulta remota (MySQL) queda lenta.
    const result = await obtenerReservasSemana(payload.desde, payload.hasta)
    console.log('[IPC] Reservas de semana obtenidas:', result.length, 'registros')
    return result
  })

  safeHandle('reservas:todas', async () => {
    console.log('[IPC] Obteniendo TODAS las reservas')
    const result = await obtenerTodasLasReservas()
    console.log('[IPC] Total de reservas obtenidas:', result.length)
    return result
  })

  safeHandle('reservas:actualizar-notas', async (_event, payload: any, notas?: string) => {
    const data = typeof payload === 'object' && payload !== null ? payload : { id: payload, notas }
    console.log('[IPC] Actualizando notas para reserva:', data?.id)
    const result = await withDbLock(() => actualizarNotasReserva(data))
    console.log('[IPC] Notas actualizadas exitosamente')
    if (data?.id) {
      await notifyReserva('modificada', data.id)
    }
    return result
  })

  safeHandle('reservas:cambios', async (_event, payload) => {
    const since = payload?.since || new Date(0).toISOString()
    const lastId = Number(payload?.lastId || 0)
    const limit = Number(payload?.limit || 200)
    return obtenerCambiosReservas(since, lastId, limit)
  })

  safeHandle('reservas:dia', async (_event, payload) => {
    const fecha = String(payload?.fecha || '').trim()
    if (!fecha) return []
    return obtenerReservasPorFecha(fecha)
  })

  safeHandle('resumen-diario:config:get', async () => {
    return getDailySummaryConfig()
  })

  safeHandle('resumen-diario:config:set', async (_event, payload) => {
    return setDailySummaryConfig({
      enabled: typeof payload?.enabled === 'boolean' ? payload.enabled : undefined,
      sendTime: typeof payload?.sendTime === 'string' ? payload.sendTime : undefined,
      recipients: Array.isArray(payload?.recipients) ? payload.recipients : undefined
    })
  })

  safeHandle('resumen-diario:enviar', async (_event, payload) => {
    const fecha = String(payload?.fecha || '').trim()
    return sendDailySummaryNow(fecha)
  })
}
