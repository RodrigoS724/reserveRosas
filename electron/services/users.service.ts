import crypto from 'node:crypto'
import { initDatabase } from '../db/database'
import { tryMysql } from '../db/mysql'
import { registrarAuditoria } from './auditoria.service'

export type UserRole = 'super' | 'admin' | 'user'

export type UserRecord = {
  id: number
  nombre: string
  username: string
  role: UserRole
  permissions: string[]
  activo: number
  created_at: string
}

const ALL_PERMISSIONS = [
  'agenda',
  'reservas',
  'historial',
  'ajustes',
  'vehiculos',
  'config',
  'usuarios',
  'auditoria'
]

async function ensureUsersTableMysql() {
  return tryMysql( async (pool) => {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL,
        permissions_json TEXT, activo TINYINT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    )
    return true
  })
}

export function getDefaultPermissions(role: UserRole) {
  if (role === 'super') return [...ALL_PERMISSIONS]
  if (role === 'admin') return ['agenda', 'reservas', 'historial', 'ajustes', 'vehiculos']
  return ['reservas', 'historial']
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 32)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

function verifyPassword(password: string, stored: string) {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = Buffer.from(parts[1], 'hex')
  const hash = Buffer.from(parts[2], 'hex')
  const computed = crypto.scryptSync(password, salt, 32)
  return crypto.timingSafeEqual(hash, computed)
}

function normalizePermissions(role: UserRole, permissions: string[] | null) {
  if (role === 'super') {
    return getDefaultPermissions(role)
  }
  if (!permissions || permissions.length === 0) {
    return getDefaultPermissions(role)
  }
  const unique = new Set<string>()
  for (const p of permissions) {
    if (ALL_PERMISSIONS.includes(p)) unique.add(p)
  }
  return Array.from(unique)
}

function parsePermissions(raw: any, role: UserRole) {
  if (!raw) return getDefaultPermissions(role)
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return normalizePermissions(role, parsed)
    }
    return getDefaultPermissions(role)
  } catch {
    return getDefaultPermissions(role)
  }
}

async function ensureUserMysql(data: {
  nombre: string
  username: string
  passwordHash: string
  role: UserRole
  permissions: string[]
  activo: number
}) {
  await ensureUsersTableMysql()
  const permissionsJson = JSON.stringify(normalizePermissions(data.role, data.permissions))
  const activo = data.activo ?? 1
  return tryMysql( async (pool) => {
    await pool.query(
      `INSERT INTO usuarios (nombre, username, password_hash, role, permissions_json, activo)
       VALUES ( ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nombre = VALUES(nombre),
         password_hash = VALUES(password_hash),
         role = VALUES(role),
         permissions_json = VALUES(permissions_json), activo = VALUES( activo)`,
      [data.nombre, data.username, data.passwordHash, data.role, permissionsJson, activo]
    )
    return true
  })
}

function ensureUserSqlite(data: {
  nombre: string
  username: string
  passwordHash: string
  role: UserRole
  permissions: string[]
  activo: number
}) {
  const db = initDatabase()
  const permissionsJson = JSON.stringify(normalizePermissions(data.role, data.permissions))
  const activo = data.activo ?? 1
  db.prepare(
    `INSERT INTO usuarios (nombre, username, password_hash, role, permissions_json, activo)
     VALUES ( ?, ?, ?, ?, ?, ?)
     ON CONFLICT(username) DO UPDATE SET
       nombre = excluded.nombre,
       password_hash = excluded.password_hash,
       role = excluded.role,
       permissions_json = excluded.permissions_json, activo = excluded.activo`
  ).run(data.nombre, data.username, data.passwordHash, data.role, permissionsJson, activo)
}

