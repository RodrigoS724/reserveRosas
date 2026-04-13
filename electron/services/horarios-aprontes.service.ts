import { initDatabase } from '../db/database'
import { tryMysql } from '../db/mysql'

function normalizarHora(hora: string): string {
  const parts = String(hora || '').split(':')
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

function normalizarFecha(fecha: string): string {
  const d = new Date(String(fecha || ''))
  if (Number.isNaN(d.getTime())) {
    throw new Error('Fecha invalida')
  }
  return d.toISOString().split('T')[0]
}

function normalizarCupo(value: any): number {
  const cupo = Number(value)
  if (!Number.isFinite(cupo) || cupo < 1) {
    throw new Error('Cupo invalido')
  }
  return Math.floor(cupo)
}

function syncHorariosAprontesToSqlite(rows: any[]) {
  if (!Array.isArray(rows) || rows.length === 0) return
  try {
    const db = initDatabase()
    const upsertById = db.prepare(
      `INSERT INTO horarios_aprontes (id, hora, cupo, activo)
       VALUES ( ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         hora = excluded.hora,
         cupo = excluded.cupo,
         activo = excluded.activo`
    )
    const upsertByHora = db.prepare(
      `INSERT INTO horarios_aprontes (hora, cupo, activo)
       VALUES ( ?, ?, ?)
       ON CONFLICT(hora) DO UPDATE SET
         cupo = excluded.cupo,
         activo = excluded.activo`
    )
    const tx = db.transaction((items: any[]) => {
      for (const row of items) {
        const id = row?.id ? Number(row.id) : null
        const hora = String(row?.hora || '')
        const cupo = Number(row?.cupo || 1)
        const activo = typeof row?.activo === 'number' ? Number(row.activo) : 1
        if (id) {
          upsertById.run(id, hora, cupo, activo)
        } else if (hora) {
          upsertByHora.run(hora, cupo, activo)
        }
      }
    })
    tx(rows)
  } catch (error) {
    console.warn('[HorariosAprontes] Error sync sqlite:', error)
  }
}

export async function obtenerHorariosAprontesBase() {
  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT id, hora, cupo, activo
       FROM horarios_aprontes
       WHERE activo = 1
       ORDER BY hora`
    )
    return rows
  })

  if (mysqlResult.ok) {
    syncHorariosAprontesToSqlite(mysqlResult.value)
    return mysqlResult.value
  }

  const db = initDatabase()
  return db.prepare(
    `SELECT id, hora, cupo, activo
     FROM horarios_aprontes
     WHERE activo = 1
     ORDER BY hora`
  ).all()
}

export async function obtenerHorariosAprontesInactivos() {
  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT id, hora, cupo
       FROM horarios_aprontes
       WHERE activo = 0
       ORDER BY hora`
    )
    return rows
  })

  if (mysqlResult.ok) {
    syncHorariosAprontesToSqlite(mysqlResult.value.map((r: any) => ({ ...r, activo: 0 })))
    return mysqlResult.value
  }

  const db = initDatabase()
  return db.prepare(
    `SELECT id, hora, cupo
     FROM horarios_aprontes
     WHERE activo = 0
     ORDER BY hora`
  ).all()
}

export async function obtenerHorariosAprontesDisponibles(fecha: string) {
  const fechaNormalizada = normalizarFecha(fecha)

  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT h.id, h.hora, h.cupo,
              IFNULL(a.usados, 0) AS usados,
              GREATEST(h.cupo - IFNULL(a.usados, 0), 0) AS disponibles
       FROM horarios_aprontes h
       LEFT JOIN (
         SELECT hora, COUNT(*) AS usados
         FROM aprontes
         WHERE fecha = ?
         GROUP BY hora
       ) a ON a.hora = h.hora
       WHERE h.activo = 1
       ORDER BY h.hora`,
      [fechaNormalizada]
    )
    return rows
  })

  if (mysqlResult.ok) return mysqlResult.value

  const db = initDatabase()
  return db.prepare(
    `SELECT h.id, h.hora, h.cupo,
            IFNULL(a.usados, 0) AS usados,
            CASE
              WHEN (h.cupo - IFNULL(a.usados, 0)) < 0 THEN 0
              ELSE (h.cupo - IFNULL(a.usados, 0))
            END AS disponibles
     FROM horarios_aprontes h
     LEFT JOIN (
       SELECT hora, COUNT(*) AS usados
       FROM aprontes
       WHERE fecha = ?
       GROUP BY hora
     ) a ON a.hora = h.hora
     WHERE h.activo = 1
     ORDER BY h.hora`
  ).all(fechaNormalizada)
}

export async function crearHorarioApronte(hora: string, cupo = 1) {
  const horaNormalizada = normalizarHora(hora)
  const cupoNormalizado = normalizarCupo(cupo)

  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT id FROM horarios_aprontes WHERE hora = ?`,
      [horaNormalizada]
    )
    if (rows.length) {
      throw new Error('El horario ya existe')
    }
    const [result]: any = await pool.execute(
      `INSERT INTO horarios_aprontes (hora, cupo, activo) VALUES ( ?, ?, 1)`,
      [horaNormalizada, cupoNormalizado]
    )
    return Number(result.insertId)
  })

  if (mysqlResult.ok) {
    try {
      const db = initDatabase()
      db.prepare(
        `INSERT INTO horarios_aprontes (id, hora, cupo, activo)
         VALUES ( ?, ?, ?, 1)`
      ).run(mysqlResult.value, horaNormalizada, cupoNormalizado)
    } catch (error) {
      console.warn('[HorariosAprontes] Backup SQLite fallo en crear:', error)
    }
    return mysqlResult.value
  }

  const db = initDatabase()
  const existe = db.prepare(
    `SELECT id FROM horarios_aprontes WHERE hora = ?`
  ).get(horaNormalizada)
  if (existe) {
    throw new Error('El horario ya existe')
  }
  const result = db.prepare(
    `INSERT INTO horarios_aprontes (hora, cupo, activo) VALUES ( ?, ?, 1)`
  ).run(horaNormalizada, cupoNormalizado)
  return Number(result.lastInsertRowid)
}

