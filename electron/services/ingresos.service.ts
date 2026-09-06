import { initDatabase, isLocalDbDisabled } from '../db/database'
import { tryMysql } from '../db/mysql'

function hasSqliteColumn(db: any, tableName: string, columnName: string) {
  return db.prepare(`PRAGMA table_info(${tableName})`).all().some((row: any) => row.name === columnName)
}

function ensureSqliteColumn(db: any, tableName: string, columnName: string, definition: string) {
  if (hasSqliteColumn(db, tableName, columnName)) return
  db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`).run()
}

function normalizarCedula(value: any) {
  return String(value || '').replace(/\D/g, '')
}

function normalizarTexto(value: any, maxLen = 4000) {
  const text = String(value || '').trim()
  return text.length > maxLen ? text.slice(0, maxLen) : text
}

function normalizarMonto(value: any) {
  const monto = Number(value)
  if (!Number.isFinite(monto) || monto < 0) return 0
  return Math.round(monto * 100) / 100
}

function normalizarJson(value: any, fallback = '{}') {
  if (value == null || value === '') return fallback
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return fallback
  }
}

function pickVehiculoData(input: any) {
  return {
    vehiculo_id: Number(input?.vehiculo_id ?? input?.vehiculoId ?? 0) || null,
    vehiculo_marca: normalizarTexto(input?.vehiculo_marca ?? input?.marca ?? '', 255) || null,
    vehiculo_modelo: normalizarTexto(input?.vehiculo_modelo ?? input?.modelo ?? '', 255) || null,
    vehiculo_color: normalizarTexto(input?.vehiculo_color ?? input?.color ?? '', 255) || null,
    vehiculo_matricula: normalizarTexto(input?.vehiculo_matricula ?? input?.matricula ?? '', 255) || null,
    vehiculo_motor: normalizarTexto(input?.vehiculo_motor ?? input?.numero_motor ?? input?.motor ?? '', 255) || null
  }
}

function pickServicioPayload(input: any) {
  return {
    numero_servicios: normalizarTexto(input?.numero_servicios ?? input?.numeroServicios ?? '', 255) || null,
    comentarios: normalizarTexto(input?.comentarios ?? '', 4000) || null,
    observaciones: normalizarTexto(input?.observaciones ?? '', 4000) || null,
    checklist_ingreso_json: normalizarJson(input?.checklist_ingreso ?? input?.checklistIngreso ?? {}),
    checklist_egreso_json: normalizarJson(input?.checklist_egreso ?? input?.checklistEgreso ?? {}),
    trabajos_json: normalizarJson(input?.trabajos ?? [])
  }
}

async function resolverCliente(input: any) {
  const clienteId = Number(input?.cliente_id ?? input?.clienteId ?? input?.id ?? 0)
  if (Number.isInteger(clienteId) && clienteId > 0) {
    const local = initDatabase().prepare('SELECT * FROM clientes WHERE id = ? LIMIT 1').get(clienteId)
    if (local) return local as any
  }

  const cedula = normalizarCedula(input?.cedula ?? input)
  if (!cedula) return null

  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute('SELECT * FROM clientes WHERE cedula = ? LIMIT 1', [cedula])
    return rows[0] ?? null
  })
  if (mysqlResult.ok) return mysqlResult.value

  if (isLocalDbDisabled()) return null
  const db = initDatabase()
  return db.prepare('SELECT * FROM clientes WHERE cedula = ? LIMIT 1').get(cedula) as any || null
}

async function asegurarSchemaMysql(pool: any) {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ingresos (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      cliente_id BIGINT UNSIGNED NOT NULL,
      reserva_id BIGINT UNSIGNED NULL,
      vehiculo_id BIGINT UNSIGNED NULL,
      vehiculo_marca VARCHAR(255) NULL,
      vehiculo_modelo VARCHAR(255) NULL,
      vehiculo_color VARCHAR(255) NULL,
      vehiculo_matricula VARCHAR(255) NULL,
      vehiculo_motor VARCHAR(255) NULL,
      fecha_actual DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      fecha_salida DATETIME NULL,
      fecha_egreso DATETIME NULL,
      monto DECIMAL(12,2) NOT NULL DEFAULT 0,
      trabajo_realizado TEXT NULL,
      numero_servicios VARCHAR(255) NULL,
      comentarios TEXT NULL,
      observaciones TEXT NULL,
      checklist_ingreso_json LONGTEXT NULL,
      checklist_egreso_json LONGTEXT NULL,
      trabajos_json LONGTEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_ingresos_cliente (cliente_id),
      INDEX idx_ingresos_reserva (reserva_id)
    )
  `)
}

