import { initDatabase } from '../db/database'
import { tryMysql } from '../db/mysql'
import {
  assertCanCreateReserva,
  assertCanDeleteReserva,
  assertCanEditReservaNotes,
  assertCanMoveReserva,
  getActor,
  isTallerRole
} from './access-control.service'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 100

type ReservaInput = {
  nombre: string
  cedula: string
  telefono: string
  marca: string
  modelo: string
  km: string
  matricula: string
  tipo_turno: string
  particular_tipo: string | null
  garantia_tipo: string | null
  garantia_fecha_compra: string | null
  garantia_numero_service: string | null
  garantia_problema: string | null
  fecha: string
  hora: string
  detalles: string
}

type ReservaSnapshot = ReservaInput & {
  estado: string
}

function buildReservaMutationInput(anterior: any, incoming: any, actorRole: string) {
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

function normalizarCatalogoTexto(value: any) {
  const text = String(value || '').trim()
  return text.length > 100 ? text.slice(0, 100) : text
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
    console.warn('[Service] No se pudo registrar marca/modelo en MySQL:', error)
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
    console.warn('[Service] No se pudo registrar marca/modelo en SQLite:', error)
  }
}

function validarReserva(data: ReservaInput) {
  const tipo = data.tipo_turno

  if (tipo === 'Garantía') {
    if (!data.garantia_tipo) {
      throw new Error('Tipo de garantia requerido.')
    }
    if (!data.garantia_fecha_compra) {
      throw new Error('Fecha de compra requerida.')
    }
    if (data.garantia_tipo === 'Service') {
      if (!data.garantia_numero_service) {
        throw new Error('Numero de service requerido.')
      }
    } else if (data.garantia_tipo === 'Reparación') {
      if (!data.garantia_problema) {
        throw new Error('Descripcion del problema requerida.')
      }
    } else {
      throw new Error('Tipo de garantia invalido.')
    }
  } else if (tipo === 'Particular') {
    if (!data.particular_tipo) {
      throw new Error('Tipo particular requerido.')
    }
    if (data.particular_tipo !== 'Service' && data.particular_tipo !== 'Taller') {
      throw new Error('Tipo particular invalido.')
    }
  }
}

function normalizarReserva(data: ReservaInput): ReservaInput {
  const tipo = data.tipo_turno

  if (tipo !== 'Garantía') {
    data.garantia_tipo = null
    data.garantia_fecha_compra = null
    data.garantia_numero_service = null
    data.garantia_problema = null
  }

  if (tipo !== 'Particular') {
    data.particular_tipo = null
  }

  return data
}

