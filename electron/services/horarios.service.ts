import { initDatabase } from '../db/database'
import { tryMysql } from '../db/mysql'

/* =========================
 * HELPERS
 * ========================= */

/**
 * Normaliza hora ? formato HH:mm
 * Ej: 8:0 → 08:00
 */
function normalizarHora(hora: string): string {
  const [h, m] = hora.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) {
    throw new Error('Formato de hora inválido')
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Determina si una fecha es sábado
 */
function esSabado(fecha: string): boolean {
  const d = new Date(`${fecha}T00:00:00`)
  return d.getDay() === 6
}

/* =========================
 * HORARIOS BASE ACTIVOS
 * ========================= */
export async function obtenerHorariosBase() {
  console.log('[Service] Obteniendo horarios base activos...')
  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(`
      SELECT * FROM horarios_base
      WHERE activo = 1
      ORDER BY hora
    `)
    return rows
  })
  if (mysqlResult.ok) return mysqlResult.value

  const db = initDatabase()
  const result = db.prepare(`
    SELECT * FROM horarios_base
    WHERE activo = 1
    ORDER BY hora
  `).all()
  return result
}

/* =========================
 * HORARIOS DISPONIBLES REALES
 * ========================= */
function obtenerHorariosDisponiblesSqlite(fecha: string) {
  const db = initDatabase()

  let horarios = db.prepare(`
    SELECT h.hora
    FROM horarios_base h
    WHERE h.activo = 1
      AND h.hora NOT IN (
        SELECT hora
        FROM reservas
        WHERE fecha = ?
          AND LOWER(IFNULL(estado, 'pendiente')) NOT IN ('cancelada', 'cancelado')
      )
      AND h.hora NOT IN (
        SELECT hora FROM bloqueos_horarios WHERE fecha = ?
      )
    ORDER BY h.hora
  `).all(fecha, fecha) as { hora: string }[]

  // SÁBADO: medio día
  if (esSabado(fecha)) {
    horarios = horarios.filter(h => h.hora < '12:00')
  }

  return horarios
}

export async function obtenerHorariosDisponibles(fecha: string) {
  const fechaNormalizada = new Date(fecha).toISOString().split('T')[0]

  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(
      `
        SELECT h.hora
        FROM horarios_base h
        WHERE h.activo = 1
          AND h.hora NOT IN (
            SELECT hora
            FROM reservas
            WHERE fecha = ?
              AND LOWER(IFNULL(estado, 'pendiente')) NOT IN ('cancelada', 'cancelado')
          )
          AND h.hora NOT IN (
            SELECT hora FROM bloqueos_horarios WHERE fecha = ?
          )
        ORDER BY h.hora
      `,
      [fechaNormalizada, fechaNormalizada]
    )
    return rows as { hora: string }[]
  })

  if (mysqlResult.ok) {
    let horarios = mysqlResult.value
    if (esSabado(fecha)) {
      horarios = horarios.filter(h => h.hora < '12:00')
    }
    return horarios
  }

  return obtenerHorariosDisponiblesSqlite(fechaNormalizada)
}

/* =========================
 * CREAR HORARIO BASE
 * ========================= */
function crearHorarioSqlite(hora: string) {
  console.log('[Service] Creando horario:', hora)
  const db = initDatabase()
  const horaNormalizada = normalizarHora(hora)

  try {
    const tx = db.transaction(() => {
      const existe = db.prepare(`
        SELECT id FROM horarios_base WHERE hora = ?
      `).get(horaNormalizada)

      if (existe) {
        throw new Error('El horario ya existe')
      }

      db.prepare(`
        INSERT INTO horarios_base (hora, activo)
        VALUES ( ?, 1)
      `).run(horaNormalizada)
      console.log('[Service] Horario creado:', horaNormalizada)
    })

    tx()
  } catch (error: any) {
    console.error('[Service] Error en crearHorario:', error)
    throw error
  }
}

export async function crearHorario(hora: string) {
  console.log('[Service] Creando horario:', hora)
  const horaNormalizada = normalizarHora(hora)

  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT id FROM horarios_base WHERE hora = ?`,
      [horaNormalizada]
    )
    if (rows.length) {
      throw new Error('El horario ya existe')
    }
    await pool.execute(
      `INSERT INTO horarios_base (hora, activo) VALUES ( ?, 1)`,
      [horaNormalizada]
    )
  })

  if (mysqlResult.ok) {
    try {
      crearHorarioSqlite(horaNormalizada)
    } catch (error) {
      console.warn('[Service] Backup SQLite fallo en crearHorario:', error)
    }
    return
  }

  return crearHorarioSqlite(horaNormalizada)
}

/* =========================
 * DESACTIVAR HORARIO BASE
 * ========================= */
function desactivarHorarioSqlite(id: number) {
  console.log('[Service] Desactivando horario:', id)
  const db = initDatabase()

  try {
    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE horarios_base
        SET activo = 0
        WHERE id = ?
      `).run(id)
      console.log('[Service] Horario desactivado:', id)
    })

    tx()
  } catch (error: any) {
    console.error('[Service] Error en desactivarHorario:', error)
    throw error
  }
}

