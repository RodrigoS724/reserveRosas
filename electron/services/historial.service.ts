import { initDatabase } from '../db/database'
import { tryMysql } from '../db/mysql'

/* =========================
 * TIPOS
 * ========================= */
export interface HistorialReserva {
  id: number
  reserva_id: number
  campo: string
  valor_anterior: string | null
  valor_nuevo: string | null
  fecha: string
  usuario: string | null
  descripcion: string
}

/* =========================
 * HELPERS
 * ========================= */

/**
 * Traduce campos técnicos a texto humano
 */
function traducirCampo(campo: string): string {
  const mapa: Record<string, string> = {
    nombre: 'Nombre',
    fecha: 'Fecha',
    hora: 'Hora',
    estado: 'Estado',
    detalles: 'Observaciones',
    creación: 'Creación',
    eliminación: 'Eliminación'
  }

  return mapa[campo] ?? campo
}

/**
 * Genera una descripción legible del cambio
 */
function describirCambio(
  campo: string, anterior: string | null,
  nuevo: string | null
): string {
  if (campo === 'creación') {
    return 'Reserva creada'
  }

  if (campo === 'eliminación') {
    return 'Reserva eliminada'
  }

  if ( anterior === null && nuevo !== null) {
    return `Se estableció ${traducirCampo(campo)}: ${nuevo}`
  }

  if ( anterior !== null && nuevo === null) {
    return `Se eliminó ${traducirCampo(campo)}`
  }

  if ( anterior !== nuevo) {
    return `Cambió ${traducirCampo(campo)} de "${anterior}" a "${nuevo}"`
  }

  return `Actualización de ${traducirCampo(campo)}`
}

/* =========================
 * OBTENER HISTORIAL
 * ========================= */
function obtenerHistorialSqlite(
  reservaId: number
): HistorialReserva[] {
  if (!Number.isInteger(reservaId)) {
    throw new Error('ID de reserva inválido')
  }

  const db = initDatabase()

  const filas = db.prepare(`
    SELECT
      id,
      reserva_id,
      campo,
      valor_anterior,
      valor_nuevo,
      fecha,
      usuario
    FROM historial_reservas
    WHERE reserva_id = ?
    ORDER BY datetime(fecha) DESC, id DESC
  `).all(reservaId) as any[]

  return filas.map(row => ({
    ...row,
    descripcion: describirCambio(
      row.campo,
      row.valor_anterior,
      row.valor_nuevo
    )
  }))
}

export async function obtenerHistorial(
  reservaId: number
): Promise<HistorialReserva[]> {
  if (!Number.isInteger(reservaId)) {
    throw new Error('ID de reserva inválido')
  }

  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(
      `
        SELECT
          id,
          reserva_id,
          campo,
          valor_anterior,
          valor_nuevo,
          fecha,
          usuario
        FROM historial_reservas
        WHERE reserva_id = ?
        ORDER BY fecha DESC, id DESC
      `,
      [reservaId]
    )
    return rows as any[]
  })

  if (mysqlResult.ok) {
    const filas = mysqlResult.value
    return filas.map(row => ({
      ...row,
      descripcion: describirCambio(
        row.campo,
        row.valor_anterior,
        row.valor_nuevo
      )
    }))
  }

  return obtenerHistorialSqlite(reservaId)
}

/* =========================
 * INSERTAR EVENTO MANUAL
 * (útil para acciones futuras)
 * ========================= */
function registrarEventoHistorialSqlite(
  reservaId: number,
  campo: string, anterior: string | null,
  nuevo: string | null,
  usuario: string
) {
  const db = initDatabase()

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO historial_reservas
      (reserva_id, campo, valor_anterior, valor_nuevo, fecha, usuario)
      VALUES ( ?, ?, ?, ?, datetime('now'), ?)
    `).run(
      reservaId,
      campo, anterior,
      nuevo,
      usuario ?? 'sistema'
    )
  })

  tx()
}

export async function registrarEventoHistorial(
  reservaId: number,
  campo: string, anterior: string | null,
  nuevo: string | null,
  usuario: string
) {
  const mysqlResult = await tryMysql( async (pool) => {
    await pool.execute(
      `
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha, usuario)
        VALUES ( ?, ?, ?, ?, NOW(), ?)
      `,
      [reservaId, campo, anterior, nuevo, usuario ?? 'sistema']
    )
  })

  if (mysqlResult.ok) {
    try {
      registrarEventoHistorialSqlite(reservaId, campo, anterior, nuevo, usuario)
    } catch (error) {
      console.warn('[Service] Backup SQLite fallo en registrarEventoHistorial:', error)
    }
    return
  }

  registrarEventoHistorialSqlite(reservaId, campo, anterior, nuevo, usuario)
}