function normalizarMatriculaReserva(value: string): string {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function validarCondicionesSubtipo(data: ReservaInput) {
  const tipo = data.tipo_turno
  const kmNumerico = /^\d+$/.test(String(data.km || '').trim())

  if (tipo === 'Particular') {
    if (data.particular_tipo === 'Service') {
      if (!kmNumerico) {
        throw new Error('KM requerido para Particular Service.')
      }
      return
    }
    if (data.particular_tipo === 'Taller') {
      if (!String(data.detalles || '').trim()) {
        throw new Error('Detalle de reparacion requerido para Particular Taller.')
      }
      return
    }
  }

  if (tipo === 'GarantÃ­a') {
    if (data.garantia_tipo === 'Service') {
      if (!String(data.garantia_fecha_compra || '').trim()) {
        throw new Error('Fecha de compra requerida para Garantia Service.')
      }
      if (!kmNumerico) {
        throw new Error('KM requerido para Garantia Service.')
      }
      if (!/^\d+$/.test(String(data.garantia_numero_service || '').trim())) {
        throw new Error('Numero de service requerido para Garantia Service.')
      }
      return
    }
    if (data.garantia_tipo === 'ReparaciÃ³n') {
      if (!String(data.garantia_problema || '').trim()) {
        throw new Error('Descripcion del problema requerida para Garantia Reparacion.')
      }
      return
    }
  }
}

/**
 * Ejecuta una operación con reintento automático en caso de SQLITE_BUSY
 */
async function executeWithRetry<T>(
  fn: () => T,
  retryCount = 0
): Promise<T> {
  try {
    console.log(`[Service] Intento ${retryCount + 1}/${MAX_RETRIES}`)
    return fn()
  } catch (error: any) {
    if (error.code === 'SQLITE_BUSY' && retryCount < MAX_RETRIES - 1) {
      console.warn(`[Service] SQLITE_BUSY, reintentando en ${RETRY_DELAY_MS}ms...`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
      return executeWithRetry(fn, retryCount + 1)
    }
    throw error
  }
}

/* =========================
 * CREAR RESERVA
 * ========================= */
async function crearReservaSqlite(dataNormalizada: ReservaInput, fechaNormalizada: string) {
  return executeWithRetry(() => {
    const db = initDatabase()

    const tx = db.transaction(() => {
      console.log('[Service] Dentro de transaction...')
      
      const result = db.prepare(`
        INSERT INTO reservas (
          nombre, cedula, telefono,
          marca, modelo, km, matricula,
          tipo_turno, particular_tipo, garantia_tipo,
          garantia_fecha_compra, garantia_numero_service, garantia_problema,
          fecha, hora, detalles
        )
        VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        dataNormalizada.nombre,
        dataNormalizada.cedula,
        dataNormalizada.telefono,
        dataNormalizada.marca,
        dataNormalizada.modelo,
        dataNormalizada.km,
        dataNormalizada.matricula,
        dataNormalizada.tipo_turno,
        dataNormalizada.particular_tipo ?? null,
        dataNormalizada.garantia_tipo ?? null,
        dataNormalizada.garantia_fecha_compra ?? null,
        dataNormalizada.garantia_numero_service ?? null,
        dataNormalizada.garantia_problema ?? null,
        fechaNormalizada,
        dataNormalizada.hora,
        dataNormalizada.detalles ?? ''
      )

      console.log('[Service] Reserva insertada con ID:', result.lastInsertRowid)

      const vehiculoExistente = db.prepare(`
        SELECT id FROM vehiculos WHERE matricula = ? `).get(dataNormalizada.matricula) as { id: number } | undefined

      let vehiculoId = vehiculoExistente?.id

      if (!vehiculoId) {
        const vehiculoInsert = db.prepare(`
          INSERT INTO vehiculos (matricula, marca, modelo, nombre, telefono)
          VALUES ( ?, ?, ?, ?, ?)
        `).run(
          dataNormalizada.matricula,
          dataNormalizada.marca,
          dataNormalizada.modelo,
          dataNormalizada.nombre,
          dataNormalizada.telefono
        )
        vehiculoId = Number(vehiculoInsert.lastInsertRowid)
      } else {
        db.prepare(`
          UPDATE vehiculos
          SET marca = ?, modelo = ?, nombre = ?, telefono = ?
          WHERE id = ?
        `).run(
          dataNormalizada.marca,
          dataNormalizada.modelo,
          dataNormalizada.nombre,
          dataNormalizada.telefono,
          vehiculoId
        )
      }

      db.prepare(`
        INSERT INTO vehiculos_historial (
          vehiculo_id, fecha, km, tipo_turno,
          particular_tipo, garantia_tipo, garantia_fecha_compra,
          garantia_numero_service, garantia_problema, detalles
        )
        VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        vehiculoId,
        fechaNormalizada,
        dataNormalizada.km,
        dataNormalizada.tipo_turno,
        dataNormalizada.particular_tipo ?? null,
        dataNormalizada.garantia_tipo ?? null,
        dataNormalizada.garantia_fecha_compra ?? null,
        dataNormalizada.garantia_numero_service ?? null,
        dataNormalizada.garantia_problema ?? null,
        dataNormalizada.detalles ?? ''
      )

      registrarMarcaModeloSqlite(db, dataNormalizada.marca, dataNormalizada.modelo)

      db.prepare(`
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
        VALUES ( ?, 'creación', '', 'reserva creada', datetime('now'))
      `).run(result.lastInsertRowid)

      console.log('[Service] Historial registrado')
      return result.lastInsertRowid
    })

    console.log('[Service] Ejecutando transaction...')
    const lastId = tx()
    console.log('[Service] Transaction completada con ID:', lastId)
    return lastId
  })
}

async function crearReservaMysql(dataNormalizada: ReservaInput, fechaNormalizada: string) {
  const mysqlResult = await tryMysql( async (pool) => {
    const [result]: any = await pool.execute(
      `
        INSERT INTO reservas (
          nombre, cedula, telefono,
          marca, modelo, km, matricula,
          tipo_turno, particular_tipo, garantia_tipo,
          garantia_fecha_compra, garantia_numero_service, garantia_problema,
          fecha, hora, detalles
        )
        VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        dataNormalizada.nombre,
        dataNormalizada.cedula,
        dataNormalizada.telefono,
        dataNormalizada.marca,
        dataNormalizada.modelo,
        dataNormalizada.km,
        dataNormalizada.matricula,
        dataNormalizada.tipo_turno,
        dataNormalizada.particular_tipo ?? null,
        dataNormalizada.garantia_tipo ?? null,
        dataNormalizada.garantia_fecha_compra ?? null,
        dataNormalizada.garantia_numero_service ?? null,
        dataNormalizada.garantia_problema ?? null,
        fechaNormalizada,
        dataNormalizada.hora,
        dataNormalizada.detalles ?? ''
      ]
    )

    const reservaId = Number(result.insertId)

    await pool.execute(
      `
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
        VALUES ( ?, 'creación', '', 'reserva creada', NOW())
      `,
      [reservaId]
    )

    const [vehiculosRows]: any = await pool.execute(
      `SELECT id FROM vehiculos WHERE matricula = ?`,
      [dataNormalizada.matricula]
    )

    let vehiculoId = vehiculosRows[0]?.id as number | undefined

    if (!vehiculoId) {
      const [vehInsert]: any = await pool.execute(
        `
          INSERT INTO vehiculos (matricula, marca, modelo, nombre, telefono)
          VALUES ( ?, ?, ?, ?, ?)
        `,
        [
          dataNormalizada.matricula,
          dataNormalizada.marca,
          dataNormalizada.modelo,
          dataNormalizada.nombre,
          dataNormalizada.telefono
        ]
      )
      vehiculoId = Number(vehInsert.insertId)
    } else {
      await pool.execute(
        `
          UPDATE vehiculos
          SET marca = ?, modelo = ?, nombre = ?, telefono = ?
          WHERE id = ?
        `,
        [
          dataNormalizada.marca,
          dataNormalizada.modelo,
          dataNormalizada.nombre,
          dataNormalizada.telefono,
          vehiculoId
        ]
      )
    }

    await pool.execute(
      `
        INSERT INTO vehiculos_historial (
          vehiculo_id, fecha, km, tipo_turno,
          particular_tipo, garantia_tipo, garantia_fecha_compra,
          garantia_numero_service, garantia_problema, detalles
        )
        VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        vehiculoId,
        fechaNormalizada,
        dataNormalizada.km,
        dataNormalizada.tipo_turno,
        dataNormalizada.particular_tipo ?? null,
        dataNormalizada.garantia_tipo ?? null,
        dataNormalizada.garantia_fecha_compra ?? null,
        dataNormalizada.garantia_numero_service ?? null,
        dataNormalizada.garantia_problema ?? null,
        dataNormalizada.detalles ?? ''
      ]
    )

    await registrarMarcaModeloMysql(pool, dataNormalizada.marca, dataNormalizada.modelo)

    return reservaId
  })

  if (!mysqlResult.ok) {
    throw mysqlResult.error
  }

  return mysqlResult.value
}

export async function crearReserva(data: ReservaInput) {
  console.log('[Service] Iniciando crearReserva...')
  const actor = getActor(data)
  assertCanCreateReserva(actor.role)
  validarReserva(data)
  validarCondicionesSubtipo(data)
  const dataNormalizada = normalizarReserva({ ...data })
  const fechaNormalizada = new Date(dataNormalizada.fecha).toISOString().split('T')[0]
  console.log('[Service] Fecha normalizada:', dataNormalizada.fecha, '->', fechaNormalizada)

  try {
    const mysqlId = await crearReservaMysql(dataNormalizada, fechaNormalizada)
    try {
      await crearReservaSqlite(dataNormalizada, fechaNormalizada)
    } catch (error) {
      console.warn('[Service] Backup SQLite fallo:', error)
    }
    return mysqlId
  } catch (error) {
    console.warn('[Service] MySQL no disponible, usando SQLite local')
    return await crearReservaSqlite(dataNormalizada, fechaNormalizada)
  }
}

/* =========================
 * OBTENER RESERVA POR ID
 * ========================= */
export async function obtenerReserva(id: number) {
  console.log('[Service] Obteniendo reserva:', id)
  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(`SELECT * FROM reservas WHERE id = ?`, [id])
    return rows[0] ?? null
  })
  if (mysqlResult.ok) return mysqlResult.value

  const db = initDatabase()
  return db.prepare(`SELECT * FROM reservas WHERE id = ?`).get(id)
}