export async function bootstrapSuperAdmin() {
  const username = process.env.SUPERADMIN_USER || 'Admin'
  const password = process.env.SUPERADMIN_PASS || 'admin'
  const nombre = process.env.SUPERADMIN_NAME || 'Super Admin'
  const role: UserRole = 'super'
  const permissions = getDefaultPermissions(role)
  const passwordHash = hashPassword(password)

  await ensureUsersTableMysql()
  const existsMysql = await tryMysql( async (pool) => {
    const [rows] = await pool.query<any[]>(
      'SELECT id FROM usuarios WHERE username = ? LIMIT 1',
      [username]
    )
    return rows && rows.length > 0
  })

  let existsSqlite = false
  try {
    const db = initDatabase()
    const row = db.prepare('SELECT id FROM usuarios WHERE username = ? LIMIT 1').get(username)
    existsSqlite = Boolean(row)
  } catch {
    existsSqlite = false
  }

  const mysqlAvailable = existsMysql.ok
  const mysqlHasUser = existsMysql.ok && existsMysql.value

  if (!mysqlAvailable && existsSqlite) {
    return
  }

  let mysqlResult = { ok: false as const }
  if (!mysqlHasUser) {
    mysqlResult = await ensureUserMysql({
      nombre,
      username,
      passwordHash,
      role,
      permissions, activo: 1
    })
  }

  if (!existsSqlite) {
    try {
      ensureUserSqlite({
        nombre,
        username,
        passwordHash,
        role,
        permissions, activo: 1
      })
    } catch (error) {
      console.warn('[Usuarios] Error sincronizando ? sqlite:', error)
    }
  }
}

export async function listarUsuarios(): Promise<UserRecord[]> {
  await ensureUsersTableMysql()
  const mysqlResult = await tryMysql( async (pool) => {
    const [rows] = await pool.query<any[]>(
      'SELECT id, nombre, username, role, permissions_json, activo, created_at FROM usuarios'
    )
    return rows
  })

  if (mysqlResult.ok) {
    return mysqlResult.value.map((row) => ({
      id: Number(row.id),
      nombre: row.nombre,
      username: row.username,
      role: row.role as UserRole,
      permissions: parsePermissions(row.permissions_json, row.role as UserRole), activo: Number(row.activo) || 0,
      created_at: row.created_at
    }))
  }

  const db = initDatabase()
  const rows = db.prepare(
    'SELECT id, nombre, username, role, permissions_json, activo, created_at FROM usuarios'
  ).all() as any[]
  return rows.map((row) => ({
    id: Number(row.id),
    nombre: row.nombre,
    username: row.username,
    role: row.role as UserRole,
    permissions: parsePermissions(row.permissions_json, row.role as UserRole), activo: Number(row.activo) || 0,
    created_at: row.created_at
  }))
}

export async function listarUsuariosLogin() {
  const users = await listarUsuarios()
  return users.filter((u) => u.activo).map((u) => ({
    id: u.id,
    nombre: u.nombre,
    username: u.username,
    role: u.role,
    permissions: u.permissions
  }))
}

export async function validarLogin(username: string, password: string) {
  await ensureUsersTableMysql()
  const mysqlResult = await tryMysql( async (pool) => {
    const [rows] = await pool.query<any[]>(
      'SELECT id, nombre, username, password_hash, role, permissions_json, activo FROM usuarios WHERE username = ? LIMIT 1',
      [username]
    )
    return rows[0]
  })

  let row: any = null
  if (mysqlResult.ok) {
    row = mysqlResult.value
  } else {
    const db = initDatabase()
    row = db.prepare(
      'SELECT id, nombre, username, password_hash, role, permissions_json, activo FROM usuarios WHERE username = ? LIMIT 1'
    ).get(username)
  }

  if (!row || !row.password_hash) return { ok: false, error: 'Usuario o contraseña inválida' }
  if (!row.activo) return { ok: false, error: 'Usuario inactivo' }
  if (!verifyPassword(password, row.password_hash)) {
    return { ok: false, error: 'Usuario o contraseña inválida' }
  }

  await registrarAuditoria({
    actor_username: row.username, actor_role: row.role, accion: 'LOGIN_OK',
    target_username: row.username,
    detalle: 'Inicio de sesión exitoso'
  })

  return {
    ok: true,
    user: {
      id: Number(row.id),
      nombre: row.nombre,
      username: row.username,
      role: row.role as UserRole,
      permissions: parsePermissions(row.permissions_json, row.role as UserRole)
    }
  }
}

