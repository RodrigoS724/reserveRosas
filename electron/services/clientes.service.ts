import { initDatabase, isLocalDbDisabled } from '../db/database'
import { tryMysql } from '../db/mysql'

function normalizarCedula(value: any) {
  return String(value || '').replace(/\D/g, '')
}

function normalizarBusqueda(value: any) {
  return String(value || '').trim().toLowerCase()
}

function normalizarTexto(value: any) {
  return String(value || '').trim()
}

export async function guardarCliente(data: any = {}) {
  const cedula = normalizarCedula(data.cedula)
  const nombre = normalizarTexto(data.nombre)
  const telefono = normalizarTexto(data.telefono)
  const localidad = normalizarTexto(data.localidad)
  const id = Number(data.id)

  if (!cedula || !nombre) {
    throw new Error('Cedula y nombre son obligatorios')
  }

  const mysqlResult = await tryMysql(async (pool) => {
    if (Number.isInteger(id) && id > 0) {
      await pool.execute(
        'UPDATE clientes SET cedula = ?, nombre = ?, telefono = ?, localidad = ? WHERE id = ?',
        [cedula, nombre, telefono, localidad, id]
      )
      return { id }
    }

    const [existenteRows]: any = await pool.execute('SELECT id FROM clientes WHERE cedula = ? LIMIT 1', [cedula])
    const existente = existenteRows?.[0]?.id ? Number(existenteRows[0].id) : null
    if (existente) {
      await pool.execute(
        'UPDATE clientes SET nombre = ?, telefono = ?, localidad = ? WHERE id = ?',
        [nombre, telefono, localidad, existente]
      )
      return { id: existente }
    }

    const [result]: any = await pool.execute(
      'INSERT INTO clientes (cedula, nombre, telefono, localidad) VALUES (?, ?, ?, ?)',
      [cedula, nombre, telefono, localidad]
    )
    return { id: Number(result.insertId) }
  })

  if (mysqlResult.ok) {
    return mysqlResult.value
  }

  if (isLocalDbDisabled()) {
    throw mysqlResult.error instanceof Error ? mysqlResult.error : new Error('MySQL no disponible')
  }

  const db = initDatabase()
  if (Number.isInteger(id) && id > 0) {
    db.prepare('UPDATE clientes SET cedula = ?, nombre = ?, telefono = ?, localidad = ? WHERE id = ?').run(cedula, nombre, telefono, localidad, id)
    return { id }
  }

  const existente = db.prepare('SELECT id FROM clientes WHERE cedula = ? LIMIT 1').get(cedula) as { id?: number } | undefined
  if (existente?.id) {
    db.prepare('UPDATE clientes SET nombre = ?, telefono = ?, localidad = ? WHERE id = ?').run(nombre, telefono, localidad, existente.id)
    return { id: Number(existente.id) }
  }

  const result = db.prepare('INSERT INTO clientes (cedula, nombre, telefono, localidad) VALUES (?, ?, ?, ?)').run(cedula, nombre, telefono, localidad)
  return { id: Number(result.lastInsertRowid) }
}

export async function listarClientes(filtro = '') {
  const search = normalizarBusqueda(filtro)
  const cedula = normalizarCedula(filtro)

  const mysqlResult = await tryMysql(async (pool) => {
    const params: any[] = []
    const where: string[] = []

    if (search) {
      where.push('(LOWER(c.nombre) LIKE ? OR LOWER(IFNULL(c.localidad, "")) LIKE ? OR c.cedula LIKE ?)')
      params.push(`%${search}%`, `%${search}%`, `%${cedula || search}%`)
    }

    const sql = `
      SELECT
        c.id,
        c.cedula,
        c.nombre,
        c.telefono,
        c.localidad,
        c.created_at,
        (SELECT COUNT(*) FROM vehiculos v WHERE v.cliente_id = c.id) AS total_vehiculos,
        (SELECT COUNT(*) FROM reservas r WHERE r.cedula = c.cedula) AS total_reservas,
        (SELECT COUNT(*) FROM aprontes a WHERE a.cliente_id = c.id) AS total_aprontes,
        (SELECT MAX(r2.fecha) FROM reservas r2 WHERE r2.cedula = c.cedula) AS ultima_reserva_fecha,
        (SELECT MAX(a2.fecha) FROM aprontes a2 WHERE a2.cliente_id = c.id) AS ultimo_apronte_fecha
      FROM clientes c
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY c.nombre ASC, c.id ASC
    `

    const [rows]: any = await pool.execute(sql, params)
    return rows as any[]
  })

  if (mysqlResult.ok) {
    return mysqlResult.value
  }

  if (isLocalDbDisabled()) {
    throw mysqlResult.error instanceof Error ? mysqlResult.error : new Error('MySQL no disponible')
  }

  const db = initDatabase()
  const params: any[] = []
  const where: string[] = []
  if (search) {
    where.push('(LOWER(nombre) LIKE ? OR LOWER(IFNULL(localidad, "")) LIKE ? OR cedula LIKE ?)')
    params.push(`%${search}%`, `%${search}%`, `%${cedula || search}%`)
  }
  const rows = db.prepare(`
    SELECT
      c.id,
      c.cedula,
      c.nombre,
      c.telefono,
      c.localidad,
      c.created_at,
      (SELECT COUNT(*) FROM vehiculos v WHERE v.cliente_id = c.id) AS total_vehiculos,
      (SELECT COUNT(*) FROM reservas r WHERE r.cedula = c.cedula) AS total_reservas,
      (SELECT COUNT(*) FROM aprontes a WHERE a.cliente_id = c.id) AS total_aprontes,
      (SELECT MAX(r2.fecha) FROM reservas r2 WHERE r2.cedula = c.cedula) AS ultima_reserva_fecha,
      (SELECT MAX(a2.fecha) FROM aprontes a2 WHERE a2.cliente_id = c.id) AS ultimo_apronte_fecha
    FROM clientes c
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY c.nombre ASC, c.id ASC
  `).all(...params)
  return rows
}

