import { initDatabase } from '../db/database'

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
  particular_tipo?: string | null
  garantia_tipo?: string | null
  garantia_fecha_compra?: string | null
  garantia_numero_service?: string | null
  garantia_problema?: string | null
  fecha: string
  hora: string
  detalles?: string
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
    if (error?.code === 'SQLITE_BUSY' && retryCount < MAX_RETRIES - 1) {
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
export async function crearReserva(data: ReservaInput) {
  console.log('[Service] Iniciando crearReserva...')
  validarReserva(data)
  const dataNormalizada = normalizarReserva({ ...data })
  
  // Normalizar fecha a formato ISO (YYYY-MM-DD)
  const fechaNormalizada = new Date(dataNormalizada.fecha).toISOString().split('T')[0]
  console.log('[Service] Fecha normalizada:', dataNormalizada.fecha, '->', fechaNormalizada)
  
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        SELECT id FROM vehiculos WHERE matricula = ?
      `).get(dataNormalizada.matricula) as { id: number } | undefined

      let vehiculoId = vehiculoExistente?.id

      if (!vehiculoId) {
        const vehiculoInsert = db.prepare(`
          INSERT INTO vehiculos (matricula, marca, modelo, nombre, telefono)
          VALUES (?, ?, ?, ?, ?)
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

      db.prepare(`
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
        VALUES (?, 'creación', '', 'reserva creada', datetime('now'))
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

/* =========================
 * OBTENER RESERVA POR ID
 * ========================= */
export function obtenerReserva(id: number) {
  console.log('[Service] Obteniendo reserva:', id)
  const db = initDatabase()
  return db.prepare(`SELECT * FROM reservas WHERE id = ?`).get(id)
}

/* =========================
 * BORRAR RESERVA
 * ========================= */
export function borrarReserva(id: number) {
  console.log('[Service] Borrando reserva:', id)
  const db = initDatabase()

  try {
    const tx = db.transaction(() => {
      const reserva = db.prepare(`
        SELECT * FROM reservas WHERE id = ?
      `).get(id)

      if (!reserva) {
        console.log('[Service] Reserva no encontrada:', id)
        return
      }

      db.prepare(`DELETE FROM reservas WHERE id = ?`).run(id)
      console.log('[Service] Reserva borrada')

      db.prepare(`
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
        VALUES (?, 'eliminación', ?, 'reserva eliminada', datetime('now'))
      `).run(id, JSON.stringify(reserva))
      console.log('[Service] Historial registrado para borrado')
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
export function moverReserva(id: number, nuevaFecha: string, nuevaHora?: string) {
  console.log('[Service] Moviendo reserva:', { id, nuevaFecha, nuevaHora })
  const db = initDatabase()

  try {
    const tx = db.transaction(() => {
      const anterior = db.prepare(`
        SELECT fecha, hora FROM reservas WHERE id = ?
      `).get(id) as { fecha: string; hora: string } | undefined

      if (!anterior) {
        console.log('[Service] Reserva no encontrada para mover:', id)
        return
      }

      db.prepare(`
        UPDATE reservas
        SET fecha = ?, hora = COALESCE(?, hora)
        WHERE id = ?
      `).run(nuevaFecha, nuevaHora ?? null, id)
      console.log('[Service] Reserva movida')

      if (nuevaFecha !== anterior.fecha) {
        db.prepare(`
          INSERT INTO historial_reservas
          (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
          VALUES (?, 'fecha', ?, ?, datetime('now'))
        `).run(id, anterior.fecha, nuevaFecha)
        console.log('[Service] Cambio de fecha registrado')
      }

      if (nuevaHora && nuevaHora !== anterior.hora) {
        db.prepare(`
          INSERT INTO historial_reservas
          (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
          VALUES (?, 'hora', ?, ?, datetime('now'))
        `).run(id, anterior.hora, nuevaHora)
        console.log('[Service] Cambio de hora registrado')
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
export function actualizarReserva(id: number, reserva: any) {
  console.log('[Service] Actualizando reserva:', id, reserva)
  const db = initDatabase()

  try {
    const anterior = db.prepare(`
      SELECT nombre, fecha, hora, estado, detalles
      FROM reservas
      WHERE id = ?
    `).get(id) as Record<string, any>

    if (!anterior) {
      console.log('[Service] Reserva no encontrada para actualizar:', id)
      return
    }

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE reservas
        SET nombre = ?, fecha = ?, hora = ?, estado = ?, detalles = ?
        WHERE id = ?
      `).run(
        reserva.nombre,
        reserva.fecha,
        reserva.hora,
        reserva.estado,
        reserva.detalles,
        reserva.id
      )
      console.log('[Service] Datos actualizados')

      for (const campo of Object.keys(anterior)) {
        if (anterior[campo] !== reserva[campo]) {
          db.prepare(`
            INSERT INTO historial_reservas
            (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
            VALUES (?, ?, ?, ?, datetime('now'))
          `).run(
            reserva.id,
            campo,
            anterior[campo],
            reserva[campo]
          )
          console.log(`[Service] Cambio registrado: ${campo}`)
        }
      }
    })

    transaction()
  } catch (error: any) {
    console.error('[Service] Error en actualizarReserva:', error)
    throw error
  }
}


