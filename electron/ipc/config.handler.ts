import { safeHandle } from './safeHandle'
import { loadUserEnv, readUserEnvText, writeUserEnvText } from '../config/env'
import { resetMysqlPool, tryMysql } from '../db/mysql'
import { testRemoteApiConnection } from './remote-proxy'

export function registrarHandlersConfig() {
  safeHandle('config:env:get', async () => {
    return readUserEnvText()
  })

  safeHandle('config:env:set', async (_event, text: string) => {
    writeUserEnvText(text || '')
    loadUserEnv()
    resetMysqlPool()
    return { ok: true }
  })

  safeHandle('config:db:test', async () => {
    const result = await tryMysql( async (pool) => {
      const [rows] = await pool.query('SELECT 1 as ok')
      return rows
    })
    if (!result.ok) {
      const message = result.error instanceof Error
        ? result.error.message
        : 'Error de conexión'
      return { ok: false, error: message }
    }
    return { ok: true }
  })

  safeHandle('config:api:test', async () => {
    const result = await testRemoteApiConnection()
    return {
      ok: result.ok,
      error: result.error || ''
    }
  })
}
