import { registrarHandlersHorarios } from './horarios.handler'
import { registrarHandlersReservas } from './reserva.handler'
import { registrarHandlersHistorial } from './historial.handler'
import { registrarHandlersVehiculos } from './vehiculos.handler'
import { registrarHandlersConfig } from './config.handler'
import { registrarHandlersUsuarios } from './users.handler'
import { registrarHandlersAuditoria } from './auditoria.handler'
import { registrarHandlersAprontes } from './aprontes.handler'
import { registrarHandlersMotos } from './motos.handler'

export function setupIpcHandlers() {
  console.log(' \n Cargando IPC handlers  \n')

  registrarHandlersHorarios()
  registrarHandlersReservas()
  registrarHandlersHistorial()
  registrarHandlersVehiculos()
  registrarHandlersConfig()
  registrarHandlersUsuarios()
  registrarHandlersAuditoria()
  registrarHandlersAprontes()
  registrarHandlersMotos()

  console.log(' \n  IPC handlers cargados \n')
}
