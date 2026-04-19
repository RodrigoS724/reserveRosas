import { initDatabase, isLocalDbDisabled } from '../db/database'
import { tryMysql } from '../db/mysql'
import {
  assertCanCreateApronte,
  assertCanDeleteApronte,
  canApproveApronte,
  getActor,
  isTallerRole,
  normalizeRole,
  requiresCajaApproval
} from './access-control.service'

export type ApronteInput = {
  nombre: string
  fecha: string
  hora: string
  telefono: string
  localidad: string
  observaciones: string
  marca: string
  modelo: string
  numero_motor?: string
  factura: string
  estado?: string
  repuestos_garantia?: string
  correo_alerta_garantia?: string
  dias_alerta_garantia?: number
  fecha_alerta_garantia?: string | null
}

function buildApronteMutationInput(anterior: any, incoming: any, actorRole: string) {
  if (isTallerRole(actorRole)) {
    return {
      ...anterior,
      estado: incoming?.estado ?? anterior?.estado
    }
  }
  return {
    ...anterior,
    ...incoming
  }
}

const ESTADOS_APRONTE = new Set([
  'APRONTE',
  'ENTREGADA',
  'ENTREGADA ESPERA DE GARANTIA'
])

let mysqlSchemaReady = false

function limpiarTexto(value: any, maxLen = 255) {
  const text = String(value || '').trim()
  return text.length > maxLen ? text.slice(0, maxLen) : text
}

function normalizarCatalogoTexto(value: any) {
  return limpiarTexto(value, 100)
}

function normalizarEstadoApronte(value: any) {
  const raw = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')

  if (!raw) return 'APRONTE'
  if (raw === 'ENTREGADA ESPERA DE GARATIA') return 'ENTREGADA ESPERA DE GARANTIA'
  if (raw === 'ENTREGADA ESPERA GARANTIA') return 'ENTREGADA ESPERA DE GARANTIA'
  if (raw === 'ESPERA DE GARANTIA') return 'ENTREGADA ESPERA DE GARANTIA'
  if (ESTADOS_APRONTE.has(raw)) return raw
  return 'APRONTE'
}

function normalizarEmail(value: any) {
  const email = String(value || '').trim().toLowerCase()
  if (!email) return ''
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}

function normalizarDiasAlerta(value: any) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 7
  const days = Math.floor(n)
  if (days < 1) return 1
  if (days > 90) return 90
  return days
}

function normalizarFechaOpcional(value: any) {
  const raw = String(value || '').trim()
  if (!raw) return null
  return normalizarFecha(raw)
}

function sqliteNowIso() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

async function ensureAprontesMysqlSchema() {
  if (mysqlSchemaReady) return

  const result = await tryMysql(async (pool) => {
    const alters = [
      `ALTER TABLE aprontes ADD COLUMN estado VARCHAR(60) DEFAULT 'APRONTE'`,
      `ALTER TABLE aprontes ADD COLUMN repuestos_garantia TEXT`,
      `ALTER TABLE aprontes ADD COLUMN correo_alerta_garantia VARCHAR(255)`,
      `ALTER TABLE aprontes ADD COLUMN dias_alerta_garantia INT DEFAULT 7`,
      `ALTER TABLE aprontes ADD COLUMN fecha_alerta_garantia DATE NULL`,
      `ALTER TABLE aprontes ADD COLUMN numero_motor VARCHAR(100)`,
      `ALTER TABLE aprontes ADD COLUMN garantia_espera_desde DATETIME NULL`,
      `ALTER TABLE aprontes ADD COLUMN garantia_notificada TINYINT DEFAULT 0`,
      `ALTER TABLE aprontes ADD COLUMN garantia_notificada_at DATETIME NULL`,
      `ALTER TABLE aprontes ADD COLUMN created_by_username VARCHAR(255) NULL`,
      `ALTER TABLE aprontes ADD COLUMN created_by_role VARCHAR(50) NULL`,
      `ALTER TABLE aprontes ADD COLUMN caja_aprobado TINYINT DEFAULT 1`,
      `ALTER TABLE aprontes ADD COLUMN caja_aprobado_at DATETIME NULL`,
      `ALTER TABLE aprontes ADD COLUMN caja_aprobado_por VARCHAR(255) NULL`
    ]

    for (const sql of alters) {
      try {
        await pool.execute(sql)
      } catch (error: any) {
        const msg = String(error?.message || '').toLowerCase()
        if (!msg.includes('duplicate column')) {
          throw error
        }
      }
    }
  })

  if (result.ok) {
    mysqlSchemaReady = true
  }
}

