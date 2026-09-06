import { safeHandle } from './safeHandle'
import { withDbLock } from './withDBLock'
import { guardarCliente, listarClientes, obtenerClienteDetalle } from '../services/clientes.service'

export function registrarHandlersClientes() {
  safeHandle('clientes:listar', async (_event, filtro: string) => {
    return await withDbLock(() => listarClientes(filtro))
  })

  safeHandle('clientes:detalle', async (_event, cliente: number | string) => {
    return await withDbLock(() => obtenerClienteDetalle(cliente))
  })

  safeHandle('clientes:guardar', async (_event, data: any) => {
    return await withDbLock(() => guardarCliente(data))
  })
}