export async function desactivarHorario(id: number) {
  console.log('[Service] Desactivando horario:', id)
  const mysqlResult = await tryMysql( async (pool) => {
    await pool.execute(`UPDATE horarios_base SET activo = 0 WHERE id = ?`, [id])
  })
  if (mysqlResult.ok) {
    try {
      desactivarHorarioSqlite(id)
    } catch (error) {
      console.warn('[Service] Backup SQLite fallo en desactivarHorario:', error)
    }
    return
  }
  return desactivarHorarioSqlite(id)
}

/* =========================
 * OBTENER HORARIOS INACTIVOS
 * ========================= */
function obtenerHorariosInactivosSqlite() {
  console.log('[Service] Obteniendo horarios inactivos')
  const db = initDatabase()
  const horarios = db.prepare(`
    SELECT id, hora FROM horarios_base WHERE activo = 0 ORDER BY hora
  `).all() as { id: number; hora: string }[]
  console.log('[Service] Horarios inactivos encontrados:', horarios.length)
  return horarios
}

export async function obtenerHorariosInactivos() {
  console.log('[Service] Obteniendo horarios inactivos')
  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT id, hora FROM horarios_base WHERE activo = 0 ORDER BY hora`
    )
    return rows
  })
  if (mysqlResult.ok) return mysqlResult.value

  return obtenerHorariosInactivosSqlite()
}

/* =========================
 * REACTIVAR HORARIO BASE
 * ========================= */
function activarHorarioSqlite(id: number) {
  const db = initDatabase()

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE horarios_base
      SET activo = 1
      WHERE id = ?
    `).run(id)
  })

  tx()
}

export async function activarHorario(id: number) {
  const mysqlResult = await tryMysql( async (pool) => {
    await pool.execute(`UPDATE horarios_base SET activo = 1 WHERE id = ?`, [id])
  })
  if (mysqlResult.ok) {
    try {
      activarHorarioSqlite(id)
    } catch (error) {
      console.warn('[Service] Backup SQLite fallo en activarHorario:', error)
    }
    return
  }
  return activarHorarioSqlite(id)
}

/* =========================
 * BLOQUEAR HORARIO EN FECHA
 * ========================= */
function bloquearHorarioSqlite(
  fecha: string,
  hora: string,
  motivo: string
) {
  console.log('[Service] Bloqueando horario:', { fecha, hora, motivo })
  const db = initDatabase()
  
  // Normalizar fecha
  const fechaNormalizada = new Date(fecha).toISOString().split('T')[0]
  const horaNormalizada = normalizarHora(hora)
  console.log('[Service] Fecha normalizada:', fecha, '->', fechaNormalizada)
  console.log('[Service] Hora normalizada:', hora, '->', horaNormalizada)

  try {
    const tx = db.transaction(() => {
      const existe = db.prepare(`
        SELECT id FROM bloqueos_horarios
        WHERE fecha = ? AND hora = ?
      `).get(fechaNormalizada, horaNormalizada)

      if (existe) {
        console.log('[Service] Horario ya bloqueado')
        return
      }

      db.prepare(`
        INSERT INTO bloqueos_horarios (fecha, hora, motivo)
        VALUES ( ?, ?, ?)
      `).run(fechaNormalizada, horaNormalizada, motivo ?? '')
      console.log('[Service] Horario bloqueado')
    })

    tx()
  } catch (error: any) {
    console.error('[Service] Error en bloquearHorario:', error)
    throw error
  }
}

