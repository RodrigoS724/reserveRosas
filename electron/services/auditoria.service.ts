import { initDatabase } from '../db/database'
import { tryMysql } from '../db/mysql'

type AuditPayload = {
  actor_username: string | null
  actor_role: string | null
  accion: string
  target_username: string | null
  detalle: string | null
}

async function ensureAuditTableMysql() {
  return tryMysql( async (pool) => {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS auditoria_usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY, actor_username VARCHAR(255), actor_role VARCHAR(50), accion VARCHAR(100) NOT NULL,
        target_username VARCHAR(255),
        detalle TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    )
    return true
  })
}

export async function registrarAuditoria(payload: AuditPayload) {
  await ensureAuditTableMysql()
  const data = {
    actor_username: payload.actor_username ?? null, actor_role: payload.actor_role ?? null, accion: payload.accion,
    target_username: payload.target_username ?? null,
    detalle: payload.detalle ?? null
  }

  await tryMysql( async (pool) => {
    await pool.query(
      `INSERT INTO auditoria_usuarios ( actor_username, actor_role, accion, target_username, detalle)
       VALUES ( ?, ?, ?, ?, ?)`,
      [data.actor_username, data.actor_role, data.accion, data.target_username, data.detalle]
    )
    return true
  })

  const db = initDatabase()
  db.prepare(
    `INSERT INTO auditoria_usuarios ( actor_username, actor_role, accion, target_username, detalle)
     VALUES ( ?, ?, ?, ?, ?)`
  ).run(data.actor_username, data.actor_role, data.accion, data.target_username, data.detalle)
}

export async function listarAuditoria() {
  await ensureAuditTableMysql()
  const mysqlResult = await tryMysql( async (pool) => {
    const [rows] = await pool.query<any[]>(
      `SELECT id, actor_username, actor_role, accion, target_username, detalle, created_at
       FROM auditoria_usuarios
       ORDER BY id DESC`
    )
    return rows
  })

  if (mysqlResult.ok) {
    return mysqlResult.value.map((row) => ({
      id: Number(row.id), actor_username: row.actor_username, actor_role: row.actor_role, accion: row.accion,
      target_username: row.target_username,
      detalle: row.detalle,
      created_at: row.created_at
    }))
  }

  const db = initDatabase()
  return db.prepare(
    `SELECT id, actor_username, actor_role, accion, target_username, detalle, created_at
     FROM auditoria_usuarios
     ORDER BY id DESC`
  ).all()
}

