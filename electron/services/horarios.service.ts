import { initDatabase } from '../db/database'

/* =========================
 * HELPERS
 * ========================= */

/**
 * Normaliza hora a formato HH:mm
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
export function obtenerHorariosBase() {
  const db = initDatabase()
  return db.prepare(`
    SELECT * FROM horarios_base
    WHERE activo = 1
    ORDER BY hora
  `).all()
}

/* =========================
 * HORARIOS DISPONIBLES REALES
 * ========================= */
export function obtenerHorariosDisponibles(fecha: string) {
  const db = initDatabase()

  let horarios = db.prepare(`
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
  `).all(fecha, fecha) as { hora: string }[]

  // 🟡 SÁBADO: medio día
  if (esSabado(fecha)) {
    horarios = horarios.filter(h => h.hora < '12:00')
  }

  return horarios
}

/* =========================
 * CREAR HORARIO BASE
 * ========================= */
export function crearHorario(hora: string) {
  const db = initDatabase()
  const horaNormalizada = normalizarHora(hora)

  const tx = db.transaction(() => {
    const existe = db.prepare(`
      SELECT id FROM horarios_base WHERE hora = ?
    `).get(horaNormalizada)

    if (existe) {
      throw new Error('El horario ya existe')
    }

    db.prepare(`
      INSERT INTO horarios_base (hora, activo)
      VALUES (?, 1)
    `).run(horaNormalizada)
  })

  tx()
}

/* =========================
 * DESACTIVAR HORARIO BASE
 * ========================= */
export function desactivarHorario(id: number) {
  const db = initDatabase()

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE horarios_base
      SET activo = 0
      WHERE id = ?
    `).run(id)
  })

  tx()
}

/* =========================
 * REACTIVAR HORARIO BASE
 * ========================= */
export function activarHorario(id: number) {
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

/* =========================
 * BLOQUEAR HORARIO EN FECHA
 * ========================= */
export function bloquearHorario(
  fecha: string,
  hora: string,
  motivo?: string
) {
  const db = initDatabase()
  const horaNormalizada = normalizarHora(hora)

  const tx = db.transaction(() => {
    const existe = db.prepare(`
      SELECT id FROM bloqueos_horarios
      WHERE fecha = ? AND hora = ?
    `).get(fecha, horaNormalizada)

    if (existe) return

    db.prepare(`
      INSERT INTO bloqueos_horarios (fecha, hora, motivo)
      VALUES (?, ?, ?)
    `).run(fecha, horaNormalizada, motivo ?? '')
  })

  tx()
}

/* =========================
 * DESBLOQUEAR HORARIO
 * ========================= */
export function desbloquearHorario(fecha: string, hora: string) {
  const db = initDatabase()
  const horaNormalizada = normalizarHora(hora)

  const tx = db.transaction(() => {
    db.prepare(`
      DELETE FROM bloqueos_horarios
      WHERE fecha = ? AND hora = ?
    `).run(fecha, horaNormalizada)
  })

  tx()
}
