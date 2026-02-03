import { registrarHandlersHorarios  } from './horarios.handler'
import { registrarHandlersReservas  } from './reserva.handler'
import { registrarHandlersHistorial  } from './historial.handler'
import { registrarHandlersVehiculos } from './vehiculos.handler'

export function setupIpcHandlers() {
  console.log(' \n🧩 Cargando IPC handlers  \n')

  registrarHandlersHorarios ()
  registrarHandlersReservas ()
  registrarHandlersHistorial ()
  registrarHandlersVehiculos ()

  console.log(' \n ✅ IPC handlers cargados \n')
}
