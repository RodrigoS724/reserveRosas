import { safeHandle } from './safeHandle'
import { listarAuditoria } from '../services/auditoria.service'

export function registrarHandlersAuditoria() {
  safeHandle('auditoria:list', async () => {
    return listarAuditoria()
  })
}
