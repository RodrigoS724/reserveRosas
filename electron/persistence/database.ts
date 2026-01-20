import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'

let db: Database.Database | null = null

export function initDatabase() {
  if (db) return db // evita inicializar dos veces

  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'reservas.db')

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }

  db = new Database(dbPath, { verbose: console.log })

  db.exec(`
    CREATE TABLE IF NOT EXISTS reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      cedula TEXT,
      telefono TEXT,
      marca TEXT,
      modelo TEXT,
      km TEXT,
      matricula TEXT,
      tipo_turno TEXT,
      fecha TEXT,
      hora TEXT,
      detalles TEXT,
      estado TEXT DEFAULT 'pendiente'
    )
  `)

  console.log('Base de datos lista en:', dbPath)

  return db
}
