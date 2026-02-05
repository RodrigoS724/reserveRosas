import { ipcMain } from 'electron'
import { loadUserEnv, readUserEnvText, writeUserEnvText } from '../config/env'
import { resetMysqlPool, tryMysql } from '../db/mysql'

export function registrarHandlersConfig() {
  ipcMain.handle('config:env:get', async () => {
    return readUserEnvText()
  })

  ipcMain.handle('config:env:set', async (_event, text: string) => {
    writeUserEnvText(text || '')
    loadUserEnv()
    resetMysqlPool()
    return { ok: true }
  })

  ipcMain.handle('config:db:test', async () => {
    const result = await tryMysql(async (pool) => {
      const [rows] = await pool.query('SELECT 1 as ok')
      return rows
    })
    if (!result.ok) {
      return { ok: false, error: result.error?.message || 'Error de conexión' }
    }
    return { ok: true }
  })
}
