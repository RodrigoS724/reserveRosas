import { registrarHandlersHorarios  } from './horarios.handler'
import { registrarHandlersReservas  } from './reserva.handler'
import { registrarHandlersHistorial  } from './historial.handler'

export function setupIpcHandlers() {
  console.log(' \n\n\n🧩 Cargando IPC handlers  \n\n\n')

  registrarHandlersHorarios ()
  registrarHandlersReservas ()
  registrarHandlersHistorial ()

  console.log(' \n\n\n ✅ IPC handlers cargados \n\n\n')
}