export async function crearUsuario(data: {
  nombre: string
  username: string
  password: string
  role: UserRole
  permissions: string[]
  activo: number
  actor_username: string
  actor_role: string
}) {
  await ensureUsersTableMysql()
  const permissions = normalizePermissions(data.role, data.permissions)
  const passwordHash = hashPassword(data.password)
  const mysqlResult = await ensureUserMysql({
    nombre: data.nombre,
    username: data.username,
    passwordHash,
    role: data.role,
    permissions, activo: data.activo ?? 1
  })

  if (!mysqlResult.ok) {
    ensureUserSqlite({
      nombre: data.nombre,
      username: data.username,
      passwordHash,
      role: data.role,
      permissions, activo: data.activo ?? 1
    })
  } else {
    try {
      ensureUserSqlite({
        nombre: data.nombre,
        username: data.username,
        passwordHash,
        role: data.role,
        permissions, activo: data.activo ?? 1
      })
    } catch (error) {
      console.warn('[Usuarios] Error sincronizando ? sqlite:', error)
    }
  }

  await registrarAuditoria({
    actor_username: data.actor_username || 'sistema', actor_role: data.actor_role || 'system', accion: 'USUARIO_CREADO',
    target_username: data.username,
    detalle: `Rol: ${data.role}`
  })
}

export async function actualizarUsuario(data: {
  id: number
  nombre: string
  username: string
  role: UserRole
  permissions: string[]
  activo: number
  actor_username: string
  actor_role: string
}) {
  await ensureUsersTableMysql()
  const permissions = normalizePermissions(data.role, data.permissions)
  const mysqlResult = await tryMysql( async (pool) => {
    await pool.query(
      `UPDATE usuarios SET nombre = ?, username = ?, role = ?, permissions_json = ?, activo = ?
       WHERE id = ?`,
      [data.nombre, data.username, data.role, JSON.stringify(permissions), data.activo ?? 1, data.id]
    )
    return true
  })

  const db = initDatabase()
  db.prepare(
    `UPDATE usuarios SET nombre = ?, username = ?, role = ?, permissions_json = ?, activo = ?
     WHERE id = ?`
  ).run(data.nombre, data.username, data.role, JSON.stringify(permissions), data.activo ?? 1, data.id)

  if (!mysqlResult.ok) {
    console.warn('[Usuarios] MySQL no disponible, actualizado solo en SQLite')
  }

  await registrarAuditoria({
    actor_username: data.actor_username || 'sistema', actor_role: data.actor_role || 'system', accion: 'USUARIO_ACTUALIZADO',
    target_username: data.username,
    detalle: `Rol: ${data.role} | activo: ${data.activo ?? 1}`
  })
}

export async function eliminarUsuario(id: number, actor: { username: string; role: string }) {
  const username = await obtenerUsernamePorId(id)
  await ensureUsersTableMysql()
  await tryMysql( async (pool) => {
    await pool.query('DELETE FROM usuarios WHERE id = ?', [id])
    return true
  })

  const db = initDatabase()
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(id)

  await registrarAuditoria({
    actor_username: actor.username || 'sistema', actor_role: actor.role || 'system', accion: 'USUARIO_ELIMINADO',
    target_username: username,
    detalle: `ID: ${id}`
  })
}

export async function actualizarPassword(id: number, password: string, actor: { username: string; role: string }) {
  const username = await obtenerUsernamePorId(id)
  await ensureUsersTableMysql()
  const passwordHash = hashPassword(password)
  await tryMysql( async (pool) => {
    await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [passwordHash, id])
    return true
  })

  const db = initDatabase()
  db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(passwordHash, id)

  await registrarAuditoria({
    actor_username: actor.username || 'sistema', actor_role: actor.role || 'system', accion: 'PASSWORD_CAMBIADA',
    target_username: username,
    detalle: `ID: ${id}`
  })
}

export const PermissionsCatalog = ALL_PERMISSIONS

async function obtenerUsernamePorId(id: number) {
  const mysqlResult = await tryMysql( async (pool) => {
    const [rows] = await pool.query<any[]>(
      'SELECT username FROM usuarios WHERE id = ? LIMIT 1',
      [id]
    )
    return rows[0]?.username || null
  })
  if (mysqlResult.ok) {
    return mysqlResult.value || null
  }
  const db = initDatabase()
  const row = db.prepare('SELECT username FROM usuarios WHERE id = ? LIMIT 1').get(id) as any
  return row.username || null
}