async function registrarMarcaModeloMysql(pool: any, marca: any, modelo: any) {
  const marcaOk = normalizarCatalogoTexto(marca)
  const modeloOk = normalizarCatalogoTexto(modelo)
  if (!marcaOk || !modeloOk) return
  try {
    await pool.execute(
      `INSERT INTO motos_catalogo (marca, modelo)
       VALUES ( ?, ? )
       ON DUPLICATE KEY UPDATE modelo = modelo`,
      [marcaOk, modeloOk]
    )
  } catch (error) {
    console.warn('[Aprontes] No se pudo registrar marca/modelo en MySQL:', error)
  }
}

function registrarMarcaModeloSqlite(db: any, marca: any, modelo: any) {
  const marcaOk = normalizarCatalogoTexto(marca)
  const modeloOk = normalizarCatalogoTexto(modelo)
  if (!marcaOk || !modeloOk) return
  try {
    db.prepare(
      `INSERT OR IGNORE INTO motos_catalogo (marca, modelo)
       VALUES ( ?, ? )`
    ).run(marcaOk, modeloOk)
  } catch (error) {
    console.warn('[Aprontes] No se pudo registrar marca/modelo en SQLite:', error)
  }
}

function normalizarFecha(value: any) {
  const d = new Date(String(value || ''))
  if (Number.isNaN(d.getTime())) {
    throw new Error('Fecha invalida')
  }
  return d.toISOString().split('T')[0]
}

function normalizarHora(value: any) {
  const parts = String(value || '').split(':')
  if (parts.length < 2) {
    throw new Error('Formato de hora invalido')
  }
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    throw new Error('Formato de hora invalido')
  }
  if (h < 0 || h > 23 || m < 0 || m > 59) {
    throw new Error('Formato de hora invalido')
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function horaEnMinutos(hora: string) {
  const parts = String(hora || '').split(':')
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    throw new Error('Formato de hora invalido')
  }
  return h * 60 + m
}

function validarReglaFinDeSemana(fechaIso: string, hora: string) {
  const day = new Date(`${fechaIso}T00:00:00`).getDay()
  if (day === 0) {
    throw new Error('Los domingos no se agendan aprontes')
  }
  if (day === 6 && horaEnMinutos(hora) > 12 * 60) {
    throw new Error('Los sabados solo se permiten horarios hasta las 12:00')
  }
}

function validarRequeridos(data: ApronteInput) {
  const required: Array<keyof ApronteInput> = [
    'nombre',
    'fecha',
    'hora',
    'telefono',
    'localidad',
    'marca',
    'modelo',
    'factura'
  ]
  for (const key of required) {
    if (!String(data[key] || '').trim()) {
      throw new Error('Campo requerido: ' + key)
    }
  }
}

function normalizarApronte(data: ApronteInput) {
  const estado = normalizarEstadoApronte(data.estado)
  const correoAlerta = normalizarEmail(data.correo_alerta_garantia)
  const diasAlerta = normalizarDiasAlerta(data.dias_alerta_garantia)

  return {
    nombre: limpiarTexto(data.nombre, 255),
    fecha: data.fecha,
    hora: data.hora,
    telefono: limpiarTexto(data.telefono, 30),
    localidad: limpiarTexto(data.localidad, 100),
    observaciones: limpiarTexto(data.observaciones, 500),
    marca: limpiarTexto(data.marca, 100),
    modelo: limpiarTexto(data.modelo, 100),
    numero_motor: limpiarTexto(data.numero_motor, 100),
    factura: limpiarTexto(data.factura, 100),
    estado,
    repuestos_garantia: limpiarTexto(data.repuestos_garantia, 1000),
    correo_alerta_garantia: correoAlerta,
    dias_alerta_garantia: diasAlerta,
    fecha_alerta_garantia: normalizarFechaOpcional(data.fecha_alerta_garantia)
  }
}

async function validarCupoDisponibleMysql(pool: any, fecha: string, hora: string, excludeId?: number | null) {
  const [horRows]: any = await pool.execute(
    `SELECT cupo FROM horarios_aprontes WHERE hora = ? AND activo = 1`,
    [hora]
  )
  if (!horRows.length) {
    throw new Error('Horario de apronte no disponible')
  }
  const cupo = Number(horRows[0]?.cupo || 0)
  if (cupo < 1) {
    throw new Error('Cupo invalido para el horario')
  }

  let sql = 'SELECT COUNT(*) AS total FROM aprontes WHERE fecha = ? AND hora = ?'
  const params: any[] = [fecha, hora]
  if (excludeId) {
    sql += ' AND id <> ?'
    params.push(excludeId)
  }
  const [countRows]: any = await pool.execute(sql, params)
  const usados = Number(countRows[0]?.total || 0)
  if (usados >= cupo) {
    throw new Error('No hay cupos disponibles para ese horario')
  }
}