export async function obtenerClienteDetalle(input: number | string) {
  const cedula = normalizarCedula(input)
  const id = Number(input)

  const mysqlResult = await tryMysql(async (pool) => {
    const clienteRowsSql = cedula
      ? 'SELECT * FROM clientes WHERE cedula = ? LIMIT 1'
      : 'SELECT * FROM clientes WHERE id = ? LIMIT 1'
    const clienteRowsArgs = cedula ? [cedula] : [id]
    const [clienteRows]: any = await pool.execute(clienteRowsSql, clienteRowsArgs)
    const cliente = clienteRows[0] ?? null
    if (!cliente) {
      return { cliente: null, vehiculos: [], reservas: [], aprontes: [] }
    }

    const [vehiculosRows]: any = await pool.execute(
      `SELECT
         v.*,
         c.codigo AS dt_vehiculo_codigo,
         c.modelo AS dt_vehiculo_modelo
       FROM vehiculos v
       LEFT JOIN dt_vehiculo_cod c ON c.id = v.dt_vehiculo_cod_id
       WHERE v.cliente_id = ?
       ORDER BY v.matricula ASC, v.id ASC`,
      [cliente.id]
    )

    const [reservasRows]: any = await pool.execute(
      `SELECT
         id,
         fecha,
         hora,
         estado,
         tipo_turno,
         particular_tipo,
         garantia_tipo,
         marca,
         modelo,
         matricula,
         km,
         detalles,
         created_at
       FROM reservas
       WHERE cedula = ?
       ORDER BY fecha DESC, hora DESC, id DESC`,
      [cliente.cedula]
    )

    const [aprontesRows]: any = await pool.execute(
      `SELECT
         id,
         fecha,
         hora,
         estado,
         marca,
         modelo,
         numero_motor,
         factura,
         repuestos_garantia,
         created_at
       FROM aprontes
       WHERE cliente_id = ?
       ORDER BY fecha DESC, hora DESC, id DESC`,
      [cliente.id]
    )

    return {
      cliente,
      vehiculos: vehiculosRows || [],
      reservas: reservasRows || [],
      aprontes: aprontesRows || []
    }
  })

  if (mysqlResult.ok) {
    return mysqlResult.value
  }

  if (isLocalDbDisabled()) {
    throw mysqlResult.error instanceof Error ? mysqlResult.error : new Error('MySQL no disponible')
  }

  const db = initDatabase()
  const cliente = (cedula
    ? db.prepare('SELECT * FROM clientes WHERE cedula = ? LIMIT 1').get(cedula)
    : db.prepare('SELECT * FROM clientes WHERE id = ? LIMIT 1').get(id)) as any | null

  if (!cliente) {
    return { cliente: null, vehiculos: [], reservas: [], aprontes: [] }
  }

  const vehiculos = db.prepare(
    `SELECT
       v.*,
       c.codigo AS dt_vehiculo_codigo,
       c.modelo AS dt_vehiculo_modelo
     FROM vehiculos v
     LEFT JOIN dt_vehiculo_cod c ON c.id = v.dt_vehiculo_cod_id
     WHERE v.cliente_id = ?
     ORDER BY v.matricula ASC, v.id ASC`
  ).all(cliente.id)

  const reservas = db.prepare(
    `SELECT
       id,
       fecha,
       hora,
       estado,
       tipo_turno,
       particular_tipo,
       garantia_tipo,
       marca,
       modelo,
       matricula,
       km,
       detalles,
       created_at
     FROM reservas
     WHERE cedula = ?
     ORDER BY fecha DESC, hora DESC, id DESC`
  ).all(cliente.cedula)

  const aprontes = db.prepare(
    `SELECT
       id,
       fecha,
       hora,
       estado,
       marca,
       modelo,
       numero_motor,
       factura,
       repuestos_garantia,
       created_at
     FROM aprontes
     WHERE cliente_id = ?
     ORDER BY fecha DESC, hora DESC, id DESC`
  ).all(cliente.id)

  return { cliente, vehiculos, reservas, aprontes }
}
