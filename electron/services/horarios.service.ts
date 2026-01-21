import { initDatabase } from '../db/database'

/**
 * Horarios base activos (configuración del negocio)
 */
export function obtenerHorariosBase() {
  const db = initDatabase()
  return db.prepare(`
    SELECT * FROM horarios_base
    WHERE activo = 1
    ORDER BY hora
  `).all()
}

/**
 * Horarios disponibles reales para una fecha puntual
 * (reactivo, respeta reservas y bloqueos)
 */
export function obtenerHorariosDisponibles(fecha: string) {
  const db = initDatabase()

  return db.prepare(`
    SELECT h.hora
    FROM horarios_base h
    WHERE h.activo = 1
      AND h.hora NOT IN (
        SELECT hora FROM reservas WHERE fecha = ?
      )
      AND h.hora NOT IN (
        SELECT hora FROM bloqueos_horarios WHERE fecha = ?
      )
    ORDER BY h.hora
  `).all(fecha, fecha)
}

/**
 * Crear nuevo horario base
 */
export function crearHorario(hora: string) {
  const db = initDatabase()
  db.prepare(`
    INSERT INTO horarios_base (hora) VALUES (?)
  `).run(hora)
}

/**
 * Desactivar horario base
 */
export function desactivarHorario(id: number) {
  const db = initDatabase()
  db.prepare(`
    UPDATE horarios_base SET activo = 0 WHERE id = ?
  `).run(id)
}

/**
 * Bloquear un horario en una fecha concreta
 */
export function bloquearHorario(
  fecha: string,
  hora: string,
  motivo?: string
) {
  const db = initDatabase()
  db.prepare(`
    INSERT INTO bloqueos_horarios (fecha, hora, motivo)
    VALUES (?, ?, ?)
  `).run(fecha, hora, motivo)
}
