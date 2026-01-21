/*import { ipcMain } from 'electron'
import { initDatabase } from './db/database'

export function setupHandlers() {
  
  ipcMain.handle('guardar-reserva', async (_e, datos) => {
    try {
      const db = initDatabase()

      const stmt = db.prepare(`
        INSERT INTO reservas (
          nombre, cedula, telefono,
          marca, modelo, km,
          matricula, tipo_turno,
          fecha, hora, detalles
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        datos.nombre,
        datos.cedula,
        datos.telefono,
        datos.marca,
        datos.modelo,
        datos.km,
        datos.matricula,
        datos.tipo_turno,
        datos.fecha,
        datos.hora,
        datos.detalles
      )
console.log('guardar-reserva llamado', datos)

      return { success: true }
    } catch (err: any) {
      console.error('DB ERROR:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('obtener-reservas-semana', () => {
  try {
    const db = initDatabase()

    const reservas = db.prepare(`
      SELECT 
        id,
        nombre,
        cedula,
        telefono,
        marca,
        modelo,
        km,
        matricula,
        tipo_turno,
        fecha,
        hora
      FROM reservas
      ORDER BY fecha, hora
    `).all()

    return reservas
  } catch (err: any) {
    console.error(err)
    return []
  }
})

ipcMain.handle('mover-reserva', (_e, { id, nuevaFecha }) => {
  try {
    const db = initDatabase()

    db.prepare(`
      UPDATE reservas
      SET fecha = ?
      WHERE id = ?
    `).run(nuevaFecha, id)

    return { success: true }
  } catch (err: any) {
    console.error(err)
    return { success: false }
  }
})

ipcMain.handle("actualizar-reserva", (_e, reserva) => {
  const db = initDatabase()

  const actual = db.prepare(
    "SELECT * FROM reservas WHERE id = ?"
  ).get(reserva.id)

  const camposEditables = ["hora", "tipo_turno", "detalles", "fecha"]

  camposEditables.forEach(campo => {
    if (actual[campo] !== reserva[campo]) {
      db.prepare(`
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha, usuario)
        VALUES (?, ?, ?, ?, datetime('now'), 'admin')
      `).run(
        reserva.id,
        campo,
        actual[campo],
        reserva[campo]
      )
    }
  })

  db.prepare(`
    UPDATE reservas
    SET hora = ?, tipo_turno = ?, detalles = ?, fecha = ?
    WHERE id = ?
  `).run(
    reserva.hora,
    reserva.tipo,
    reserva.observaciones,
    reserva.fecha,
    reserva.id
  )

  return true
})

ipcMain.handle("obtener-historial", (_e, reservaId) => {
  return initDatabase()
    .prepare("SELECT * FROM historial_reservas WHERE reserva_id = ? ORDER BY fecha DESC")
    .all(reservaId)
})


}


*/