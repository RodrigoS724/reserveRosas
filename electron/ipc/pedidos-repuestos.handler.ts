import { safeHandle } from './safeHandle'

function remoteOnly() {
  throw new Error('Los pedidos de repuestos requieren la API remota configurada')
}

export function registrarHandlersPedidosRepuestos() {
  safeHandle('pedidos-repuestos:list', remoteOnly)
  safeHandle('pedidos-repuestos:create', remoteOnly)
  safeHandle('pedidos-repuestos:update', remoteOnly)
  safeHandle('pedidos-repuestos:update-estado', remoteOnly)
  safeHandle('pedidos-repuestos:delete', remoteOnly)
}