/* =========================
 * RESERVAS DE LA SEMANA
 * ========================= */
export function obtenerReservasSemana(desde: string, hasta: string) {
  console.log('[Service] Obteniendo reservas entre:', desde, 'y', hasta)
  const db = initDatabase()
  
  // Normalizar fechas
  const desdeNormalizado = new Date(desde).toISOString().split('T')[0]
  const hastaNormalizado = new Date(hasta).toISOString().split('T')[0]
  console.log('[Service] Fechas normalizadas:', desdeNormalizado, 'a', hastaNormalizado)
  
  const result = db.prepare(`
    SELECT * FROM reservas
    WHERE fecha >= ? AND fecha <= ?
    ORDER BY fecha, hora
  `).all(desdeNormalizado, hastaNormalizado)
  console.log('[Service] Reservas encontradas:', result)
  
  // Debug: mostrar todas las reservas en la BD
  const todasLasReservas = db.prepare(`SELECT * FROM reservas ORDER BY fecha, hora`).all()
  console.log('[Service] TODAS las reservas en BD:', todasLasReservas)
  
  return result
}

/* =========================
 * OBTENER TODAS LAS RESERVAS
 * ========================= */
export function obtenerTodasLasReservas() {
  console.log('[Service] Obteniendo TODAS las reservas')
  const db = initDatabase()
  
  const result = db.prepare(`
    SELECT * FROM reservas
    ORDER BY fecha DESC, hora DESC
  `).all()
  
  console.log('[Service] Total de reservas:', result.length)
  return result
}

/* =========================
 * ACTUALIZAR NOTAS DE RESERVA
 * ========================= */
export function actualizarNotasReserva(id: number, notas: string) {
  console.log('[Service] Actualizando notas para reserva:', id)
  const db = initDatabase()

  try {
    const anterior = db.prepare(`
      SELECT notas FROM reservas WHERE id = ?
    `).get(id) as { notas: string | null } | undefined

    if (!anterior) {
      console.log('[Service] Reserva no encontrada:', id)
      return
    }

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE reservas SET notas = ? WHERE id = ?
      `).run(notas, id)
      console.log('[Service] Notas actualizadas')

      // Registrar en historial
      db.prepare(`
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
        VALUES (?, 'notas', ?, ?, datetime('now'))
      `).run(id, anterior.notas || '', notas)
      console.log('[Service] Cambio de notas registrado en historial')
    })

    transaction()
  } catch (error: any) {
    console.error('[Service] Error en actualizarNotasReserva:', error)
    throw error
  }
}

