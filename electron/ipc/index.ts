import { setupHorariosHandlers } from './horarios.handler'
import { setupReservasHandlers } from './reserva.handler'
import { setupHistorialHandlers } from './historial.handler'

export function setupIpcHandlers() {
  console.log(' \n\n\n🧩 Cargando IPC handlers  \n\n\n')

  setupHorariosHandlers()
  setupReservasHandlers()
  setupHistorialHandlers()

  console.log(' \n\n\n ✅ IPC handlers cargados \n\n\n')
}