export async function bloquearHorario(
  fecha: string,
  hora: string,
  motivo: string
) {
  console.log('[Service] Bloqueando horario:', { fecha, hora, motivo })
  const fechaNormalizada = new Date(fecha).toISOString().split('T')[0]
  const horaNormalizada = normalizarHora(hora)

  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT id FROM bloqueos_horarios WHERE fecha = ? AND hora = ?`,
      [fechaNormalizada, horaNormalizada]
    )
    if (rows.length) return
    await pool.execute(
      `INSERT INTO bloqueos_horarios (fecha, hora, motivo) VALUES ( ?, ?, ?)`,
      [fechaNormalizada, horaNormalizada, motivo ?? '']
    )
  })

  if (mysqlResult.ok) {
    try {
      bloquearHorarioSqlite(fechaNormalizada, horaNormalizada, motivo)
    } catch (error) {
      console.warn('[Service] Backup SQLite fallo en bloquearHorario:', error)
    }
    return
  }

  return bloquearHorarioSqlite(fechaNormalizada, horaNormalizada, motivo)
}

/* =========================
 * DESBLOQUEAR HORARIO
 * ========================= */
function desbloquearHorarioSqlite(fecha: string, hora: string) {
  console.log('[Service] Desbloqueando horario:', { fecha, hora })
  const db = initDatabase()
  
  // Normalizar fecha
  const fechaNormalizada = new Date(fecha).toISOString().split('T')[0]
  const horaNormalizada = normalizarHora(hora)
  console.log('[Service] Fecha normalizada:', fecha, '->', fechaNormalizada)
  console.log('[Service] Hora normalizada:', hora, '->', horaNormalizada)

  try {
    const tx = db.transaction(() => {
      db.prepare(`
        DELETE FROM bloqueos_horarios
        WHERE fecha = ? AND hora = ?
      `).run(fechaNormalizada, horaNormalizada)
      console.log('[Service] Horario desbloqueado')
    })

    tx()
  } catch (error: any) {
    console.error('[Service] Error en desbloquearHorario:', error)
    throw error
  }
}

export async function desbloquearHorario(fecha: string, hora: string) {
  console.log('[Service] Desbloqueando horario:', { fecha, hora })
  const fechaNormalizada = new Date(fecha).toISOString().split('T')[0]
  const horaNormalizada = normalizarHora(hora)

  const mysqlResult = await tryMysql( async (pool) => {
    await pool.execute(
      `DELETE FROM bloqueos_horarios WHERE fecha = ? AND hora = ?`,
      [fechaNormalizada, horaNormalizada]
    )
  })

  if (mysqlResult.ok) {
    try {
      desbloquearHorarioSqlite(fechaNormalizada, horaNormalizada)
    } catch (error) {
      console.warn('[Service] Backup SQLite fallo en desbloquearHorario:', error)
    }
    return
  }

  return desbloquearHorarioSqlite(fechaNormalizada, horaNormalizada)
}

/* =========================
 * OBTENER HORARIOS BLOQUEADOS POR FECHA
 * ========================= */
function obtenerHorariosBloqueadosSqlite(fecha: string) {
  console.log('[Service] Obteniendo horarios bloqueados para:', fecha)
  const db = initDatabase()
  
  // Normalizar fecha
  const fechaNormalizada = new Date(fecha).toISOString().split('T')[0]
  console.log('[Service] Fecha normalizada:', fecha, '->', fechaNormalizada)
  
  const result = db.prepare(`
    SELECT * FROM bloqueos_horarios
    WHERE fecha = ?
    ORDER BY hora
  `).all(fechaNormalizada)
  console.log('[Service] Horarios bloqueados encontrados:', result)
  
  // Debug: mostrar TODOS los bloqueos en BD
  const todosLosBloqueos = db.prepare(`SELECT * FROM bloqueos_horarios ORDER BY fecha, hora`).all()
  console.log('[Service] TODOS los bloqueos en BD:', todosLosBloqueos)
  
  return result
}

export async function obtenerHorariosBloqueados(fecha: string) {
  console.log('[Service] Obteniendo horarios bloqueados para:', fecha)
  const fechaNormalizada = new Date(fecha).toISOString().split('T')[0]

  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT * FROM bloqueos_horarios WHERE fecha = ? ORDER BY hora`,
      [fechaNormalizada]
    )
    return rows
  })

  if (mysqlResult.ok) return mysqlResult.value

  return obtenerHorariosBloqueadosSqlite(fechaNormalizada)
}

/* =========================
 * BORRAR HORARIO PERMANENTE
 * ========================= */
function borrarHorarioPermanenteSqlite(id: number) {
  console.log('[Service] Borrando horario permanentemente:', id)
  const db = initDatabase()

  try {
    const tx = db.transaction(() => {
      const horario = db.prepare(`
        SELECT * FROM horarios_base WHERE id = ?
      `).get(id)

      if (!horario) {
        console.log('[Service] Horario no encontrado:', id)
        throw new Error('Horario no encontrado')
      }

      db.prepare(`
        DELETE FROM horarios_base WHERE id = ?
      `).run(id)
      console.log('[Service] Horario eliminado permanentemente:', horario)
    })

    tx()
  } catch (error: any) {
    console.error('[Service] Error en borrarHorarioPermanente:', error)
    throw error
  }
}

export async function borrarHorarioPermanente(id: number) {
  console.log('[Service] Borrando horario permanentemente:', id)
  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(`SELECT * FROM horarios_base WHERE id = ?`, [id])
    const horario = rows[0]
    if (!horario) {
      throw new Error('Horario no encontrado')
    }
    await pool.execute(`DELETE FROM horarios_base WHERE id = ?`, [id])
  })

  if (mysqlResult.ok) {
    try {
      borrarHorarioPermanenteSqlite(id)
    } catch (error) {
      console.warn('[Service] Backup SQLite fallo en borrarHorarioPermanente:', error)
    }
    return
  }

  return borrarHorarioPermanenteSqlite(id)
}

