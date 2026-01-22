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

  ipcMain.handle('horarios:crear', (_, hora: string) =>
    withDbLock(() => crearHorario(hora))
  )

  ipcMain.handle('horarios:desactivar', (_, id: number) =>
    withDbLock(() => desactivarHorario(id))
  )

  ipcMain.handle('horarios:bloquear', (_, payload) =>
    withDbLock(() =>
      bloquearHorario(payload.fecha, payload.hora, payload.motivo)
    )
  )
}
