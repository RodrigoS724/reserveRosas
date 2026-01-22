import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { app } from 'electron'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let db: Database.Database | null = null

export function initDatabase() {
  if (db) return db

  if (!app.isReady()) {
    throw new Error('Electron app not ready')
  }

  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'reservas.db')

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }

  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('busy_timeout = 5000')
  db.pragma('synchronous = NORMAL')

  // ===============================
  // TABLA PRINCIPAL DE RESERVAS
  // ===============================
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      cedula TEXT,
      telefono TEXT,
      marca TEXT,
      modelo TEXT,
      km TEXT,
      matricula TEXT,
      tipo_turno TEXT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      detalles TEXT,
      estado TEXT DEFAULT 'pendiente'
    );
  `)

  // ===============================
  // HORARIOS BASE (CONFIGURABLES)
  // ===============================
  db.exec(`
    CREATE TABLE IF NOT EXISTS horarios_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hora TEXT UNIQUE NOT NULL,
      activo INTEGER DEFAULT 1
    );
  `)

  // ===============================
  // BLOQUEOS PUNTUALES
  // ===============================
  db.exec(`
    CREATE TABLE IF NOT EXISTS bloqueos_horarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      motivo TEXT
    );
  `)

  // ===============================
  // HISTORIAL DE CAMBIOS
  // ===============================
  db.exec(`
    CREATE TABLE IF NOT EXISTS historial_reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reserva_id INTEGER NOT NULL,
      campo TEXT NOT NULL,
      valor_anterior TEXT,
      valor_nuevo TEXT,
      fecha TEXT NOT NULL,
      usuario TEXT,
      FOREIGN KEY (reserva_id) REFERENCES reservas(id)
    );
  `)

  // ===============================
  // SEED DE HORARIOS (solo si vacío)
  // ===============================
  const count = db.prepare(`
    SELECT COUNT(*) as total FROM horarios_base
  `).get() as { total: number }

  if (count.total === 0) {
    const insert = db.prepare(`
      INSERT INTO horarios_base (hora) VALUES (?)
    `)

    const horas = [
      '08:00', '09:00', '10:00', '11:00',
      '13:00', '14:00', '15:00', '16:00'
    ]

    const transaction = db.transaction(() => {
      horas.forEach(h => insert.run(h))
    })

    transaction()
  }

  console.log('✅ DB inicializada en:', dbPath)

  return db
}