/* =========================
 * BORRAR RESERVA
 * ========================= */
export async function borrarReserva(input: number | any) {
  const payload = typeof input === 'object' && input !== null ? input : { id: input }
  const actor = getActor(payload)
  assertCanDeleteReserva(actor.role)
  const reservaId = Number(payload?.id || input)
  console.log('[Service] Borrando reserva:', reservaId)

  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(`SELECT * FROM reservas WHERE id = ?`, [reservaId])
    const reserva = rows[0]
    if (!reserva) {
      console.log('[Service] Reserva no encontrada en MySQL:', reservaId)
      return
    }

    await pool.execute(`DELETE FROM reservas WHERE id = ?`, [reservaId])
    await pool.execute(
      `
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
        VALUES ( ?, 'eliminación', ?, 'reserva eliminada', NOW())
      `,
      [reservaId, JSON.stringify(reserva)]
    )
  })

  if (mysqlResult.ok) {
    try {
      const db = initDatabase()
      const tx = db.transaction(() => {
      const reserva = db.prepare(`SELECT * FROM reservas WHERE id = ?`).get(reservaId)
        if (!reserva) return
      db.prepare(`DELETE FROM reservas WHERE id = ?`).run(reservaId)
        db.prepare(`
          INSERT INTO historial_reservas
          (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
          VALUES ( ?, 'eliminación', ?, 'reserva eliminada', datetime('now'))
        `).run(reservaId, JSON.stringify(reserva))
      })
      tx()
    } catch (error) {
      console.warn('[Service] Backup SQLite fallo al borrar:', error)
    }
    return
  }

  const db = initDatabase()
  try {
    const tx = db.transaction(() => {
      const reserva = db.prepare(`SELECT * FROM reservas WHERE id = ?`).get(reservaId)
      if (!reserva) {
        console.log('[Service] Reserva no encontrada:', reservaId)
        return
      }
      db.prepare(`DELETE FROM reservas WHERE id = ?`).run(reservaId)
      db.prepare(`
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
        VALUES ( ?, 'eliminación', ?, 'reserva eliminada', datetime('now'))
      `).run(reservaId, JSON.stringify(reserva))
    })
    tx()
  } catch (error: any) {
    console.error('[Service] Error en borrarReserva:', error)
    throw error
  }
}