function validarCupoDisponibleSqlite(db: any, fecha: string, hora: string, excludeId?: number | null) {
  const horario = db.prepare(
    'SELECT cupo FROM horarios_aprontes WHERE hora = ? AND activo = 1'
  ).get(hora) as { cupo: number } | undefined

  if (!horario) {
    throw new Error('Horario de apronte no disponible')
  }
  const cupo = Number(horario.cupo || 0)
  if (cupo < 1) {
    throw new Error('Cupo invalido para el horario')
  }

  let sql = 'SELECT COUNT(*) AS total FROM aprontes WHERE fecha = ? AND hora = ?'
  const params: any[] = [fecha, hora]
  if (excludeId) {
    sql += ' AND id <> ?'
    params.push(excludeId)
  }
  const countRow = db.prepare(sql).get(...params) as { total: number } | undefined
  const usados = Number(countRow?.total || 0)
  if (usados >= cupo) {
    throw new Error('No hay cupos disponibles para ese horario')
  }
}

function syncAprontesToSqlite(rows: any[]) {
  if (isLocalDbDisabled()) return
  if (!Array.isArray(rows) || rows.length === 0) return
  try {
    const db = initDatabase()
    const upsert = db.prepare(
      `INSERT INTO aprontes (
        id, nombre, fecha, hora, telefono, localidad, observaciones,
        marca, modelo, numero_motor, factura, estado, repuestos_garantia,
        correo_alerta_garantia, dias_alerta_garantia, fecha_alerta_garantia,
        garantia_espera_desde, garantia_notificada, garantia_notificada_at,
        created_at
      ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        nombre = excluded.nombre,
        fecha = excluded.fecha,
        hora = excluded.hora,
        telefono = excluded.telefono,
        localidad = excluded.localidad,
        observaciones = excluded.observaciones,
        marca = excluded.marca,
        modelo = excluded.modelo,
        numero_motor = excluded.numero_motor,
        factura = excluded.factura,
        estado = excluded.estado,
        repuestos_garantia = excluded.repuestos_garantia,
        correo_alerta_garantia = excluded.correo_alerta_garantia,
        dias_alerta_garantia = excluded.dias_alerta_garantia,
        fecha_alerta_garantia = excluded.fecha_alerta_garantia,
        created_by_username = excluded.created_by_username,
        created_by_role = excluded.created_by_role,
        caja_aprobado = excluded.caja_aprobado,
        caja_aprobado_at = excluded.caja_aprobado_at,
        caja_aprobado_por = excluded.caja_aprobado_por,
        garantia_espera_desde = excluded.garantia_espera_desde,
        garantia_notificada = excluded.garantia_notificada,
        garantia_notificada_at = excluded.garantia_notificada_at,
        created_at = excluded.created_at`
    )
    const tx = db.transaction((items: any[]) => {
      for (const row of items) {
        const id = row?.id ? Number(row.id) : null
        if (!id) continue
        upsert.run(
          id,
          row?.nombre ?? '',
          row?.fecha ?? '',
          row?.hora ?? '',
          row?.telefono ?? '',
          row?.localidad ?? '',
          row?.observaciones ?? '',
          row?.marca ?? '',
          row?.modelo ?? '',
          row?.numero_motor ?? '',
          row?.factura ?? '',
          row?.estado ?? 'APRONTE',
          row?.repuestos_garantia ?? '',
          row?.correo_alerta_garantia ?? '',
          Number(row?.dias_alerta_garantia || 7),
          row?.fecha_alerta_garantia ?? null,
          row?.created_by_username ?? null,
          row?.created_by_role ?? null,
          Number(row?.caja_aprobado ?? 1),
          row?.caja_aprobado_at ?? null,
          row?.caja_aprobado_por ?? null,
          row?.garantia_espera_desde ?? null,
          Number(row?.garantia_notificada || 0),
          row?.garantia_notificada_at ?? null,
          row?.created_at ?? null
        )
      }
    })
    tx(rows)
  } catch (error) {
    console.warn('[Aprontes] Error sync sqlite:', error)
  }
}

