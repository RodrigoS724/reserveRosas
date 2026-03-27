import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import { fileURLToPath } from 'node:url'

// Definir __filename y __dirname para módulos ES
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Hacer disponibles globalmente para módulos que los necesitan (como better-sqlite3)
if (typeof globalThis !== 'undefined') {
  globalThis.__filename = __filename
  globalThis.__dirname = __dirname
}

let db: Database.Database | null = null
let dbConnectionInProgress = false

export function isLocalDbDisabled() {
  const raw = String(process.env.DISABLE_LOCAL_DB || process.env.LOCAL_DB_DISABLED || '').trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

export function initDatabase() {
  if (isLocalDbDisabled()) {
    throw new Error('Base de datos local deshabilitada (DISABLE_LOCAL_DB).')
  }
  // Si ya existe conexión activa, retornarla
  if (db) {
    console.log(' [DB] Reutilizando conexión existente')
    return db
  }

  // Evitar race condition si se llama múltiples veces simultáneamente
  if (dbConnectionInProgress) {
    console.log('⏳ [DB] Conexión en progreso, esperando...')
    let attempts = 0
    while (!db && attempts < 50) {
      const startTime = Date.now()
      while (Date.now() - startTime < 100 && !db) {}
      attempts++
    }
    if (db) return db
  }

  dbConnectionInProgress = true
  
  try {
    if (!app.isReady()) {
      throw new Error('Electron app not ready')
    }

    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, 'reservas.db')

    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }

    console.log(' [DB] Creando nueva conexión a:', dbPath)
    db = new Database(dbPath, {
      readonly: false,
      fileMustExist: false,
      timeout: 30000
    })
    
    // Configuración para mejor manejo de bloqueos en Windows
    console.log(' [DB] Configurando pragmas...')
    db.pragma('query_only = FALSE')
    db.pragma('journal_mode = OFF')  // SIN journaling - máxima compatibilidad en Windows
    db.pragma('synchronous = OFF')  // Sin sincronización - máxima velocidad
    db.pragma('cache_size = -64000')  // 64MB cache
    db.pragma('temp_store = MEMORY')
    db.pragma('foreign_keys = ON')
    db.pragma('busy_timeout = 100000')  // 100 segundos - timeout extremadamente alto
    console.log(' [DB] Pragmas configurados correctamente')

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
      particular_tipo TEXT,
      garantia_tipo TEXT,
      garantia_fecha_compra TEXT,
      garantia_numero_service TEXT,
      garantia_problema TEXT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      detalles TEXT,
      estado TEXT DEFAULT 'pendiente',
      notas TEXT
    );
  `)

  // ===============================
  // HORARIOS BASE (CONFIGURABLES)
  // ===============================
  db.exec(`
    CREATE TABLE IF NOT EXISTS horarios_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hora TEXT UNIQUE NOT NULL, activo INTEGER DEFAULT 1
    );
  `)

  // ===============================
  // HORARIOS APRONTES
  // ===============================
  db.exec(`
    CREATE TABLE IF NOT EXISTS horarios_aprontes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hora TEXT UNIQUE NOT NULL,
      cupo INTEGER NOT NULL DEFAULT 1,
      activo INTEGER DEFAULT 1
    );
  `)

  // ===============================
  // APRONTES
  // ===============================
  db.exec(`
    CREATE TABLE IF NOT EXISTS aprontes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      telefono TEXT,
      localidad TEXT,
      observaciones TEXT,
      marca TEXT,
      modelo TEXT,
      factura TEXT,
      estado TEXT DEFAULT 'APRONTE',
      repuestos_garantia TEXT,
      correo_alerta_garantia TEXT,
      dias_alerta_garantia INTEGER DEFAULT 7,
      fecha_alerta_garantia TEXT,
      garantia_espera_desde TEXT,
      garantia_notificada INTEGER DEFAULT 0,
      garantia_notificada_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  db.exec(`CREATE INDEX IF NOT EXISTS idx_aprontes_fecha_hora ON aprontes (fecha, hora)`)

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
  // VEHICULOS
  // ===============================
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehiculos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matricula TEXT UNIQUE,
      marca TEXT,
      modelo TEXT,
      nombre TEXT,
      telefono TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // ===============================
  // CATALOGO MARCAS/MODELOS
  // ===============================
  db.exec(`
    CREATE TABLE IF NOT EXISTS motos_catalogo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marca TEXT NOT NULL,
      modelo TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE (marca, modelo)
    );
  `)

  // ===============================
  // USUARIOS Y PERMISOS
  // ===============================
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      permissions_json TEXT, activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // ===============================
  // AUDITORIA DE USUARIOS
  // ===============================
  db.exec(`
    CREATE TABLE IF NOT EXISTS auditoria_usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_username TEXT, actor_role TEXT, accion TEXT NOT NULL,
      target_username TEXT,
      detalle TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // ===============================
  // HISTORIAL DE VEHICULOS
  // ===============================
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehiculos_historial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehiculo_id INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      km TEXT,
      tipo_turno TEXT,
      particular_tipo TEXT,
      garantia_tipo TEXT,
      garantia_fecha_compra TEXT,
      garantia_numero_service TEXT,
      garantia_problema TEXT,
      detalles TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id)
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
      INSERT INTO horarios_base (hora) VALUES ( ?)
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

  // ===============================
  // MIGRACIONES
  // ===============================
  console.log(' [DB] Ejecutando migraciones...')
  
  try {
    db.exec(`ALTER TABLE reservas ADD COLUMN notas TEXT`)
    console.log(' [DB] Columna "notas" agregada a reservas')
  } catch (err: any) {
    if (err.message.includes('duplicate column')) {
      console.log('ℹ️ [DB] Columna "notas" ya existe en reservas')
    } else if (err.message.includes('no such table')) {
      console.log('ℹ️ [DB] Tabla reservas no existe (será creada por CREATE TABLE IF NOT EXISTS)')
    } else {
      console.warn('⚠️ [DB] Error durante migración:', err.message)
    }
  }

  console.log(' DB inicializada en:', dbPath)
  try {
    db.exec(`ALTER TABLE reservas ADD COLUMN particular_tipo TEXT`)
    console.log('âœ… [DB] Columna "particular_tipo" agregada a reservas')
  } catch (err: any) {
    if (err.message.includes('duplicate column')) {
      console.log('â„¹ï¸ [DB] Columna "particular_tipo" ya existe en reservas')
    } else if (err.message.includes('no such table')) {
      console.log('â„¹ï¸ [DB] Tabla reservas no existe (serÃ¡ creada por CREATE TABLE IF NOT EXISTS)')
    } else {
      console.warn('âš ï¸ [DB] Error durante migraciÃ³n:', err.message)
    }
  }

  try {
    db.exec(`ALTER TABLE reservas ADD COLUMN garantia_tipo TEXT`)
    console.log('âœ… [DB] Columna "garantia_tipo" agregada a reservas')
  } catch (err: any) {
    if (err.message.includes('duplicate column')) {
      console.log('â„¹ï¸ [DB] Columna "garantia_tipo" ya existe en reservas')
    } else if (err.message.includes('no such table')) {
      console.log('â„¹ï¸ [DB] Tabla reservas no existe (serÃ¡ creada por CREATE TABLE IF NOT EXISTS)')
    } else {
      console.warn('âš ï¸ [DB] Error durante migraciÃ³n:', err.message)
    }
  }

  try {
    db.exec(`ALTER TABLE reservas ADD COLUMN garantia_fecha_compra TEXT`)
    console.log('âœ… [DB] Columna "garantia_fecha_compra" agregada a reservas')
  } catch (err: any) {
    if (err.message.includes('duplicate column')) {
      console.log('â„¹ï¸ [DB] Columna "garantia_fecha_compra" ya existe en reservas')
    } else if (err.message.includes('no such table')) {
      console.log('â„¹ï¸ [DB] Tabla reservas no existe (serÃ¡ creada por CREATE TABLE IF NOT EXISTS)')
    } else {
      console.warn('âš ï¸ [DB] Error durante migraciÃ³n:', err.message)
    }
  }

  try {
    db.exec(`ALTER TABLE reservas ADD COLUMN garantia_numero_service TEXT`)
    console.log('âœ… [DB] Columna "garantia_numero_service" agregada a reservas')
  } catch (err: any) {
    if (err.message.includes('duplicate column')) {
      console.log('â„¹ï¸ [DB] Columna "garantia_numero_service" ya existe en reservas')
    } else if (err.message.includes('no such table')) {
      console.log('â„¹ï¸ [DB] Tabla reservas no existe (serÃ¡ creada por CREATE TABLE IF NOT EXISTS)')
    } else {
      console.warn('âš ï¸ [DB] Error durante migraciÃ³n:', err.message)
    }
  }

  try {
    db.exec(`ALTER TABLE reservas ADD COLUMN garantia_problema TEXT`)
    console.log('âœ… [DB] Columna "garantia_problema" agregada a reservas')
  } catch (err: any) {
    if (err.message.includes('duplicate column')) {
      console.log('â„¹ï¸ [DB] Columna "garantia_problema" ya existe en reservas')
    } else if (err.message.includes('no such table')) {
      console.log('â„¹ï¸ [DB] Tabla reservas no existe (serÃ¡ creada por CREATE TABLE IF NOT EXISTS)')
    } else {
      console.warn('âš ï¸ [DB] Error durante migraciÃ³n:', err.message)
    }
  }

  try {
    db.exec(`ALTER TABLE aprontes ADD COLUMN observaciones TEXT`)
    console.log(' [DB] Columna "observaciones" agregada a aprontes')
  } catch (err: any) {
    if (err.message.includes('duplicate column')) {
      console.log(' [DB] Columna "observaciones" ya existe en aprontes')
    } else if (err.message.includes('no such table')) {
      console.log(' [DB] Tabla aprontes no existe (sera creada por CREATE TABLE IF NOT EXISTS)')
    } else {
      console.warn(' [DB] Error durante migracion (aprontes observaciones):', err.message)
    }
  }

  try {
    db.exec(`ALTER TABLE aprontes ADD COLUMN estado TEXT DEFAULT 'APRONTE'`)
    console.log(' [DB] Columna "estado" agregada a aprontes')
  } catch (err: any) {
    if (err.message.includes('duplicate column')) {
      console.log(' [DB] Columna "estado" ya existe en aprontes')
    } else if (err.message.includes('no such table')) {
      console.log(' [DB] Tabla aprontes no existe (sera creada por CREATE TABLE IF NOT EXISTS)')
    } else {
      console.warn(' [DB] Error durante migracion (aprontes estado):', err.message)
    }
  }

  try {
    db.exec(`ALTER TABLE aprontes ADD COLUMN repuestos_garantia TEXT`)
    console.log(' [DB] Columna "repuestos_garantia" agregada a aprontes')
  } catch (err: any) {
    if (err.message.includes('duplicate column')) {
      console.log(' [DB] Columna "repuestos_garantia" ya existe en aprontes')
    } else if (err.message.includes('no such table')) {
      console.log(' [DB] Tabla aprontes no existe (sera creada por CREATE TABLE IF NOT EXISTS)')
    } else {
      console.warn(' [DB] Error durante migracion (aprontes repuestos_garantia):', err.message)
    }
  }

  try {
    db.exec(`ALTER TABLE aprontes ADD COLUMN correo_alerta_garantia TEXT`)
    console.log(' [DB] Columna "correo_alerta_garantia" agregada a aprontes')
  } catch (err: any) {
    if (err.message.includes('duplicate column')) {
      console.log(' [DB] Columna "correo_alerta_garantia" ya existe en aprontes')
    } else if (err.message.includes('no such table')) {
      console.log(' [DB] Tabla aprontes no existe (sera creada por CREATE TABLE IF NOT EXISTS)')
    } else {
      console.warn(' [DB] Error durante migracion (aprontes correo_alerta_garantia):', err.message)
    }
  }

  try {
    db.exec(`ALTER TABLE aprontes ADD COLUMN dias_alerta_garantia INTEGER DEFAULT 7`)
    console.log(' [DB] Columna "dias_alerta_garantia" agregada a aprontes')
  } catch (err: any) {
    if (err.message.includes('duplicate column')) {
      console.log(' [DB] Columna "dias_alerta_garantia" ya existe en aprontes')
    } else if (err.message.includes('no such table')) {
      console.log(' [DB] Tabla aprontes no existe (sera creada por CREATE TABLE IF NOT EXISTS)')
    } else {
      console.warn(' [DB] Error durante migracion (aprontes dias_alerta_garantia):', err.message)
    }
  }

  try {
    db.exec(`ALTER TABLE aprontes ADD COLUMN fecha_alerta_garantia TEXT`)
    console.log(' [DB] Columna "fecha_alerta_garantia" agregada a aprontes')
  } catch (err: any) {
    if (err.message.includes('duplicate column')) {
      console.log(' [DB] Columna "fecha_alerta_garantia" ya existe en aprontes')
    } else if (err.message.includes('no such table')) {
      console.log(' [DB] Tabla aprontes no existe (sera creada por CREATE TABLE IF NOT EXISTS)')
    } else {
      console.warn(' [DB] Error durante migracion (aprontes fecha_alerta_garantia):', err.message)
    }
  }

  try {
    db.exec(`ALTER TABLE aprontes ADD COLUMN garantia_espera_desde TEXT`)
    console.log(' [DB] Columna "garantia_espera_desde" agregada a aprontes')
  } catch (err: any) {
    if (err.message.includes('duplicate column')) {
      console.log(' [DB] Columna "garantia_espera_desde" ya existe en aprontes')
    } else if (err.message.includes('no such table')) {
      console.log(' [DB] Tabla aprontes no existe (sera creada por CREATE TABLE IF NOT EXISTS)')
    } else {
      console.warn(' [DB] Error durante migracion (aprontes garantia_espera_desde):', err.message)
    }
  }

  try {
    db.exec(`ALTER TABLE aprontes ADD COLUMN garantia_notificada INTEGER DEFAULT 0`)
    console.log(' [DB] Columna "garantia_notificada" agregada a aprontes')
  } catch (err: any) {
    if (err.message.includes('duplicate column')) {
      console.log(' [DB] Columna "garantia_notificada" ya existe en aprontes')
    } else if (err.message.includes('no such table')) {
      console.log(' [DB] Tabla aprontes no existe (sera creada por CREATE TABLE IF NOT EXISTS)')
    } else {
      console.warn(' [DB] Error durante migracion (aprontes garantia_notificada):', err.message)
    }
  }

  try {
    db.exec(`ALTER TABLE aprontes ADD COLUMN garantia_notificada_at TEXT`)
    console.log(' [DB] Columna "garantia_notificada_at" agregada a aprontes')
  } catch (err: any) {
    if (err.message.includes('duplicate column')) {
      console.log(' [DB] Columna "garantia_notificada_at" ya existe en aprontes')
    } else if (err.message.includes('no such table')) {
      console.log(' [DB] Tabla aprontes no existe (sera creada por CREATE TABLE IF NOT EXISTS)')
    } else {
      console.warn(' [DB] Error durante migracion (aprontes garantia_notificada_at):', err.message)
    }
  }


  return db
  } finally {
    dbConnectionInProgress = false
  }
}


