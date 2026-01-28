// main/ipc/horarios.handlers.ts
import { ipcMain } from 'electron'
import {
  obtenerHorariosBase,
  obtenerHorariosInactivos,
  obtenerHorariosDisponibles,
  crearHorario,
  desactivarHorario,
  activarHorario,
  bloquearHorario,
  desbloquearHorario,
  obtenerHorariosBloqueados,
  borrarHorarioPermanente
} from '../services/horarios.service'
import { withDbLock } from './withDBLock'

export function registrarHandlersHorarios() {

  ipcMain.handle('horarios:base', async () => {
    console.log('[IPC] Obteniendo horarios base...')
    try {
      const result = await withDbLock(() => obtenerHorariosBase())
      console.log('[IPC] Horarios base obtenidos:', result)
      return result
    } catch (error: any) {
      console.error('[IPC] Error obteniendo horarios base:', error)
      throw error
    }
  })

  ipcMain.handle('horarios:disponibles', (_, fecha: string) =>
    obtenerHorariosDisponibles(fecha)
  )

  ipcMain.handle('horarios:crear', async (_, hora: string) =>
    await withDbLock(() => crearHorario(hora))
  )

  ipcMain.handle('horarios:desactivar', async (_, id: number) => {
    console.log('[IPC] Desactivando horario:', id)
    try {
      const result = await withDbLock(() => desactivarHorario(id))
      console.log('[IPC] Horario desactivado exitosamente')
      return result
    } catch (error: any) {
      console.error('[IPC] Error desactivando horario:', error)
      throw error
    }
  })

  ipcMain.handle('horarios:activar', async (_, id: number) => {
    console.log('[IPC] Activando horario:', id)
    try {
      const result = await withDbLock(() => activarHorario(id))
      console.log('[IPC] Horario activado exitosamente')
      return result
    } catch (error: any) {
      console.error('[IPC] Error activando horario:', error)
      throw error
    }
  })

  ipcMain.handle('horarios:inactivos', async () => {
    console.log('[IPC] Obteniendo horarios inactivos...')
    try {
      const result = await withDbLock(() => obtenerHorariosInactivos())
      console.log('[IPC] Horarios inactivos obtenidos:', result)
      return result
    } catch (error: any) {
      console.error('[IPC] Error obteniendo horarios inactivos:', error)
      throw error
    }
  })

  ipcMain.handle('horarios:bloquear', async (_, payload) =>
    await withDbLock(() =>
      bloquearHorario(payload.fecha, payload.hora, payload.motivo)
    )
  )

  ipcMain.handle('horarios:desbloquear', async (_, payload) => {
    console.log('[IPC] Desbloqueando horario:', payload)
    try {
      const result = await withDbLock(() =>
        desbloquearHorario(payload.fecha, payload.hora)
      )
      console.log('[IPC] Horario desbloqueado exitosamente')
      return result
    } catch (error: any) {
      console.error('[IPC] Error desbloqueando horario:', error)
      throw error
    }
  })

  ipcMain.handle('horarios:bloqueados', async (_, fecha: string) => {
    console.log('[IPC] Obteniendo horarios bloqueados para:', fecha)
    try {
      const result = await withDbLock(() => obtenerHorariosBloqueados(fecha))
      console.log('[IPC] Horarios bloqueados obtenidos:', result)
      return result
    } catch (error: any) {
      console.error('[IPC] Error obteniendo horarios bloqueados:', error)
      throw error
    }
  })

  ipcMain.handle('horarios:borrar', async (_, id: number) => {
    console.log('[IPC] Borrando horario permanentemente:', id)
    try {
      const result = await withDbLock(() => borrarHorarioPermanente(id))
      console.log('[IPC] Horario eliminado exitosamente')
      return result
    } catch (error: any) {
      console.error('[IPC] Error borrando horario:', error)
      throw error
    }
  })
}