async function crearApronteSqlite(dataNormalizada: ApronteInput, fechaNormalizada: string, horaNormalizada: string, actor: { username: string; role: string }) {
  const creatorRole = normalizeRole(actor.role)
  const cajaAprobado = requiresCajaApproval(creatorRole) ? 0 : 1
  const db = initDatabase()
  const tx = db.transaction(() => {
    validarCupoDisponibleSqlite(db, fechaNormalizada, horaNormalizada)
    const result = db.prepare(
      `INSERT INTO aprontes (
        nombre, fecha, hora,
        telefono, localidad, observaciones,
        marca, modelo, numero_motor, factura,
        estado, repuestos_garantia,
        correo_alerta_garantia, dias_alerta_garantia, fecha_alerta_garantia,
        garantia_espera_desde, garantia_notificada, garantia_notificada_at,
        created_by_username, created_by_role, caja_aprobado, caja_aprobado_at, caja_aprobado_por
      ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      dataNormalizada.nombre,
      fechaNormalizada,
      horaNormalizada,
      dataNormalizada.telefono,
      dataNormalizada.localidad,
      dataNormalizada.observaciones,
      dataNormalizada.marca,
      dataNormalizada.modelo,
      dataNormalizada.numero_motor,
      dataNormalizada.factura,
      dataNormalizada.estado,
      dataNormalizada.repuestos_garantia,
      dataNormalizada.correo_alerta_garantia,
      dataNormalizada.dias_alerta_garantia,
      dataNormalizada.fecha_alerta_garantia ?? null,
      dataNormalizada.estado === 'ENTREGADA ESPERA DE GARANTIA' ? sqliteNowIso() : null,
      0,
      null,
      actor.username || null,
      creatorRole,
      cajaAprobado,
      cajaAprobado ? sqliteNowIso() : null,
      cajaAprobado ? (actor.username || null) : null
    )
    registrarMarcaModeloSqlite(db, dataNormalizada.marca, dataNormalizada.modelo)
    return Number(result.lastInsertRowid)
  })
  return tx()
}

async function crearApronteMysql(dataNormalizada: ApronteInput, fechaNormalizada: string, horaNormalizada: string, actor: { username: string; role: string }) {
  await ensureAprontesMysqlSchema()
  const creatorRole = normalizeRole(actor.role)
  const cajaAprobado = requiresCajaApproval(creatorRole) ? 0 : 1
  const mysqlResult = await tryMysql(async (pool) => {
    await validarCupoDisponibleMysql(pool, fechaNormalizada, horaNormalizada)
    const [result]: any = await pool.execute(
      `INSERT INTO aprontes (
        nombre, fecha, hora,
        telefono, localidad, observaciones,
        marca, modelo, numero_motor, factura,
        estado, repuestos_garantia,
        correo_alerta_garantia, dias_alerta_garantia, fecha_alerta_garantia,
        garantia_espera_desde, garantia_notificada, garantia_notificada_at,
        created_by_username, created_by_role, caja_aprobado, caja_aprobado_at, caja_aprobado_por
      ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        dataNormalizada.nombre,
        fechaNormalizada,
        horaNormalizada,
        dataNormalizada.telefono,
        dataNormalizada.localidad,
        dataNormalizada.observaciones,
        dataNormalizada.marca,
        dataNormalizada.modelo,
        dataNormalizada.numero_motor,
        dataNormalizada.factura,
        dataNormalizada.estado,
        dataNormalizada.repuestos_garantia,
        dataNormalizada.correo_alerta_garantia,
        dataNormalizada.dias_alerta_garantia,
        dataNormalizada.fecha_alerta_garantia ?? null,
        dataNormalizada.estado === 'ENTREGADA ESPERA DE GARANTIA' ? new Date() : null,
        0,
        null,
        actor.username || null,
        creatorRole,
        cajaAprobado,
        cajaAprobado ? new Date() : null,
        cajaAprobado ? (actor.username || null) : null
      ]
    )
    await registrarMarcaModeloMysql(pool, dataNormalizada.marca, dataNormalizada.modelo)
    return Number(result.insertId)
  })

  if (!mysqlResult.ok) {
    throw mysqlResult.error
  }

  return mysqlResult.value
}

