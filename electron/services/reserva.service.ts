import { initDatabase } from '../db/database'

/* =========================
 * CREAR RESERVA
 * ========================= */
export function crearReserva(data: {
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
  const db = initDatabase()

  const tx = db.transaction(() => {
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
      data.fecha,
      data.hora,
      data.detalles ?? ''
    )

    db.prepare(`
      INSERT INTO historial_reservas
      (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
      VALUES (?, 'creación', '', 'reserva creada', datetime('now'))
    `).run(result.lastInsertRowid)

    return result.lastInsertRowid
  })

  return tx()
}

/* =========================
 * OBTENER RESERVA POR ID
 * ========================= */
export function obtenerReserva(id: number) {
  const db = initDatabase()
  return db.prepare(`SELECT * FROM reservas WHERE id = ?`).get(id)
}

/* =========================
 * BORRAR RESERVA
 * ========================= */
export function borrarReserva(id: number) {
  const db = initDatabase()

  const tx = db.transaction(() => {
    const reserva = db.prepare(`
      SELECT * FROM reservas WHERE id = ?
    `).get(id)

    if (!reserva) return

    db.prepare(`DELETE FROM reservas WHERE id = ?`).run(id)

    db.prepare(`
      INSERT INTO historial_reservas
      (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
      VALUES (?, 'eliminación', ?, 'reserva eliminada', datetime('now'))
    `).run(id, JSON.stringify(reserva))
  })

  tx()
}

/* =========================
 * MOVER RESERVA (drag & drop)
 * ========================= */
export function moverReserva(id: number, nuevaFecha: string, nuevaHora?: string) {
  const db = initDatabase()

  const tx = db.transaction(() => {
    const anterior = db.prepare(`
      SELECT fecha, hora FROM reservas WHERE id = ?
    `).get(id)

    if (!anterior) return

    db.prepare(`
      UPDATE reservas
      SET fecha = ?, hora = COALESCE(?, hora)
      WHERE id = ?
    `).run(nuevaFecha, nuevaHora ?? null, id)

    if (nuevaFecha !== anterior.fecha) {
      db.prepare(`
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
        VALUES (?, 'fecha', ?, ?, datetime('now'))
      `).run(id, anterior.fecha, nuevaFecha)
    }

    if (nuevaHora && nuevaHora !== anterior.hora) {
      db.prepare(`
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
        VALUES (?, 'hora', ?, ?, datetime('now'))
      `).run(id, anterior.hora, nuevaHora)
    }
  })

  tx()
}

/* =========================
 * ACTUALIZAR RESERVA (EDITAR)
 * ========================= */
export function actualizarReserva(id: number, reserva: any) {
  const db = initDatabase()

  const anterior = db.prepare(`
    SELECT nombre, fecha, hora, estado, detalles
    FROM reservas
    WHERE id = ?
  `).get(id) as Record<string, any>

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
      }
    }
  })

  transaction()
}


/* =========================
 * RESERVAS DE LA SEMANA
 * ========================= */
export function obtenerReservasSemana(desde: string, hasta: string) {
  const db = initDatabase()
  return db.prepare(`
    SELECT * FROM reservas
    WHERE fecha BETWEEN ? AND ?
    ORDER BY fecha, hora
  `).all(desde, hasta)
}
