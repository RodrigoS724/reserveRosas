import { ipcMain } from 'electron'
import {
  obtenerHorariosBase,
  obtenerHorariosDisponibles,
  crearHorario,
  desactivarHorario,
  bloquearHorario
} from '../services/horarios.service'

export function setupHorariosHandlers() {
    console.log('/nHorarios Handler funcionando /n');
    
  ipcMain.handle('horarios:base', () =>
    obtenerHorariosBase()
  )

  ipcMain.handle('horarios:disponibles', (_e, fecha) =>
    obtenerHorariosDisponibles(fecha)
  )

  ipcMain.handle('horarios:crear', (_e, hora) => {
    crearHorario(hora)
    return { success: true }
  })

  ipcMain.handle('horarios:desactivar', (_e, id) => {
    desactivarHorario(id)
    return { success: true }
  })

  ipcMain.handle('horarios:bloquear', (_e, data) => {
    bloquearHorario(data.fecha, data.hora, data.motivo)
    return { success: true }
  })
}
