import { registrarHandlersHorarios  } from './horarios.handler'
import { registrarHandlersReservas  } from './reserva.handler'
import { registrarHandlersHistorial  } from './historial.handler'

export function setupIpcHandlers() {
  console.log(' \n🧩 Cargando IPC handlers  \n')

  registrarHandlersHorarios ()
  registrarHandlersReservas ()
  registrarHandlersHistorial ()

  console.log(' \n ✅ IPC handlers cargados \n')
}