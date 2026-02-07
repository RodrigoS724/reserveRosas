import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

function getDbPath() {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'reservas.db')
}

function getBackupDir() {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'backups')
}

function timestamp() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
}

export function runBackupOnce() {
  try {
    const dbPath = getDbPath()
    if (!fs.existsSync(dbPath)) {
      console.warn('[Backup] DB file not found:', dbPath)
      return
    }

    const backupsDir = getBackupDir()
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true })
    }

    const dest = path.join(backupsDir, `reservas_${timestamp()}.db`)
    fs.copyFileSync(dbPath, dest)
    console.log('[Backup] Copia creada:', dest)
  } catch (error) {
    console.error('[Backup] Error al crear backup:', error)
  }
}

export function startBackupScheduler() {
  // Backup inmediato y luego cada hora
  runBackupOnce()
  setInterval(runBackupOnce, 60 * 60 * 1000)
}
