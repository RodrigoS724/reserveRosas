import { execute, withTransaction } from './db.js'
import { registrarMarcaModelo } from './motos.js'
import { normalizeDate, normalizeHora } from './utils.js'

function cleanText(value, maxLen = 255) {
  const text = String(value || '').trim()
  return text.length > maxLen ? text.slice(0, maxLen) : text
}

function validateRequired(data) {
  const required = ['nombre', 'telefono', 'localidad', 'marca', 'modelo', 'factura', 'fecha', 'hora']
  for (const key of required) {
    if (!String(data[key] || '').trim()) {
      throw new Error('Campo requerido: ' + key)
    }
  }
}

function normalizeAprontePayload(data) {
  return {
    nombre: cleanText(data.nombre, 255),
    telefono: cleanText(data.telefono, 30),
    localidad: cleanText(data.localidad, 100),
    observaciones: cleanText(data.observaciones, 500),
    marca: cleanText(data.marca, 100),
    modelo: cleanText(data.modelo, 100),
    factura: cleanText(data.factura, 100),
    fecha: data.fecha,
    hora: data.hora
  }
}

async function validarCupoDisponible(conn, fecha, hora, excludeId = null) {
  const [horRows] = await conn.execute(
    'SELECT cupo FROM horarios_aprontes WHERE hora = ? AND activo = 1',
    [hora]
  )
  if (!horRows.length) {
    throw new Error('Horario de apronte no disponible')
  }

  const cupo = Number(horRows[0].cupo || 0)
  if (cupo < 1) {
    throw new Error('Cupo invalido para el horario')
  }

  const params = [fecha, hora]
  let sql = 'SELECT COUNT(*) AS total FROM aprontes WHERE fecha = ? AND hora = ?'
  if (excludeId) {
    sql += ' AND id <> ?'
    params.push(excludeId)
  }
  const [countRows] = await conn.execute(sql, params)
  const usados = Number(countRows[0]?.total || 0)
  if (usados >= cupo) {
    throw new Error('No hay cupos disponibles para ese horario')
  }
}

export async function crearApronte(data) {
  validateRequired(data)
  const payload = normalizeAprontePayload(data)
  const fechaNormalizada = normalizeDate(payload.fecha)
  const horaNormalizada = normalizeHora(payload.hora)

  return withTransaction(async (conn) => {
    await validarCupoDisponible(conn, fechaNormalizada, horaNormalizada)

    const [result] = await conn.execute(
      `INSERT INTO aprontes (
        nombre, fecha, hora,
        telefono, localidad, observaciones,
        marca, modelo, factura
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.nombre,
        fechaNormalizada,
        horaNormalizada,
        payload.telefono,
        payload.localidad,
        payload.observaciones,
        payload.marca,
        payload.modelo,
        payload.factura
      ]
    )

    try {
      await registrarMarcaModelo(conn, payload.marca, payload.modelo)
    } catch (error) {
      console.warn('[Aprontes] No se pudo registrar marca/modelo:', error)
    }

    return Number(result.insertId)
  })
}

export async function obtenerApronte(id) {
  const rows = await execute('SELECT * FROM aprontes WHERE id = ?', [id])
  return rows[0] ?? null
}

export async function obtenerAprontesPorFecha(fecha) {
  const fechaNormalizada = normalizeDate(fecha)
  const rows = await execute(
    `SELECT * FROM aprontes
     WHERE fecha = ?
     ORDER BY hora`,
    [fechaNormalizada]
  )
  return rows
}

export async function obtenerTodosLosAprontes() {
  const rows = await execute(
    'SELECT * FROM aprontes ORDER BY fecha DESC, hora DESC'
  )
  return rows
}

export async function actualizarApronte(id, data) {
  const apronteId = Number(id || data?.id || 0)
  if (!apronteId) {
    throw new Error('ID de apronte invalido')
  }

  return withTransaction(async (conn) => {
    const [rows] = await conn.execute(
      'SELECT * FROM aprontes WHERE id = ?',
      [apronteId]
    )
    const anterior = rows[0]
    if (!anterior) return

    const merged = {
      ...anterior,
      ...data
    }

    validateRequired(merged)
    const payload = normalizeAprontePayload(merged)
    const fechaNormalizada = normalizeDate(payload.fecha)
    const horaNormalizada = normalizeHora(payload.hora)

    const mismoHorario = fechaNormalizada === anterior.fecha && horaNormalizada === anterior.hora
    if (!mismoHorario) {
      await validarCupoDisponible(conn, fechaNormalizada, horaNormalizada, apronteId)
    }

    await conn.execute(
      `UPDATE aprontes
       SET nombre = ?, fecha = ?, hora = ?,
           telefono = ?, localidad = ?, observaciones = ?,
           marca = ?, modelo = ?, factura = ?
       WHERE id = ?`,
      [
        payload.nombre,
        fechaNormalizada,
        horaNormalizada,
        payload.telefono,
        payload.localidad,
        payload.observaciones,
        payload.marca,
        payload.modelo,
        payload.factura,
        apronteId
      ]
    )

    try {
      await registrarMarcaModelo(conn, payload.marca, payload.modelo)
    } catch (error) {
      console.warn('[Aprontes] No se pudo registrar marca/modelo:', error)
    }
  })
}

export async function borrarApronte(id) {
  await execute('DELETE FROM aprontes WHERE id = ?', [id])
}