/* =========================
 * MOVER RESERVA (drag & drop)
 * ========================= */
export async function moverReserva(idOrPayload: number | any, nuevaFecha?: string, nuevaHora?: string) {
  const payload = typeof idOrPayload === 'object' && idOrPayload !== null
    ? idOrPayload
    : { id: idOrPayload, nuevaFecha, nuevaHora }
  const actor = getActor(payload)
  assertCanMoveReserva(actor.role)
  const reservaId = Number(payload?.id || idOrPayload)
  console.log('[Service] Moviendo reserva:', { id: reservaId, nuevaFecha: payload?.nuevaFecha, nuevaHora: payload?.nuevaHora })

  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT fecha, hora FROM reservas WHERE id = ?`,
      [reservaId]
    )
    const anterior = rows[0]
    if (!anterior) {
      console.log('[Service] Reserva no encontrada para mover (MySQL):', reservaId)
      return
    }

    await pool.execute(
      `UPDATE reservas SET fecha = ?, hora = COALESCE( ?, hora) WHERE id = ?`,
      [payload?.nuevaFecha, payload?.nuevaHora ?? null, reservaId]
    )

    if (payload?.nuevaFecha !== anterior.fecha) {
      await pool.execute(
        `
          INSERT INTO historial_reservas
          (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
          VALUES ( ?, 'fecha', ?, ?, NOW())
        `,
        [reservaId, anterior.fecha, payload?.nuevaFecha]
      )
    }

    if (payload?.nuevaHora && payload.nuevaHora !== anterior.hora) {
      await pool.execute(
        `
          INSERT INTO historial_reservas
          (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
          VALUES ( ?, 'hora', ?, ?, NOW())
        `,
        [reservaId, anterior.hora, payload.nuevaHora]
      )
    }
  })

  if (mysqlResult.ok) {
    try {
      const db = initDatabase()
      const tx = db.transaction(() => {
      const anterior = db.prepare(`SELECT fecha, hora FROM reservas WHERE id = ?`).get(reservaId) as { fecha: string; hora: string } | undefined
        if (!anterior) return
      db.prepare(`UPDATE reservas SET fecha = ?, hora = COALESCE( ?, hora) WHERE id = ?`).run(payload?.nuevaFecha, payload?.nuevaHora ?? null, reservaId)
      if (payload?.nuevaFecha !== anterior.fecha) {
          db.prepare(`
            INSERT INTO historial_reservas
            (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
            VALUES ( ?, 'fecha', ?, ?, datetime('now'))
          `).run(reservaId, anterior.fecha, payload?.nuevaFecha)
        }
        if (payload?.nuevaHora && payload.nuevaHora !== anterior.hora) {
          db.prepare(`
            INSERT INTO historial_reservas
            (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
            VALUES ( ?, 'hora', ?, ?, datetime('now'))
          `).run(reservaId, anterior.hora, payload.nuevaHora)
        }
      })
      tx()
    } catch (error) {
      console.warn('[Service] Backup SQLite fallo en moverReserva:', error)
    }
    return
  }

  const db = initDatabase()
  try {
    const tx = db.transaction(() => {
      const anterior = db.prepare(`SELECT fecha, hora FROM reservas WHERE id = ?`).get(reservaId) as { fecha: string; hora: string } | undefined
      if (!anterior) {
        console.log('[Service] Reserva no encontrada para mover:', reservaId)
        return
      }
      db.prepare(`UPDATE reservas SET fecha = ?, hora = COALESCE( ?, hora) WHERE id = ?`).run(payload?.nuevaFecha, payload?.nuevaHora ?? null, reservaId)
      if (payload?.nuevaFecha !== anterior.fecha) {
        db.prepare(`
          INSERT INTO historial_reservas
          (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
          VALUES ( ?, 'fecha', ?, ?, datetime('now'))
        `).run(reservaId, anterior.fecha, payload?.nuevaFecha)
      }
      if (payload?.nuevaHora && payload.nuevaHora !== anterior.hora) {
        db.prepare(`
          INSERT INTO historial_reservas
          (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
          VALUES ( ?, 'hora', ?, ?, datetime('now'))
        `).run(reservaId, anterior.hora, payload.nuevaHora)
      }
    })
    tx()
  } catch (error: any) {
    console.error('[Service] Error en moverReserva:', error)
    throw error
  }
}

/* =========================
 * ACTUALIZAR RESERVA (EDITAR)
 * ========================= */
export async function actualizarReserva(idOrPayload: number | any, reserva?: any) {
  const incoming = typeof idOrPayload === 'object' && idOrPayload !== null ? idOrPayload : (reserva || {})
  const actor = getActor(incoming)
  const reservaId = Number((typeof idOrPayload === 'object' ? idOrPayload?.id : idOrPayload) || incoming?.id || 0)
  console.log('[Service] Actualizando reserva:', reservaId, incoming)
  if (!reservaId) {
    throw new Error('ID de reserva invalido.')
  }

  const mergedIncoming = isTallerRole(actor.role)
    ? { estado: incoming?.estado }
    : incoming

  const matriculaNormalizada = normalizarMatriculaReserva(mergedIncoming?.matricula || '').slice(0, 10)
  if (matriculaNormalizada && !/^[A-Z0-9]{3,10}$/.test(matriculaNormalizada)) {
    throw new Error('Matricula invalida. Usa solo letras y numeros.')
  }
  const reservaActualizada = normalizarReserva({
    nombre: String(mergedIncoming?.nombre ?? ''),
    cedula: String(mergedIncoming?.cedula ?? ''),
    telefono: String(mergedIncoming?.telefono ?? ''),
    marca: String(mergedIncoming?.marca ?? ''),
    modelo: String(mergedIncoming?.modelo ?? ''),
    km: String(mergedIncoming?.km ?? ''),
    matricula: matriculaNormalizada,
    tipo_turno: String(mergedIncoming?.tipo_turno ?? ''),
    particular_tipo: mergedIncoming?.particular_tipo ?? null,
    garantia_tipo: mergedIncoming?.garantia_tipo ?? null,
    garantia_fecha_compra: mergedIncoming?.garantia_fecha_compra ?? null,
    garantia_numero_service: mergedIncoming?.garantia_numero_service ?? null,
    garantia_problema: mergedIncoming?.garantia_problema ?? null,
    fecha: String(mergedIncoming?.fecha ?? ''),
    hora: String(mergedIncoming?.hora ?? ''),
    detalles: String(mergedIncoming?.detalles ?? '')
  } as ReservaInput)
  const estadoActual = String(mergedIncoming?.estado ?? 'pendiente')
  const payloadBase: ReservaSnapshot = { ...reservaActualizada, estado: estadoActual }

  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT nombre, cedula, telefono, marca, modelo, km, matricula,
              tipo_turno, particular_tipo, garantia_tipo, garantia_fecha_compra,
              garantia_numero_service, garantia_problema, fecha, hora, estado, detalles
       FROM reservas WHERE id = ?`,
      [reservaId]
    )
    const anterior = rows[0] as Partial<ReservaSnapshot>
    if (!anterior) {
      console.log('[Service] Reserva no encontrada para actualizar (MySQL):', reservaId)
      return
    }

    const payload = buildReservaMutationInput(anterior, payloadBase, actor.role) as ReservaSnapshot
    const campos = Object.keys(payload) as (keyof ReservaSnapshot)[]

    await pool.execute(
      `UPDATE reservas
       SET nombre = ?, cedula = ?, telefono = ?, marca = ?, modelo = ?, km = ?, matricula = ?,
           tipo_turno = ?, particular_tipo = ?, garantia_tipo = ?, garantia_fecha_compra = ?,
           garantia_numero_service = ?, garantia_problema = ?, fecha = ?, hora = ?, estado = ?, detalles = ?
       WHERE id = ?`,
      [
        payload.nombre,
        payload.cedula,
        payload.telefono,
        payload.marca,
        payload.modelo,
        payload.km,
        payload.matricula,
        payload.tipo_turno,
        payload.particular_tipo ?? null,
        payload.garantia_tipo ?? null,
        payload.garantia_fecha_compra ?? null,
        payload.garantia_numero_service ?? null,
        payload.garantia_problema ?? null,
        payload.fecha,
        payload.hora,
        payload.estado,
        payload.detalles,
        reservaId
      ]
    )

    await registrarMarcaModeloMysql(pool, payload.marca, payload.modelo)

    for (const campo of campos) {
      if ( anterior[campo] !== payload[campo]) {
        await pool.execute(
          `
            INSERT INTO historial_reservas
            (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
            VALUES ( ?, ?, ?, ?, NOW())
          `,
          [reservaId, campo, anterior[campo], payload[campo]]
        )
      }
    }
  })

  if (mysqlResult.ok) {
    try {
      const db = initDatabase()
      const anterior = db.prepare(`
        SELECT nombre, cedula, telefono, marca, modelo, km, matricula,
               tipo_turno, particular_tipo, garantia_tipo, garantia_fecha_compra,
               garantia_numero_service, garantia_problema, fecha, hora, estado, detalles
        FROM reservas
        WHERE id = ?
      `).get(reservaId) as Partial<ReservaSnapshot>
      if (!anterior) return
      const payload = buildReservaMutationInput(anterior, payloadBase, actor.role) as ReservaSnapshot
      const campos = Object.keys(payload) as (keyof ReservaSnapshot)[]
      const transaction = db.transaction(() => {
        db.prepare(`
          UPDATE reservas
          SET nombre = ?, cedula = ?, telefono = ?, marca = ?, modelo = ?, km = ?, matricula = ?,
              tipo_turno = ?, particular_tipo = ?, garantia_tipo = ?, garantia_fecha_compra = ?,
              garantia_numero_service = ?, garantia_problema = ?, fecha = ?, hora = ?, estado = ?, detalles = ?
          WHERE id = ?
        `).run(
          payload.nombre,
          payload.cedula,
          payload.telefono,
          payload.marca,
          payload.modelo,
          payload.km,
          payload.matricula,
          payload.tipo_turno,
          payload.particular_tipo ?? null,
          payload.garantia_tipo ?? null,
          payload.garantia_fecha_compra ?? null,
          payload.garantia_numero_service ?? null,
          payload.garantia_problema ?? null,
          payload.fecha,
          payload.hora,
          payload.estado,
          payload.detalles,
          reservaId
        )
        registrarMarcaModeloSqlite(db, payload.marca, payload.modelo)
        for (const campo of campos) {
          if ( anterior[campo] !== payload[campo]) {
            db.prepare(`
              INSERT INTO historial_reservas
              (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
              VALUES ( ?, ?, ?, ?, datetime('now'))
            `).run(
              reservaId,
              campo, anterior[campo],
              payload[campo]
            )
          }
        }
      })
      transaction()
    } catch (error) {
      console.warn('[Service] Backup SQLite fallo en actualizarReserva:', error)
    }
    return
  }

  const db = initDatabase()
  try {
    const anterior = db.prepare(`
      SELECT nombre, cedula, telefono, marca, modelo, km, matricula,
             tipo_turno, particular_tipo, garantia_tipo, garantia_fecha_compra,
             garantia_numero_service, garantia_problema, fecha, hora, estado, detalles
      FROM reservas
      WHERE id = ?
    `).get(reservaId) as Partial<ReservaSnapshot>

    if (!anterior) {
      console.log('[Service] Reserva no encontrada para actualizar:', id)
      return
    }

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE reservas
        SET nombre = ?, cedula = ?, telefono = ?, marca = ?, modelo = ?, km = ?, matricula = ?,
            tipo_turno = ?, particular_tipo = ?, garantia_tipo = ?, garantia_fecha_compra = ?,
            garantia_numero_service = ?, garantia_problema = ?, fecha = ?, hora = ?, estado = ?, detalles = ?
        WHERE id = ?
      `).run(
        payload.nombre,
        payload.cedula,
        payload.telefono,
        payload.marca,
        payload.modelo,
        payload.km,
        payload.matricula,
        payload.tipo_turno,
        payload.particular_tipo ?? null,
        payload.garantia_tipo ?? null,
        payload.garantia_fecha_compra ?? null,
        payload.garantia_numero_service ?? null,
        payload.garantia_problema ?? null,
        payload.fecha,
        payload.hora,
        payload.estado,
        payload.detalles,
        reservaId
      )
      registrarMarcaModeloSqlite(db, payload.marca, payload.modelo)

      for (const campo of campos) {
        if ( anterior[campo] !== payload[campo]) {
          db.prepare(`
            INSERT INTO historial_reservas
            (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
            VALUES ( ?, ?, ?, ?, datetime('now'))
          `).run(
            reservaId,
            campo, anterior[campo],
            payload[campo]
          )
        }
      }
    })

    transaction()
  } catch (error: any) {
    console.error('[Service] Error en actualizarReserva:', error)
    throw error
  }
}

function syncReservasToSqlite(rows: any[]) {
  if (!Array.isArray(rows) || rows.length === 0) return
  try {
    const db = initDatabase()
    const selectById = db.prepare(`SELECT id FROM reservas WHERE id = ?`)
    const selectByKey = db.prepare(`
      SELECT id FROM reservas
      WHERE fecha = ? AND hora = ?
        AND IFNULL(cedula, '') = ?
        AND IFNULL(matricula, '') = ?
      LIMIT 1
    `)
    const insert = db.prepare(`
      INSERT INTO reservas (
        id, nombre, cedula, telefono, marca, modelo, km, matricula,
        tipo_turno, particular_tipo, garantia_tipo, garantia_fecha_compra,
        garantia_numero_service, garantia_problema, fecha, hora, detalles,
        estado, notas
      ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const update = db.prepare(`
      UPDATE reservas
      SET nombre = ?, cedula = ?, telefono = ?, marca = ?, modelo = ?, km = ?, matricula = ?,
          tipo_turno = ?, particular_tipo = ?, garantia_tipo = ?, garantia_fecha_compra = ?,
          garantia_numero_service = ?, garantia_problema = ?, fecha = ?, hora = ?, detalles = ?,
          estado = ?, notas = ?
      WHERE id = ?
    `)

    const tx = db.transaction(() => {
      for (const row of rows) {
        const id = row?.id ? Number(row.id) : null
        let existingId: number | null = null
        if (id) {
          const byId = selectById.get(id) as { id: number } | undefined
          if (byId?.id) existingId = byId.id
        }
        if (!existingId) {
          const byKey = selectByKey.get(
            row?.fecha ?? '',
            row?.hora ?? '',
            row?.cedula ?? '',
            row?.matricula ?? ''
          ) as { id: number } | undefined
          if (byKey?.id) existingId = byKey.id
        }

        const values = [
          row?.nombre ?? '',
          row?.cedula ?? '',
          row?.telefono ?? '',
          row?.marca ?? '',
          row?.modelo ?? '',
          row?.km ?? '',
          row?.matricula ?? '',
          row?.tipo_turno ?? '',
          row?.particular_tipo ?? null,
          row?.garantia_tipo ?? null,
          row?.garantia_fecha_compra ?? null,
          row?.garantia_numero_service ?? null,
          row?.garantia_problema ?? null,
          row?.fecha ?? '',
          row?.hora ?? '',
          row?.detalles ?? null,
          row?.estado ?? 'pendiente',
          row?.notas ?? null
        ]

        if (existingId) {
          update.run(
            ...values,
            existingId
          )
        } else {
          insert.run(
            id || null,
            ...values
          )
        }
      }
    })
    tx()
  } catch (error) {
    console.warn('[Service] Error sincronizando reservas MySQL -> SQLite:', error)
  }
}


/* =========================
 * RESERVAS DE LA SEMANA
 * ========================= */
export async function obtenerReservasSemana(desde: string, hasta: string) {
  console.log('[Service] Obteniendo reservas entre:', desde, 'y', hasta)
  
  const desdeNormalizado = new Date(desde).toISOString().split('T')[0]
  const hastaNormalizado = new Date(hasta).toISOString().split('T')[0]
  console.log('[Service] Fechas normalizadas:', desdeNormalizado, 'a', hastaNormalizado)

  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(
      `
        SELECT * FROM reservas
        WHERE fecha >= ? AND fecha <= ?
        ORDER BY fecha, hora
      `,
      [desdeNormalizado, hastaNormalizado]
    )
    return rows
  })
  if (mysqlResult.ok) {
    syncReservasToSqlite(mysqlResult.value)
    return mysqlResult.value
  }

  const db = initDatabase()
  const result = db.prepare(`
    SELECT * FROM reservas
    WHERE fecha >= ? AND fecha <= ?
    ORDER BY fecha, hora
  `).all(desdeNormalizado, hastaNormalizado)
  return result
}

/* =========================
 * RESERVAS POR FECHA
 * ========================= */
export async function obtenerReservasPorFecha(fecha: string) {
  const fechaNormalizada = new Date(fecha).toISOString().split('T')[0]

  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(
      `
        SELECT * FROM reservas
        WHERE fecha = ?
        ORDER BY hora
      `,
      [fechaNormalizada]
    )
    return rows
  })

  if (mysqlResult.ok) {
    syncReservasToSqlite(mysqlResult.value)
    return mysqlResult.value
  }

  const db = initDatabase()
  return db.prepare(`
    SELECT * FROM reservas
    WHERE fecha = ?
    ORDER BY hora
  `).all(fechaNormalizada)
}

/* =========================
 * OBTENER TODAS LAS RESERVAS
 * ========================= */
export async function obtenerTodasLasReservas() {
  console.log('[Service] Obteniendo TODAS las reservas')

  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT * FROM reservas ORDER BY fecha DESC, hora DESC`
    )
    return rows
  })
  if (mysqlResult.ok) {
    syncReservasToSqlite(mysqlResult.value)
    return mysqlResult.value
  }

  const db = initDatabase()
  const result = db.prepare(`
    SELECT * FROM reservas
    ORDER BY fecha DESC, hora DESC
  `).all()
  return result
}

/* =========================
 * ACTUALIZAR NOTAS DE RESERVA
 * ========================= */
export async function actualizarNotasReserva(id: number, notas: string) {
  const payload = typeof id === 'object' && id !== null ? id : { id, notas }
  const actor = getActor(payload)
  assertCanEditReservaNotes(actor.role)
  const reservaId = Number(payload?.id || id)
  const nextNotas = String(payload?.notas ?? notas ?? '')
  console.log('[Service] Actualizando notas para reserva:', reservaId)

  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT notas FROM reservas WHERE id = ?`,
      [reservaId]
    )
    const anterior = rows[0]
    if (!anterior) return

    await pool.execute(`UPDATE reservas SET notas = ? WHERE id = ?`, [nextNotas, reservaId])
    await pool.execute(
      `
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
        VALUES ( ?, 'notas', ?, ?, NOW())
      `,
      [reservaId, anterior.notas || '', nextNotas]
    )
  })

  if (mysqlResult.ok) {
    try {
      const db = initDatabase()
      const anterior = db.prepare(`SELECT notas FROM reservas WHERE id = ?`).get(reservaId) as { notas: string | null } | undefined
      if (!anterior) return
      const transaction = db.transaction(() => {
        db.prepare(`UPDATE reservas SET notas = ? WHERE id = ?`).run(nextNotas, reservaId)
        db.prepare(`
          INSERT INTO historial_reservas
          (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
          VALUES ( ?, 'notas', ?, ?, datetime('now'))
        `).run(reservaId, anterior.notas || '', nextNotas)
      })
      transaction()
    } catch (error) {
      console.warn('[Service] Backup SQLite fallo en actualizarNotasReserva:', error)
    }
    return
  }

  const db = initDatabase()
  try {
    const anterior = db.prepare(`
      SELECT notas FROM reservas WHERE id = ? `).get(reservaId) as { notas: string | null } | undefined

    if (!anterior) {
      console.log('[Service] Reserva no encontrada:', reservaId)
      return
    }

    const transaction = db.transaction(() => {
      db.prepare(`UPDATE reservas SET notas = ? WHERE id = ?`).run(nextNotas, reservaId)
      db.prepare(`
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
        VALUES ( ?, 'notas', ?, ?, datetime('now'))
      `).run(reservaId, anterior.notas || '', nextNotas)
    })

    transaction()
  } catch (error: any) {
    console.error('[Service] Error en actualizarNotasReserva:', error)
    throw error
  }
}

