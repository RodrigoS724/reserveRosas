import { initDatabase, isLocalDbDisabled } from '../db/database'
import { tryMysql } from '../db/mysql'

type RegistroStats = {
  reservas: {
    total: number
    garantia: number
    particular: number
    otros: number
    garantia_service: number
    garantia_reparacion: number
    particular_service: number
    particular_taller: number
  }
  aprontes: {
    total: number
    estados: Record<string, number>
  }
  porDia: Array<{ fecha: string; reservas: number; aprontes: number }>
}

type RegistroMensual = {
  mes: string
  rango: { desde: string; hasta: string }
  reservas: any[]
  aprontes: any[]
  stats: RegistroStats
}

function parseMonth(value?: string) {
  const today = new Date()
  let year = today.getUTCFullYear()
  let month = today.getUTCMonth() + 1

  const raw = String(value || '').trim()
  const match = /^(\d{4})-(\d{2})$/.exec(raw)
  if (match) {
    const y = Number(match[1])
    const m = Number(match[2])
    if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
      year = y
      month = m
    }
  }

  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0))
  const desde = start.toISOString().slice(0, 10)
  const hasta = end.toISOString().slice(0, 10)

  return {
    mes: `${year}-${String(month).padStart(2, '0')}`,
    desde,
    hasta
  }
}

function buildDailyBuckets(desde: string, hasta: string) {
  const buckets = new Map<string, { fecha: string; reservas: number; aprontes: number }>()
  const start = new Date(`${desde}T00:00:00Z`)
  const end = new Date(`${hasta}T00:00:00Z`)

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10)
    buckets.set(iso, { fecha: iso, reservas: 0, aprontes: 0 })
  }
  return buckets
}

function summarizeReservas(reservas: any[]) {
  const stats = {
    total: reservas.length,
    garantia: 0,
    particular: 0,
    otros: 0,
    garantia_service: 0,
    garantia_reparacion: 0,
    particular_service: 0,
    particular_taller: 0
  }

  for (const r of reservas || []) {
    const tipo = String(r?.tipo_turno || '').trim().toLowerCase()
    if (tipo === 'garantia') {
      stats.garantia += 1
      const sub = String(r?.garantia_tipo || '').trim().toLowerCase()
      if (sub === 'service') stats.garantia_service += 1
      else if (sub === 'reparacion') stats.garantia_reparacion += 1
    } else if (tipo === 'particular') {
      stats.particular += 1
      const sub = String(r?.particular_tipo || '').trim().toLowerCase()
      if (sub === 'service') stats.particular_service += 1
      else if (sub === 'taller') stats.particular_taller += 1
    } else {
      stats.otros += 1
    }
  }
  return stats
}

function summarizeAprontes(aprontes: any[]) {
  const estados: Record<string, number> = {}
  for (const a of aprontes || []) {
    const key = String(a?.estado || 'APRONTE').trim().toUpperCase()
    estados[key] = (estados[key] || 0) + 1
  }
  return { total: aprontes.length, estados }
}

async function obtenerDesdeMysql(desde: string, hasta: string) {
  return tryMysql(async (pool) => {
    const [aprontesColumns]: any = await pool.execute(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'aprontes'
         AND COLUMN_NAME IN ('observaciones', 'observacion')`
    )
    const tieneObservaciones = Array.isArray(aprontesColumns) && aprontesColumns.some((row: any) => row.COLUMN_NAME === 'observaciones')
    const observacionesSql = tieneObservaciones ? 'observaciones' : 'observacion AS observaciones'

    const [reservas] = await pool.execute(
      `SELECT id, nombre, telefono, marca, modelo, km, matricula,
              tipo_turno, particular_tipo, garantia_tipo,
              garantia_fecha_compra, garantia_numero_service, garantia_problema,
              fecha, hora, estado
       FROM reservas
       WHERE fecha >= ? AND fecha <= ?
       ORDER BY fecha, hora`,
      [desde, hasta]
    )

    const [aprontes] = await pool.execute(
      `SELECT id, nombre, telefono, localidad, ${observacionesSql},
              marca, modelo, factura, estado, fecha, hora
       FROM aprontes
       WHERE fecha >= ? AND fecha <= ?
       ORDER BY fecha, hora`,
      [desde, hasta]
    )

    return {
      reservas: reservas as any[],
      aprontes: aprontes as any[]
    }
  })
}

function obtenerDesdeSqlite(desde: string, hasta: string) {
  if (isLocalDbDisabled()) {
    throw new Error('Base de datos local deshabilitada')
  }
  const db = initDatabase()
  const hasObservaciones = db.prepare('PRAGMA table_info(aprontes)').all().some((row: any) => row.name === 'observaciones')
  const observacionesSql = hasObservaciones ? 'observaciones' : 'observacion AS observaciones'
  const reservas = db.prepare(
    `SELECT id, nombre, telefono, marca, modelo, km, matricula,
            tipo_turno, particular_tipo, garantia_tipo,
            garantia_fecha_compra, garantia_numero_service, garantia_problema,
            fecha, hora, estado
     FROM reservas
     WHERE fecha >= ? AND fecha <= ?
     ORDER BY fecha, hora`
  ).all(desde, hasta)

  const aprontes = db.prepare(
    `SELECT id, nombre, telefono, localidad, ${observacionesSql},
            marca, modelo, factura, estado, fecha, hora
     FROM aprontes
     WHERE fecha >= ? AND fecha <= ?
     ORDER BY fecha, hora`
  ).all(desde, hasta)

  return { reservas, aprontes }
}

export async function obtenerRegistroMensual(mes?: string): Promise<RegistroMensual> {
  const range = parseMonth(mes)

  const mysqlResult = await obtenerDesdeMysql(range.desde, range.hasta)
  let reservas: any[] = []
  let aprontes: any[] = []

  if (mysqlResult.ok) {
    reservas = mysqlResult.value.reservas
    aprontes = mysqlResult.value.aprontes
  } else {
    const local = obtenerDesdeSqlite(range.desde, range.hasta)
    reservas = local.reservas
    aprontes = local.aprontes
  }

  const buckets = buildDailyBuckets(range.desde, range.hasta)
  for (const r of reservas || []) {
    const b = buckets.get(r.fecha)
    if (b) b.reservas += 1
  }
  for (const a of aprontes || []) {
    const b = buckets.get(a.fecha)
    if (b) b.aprontes += 1
  }

  const stats: RegistroStats = {
    reservas: summarizeReservas(reservas),
    aprontes: summarizeAprontes(aprontes),
    porDia: Array.from(buckets.values())
  }

  return {
    mes: range.mes,
    rango: { desde: range.desde, hasta: range.hasta },
    reservas,
    aprontes,
    stats
  }
}

