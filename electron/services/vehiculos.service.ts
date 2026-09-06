import { initDatabase } from '../db/database'
import { tryMysql } from '../db/mysql'

function normalizarMatricula(value: string) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export async function obtenerVehiculos() {
  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(`
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
    `)
    return rows
  })
  if (mysqlResult.ok) return mysqlResult.value

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

export async function obtenerVehiculoPorMatriculaMysql(matricula: string) {
  const mat = normalizarMatricula(matricula)
  if (!mat) {
    throw new Error('Matricula invalida')
  }

  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(
      `
        SELECT id, matricula, marca, modelo
        FROM vehiculos
        WHERE matricula = ?
        LIMIT 1
      `,
      [mat]
    )
    return rows[0] ?? null
  })

  if (!mysqlResult.ok) {
    throw new Error('No se pudo validar la matricula en MySQL')
  }

  return mysqlResult.value
}

export async function obtenerHistorialVehiculo(vehiculoId: number) {
  const mysqlResult = await tryMysql( async (pool) => {
    const [rows]: any = await pool.execute(
      `
        SELECT *
        FROM vehiculos_historial
        WHERE vehiculo_id = ?
        ORDER BY fecha DESC, id DESC
      `,
      [vehiculoId]
    )
    return rows
  })
  if (mysqlResult.ok) return mysqlResult.value

  const db = initDatabase()
  return db.prepare(`
    SELECT *
    FROM vehiculos_historial
    WHERE vehiculo_id = ?
    ORDER BY fecha DESC, id DESC
  `).all(vehiculoId)
}

export async function obtenerVehiculosPorCedula(cedula: string) {
  const cedulaNormalizada = String(cedula || '').replace(/\D/g, '')
  if (!cedulaNormalizada) return { cliente: null, vehiculos: [] }

  const mysqlResult = await tryMysql(async (pool) => {
    const [clienteRows]: any = await pool.execute('SELECT * FROM clientes WHERE cedula = ? LIMIT 1', [cedulaNormalizada])
    const cliente = clienteRows[0] ?? null
    const [vehiculosRows]: any = await pool.execute(
      `SELECT v.*, c.codigo AS dt_vehiculo_codigo, c.modelo AS dt_vehiculo_modelo
       FROM vehiculos v
       LEFT JOIN dt_vehiculo_cod c ON c.id = v.dt_vehiculo_cod_id
       LEFT JOIN clientes cl ON cl.id = v.cliente_id
       WHERE cl.cedula = ?
       ORDER BY v.matricula`,
      [cedulaNormalizada]
    )
    return { cliente, vehiculos: vehiculosRows || [] }
  })
  if (mysqlResult.ok) return mysqlResult.value

  const db = initDatabase()
  const cliente = db.prepare('SELECT * FROM clientes WHERE cedula = ? LIMIT 1').get(cedulaNormalizada) ?? null
  const vehiculos = db.prepare(
    `SELECT v.*, c.codigo AS dt_vehiculo_codigo, c.modelo AS dt_vehiculo_modelo
     FROM vehiculos v
     LEFT JOIN dt_vehiculo_cod c ON c.id = v.dt_vehiculo_cod_id
     LEFT JOIN clientes cl ON cl.id = v.cliente_id
     WHERE cl.cedula = ?
     ORDER BY v.matricula`
  ).all(cedulaNormalizada)
  return { cliente, vehiculos }
}

export async function obtenerCatalogoVehiculos() {
  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute('SELECT * FROM dt_vehiculo_cod ORDER BY codigo, modelo')
    return rows
  })
  if (mysqlResult.ok) return mysqlResult.value
  const db = initDatabase()
  return db.prepare('SELECT * FROM dt_vehiculo_cod ORDER BY codigo, modelo').all()
}

export async function actualizarVehiculoCliente(data: any = {}) {
  const id = Number(data.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Vehiculo invalido')
  }

  const matricula = normalizarMatricula(data.matricula)
  if (!matricula) {
    throw new Error('Matricula requerida')
  }

  const payload = [
    String(data.motor || '').trim() || null,
    String(data.chasis || '').trim() || null,
    matricula,
    String(data.color || '').trim() || null,
    String(data.fecha_compra || data.fechaCompra || '').trim() || null,
    id
  ]

  const mysqlResult = await tryMysql(async (pool) => {
    await pool.execute(
      `UPDATE vehiculos
       SET motor = ?, chasis = ?, matricula = ?, color = ?, fecha_compra = ?
       WHERE id = ?`,
      payload
    )
    return { id }
  })

  if (mysqlResult.ok) return mysqlResult.value

  const db = initDatabase()
  db.prepare(
    `UPDATE vehiculos
     SET motor = ?, chasis = ?, matricula = ?, color = ?, fecha_compra = ?
     WHERE id = ?`
  ).run(...payload)
  return { id }
}
