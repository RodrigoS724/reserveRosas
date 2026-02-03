// main/ipc/reservas.handlers.ts
import { ipcMain } from 'electron'
import {
  crearReserva,
  obtenerReserva,
  borrarReserva,
  moverReserva,
  actualizarReserva,
  obtenerReservasSemana,
  obtenerTodasLasReservas,
  actualizarNotasReserva
} from '../services/reserva.service'
import { withDbLock } from './withDBLock'

export function registrarHandlersReservas() {

  ipcMain.handle('reservas:crear', async (_, data) => {
    const startTime = Date.now()
    console.log("\n" + "=".repeat(50))
    console.log("[IPC] Recibiendo solicitud de reserva:")
    console.log(data)
    console.log("=".repeat(50))
    
    try {
      console.log('[IPC] Esperando lock...')
      const result = await withDbLock(async () => {
        console.log('[IPC] Lock adquirido, ejecutando crearReserva')
        return await crearReserva(data)
      })
      
      const elapsed = Date.now() - startTime
      console.log(`[IPC] Reserva creada exitosamente en ${elapsed}ms, retornando ID:`, result)
      console.log("=".repeat(50) + "\n")
      return result
    } catch (error: any) {
      const elapsed = Date.now() - startTime
      console.error(`[IPC] Error en reservas:crear (${elapsed}ms):`, error?.message || error)
      console.error("Stack:", error?.stack)
      console.log("=".repeat(50) + "\n")
      throw error
    }
  })

  ipcMain.handle('reservas:obtener', (_, id: number) => {
    console.log('[IPC] Obteniendo reserva:', id)
    return obtenerReserva(id)
  })

  ipcMain.handle('reservas:borrar', async (_, id: number) => {
    console.log('[IPC] Borrando reserva:', id)
    try {
      const result = await withDbLock(() => borrarReserva(id))
      console.log('[IPC] Reserva borrada exitosamente')
      return result
    } catch (error: any) {
      console.error('[IPC] Error en reservas:borrar:', error)
      throw error
    }
  })

  ipcMain.handle('reservas:mover', async (_, payload) => {
    console.log('[IPC] Moviendo reserva:', payload)
    try {
      const result = await withDbLock(() =>
        moverReserva(payload.id, payload.nuevaFecha, payload.nuevaHora)
      )
      console.log('[IPC] Reserva movida exitosamente')
      return result
    } catch (error: any) {
      console.error('[IPC] Error en reservas:mover:', error)
      throw error
    }
  })

  ipcMain.handle('reservas:actualizar', async (_, payload) => {
    console.log('[IPC] Actualizando reserva:', payload)
    try {
      const result = await withDbLock(() =>
        actualizarReserva(payload.id, payload)
      )
      console.log('[IPC] Reserva actualizada exitosamente')
      return result
    } catch (error: any) {
      console.error('[IPC] Error en reservas:actualizar:', error)
      throw error
    }
  })

  ipcMain.handle('reservas:semana', async (_, payload) => {
    console.log('[IPC] Obteniendo reservas de semana:', payload)
    try {
      const result = await withDbLock(() => 
        obtenerReservasSemana(payload.desde, payload.hasta)
      )
      console.log('[IPC] Reservas de semana obtenidas:', result.length, 'registros')
      return result
    } catch (error: any) {
      console.error('[IPC] Error en reservas:semana:', error)
      throw error
    }
  })

  ipcMain.handle('reservas:todas', async (_) => {
    console.log('[IPC] Obteniendo TODAS las reservas')
    try {
      const result = await withDbLock(() => obtenerTodasLasReservas())
      console.log('[IPC] Total de reservas obtenidas:', result.length)
      return result
    } catch (error: any) {
      console.error('[IPC] Error en reservas:todas:', error)
      throw error
    }
  })

  ipcMain.handle('reservas:actualizar-notas', async (_, id: number, notas: string) => {
    console.log('[IPC] Actualizando notas para reserva:', id)
    try {
      const result = await withDbLock(() => actualizarNotasReserva(id, notas))
      console.log('[IPC] Notas actualizadas exitosamente')
      return result
    } catch (error: any) {
      console.error('[IPC] Error en reservas:actualizar-notas:', error)
      throw error
    }
  })
}
