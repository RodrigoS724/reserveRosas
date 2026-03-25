import { initDatabase } from '../db/database'
import { tryMysql } from '../db/mysql'

export type ApronteInput = {
  nombre: string
  fecha: string
  hora: string
  telefono: string
  localidad: string
  observaciones: string
  marca: string
  modelo: string
  factura: string
}

function limpiarTexto(value: any, maxLen = 255) {
  const text = String(value || '').trim()
  return text.length > maxLen ? text.slice(0, maxLen) : text
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
  return {
    nombre: limpiarTexto(data.nombre, 255),
    fecha: data.fecha,
    hora: data.hora,
    telefono: limpiarTexto(data.telefono, 30),
    localidad: limpiarTexto(data.localidad, 100),
    observaciones: limpiarTexto(data.observaciones, 500),
    marca: limpiarTexto(data.marca, 100),
    modelo: limpiarTexto(data.modelo, 100),
    factura: limpiarTexto(data.factura, 100)
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
  if (!Array.isArray(rows) || rows.length === 0) return
  try {
    const db = initDatabase()
    const upsert = db.prepare(
      `INSERT INTO aprontes (
        id, nombre, fecha, hora, telefono, localidad, observaciones, marca, modelo, factura, created_at
      ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        nombre = excluded.nombre,
        fecha = excluded.fecha,
        hora = excluded.hora,
        telefono = excluded.telefono,
        localidad = excluded.localidad,
        observaciones = excluded.observaciones,
        marca = excluded.marca,
        modelo = excluded.modelo,
        factura = excluded.factura,
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
          row?.factura ?? '',
          row?.created_at ?? null
        )
      }
    })
    tx(rows)
  } catch (error) {
    console.warn('[Aprontes] Error sync sqlite:', error)
  }
}

async function crearApronteSqlite(dataNormalizada: ApronteInput, fechaNormalizada: string, horaNormalizada: string) {
  const db = initDatabase()
  const tx = db.transaction(() => {
    validarCupoDisponibleSqlite(db, fechaNormalizada, horaNormalizada)
    const result = db.prepare(
      `INSERT INTO aprontes (
        nombre, fecha, hora,
        telefono, localidad, observaciones,
        marca, modelo, factura
      ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      dataNormalizada.nombre,
      fechaNormalizada,
      horaNormalizada,
      dataNormalizada.telefono,
      dataNormalizada.localidad,
      dataNormalizada.observaciones,
      dataNormalizada.marca,
      dataNormalizada.modelo,
      dataNormalizada.factura
    )
    return Number(result.lastInsertRowid)
  })
  return tx()
}

async function crearApronteMysql(dataNormalizada: ApronteInput, fechaNormalizada: string, horaNormalizada: string) {
  const mysqlResult = await tryMysql(async (pool) => {
    await validarCupoDisponibleMysql(pool, fechaNormalizada, horaNormalizada)
    const [result]: any = await pool.execute(
      `INSERT INTO aprontes (
        nombre, fecha, hora,
        telefono, localidad, observaciones,
        marca, modelo, factura
      ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dataNormalizada.nombre,
        fechaNormalizada,
        horaNormalizada,
        dataNormalizada.telefono,
        dataNormalizada.localidad,
        dataNormalizada.observaciones,
        dataNormalizada.marca,
        dataNormalizada.modelo,
        dataNormalizada.factura
      ]
    )
    return Number(result.insertId)
  })

  if (!mysqlResult.ok) {
    throw mysqlResult.error
  }

  return mysqlResult.value
}

export async function crearApronte(data: ApronteInput) {
  validarRequeridos(data)
  const normalized = normalizarApronte({ ...data })
  const fechaNormalizada = normalizarFecha(normalized.fecha)
  const horaNormalizada = normalizarHora(normalized.hora)

  try {
    const mysqlId = await crearApronteMysql(normalized, fechaNormalizada, horaNormalizada)
    try {
      const db = initDatabase()
      db.prepare(
        `INSERT INTO aprontes (
          id, nombre, fecha, hora,
          telefono, localidad, observaciones,
          marca, modelo, factura
        ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        normalized.factura
      )
    } catch (error) {
      console.warn('[Aprontes] Backup SQLite fallo en crear:', error)
    }
    return mysqlId
  } catch (error) {
    console.warn('[Aprontes] MySQL no disponible, usando SQLite local')
    return crearApronteSqlite(normalized, fechaNormalizada, horaNormalizada)
  }
}

export async function obtenerApronte(id: number) {
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
  const fechaNormalizada = normalizarFecha(fecha)

  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT * FROM aprontes WHERE fecha = ? ORDER BY hora`,
      [fechaNormalizada]
    )
    return rows
  })

  if (mysqlResult.ok) {
    syncAprontesToSqlite(mysqlResult.value)
    return mysqlResult.value
  }

  const db = initDatabase()
  return db.prepare(
    `SELECT * FROM aprontes WHERE fecha = ? ORDER BY hora`
  ).all(fechaNormalizada)
}

export async function obtenerTodosLosAprontes() {
  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT * FROM aprontes ORDER BY fecha DESC, hora DESC`
    )
    return rows
  })

  if (mysqlResult.ok) {
    syncAprontesToSqlite(mysqlResult.value)
    return mysqlResult.value
  }

  const db = initDatabase()
  return db.prepare(
    `SELECT * FROM aprontes ORDER BY fecha DESC, hora DESC`
  ).all()
}

