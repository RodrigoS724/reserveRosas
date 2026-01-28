import { initDatabase } from '../db/database'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 100

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
export async function crearReserva(data: {
  nombre: string
  cedula: string
  telefono: string
  marca: string
  modelo: string
  km: string
  matricula: string
  tipo_turno: string
  fecha: string
  hora: string
  detalles?: string
}) {
  console.log('[Service] Iniciando crearReserva...')
  
  // Normalizar fecha a formato ISO (YYYY-MM-DD)
  const fechaNormalizada = new Date(data.fecha).toISOString().split('T')[0]
  console.log('[Service] Fecha normalizada:', data.fecha, '->', fechaNormalizada)
  
  return executeWithRetry(() => {
    const db = initDatabase()

    const tx = db.transaction(() => {
      console.log('[Service] Dentro de transaction...')
      
      const result = db.prepare(`
        INSERT INTO reservas (
          nombre, cedula, telefono,
          marca, modelo, km, matricula,
          tipo_turno, fecha, hora, detalles
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.nombre,
        data.cedula,
        data.telefono,
        data.marca,
        data.modelo,
        data.km,
        data.matricula,
        data.tipo_turno,
        fechaNormalizada,
        data.hora,
        data.detalles ?? ''
      )

      console.log('[Service] Reserva insertada con ID:', result.lastInsertRowid)

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

