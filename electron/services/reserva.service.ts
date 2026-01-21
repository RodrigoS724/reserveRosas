import { initDatabase } from '../db/database'

export function moverReserva(id: number, nuevaFecha: string) {
  const db = initDatabase()
  const anterior = db.prepare(`SELECT fecha FROM reservas WHERE id = ?`).get(id)

  db.prepare(`
    UPDATE reservas SET fecha = ?
    WHERE id = ?
  `).run(nuevaFecha, id)

  db.prepare(`
    INSERT INTO historial_reservas
    (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
    VALUES (?, 'fecha', ?, ?, datetime('now'))
  `).run(id, anterior.fecha, nuevaFecha)
}

export function actualizarDetalles(id: number, detalles: string) {
  const db = initDatabase()
  const anterior = db.prepare(`SELECT detalles FROM reservas WHERE id = ?`).get(id)

  db.prepare(`
    UPDATE reservas SET detalles = ?
    WHERE id = ?
  `).run(detalles, id)

  db.prepare(`
    INSERT INTO historial_reservas
    (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
    VALUES (?, 'detalles', ?, ?, datetime('now'))
  `).run(id, anterior.detalles, detalles)
}

export function obtenerReservasSemana(desde: string, hasta: string) {
  const db = initDatabase()
  return db.prepare(`
    SELECT * FROM reservas
    WHERE fecha BETWEEN ? AND ?
    ORDER BY fecha, hora
  `).all(desde, hasta)
}
