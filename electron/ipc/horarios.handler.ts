// main/ipc/horarios.handlers.ts
import { safeHandle } from './safeHandle'
import {
  obtenerHorariosBase,
  obtenerHorariosInactivos,
  obtenerHorariosDisponibles,
  crearHorario,
  desactivarHorario, activarHorario,
  bloquearHorario,
  desbloquearHorario,
  obtenerHorariosBloqueados,
  borrarHorarioPermanente
} from '../services/horarios.service'
import { withDbLock } from './withDBLock'

export function registrarHandlersHorarios() {

  safeHandle('horarios:base', async () => {
    console.log('[IPC] Obteniendo horarios base...')
    const result = await withDbLock(() => obtenerHorariosBase())
    console.log('[IPC] Horarios base obtenidos:', result)
    return result
  })

  safeHandle('horarios:disponibles', (_event, fecha: string) =>
    obtenerHorariosDisponibles(fecha)
  )

  safeHandle('horarios:crear', async (_event, hora: string) =>
    await withDbLock(() => crearHorario(hora))
  )

  safeHandle('horarios:desactivar', async (_event, id: number) => {
    console.log('[IPC] Desactivando horario:', id)
    const result = await withDbLock(() => desactivarHorario(id))
    console.log('[IPC] Horario desactivado exitosamente')
    return result
  })

  safeHandle('horarios:activar', async (_event, id: number) => {
    console.log('[IPC] Activando horario:', id)
    const result = await withDbLock(() => activarHorario(id))
    console.log('[IPC] Horario activado exitosamente')
    return result
  })

  safeHandle('horarios:inactivos', async () => {
    console.log('[IPC] Obteniendo horarios inactivos...')
    const result = await withDbLock(() => obtenerHorariosInactivos())
    console.log('[IPC] Horarios inactivos obtenidos:', result)
    return result
  })

  safeHandle('horarios:bloquear', async (_event, payload) =>
    await withDbLock(() =>
      bloquearHorario(payload.fecha, payload.hora, payload.motivo)
    )
  )

  safeHandle('horarios:desbloquear', async (_event, payload) => {
    console.log('[IPC] Desbloqueando horario:', payload)
    const result = await withDbLock(() =>
      desbloquearHorario(payload.fecha, payload.hora)
    )
    console.log('[IPC] Horario desbloqueado exitosamente')
    return result
  })

  safeHandle('horarios:bloqueados', async (_event, fecha: string) => {
    console.log('[IPC] Obteniendo horarios bloqueados para:', fecha)
    const result = await withDbLock(() => obtenerHorariosBloqueados(fecha))
    console.log('[IPC] Horarios bloqueados obtenidos:', result)
    return result
  })

  safeHandle('horarios:borrar', async (_event, id: number) => {
    console.log('[IPC] Borrando horario permanentemente:', id)
    const result = await withDbLock(() => borrarHorarioPermanente(id))
    console.log('[IPC] Horario eliminado exitosamente')
    return result
  })
}