export async function crearApronte(data: ApronteInput) {
  await ensureAprontesMysqlSchema()
  const actor = getActor(data)
  assertCanCreateApronte(actor.role)
  validarRequeridos(data)
  const normalized = normalizarApronte({ ...data })
  const fechaNormalizada = normalizarFecha(normalized.fecha)
  const horaNormalizada = normalizarHora(normalized.hora)
  validarReglaFinDeSemana(fechaNormalizada, horaNormalizada)

  try {
    const mysqlId = await crearApronteMysql(normalized, fechaNormalizada, horaNormalizada, actor)
    try {
      const creatorRole = normalizeRole(actor.role)
      const cajaAprobado = requiresCajaApproval(creatorRole) ? 0 : 1
      const db = initDatabase()
      db.prepare(
        `INSERT INTO aprontes (
          id, nombre, fecha, hora,
          telefono, localidad, observaciones,
          marca, modelo, numero_motor, factura,
          estado, repuestos_garantia,
          correo_alerta_garantia, dias_alerta_garantia, fecha_alerta_garantia,
          garantia_espera_desde, garantia_notificada, garantia_notificada_at,
          created_by_username, created_by_role, caja_aprobado, caja_aprobado_at, caja_aprobado_por
        ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        mysqlId,
        normalized.nombre,
        fechaNormalizada,
        horaNormalizada,
        normalized.telefono,
        normalized.localidad,
        normalized.observaciones,
        normalized.marca,
        normalized.modelo,
        normalized.numero_motor,
        normalized.factura,
        normalized.estado,
        normalized.repuestos_garantia,
        normalized.correo_alerta_garantia,
        normalized.dias_alerta_garantia,
        normalized.fecha_alerta_garantia ?? null,
        normalized.estado === 'ENTREGADA ESPERA DE GARANTIA' ? sqliteNowIso() : null,
        0,
        null,
        actor.username || null,
        creatorRole,
        cajaAprobado,
        cajaAprobado ? sqliteNowIso() : null,
        cajaAprobado ? (actor.username || null) : null
      )
      registrarMarcaModeloSqlite(db, normalized.marca, normalized.modelo)
    } catch (error) {
      console.warn('[Aprontes] Backup SQLite fallo en crear:', error)
    }
    return mysqlId
  } catch (error) {
    console.warn('[Aprontes] MySQL no disponible, usando SQLite local')
    return crearApronteSqlite(normalized, fechaNormalizada, horaNormalizada, actor)
  }
}

export async function obtenerApronte(id: number) {
  await ensureAprontesMysqlSchema()
  const idNum = Number(id)
  if (!idNum) return null

  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute(`SELECT * FROM aprontes WHERE id = ?`, [idNum])
    return rows[0] ?? null
  })

  if (mysqlResult.ok) return mysqlResult.value

  const db = initDatabase()
  return db.prepare(`SELECT * FROM aprontes WHERE id = ?`).get(idNum)
}

export async function obtenerAprontesPorFecha(fecha: string) {
  await ensureAprontesMysqlSchema()
  const fechaNormalizada = normalizarFecha(fecha)

  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT *
       FROM aprontes
       WHERE fecha = ?
       ORDER BY hora`,
      [fechaNormalizada]
    )
    return rows
  })

  if (mysqlResult.ok) {
    syncAprontesToSqlite(mysqlResult.value)
    return mysqlResult.value
  }

  if (isLocalDbDisabled()) {
    throw mysqlResult.error instanceof Error
      ? mysqlResult.error
      : new Error('MySQL no disponible y DB local deshabilitada')
  }

  const db = initDatabase()
  return db.prepare(
    `SELECT *
     FROM aprontes
     WHERE fecha = ?
     ORDER BY hora`
  ).all(fechaNormalizada)
}

