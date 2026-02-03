import { ipcMain } from 'electron'
import { obtenerVehiculos, obtenerHistorialVehiculo } from '../services/vehiculos.service'
import { withDbLock } from './withDBLock'

export function registrarHandlersVehiculos() {
  ipcMain.handle('vehiculos:todos', async () => {
    try {
      return await withDbLock(() => obtenerVehiculos())
    } catch (error: any) {
      console.error('[IPC] Error en vehiculos:todos:', error)
      throw error
    }
  })

  ipcMain.handle('vehiculos:historial', async (_, vehiculoId: number) => {
    try {
      return await withDbLock(() => obtenerHistorialVehiculo(vehiculoId))
    } catch (error: any) {
      console.error('[IPC] Error en vehiculos:historial:', error)
      throw error
    }
  })
}