function asegurarSchemaSqlite() {
  const db = initDatabase()
  ensureSqliteColumn(db, 'ingresos', 'vehiculo_id', 'INTEGER')
  ensureSqliteColumn(db, 'ingresos', 'vehiculo_marca', 'TEXT')
  ensureSqliteColumn(db, 'ingresos', 'vehiculo_modelo', 'TEXT')
  ensureSqliteColumn(db, 'ingresos', 'vehiculo_color', 'TEXT')
  ensureSqliteColumn(db, 'ingresos', 'vehiculo_matricula', 'TEXT')
  ensureSqliteColumn(db, 'ingresos', 'vehiculo_motor', 'TEXT')
  ensureSqliteColumn(db, 'ingresos', 'fecha_salida', 'TEXT')
  ensureSqliteColumn(db, 'ingresos', 'numero_servicios', 'TEXT')
  ensureSqliteColumn(db, 'ingresos', 'comentarios', 'TEXT')
  ensureSqliteColumn(db, 'ingresos', 'observaciones', 'TEXT')
  ensureSqliteColumn(db, 'ingresos', 'checklist_ingreso_json', 'TEXT')
  ensureSqliteColumn(db, 'ingresos', 'checklist_egreso_json', 'TEXT')
  ensureSqliteColumn(db, 'ingresos', 'trabajos_json', 'TEXT')
}

export async function listarIngresos() {
  const mysqlResult = await tryMysql(async (pool) => {
    await asegurarSchemaMysql(pool)
    const [rows]: any = await pool.execute(
      `SELECT i.*, c.cedula AS cliente_cedula, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
       FROM ingresos i
       INNER JOIN clientes c ON c.id = i.cliente_id
       ORDER BY i.fecha_actual DESC, i.id DESC`
    )
    return rows as any[]
  })

  if (mysqlResult.ok) return mysqlResult.value

  if (isLocalDbDisabled()) {
    throw mysqlResult.error instanceof Error ? mysqlResult.error : new Error('MySQL no disponible')
  }

  asegurarSchemaSqlite()
  const db = initDatabase()
  return db.prepare(
    `SELECT i.*, c.cedula AS cliente_cedula, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
     FROM ingresos i
     INNER JOIN clientes c ON c.id = i.cliente_id
     ORDER BY i.fecha_actual DESC, i.id DESC`
  ).all()
}

export async function obtenerIngresosPorCliente(input: any) {
  const cliente = await resolverCliente(input)
  if (!cliente?.id) return []

  const mysqlResult = await tryMysql(async (pool) => {
    await asegurarSchemaMysql(pool)
    const [rows]: any = await pool.execute(
      `SELECT i.*, c.cedula AS cliente_cedula, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
       FROM ingresos i
       INNER JOIN clientes c ON c.id = i.cliente_id
       WHERE i.cliente_id = ?
       ORDER BY i.fecha_actual DESC, i.id DESC`,
      [cliente.id]
    )
    return rows as any[]
  })

  if (mysqlResult.ok) return mysqlResult.value

  if (isLocalDbDisabled()) {
    throw mysqlResult.error instanceof Error ? mysqlResult.error : new Error('MySQL no disponible')
  }

  asegurarSchemaSqlite()
  const db = initDatabase()
  return db.prepare(
    `SELECT i.*, c.cedula AS cliente_cedula, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
     FROM ingresos i
     INNER JOIN clientes c ON c.id = i.cliente_id
     WHERE i.cliente_id = ?
     ORDER BY i.fecha_actual DESC, i.id DESC`
  ).all(cliente.id)
}

