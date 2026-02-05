import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

export function isMysqlConfigured() {
  return Boolean(
    process.env.MYSQL_HOST &&
    process.env.MYSQL_USER &&
    process.env.MYSQL_DATABASE
  )
}

export function getMysqlPool() {
  if (!pool) {
    const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number.isFinite(port) ? port : 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true
    })
  }
  return pool
}

export function resetMysqlPool() {
  pool = null
}

export async function tryMysql<T>(fn: (pool: mysql.Pool) => Promise<T>) {
  if (!isMysqlConfigured()) {
    return { ok: false as const, error: new Error('MYSQL not configured') }
  }
  try {
    const value = await fn(getMysqlPool())
    return { ok: true as const, value }
  } catch (error) {
    console.warn('[MySQL] Error:', error)
    return { ok: false as const, error }
  }
}