export async function obtenerTodosLosAprontes() {
  await ensureAprontesMysqlSchema()
  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT *
       FROM aprontes
       ORDER BY fecha DESC, hora DESC`
    )
    return rows
  })

  if (mysqlResult.ok) {
    syncAprontesToSqlite(mysqlResult.value)
    return mysqlResult.value
  }

  if (isLocalDbDisabled()) {
    throw mysqlResult.error instanceof Error
      ? mysqlResult.error
      : new Error('MySQL no disponible y DB local deshabilitada')
  }

  const db = initDatabase()
  return db.prepare(
    `SELECT *
     FROM aprontes
     ORDER BY fecha DESC, hora DESC`
  ).all()
}

export async function actualizarApronte(id: number, data: Partial<ApronteInput>) {
  await ensureAprontesMysqlSchema()
  const actor = getActor(data)
  const apronteId = Number(id || (data as any)?.id || 0)
  if (!apronteId) {
    throw new Error('ID de apronte invalido')
  }

  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute('SELECT * FROM aprontes WHERE id = ?', [apronteId])
    const anterior = rows[0]
    if (!anterior) return

    const merged = buildApronteMutationInput(anterior, data, actor.role)
    validarRequeridos(merged)
    const normalized = normalizarApronte(merged)
    const fechaNormalizada = normalizarFecha(normalized.fecha)
    const horaNormalizada = normalizarHora(normalized.hora)
    validarReglaFinDeSemana(fechaNormalizada, horaNormalizada)
    const estadoAnterior = normalizarEstadoApronte(anterior.estado)
    const estadoNuevo = normalizarEstadoApronte(normalized.estado)
    const entraEspera = estadoNuevo === 'ENTREGADA ESPERA DE GARANTIA' && estadoAnterior !== 'ENTREGADA ESPERA DE GARANTIA'
    const saleEspera = estadoNuevo !== 'ENTREGADA ESPERA DE GARANTIA'
    const nextCajaAprobado = canApproveApronte(actor.role) && Object.prototype.hasOwnProperty.call(data || {}, 'caja_aprobado')
      ? ((data as any)?.caja_aprobado ? 1 : 0)
      : Number(anterior.caja_aprobado ?? 1)
    const cajaApprovalChanged = nextCajaAprobado !== Number(anterior.caja_aprobado ?? 1)

    const mismoHorario = fechaNormalizada === anterior.fecha && horaNormalizada === anterior.hora
    if (!mismoHorario) {
      await validarCupoDisponibleMysql(pool, fechaNormalizada, horaNormalizada, apronteId)
    }

    await pool.execute(
      `UPDATE aprontes
       SET nombre = ?, fecha = ?, hora = ?,
           telefono = ?, localidad = ?, observaciones = ?,
           marca = ?, modelo = ?, numero_motor = ?, factura = ?,
           estado = ?, repuestos_garantia = ?,
           correo_alerta_garantia = ?, dias_alerta_garantia = ?, fecha_alerta_garantia = ?,
           garantia_espera_desde = CASE
             WHEN ? THEN NOW()
             WHEN ? THEN NULL
             ELSE garantia_espera_desde
           END,
           garantia_notificada = CASE
             WHEN ? THEN 0
             WHEN ? THEN 0
             ELSE garantia_notificada
           END,
           garantia_notificada_at = CASE
             WHEN ? OR ? THEN NULL
             ELSE garantia_notificada_at
           END,
           caja_aprobado = ?,
           caja_aprobado_at = CASE
             WHEN ? THEN NOW()
             WHEN ? THEN NULL
             ELSE caja_aprobado_at
           END,
           caja_aprobado_por = CASE
             WHEN ? THEN ?
             WHEN ? THEN NULL
             ELSE caja_aprobado_por
           END
       WHERE id = ?`,
      [
        normalized.nombre,
        fechaNormalizada,
        horaNormalizada,
        normalized.telefono,
        normalized.localidad,
        normalized.observaciones,
        normalized.marca,
        normalized.modelo,
        normalized.numero_motor,
        normalized.factura,
        estadoNuevo,
        normalized.repuestos_garantia,
        normalized.correo_alerta_garantia,
        normalized.dias_alerta_garantia,
        normalized.fecha_alerta_garantia,
        entraEspera,
        saleEspera,
        entraEspera,
        saleEspera,
        entraEspera,
        saleEspera,
        nextCajaAprobado,
        cajaApprovalChanged && nextCajaAprobado === 1,
        cajaApprovalChanged && nextCajaAprobado === 0,
        cajaApprovalChanged && nextCajaAprobado === 1,
        actor.username || null,
        cajaApprovalChanged && nextCajaAprobado === 0,
        apronteId
      ]
    )
    await registrarMarcaModeloMysql(pool, normalized.marca, normalized.modelo)
  })

  if (mysqlResult.ok) {
    try {
      const db = initDatabase()
      const anterior = db.prepare('SELECT * FROM aprontes WHERE id = ?').get(apronteId) as any
      if (!anterior) return
      const merged = buildApronteMutationInput(anterior, data, actor.role)
      validarRequeridos(merged)
      const normalized = normalizarApronte(merged)
      const fechaNormalizada = normalizarFecha(normalized.fecha)
      const horaNormalizada = normalizarHora(normalized.hora)
      validarReglaFinDeSemana(fechaNormalizada, horaNormalizada)
      const estadoAnterior = normalizarEstadoApronte(anterior.estado)
      const estadoNuevo = normalizarEstadoApronte(normalized.estado)
      const entraEspera = estadoNuevo === 'ENTREGADA ESPERA DE GARANTIA' && estadoAnterior !== 'ENTREGADA ESPERA DE GARANTIA'
      const saleEspera = estadoNuevo !== 'ENTREGADA ESPERA DE GARANTIA'
      const nextCajaAprobado = canApproveApronte(actor.role) && Object.prototype.hasOwnProperty.call(data || {}, 'caja_aprobado')
        ? ((data as any)?.caja_aprobado ? 1 : 0)
        : Number(anterior.caja_aprobado ?? 1)
      const cajaApprovalChanged = nextCajaAprobado !== Number(anterior.caja_aprobado ?? 1)
      const mismoHorario = fechaNormalizada === anterior.fecha && horaNormalizada === anterior.hora
      if (!mismoHorario) {
        validarCupoDisponibleSqlite(db, fechaNormalizada, horaNormalizada, apronteId)
      }
      db.prepare(
        `UPDATE aprontes
         SET nombre = ?, fecha = ?, hora = ?,
             telefono = ?, localidad = ?, observaciones = ?,
             marca = ?, modelo = ?, numero_motor = ?, factura = ?,
             estado = ?, repuestos_garantia = ?,
             correo_alerta_garantia = ?, dias_alerta_garantia = ?, fecha_alerta_garantia = ?,
             garantia_espera_desde = CASE
               WHEN ? THEN ?
               WHEN ? THEN NULL
               ELSE garantia_espera_desde
             END,
             garantia_notificada = CASE
               WHEN ? THEN 0
               WHEN ? THEN 0
               ELSE garantia_notificada
             END,
             garantia_notificada_at = CASE
               WHEN ? OR ? THEN NULL
               ELSE garantia_notificada_at
             END,
             caja_aprobado = ?,
             caja_aprobado_at = CASE
               WHEN ? THEN ?
               WHEN ? THEN NULL
               ELSE caja_aprobado_at
             END,
             caja_aprobado_por = CASE
               WHEN ? THEN ?
               WHEN ? THEN NULL
               ELSE caja_aprobado_por
             END
         WHERE id = ?`
      ).run(
        normalized.nombre,
        fechaNormalizada,
        horaNormalizada,
        normalized.telefono,
        normalized.localidad,
        normalized.observaciones,
        normalized.marca,
        normalized.modelo,
        normalized.numero_motor,
        normalized.factura,
        estadoNuevo,
        normalized.repuestos_garantia,
        normalized.correo_alerta_garantia,
        normalized.dias_alerta_garantia,
        normalized.fecha_alerta_garantia,
        entraEspera,
        sqliteNowIso(),
        saleEspera,
        entraEspera,
        saleEspera,
        entraEspera,
        saleEspera,
        nextCajaAprobado,
        cajaApprovalChanged && nextCajaAprobado === 1,
        sqliteNowIso(),
        cajaApprovalChanged && nextCajaAprobado === 0,
        cajaApprovalChanged && nextCajaAprobado === 1,
        actor.username || null,
        cajaApprovalChanged && nextCajaAprobado === 0,
        apronteId
      )
      registrarMarcaModeloSqlite(db, normalized.marca, normalized.modelo)
    } catch (error) {
      console.warn('[Aprontes] Backup SQLite fallo en actualizar:', error)
    }
    return
  }

  const db = initDatabase()
  const anterior = db.prepare('SELECT * FROM aprontes WHERE id = ?').get(apronteId) as any
  if (!anterior) return
  const merged = buildApronteMutationInput(anterior, data, actor.role)
  validarRequeridos(merged)
  const normalized = normalizarApronte(merged)
  const fechaNormalizada = normalizarFecha(normalized.fecha)
  const horaNormalizada = normalizarHora(normalized.hora)
  validarReglaFinDeSemana(fechaNormalizada, horaNormalizada)
  const estadoAnterior = normalizarEstadoApronte(anterior.estado)
  const estadoNuevo = normalizarEstadoApronte(normalized.estado)
  const entraEspera = estadoNuevo === 'ENTREGADA ESPERA DE GARANTIA' && estadoAnterior !== 'ENTREGADA ESPERA DE GARANTIA'
  const saleEspera = estadoNuevo !== 'ENTREGADA ESPERA DE GARANTIA'
  const nextCajaAprobado = canApproveApronte(actor.role) && Object.prototype.hasOwnProperty.call(data || {}, 'caja_aprobado')
    ? ((data as any)?.caja_aprobado ? 1 : 0)
    : Number(anterior.caja_aprobado ?? 1)
  const cajaApprovalChanged = nextCajaAprobado !== Number(anterior.caja_aprobado ?? 1)
  const mismoHorario = fechaNormalizada === anterior.fecha && horaNormalizada === anterior.hora
  if (!mismoHorario) {
    validarCupoDisponibleSqlite(db, fechaNormalizada, horaNormalizada, apronteId)
  }

  db.prepare(
    `UPDATE aprontes
     SET nombre = ?, fecha = ?, hora = ?,
         telefono = ?, localidad = ?, observaciones = ?,
         marca = ?, modelo = ?, numero_motor = ?, factura = ?,
         estado = ?, repuestos_garantia = ?,
         correo_alerta_garantia = ?, dias_alerta_garantia = ?, fecha_alerta_garantia = ?,
         garantia_espera_desde = CASE
           WHEN ? THEN ?
           WHEN ? THEN NULL
           ELSE garantia_espera_desde
         END,
         garantia_notificada = CASE
           WHEN ? THEN 0
           WHEN ? THEN 0
           ELSE garantia_notificada
         END,
         garantia_notificada_at = CASE
           WHEN ? OR ? THEN NULL
           ELSE garantia_notificada_at
         END,
         caja_aprobado = ?,
         caja_aprobado_at = CASE
           WHEN ? THEN ?
           WHEN ? THEN NULL
           ELSE caja_aprobado_at
         END,
         caja_aprobado_por = CASE
           WHEN ? THEN ?
           WHEN ? THEN NULL
           ELSE caja_aprobado_por
         END
     WHERE id = ?`
  ).run(
    normalized.nombre,
    fechaNormalizada,
    horaNormalizada,
    normalized.telefono,
    normalized.localidad,
    normalized.observaciones,
    normalized.marca,
    normalized.modelo,
    normalized.numero_motor,
    normalized.factura,
    estadoNuevo,
    normalized.repuestos_garantia,
    normalized.correo_alerta_garantia,
    normalized.dias_alerta_garantia,
    normalized.fecha_alerta_garantia,
    entraEspera,
    sqliteNowIso(),
    saleEspera,
    entraEspera,
    saleEspera,
    entraEspera,
    saleEspera,
    nextCajaAprobado,
    cajaApprovalChanged && nextCajaAprobado === 1,
    sqliteNowIso(),
    cajaApprovalChanged && nextCajaAprobado === 0,
    cajaApprovalChanged && nextCajaAprobado === 1,
    actor.username || null,
    cajaApprovalChanged && nextCajaAprobado === 0,
    apronteId
  )
  registrarMarcaModeloSqlite(db, normalized.marca, normalized.modelo)
}

export async function borrarApronte(input: number | any) {
  await ensureAprontesMysqlSchema()
  const payload = typeof input === 'object' && input !== null ? input : { id: input }
  const actor = getActor(payload)
  assertCanDeleteApronte(actor.role)
  const apronteId = Number(payload?.id || input)
  if (!apronteId) return

  const mysqlResult = await tryMysql(async (pool) => {
    await pool.execute(`DELETE FROM aprontes WHERE id = ?`, [apronteId])
  })

  if (mysqlResult.ok) {
    try {
      const db = initDatabase()
      db.prepare(`DELETE FROM aprontes WHERE id = ?`).run(apronteId)
    } catch (error) {
      console.warn('[Aprontes] Backup SQLite fallo en borrar:', error)
    }
    return
  }

  const db = initDatabase()
  db.prepare(`DELETE FROM aprontes WHERE id = ?`).run(apronteId)
}

export async function obtenerAprontesPendientesAlertaGarantia() {
  await ensureAprontesMysqlSchema()
  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT id, nombre, telefono, marca, modelo, factura,
              estado, repuestos_garantia, correo_alerta_garantia,
              dias_alerta_garantia, fecha_alerta_garantia, garantia_espera_desde, fecha, hora
       FROM aprontes
       WHERE UPPER(TRIM(estado)) = 'ENTREGADA ESPERA DE GARANTIA'
         AND IFNULL(garantia_notificada, 0) = 0`
    )
    return rows
  })

  if (mysqlResult.ok) {
    syncAprontesToSqlite(mysqlResult.value)
    return mysqlResult.value
  }

  const db = initDatabase()
  return db.prepare(
    `SELECT id, nombre, telefono, marca, modelo, factura,
            estado, repuestos_garantia, correo_alerta_garantia,
            dias_alerta_garantia, fecha_alerta_garantia, garantia_espera_desde, fecha, hora
     FROM aprontes
     WHERE UPPER(TRIM(IFNULL(estado, ''))) = 'ENTREGADA ESPERA DE GARANTIA'
       AND IFNULL(garantia_notificada, 0) = 0`
  ).all()
}

export async function marcarApronteGarantiaNotificado(id: number) {
  await ensureAprontesMysqlSchema()
  const apronteId = Number(id)
  if (!apronteId) return

  const mysqlResult = await tryMysql(async (pool) => {
    await pool.execute(
      `UPDATE aprontes
       SET garantia_notificada = 1,
           garantia_notificada_at = NOW()
       WHERE id = ?`,
      [apronteId]
    )
  })

  if (mysqlResult.ok) {
    try {
      const db = initDatabase()
      db.prepare(
        `UPDATE aprontes
         SET garantia_notificada = 1,
             garantia_notificada_at = ?
         WHERE id = ?`
      ).run(sqliteNowIso(), apronteId)
    } catch (error) {
      console.warn('[Aprontes] Backup SQLite fallo en marcar notificado:', error)
    }
    return
  }

  const db = initDatabase()
  db.prepare(
    `UPDATE aprontes
     SET garantia_notificada = 1,
         garantia_notificada_at = ?
     WHERE id = ?`
  ).run(sqliteNowIso(), apronteId)
}