export async function obtenerIngreso(id: number) {
  const ingresoId = Number(id)
  if (!Number.isInteger(ingresoId) || ingresoId <= 0) return null

  const mysqlResult = await tryMysql(async (pool) => {
    await asegurarSchemaMysql(pool)
    const [rows]: any = await pool.execute(
      `SELECT i.*, c.cedula AS cliente_cedula, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
       FROM ingresos i
       INNER JOIN clientes c ON c.id = i.cliente_id
       WHERE i.id = ?
       LIMIT 1`,
      [ingresoId]
    )
    return rows[0] ?? null
  })

  if (mysqlResult.ok) return mysqlResult.value

  if (isLocalDbDisabled()) {
    throw mysqlResult.error instanceof Error ? mysqlResult.error : new Error('MySQL no disponible')
  }

  const db = initDatabase()
  return db.prepare(
    `SELECT i.*, c.cedula AS cliente_cedula, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
     FROM ingresos i
     INNER JOIN clientes c ON c.id = i.cliente_id
     WHERE i.id = ?
     LIMIT 1`
  ).get(ingresoId) as any || null
}

export async function crearIngreso(input: any = {}) {
  const cliente = await resolverCliente(input)
  if (!cliente?.id) {
    throw new Error('Cliente requerido')
  }

  const reservaId = Number(input.reserva_id ?? input.reservaId ?? 0) || null
  const fechaActual = String(input.fecha_actual ?? input.fechaActual ?? '').trim() || new Date().toISOString().slice(0, 19).replace('T', ' ')
  const fechaSalida = String(input.fecha_salida ?? input.fechaSalida ?? '').trim() || null
  const monto = normalizarMonto(input.monto)
  const trabajoRealizado = normalizarTexto(input.trabajo_realizado ?? input.trabajoRealizado ?? '', 4000) || null
  const vehiculo = pickVehiculoData(input)
  const servicio = pickServicioPayload(input)

  const mysqlResult = await tryMysql(async (pool) => {
    await asegurarSchemaMysql(pool)
    const [result]: any = await pool.execute(
      `INSERT INTO ingresos (
        cliente_id, reserva_id, vehiculo_id, vehiculo_marca, vehiculo_modelo, vehiculo_color, vehiculo_matricula, vehiculo_motor,
        fecha_actual, fecha_salida, monto, trabajo_realizado, numero_servicios, comentarios, observaciones,
        checklist_ingreso_json, checklist_egreso_json, trabajos_json
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cliente.id,
        reservaId,
        vehiculo.vehiculo_id,
        vehiculo.vehiculo_marca,
        vehiculo.vehiculo_modelo,
        vehiculo.vehiculo_color,
        vehiculo.vehiculo_matricula,
        vehiculo.vehiculo_motor,
        fechaActual,
        fechaSalida,
        monto,
        trabajoRealizado,
        servicio.numero_servicios,
        servicio.comentarios,
        servicio.observaciones,
        servicio.checklist_ingreso_json,
        servicio.checklist_egreso_json,
        servicio.trabajos_json
      ]
    )
    return Number(result.insertId)
  })

  if (mysqlResult.ok) return obtenerIngreso(mysqlResult.value)

  if (isLocalDbDisabled()) {
    throw mysqlResult.error instanceof Error ? mysqlResult.error : new Error('MySQL no disponible')
  }

  asegurarSchemaSqlite()
  const db = initDatabase()
  const result = db.prepare(
    `INSERT INTO ingresos (
      cliente_id, reserva_id, vehiculo_id, vehiculo_marca, vehiculo_modelo, vehiculo_color, vehiculo_matricula, vehiculo_motor,
      fecha_actual, fecha_salida, monto, trabajo_realizado, numero_servicios, comentarios, observaciones,
      checklist_ingreso_json, checklist_egreso_json, trabajos_json
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    cliente.id,
    reservaId,
    vehiculo.vehiculo_id,
    vehiculo.vehiculo_marca,
    vehiculo.vehiculo_modelo,
    vehiculo.vehiculo_color,
    vehiculo.vehiculo_matricula,
    vehiculo.vehiculo_motor,
    fechaActual,
    fechaSalida,
    monto,
    trabajoRealizado,
    servicio.numero_servicios,
    servicio.comentarios,
    servicio.observaciones,
    servicio.checklist_ingreso_json,
    servicio.checklist_egreso_json,
    servicio.trabajos_json
  )

  return obtenerIngreso(Number(result.lastInsertRowid))
}

export async function actualizarIngreso(input: any = {}) {
  const ingresoId = Number(input.id ?? input.ingreso_id ?? input.ingresoId ?? 0)
  if (!Number.isInteger(ingresoId) || ingresoId <= 0) {
    throw new Error('Ingreso requerido')
  }

  const cliente = await resolverCliente(input)
  if (!cliente?.id) {
    throw new Error('Cliente requerido')
  }

  const reservaId = Number(input.reserva_id ?? input.reservaId ?? 0) || null
  const fechaActual = String(input.fecha_actual ?? input.fechaActual ?? '').trim() || null
  const fechaEgreso = String(input.fecha_egreso ?? input.fechaEgreso ?? '').trim() || null
  const monto = normalizarMonto(input.monto)
  const trabajoRealizado = normalizarTexto(input.trabajo_realizado ?? input.trabajoRealizado ?? '', 4000) || null
  const vehiculo = pickVehiculoData(input)
  const servicio = pickServicioPayload(input)

  const mysqlResult = await tryMysql(async (pool) => {
    await asegurarSchemaMysql(pool)
    await pool.execute(
      `UPDATE ingresos
       SET cliente_id = ?,
           reserva_id = ?,
           vehiculo_id = ?,
           vehiculo_marca = ?,
           vehiculo_modelo = ?,
           vehiculo_color = ?,
           vehiculo_matricula = ?,
           vehiculo_motor = ?,
           fecha_actual = COALESCE(?, fecha_actual),
           fecha_salida = COALESCE(?, fecha_salida),
           fecha_egreso = COALESCE(?, fecha_egreso),
           monto = ?,
           trabajo_realizado = ?,
           numero_servicios = ?,
           comentarios = ?,
           observaciones = ?,
           checklist_ingreso_json = ?,
           checklist_egreso_json = ?,
           trabajos_json = ?
       WHERE id = ?`,
      [
        cliente.id,
        reservaId,
        vehiculo.vehiculo_id,
        vehiculo.vehiculo_marca,
        vehiculo.vehiculo_modelo,
        vehiculo.vehiculo_color,
        vehiculo.vehiculo_matricula,
        vehiculo.vehiculo_motor,
        fechaActual,
        fechaSalida,
        fechaEgreso,
        monto,
        trabajoRealizado,
        servicio.numero_servicios,
        servicio.comentarios,
        servicio.observaciones,
        servicio.checklist_ingreso_json,
        servicio.checklist_egreso_json,
        servicio.trabajos_json,
        ingresoId
      ]
    )
    return true
  })

  if (mysqlResult.ok) return obtenerIngreso(ingresoId)

  if (isLocalDbDisabled()) {
    throw mysqlResult.error instanceof Error ? mysqlResult.error : new Error('MySQL no disponible')
  }

  asegurarSchemaSqlite()
  const db = initDatabase()
  db.prepare(
    `UPDATE ingresos
     SET cliente_id = ?,
         reserva_id = ?,
           vehiculo_id = ?,
           vehiculo_marca = ?,
           vehiculo_modelo = ?,
           vehiculo_color = ?,
           vehiculo_matricula = ?,
           vehiculo_motor = ?,
         fecha_actual = COALESCE(?, fecha_actual),
           fecha_salida = COALESCE(?, fecha_salida),
         fecha_egreso = COALESCE(?, fecha_egreso),
         monto = ?,
           trabajo_realizado = ?,
           numero_servicios = ?,
           comentarios = ?,
           observaciones = ?,
           checklist_ingreso_json = ?,
           checklist_egreso_json = ?,
           trabajos_json = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    cliente.id,
    reservaId,
    vehiculo.vehiculo_id,
    vehiculo.vehiculo_marca,
    vehiculo.vehiculo_modelo,
    vehiculo.vehiculo_color,
    vehiculo.vehiculo_matricula,
    vehiculo.vehiculo_motor,
    fechaActual,
    fechaSalida,
    fechaEgreso,
    monto,
    trabajoRealizado,
    servicio.numero_servicios,
    servicio.comentarios,
    servicio.observaciones,
    servicio.checklist_ingreso_json,
    servicio.checklist_egreso_json,
    servicio.trabajos_json,
    ingresoId
  )

  return obtenerIngreso(ingresoId)
}

export async function registrarEgreso(input: any = {}) {
  const ingresoId = Number(input.id ?? input.ingreso_id ?? input.ingresoId ?? 0)
  if (!ingresoId) {
    throw new Error('Ingreso requerido')
  }

  const fechaEgreso = String(input.fecha_egreso ?? input.fechaEgreso ?? '').trim() || new Date().toISOString().slice(0, 19).replace('T', ' ')
  const monto = input.monto == null ? null : normalizarMonto(input.monto)
  const trabajoRealizado = input.trabajo_realizado == null && input.trabajoRealizado == null
    ? null
    : normalizarTexto(input.trabajo_realizado ?? input.trabajoRealizado ?? '', 4000)
  const servicio = pickServicioPayload(input)

  const mysqlResult = await tryMysql(async (pool) => {
    await asegurarSchemaMysql(pool)
    await pool.execute(
      `UPDATE ingresos
       SET fecha_egreso = COALESCE(?, fecha_egreso),
           monto = COALESCE(?, monto),
           trabajo_realizado = COALESCE(?, trabajo_realizado),
           checklist_egreso_json = COALESCE(?, checklist_egreso_json),
           trabajos_json = COALESCE(?, trabajos_json),
           observaciones = COALESCE(?, observaciones)
       WHERE id = ?`,
      [fechaEgreso, monto, trabajoRealizado, servicio.checklist_egreso_json, servicio.trabajos_json, servicio.observaciones, ingresoId]
    )
    return true
  })

  if (mysqlResult.ok) return obtenerIngreso(ingresoId)

  if (isLocalDbDisabled()) {
    throw mysqlResult.error instanceof Error ? mysqlResult.error : new Error('MySQL no disponible')
  }

  asegurarSchemaSqlite()
  const db = initDatabase()
  db.prepare(
    `UPDATE ingresos
     SET fecha_egreso = COALESCE(?, fecha_egreso),
         monto = COALESCE(?, monto),
         trabajo_realizado = COALESCE(?, trabajo_realizado),
         checklist_egreso_json = COALESCE(?, checklist_egreso_json),
         trabajos_json = COALESCE(?, trabajos_json),
         observaciones = COALESCE(?, observaciones),
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(fechaEgreso, monto, trabajoRealizado, servicio.checklist_egreso_json, servicio.trabajos_json, servicio.observaciones, ingresoId)

  return obtenerIngreso(ingresoId)
}