/* =========================
 * OBTENER CAMBIOS RECIENTES
 * ========================= */
export async function obtenerCambiosReservas(since: string, lastId = 0, limit = 200) {
  console.log('[Service] Buscando cambios de reservas desde:', since, 'id>', lastId)

  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute(
      `
        SELECT h.id, h.reserva_id, h.campo, h.valor_anterior, h.valor_nuevo, h.fecha,
               r.nombre, r.fecha AS reserva_fecha, r.hora AS reserva_hora
        FROM historial_reservas h
        LEFT JOIN reservas r ON r.id = h.reserva_id
        WHERE (h.fecha > ? OR (h.fecha = ? AND h.id > ?))
        ORDER BY h.fecha ASC, h.id ASC
        LIMIT ?
      `,
      [since, since, lastId, limit]
    )
    return rows
  })
  if (mysqlResult.ok) return mysqlResult.value

  const db = initDatabase()
  const rows = db.prepare(
    `
      SELECT h.id, h.reserva_id, h.campo, h.valor_anterior, h.valor_nuevo, h.fecha,
             r.nombre, r.fecha AS reserva_fecha, r.hora AS reserva_hora
      FROM historial_reservas h
      LEFT JOIN reservas r ON r.id = h.reserva_id
      WHERE (h.fecha > ? OR (h.fecha = ? AND h.id > ?))
      ORDER BY h.fecha ASC, h.id ASC
      LIMIT ?
    `
  ).all(since, since, lastId, limit)
  return rows
}








