// main/ipc/horarios.handlers.ts
import { ipcMain } from 'electron'
import {
  obtenerHorariosBase,
  obtenerHorariosDisponibles,
  crearHorario,
  desactivarHorario,
  bloquearHorario
} from '../services/horarios.service'
import { withDbLock } from './withDBLock'

export function registrarHandlersHorarios() {

  ipcMain.handle('horarios:base', () =>
    obtenerHorariosBase()
  )

  ipcMain.handle('horarios:disponibles', (_, fecha: string) =>
    obtenerHorariosDisponibles(fecha)
  )

  ipcMain.handle('horarios:crear', async (_, hora: string) =>
    await withDbLock(() => crearHorario(hora))
  )

  ipcMain.handle('horarios:desactivar', async (_, id: number) =>
    await withDbLock(() => desactivarHorario(id))
  )

  ipcMain.handle('horarios:bloquear', async (_, payload) =>
    await withDbLock(() =>
      bloquearHorario(payload.fecha, payload.hora, payload.motivo)
    )
  )
}
