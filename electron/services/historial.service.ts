import { initDatabase } from '../db/database'

export function obtenerHistorial(reservaId: number) {
  const db = initDatabase()
  return db.prepare(`
    SELECT * FROM historial_reservas
    WHERE reserva_id = ?
    ORDER BY fecha DESC
  `).all(reservaId)
}
