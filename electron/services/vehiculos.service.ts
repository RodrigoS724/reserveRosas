import { initDatabase } from '../db/database'

export function obtenerVehiculos() {
  const db = initDatabase()
  return db.prepare(`
    SELECT
      v.*,
      h.fecha as ultima_fecha,
      h.km as ultimo_km,
      h.tipo_turno as ultimo_tipo_turno,
      h.particular_tipo as ultimo_particular_tipo,
      h.garantia_tipo as ultimo_garantia_tipo
    FROM vehiculos v
    LEFT JOIN vehiculos_historial h
      ON h.id = (
        SELECT id FROM vehiculos_historial
        WHERE vehiculo_id = v.id
        ORDER BY fecha DESC, id DESC
        LIMIT 1
      )
    ORDER BY v.matricula
  `).all()
}

export function obtenerHistorialVehiculo(vehiculoId: number) {
  const db = initDatabase()
  return db.prepare(`
    SELECT *
    FROM vehiculos_historial
    WHERE vehiculo_id = ?
    ORDER BY fecha DESC, id DESC
  `).all(vehiculoId)
}