export async function actualizarCupoHorarioApronte(id: number, cupo: number) {
  const idNum = Number(id)
  if (!idNum) {
    throw new Error('ID de horario invalido')
  }
  const cupoNormalizado = normalizarCupo(cupo)

  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT id FROM horarios_aprontes WHERE id = ?`,
      [idNum]
    )
    if (!rows.length) {
      throw new Error('Horario no encontrado')
    }
    await pool.execute(
      `UPDATE horarios_aprontes SET cupo = ? WHERE id = ?`,
      [cupoNormalizado, idNum]
    )
  })

  if (mysqlResult.ok) {
    try {
      const db = initDatabase()
      db.prepare(
        `UPDATE horarios_aprontes SET cupo = ? WHERE id = ?`
      ).run(cupoNormalizado, idNum)
    } catch (error) {
      console.warn('[HorariosAprontes] Backup SQLite fallo en cupo:', error)
    }
    return
  }

  const db = initDatabase()
  const existente = db.prepare(
    `SELECT id FROM horarios_aprontes WHERE id = ?`
  ).get(idNum)
  if (!existente) {
    throw new Error('Horario no encontrado')
  }
  db.prepare(`UPDATE horarios_aprontes SET cupo = ? WHERE id = ?`).run(cupoNormalizado, idNum)
}

export async function desactivarHorarioApronte(id: number) {
  const idNum = Number(id)
  if (!idNum) {
    throw new Error('ID de horario invalido')
  }

  const mysqlResult = await tryMysql(async (pool) => {
    await pool.execute(`UPDATE horarios_aprontes SET activo = 0 WHERE id = ?`, [idNum])
  })

  if (mysqlResult.ok) {
    try {
      const db = initDatabase()
      db.prepare(`UPDATE horarios_aprontes SET activo = 0 WHERE id = ?`).run(idNum)
    } catch (error) {
      console.warn('[HorariosAprontes] Backup SQLite fallo en desactivar:', error)
    }
    return
  }

  const db = initDatabase()
  db.prepare(`UPDATE horarios_aprontes SET activo = 0 WHERE id = ?`).run(idNum)
}

export async function activarHorarioApronte(id: number) {
  const idNum = Number(id)
  if (!idNum) {
    throw new Error('ID de horario invalido')
  }

  const mysqlResult = await tryMysql(async (pool) => {
    await pool.execute(`UPDATE horarios_aprontes SET activo = 1 WHERE id = ?`, [idNum])
  })

  if (mysqlResult.ok) {
    try {
      const db = initDatabase()
      db.prepare(`UPDATE horarios_aprontes SET activo = 1 WHERE id = ?`).run(idNum)
    } catch (error) {
      console.warn('[HorariosAprontes] Backup SQLite fallo en activar:', error)
    }
    return
  }

  const db = initDatabase()
  db.prepare(`UPDATE horarios_aprontes SET activo = 1 WHERE id = ?`).run(idNum)
}

export async function borrarHorarioApronte(id: number) {
  const idNum = Number(id)
  if (!idNum) {
    throw new Error('ID de horario invalido')
  }

  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute(`SELECT id FROM horarios_aprontes WHERE id = ?`, [idNum])
    if (!rows.length) {
      throw new Error('Horario no encontrado')
    }
    await pool.execute(`DELETE FROM horarios_aprontes WHERE id = ?`, [idNum])
  })

  if (mysqlResult.ok) {
    try {
      const db = initDatabase()
      db.prepare(`DELETE FROM horarios_aprontes WHERE id = ?`).run(idNum)
    } catch (error) {
      console.warn('[HorariosAprontes] Backup SQLite fallo en borrar:', error)
    }
    return
  }

  const db = initDatabase()
  const existente = db.prepare(`SELECT id FROM horarios_aprontes WHERE id = ?`).get(idNum)
  if (!existente) {
    throw new Error('Horario no encontrado')
  }
  db.prepare(`DELETE FROM horarios_aprontes WHERE id = ?`).run(idNum)
}

export const _internals = {
  normalizarHora,
  normalizarFecha,
  normalizarCupo
}