export async function actualizarApronte(id: number, data: Partial<ApronteInput>) {
  const apronteId = Number(id || (data as any)?.id || 0)
  if (!apronteId) {
    throw new Error('ID de apronte invalido')
  }

  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute('SELECT * FROM aprontes WHERE id = ?', [apronteId])
    const anterior = rows[0]
    if (!anterior) return

    const merged = { ...anterior, ...data }
    validarRequeridos(merged)
    const normalized = normalizarApronte(merged)
    const fechaNormalizada = normalizarFecha(normalized.fecha)
    const horaNormalizada = normalizarHora(normalized.hora)

    const mismoHorario = fechaNormalizada === anterior.fecha && horaNormalizada === anterior.hora
    if (!mismoHorario) {
      await validarCupoDisponibleMysql(pool, fechaNormalizada, horaNormalizada, apronteId)
    }

    await pool.execute(
      `UPDATE aprontes
       SET nombre = ?, fecha = ?, hora = ?,
           telefono = ?, localidad = ?, observaciones = ?,
           marca = ?, modelo = ?, factura = ?
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
        normalized.factura,
        apronteId
      ]
    )
  })

  if (mysqlResult.ok) {
    try {
      const db = initDatabase()
      const anterior = db.prepare('SELECT * FROM aprontes WHERE id = ?').get(apronteId) as any
      if (!anterior) return
      const merged = { ...anterior, ...data }
      validarRequeridos(merged)
      const normalized = normalizarApronte(merged)
      const fechaNormalizada = normalizarFecha(normalized.fecha)
      const horaNormalizada = normalizarHora(normalized.hora)
      const mismoHorario = fechaNormalizada === anterior.fecha && horaNormalizada === anterior.hora
      if (!mismoHorario) {
        validarCupoDisponibleSqlite(db, fechaNormalizada, horaNormalizada, apronteId)
      }
      db.prepare(
        `UPDATE aprontes
         SET nombre = ?, fecha = ?, hora = ?,
             telefono = ?, localidad = ?, observaciones = ?,
             marca = ?, modelo = ?, factura = ?
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
        normalized.factura,
        apronteId
      )
    } catch (error) {
      console.warn('[Aprontes] Backup SQLite fallo en actualizar:', error)
    }
    return
  }

  const db = initDatabase()
  const anterior = db.prepare('SELECT * FROM aprontes WHERE id = ?').get(apronteId) as any
  if (!anterior) return
  const merged = { ...anterior, ...data }
  validarRequeridos(merged)
  const normalized = normalizarApronte(merged)
  const fechaNormalizada = normalizarFecha(normalized.fecha)
  const horaNormalizada = normalizarHora(normalized.hora)
  const mismoHorario = fechaNormalizada === anterior.fecha && horaNormalizada === anterior.hora
  if (!mismoHorario) {
    validarCupoDisponibleSqlite(db, fechaNormalizada, horaNormalizada, apronteId)
  }

  db.prepare(
    `UPDATE aprontes
     SET nombre = ?, fecha = ?, hora = ?,
         telefono = ?, localidad = ?, observaciones = ?,
         marca = ?, modelo = ?, factura = ?
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
    normalized.factura,
    apronteId
  )
}

export async function borrarApronte(id: number) {
  const apronteId = Number(id)
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
