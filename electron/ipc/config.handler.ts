import { safeHandle } from './safeHandle'
import { loadUserEnv, readUserEnvText, writeUserEnvText } from '../config/env'
import { resetMysqlPool } from '../db/mysql'
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
    return await testRemoteApiConnection()
  })

  safeHandle('config:api:test', async () => {
    const result = await testRemoteApiConnection()
    return {
      ok: result.ok,
      error: result.error || ''
    }
  })
}
