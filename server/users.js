import crypto from 'node:crypto'
import { execute } from './db.js'
import { registrarAuditoria } from './auditoria.js'

const ALL_PERMISSIONS = [
  'agenda',
  'reservas',
  'aprontes',
  'historial',
  'ajustes',
  'vehiculos',
  'config',
  'usuarios',
  'auditoria'
]

function normalizeRole(role) {
  if (role === 'superadmin' || role === 'super' || role === 'admin' || role === 'user') {
    return role
  }
  return 'user'
}

export function getDefaultPermissions(role) {
  if (role === 'superadmin') return [...ALL_PERMISSIONS]
  if (role === 'super') return [...ALL_PERMISSIONS]
  if (role === 'admin') return ['agenda', 'reservas', 'aprontes', 'historial', 'ajustes', 'vehiculos']
  return ['reservas', 'historial']
}

function normalizePermissions(role, permissions) {
  const normalizedRole = normalizeRole(role)
  const allowed = new Set(ALL_PERMISSIONS)
  if (!permissions || permissions.length === 0) {
    return getDefaultPermissions(normalizedRole)
  }
  const unique = new Set()
  for (const p of permissions) {
    if (allowed.has(p)) unique.add(p)
  }
  return Array.from(unique)
}

function parsePermissions(raw, role) {
  const normalizedRole = normalizeRole(role)
  if (!raw) return getDefaultPermissions(normalizedRole)
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return normalizePermissions(normalizedRole, parsed)
    }
    return getDefaultPermissions(normalizedRole)
  } catch {
    return getDefaultPermissions(normalizedRole)
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 32)
  return 'scrypt$' + salt.toString('hex') + '$' + hash.toString('hex')
}

function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = Buffer.from(parts[1], 'hex')
  const hash = Buffer.from(parts[2], 'hex')
  const computed = crypto.scryptSync(password, salt, 32)
  if (hash.length !== computed.length) return false
  return crypto.timingSafeEqual(hash, computed)
}

async function ensureUsersTable() {
  await execute(
    `CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(50) NOT NULL,
      permissions_json TEXT,
      activo TINYINT DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  )
}

export async function listarUsuarios() {
  await ensureUsersTable()
  const rows = await execute(
    'SELECT id, nombre, username, password_hash, role, permissions_json, activo, created_at FROM usuarios'
  )
  return rows.map((row) => ({
    id: Number(row.id),
    nombre: row.nombre,
    username: row.username,
    role: normalizeRole(row.role),
    permissions: parsePermissions(row.permissions_json, normalizeRole(row.role)),
    activo: Number(row.activo) || 0,
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

export async function validarLogin(username, password) {
  await ensureUsersTable()
  const rows = await execute(
    'SELECT id, nombre, username, password_hash, role, permissions_json, activo FROM usuarios WHERE username = ? LIMIT 1',
    [username]
  )
  const row = rows[0]
  if (!row || !row.password_hash) {
    return { ok: false, error: 'Usuario o contrasena invalida' }
  }
  if (!Number(row.activo)) {
    return { ok: false, error: 'Usuario inactivo' }
  }
  if (!verifyPassword(password, row.password_hash)) {
    return { ok: false, error: 'Usuario o contrasena invalida' }
  }

  await registrarAuditoria({
    actor_username: row.username,
    actor_role: row.role,
    accion: 'LOGIN_OK',
    target_username: row.username,
    detalle: 'Inicio de sesion exitoso'
  })

  return {
    ok: true,
    user: {
      id: Number(row.id),
      nombre: row.nombre,
      username: row.username,
      role: normalizeRole(row.role),
      permissions: parsePermissions(row.permissions_json, normalizeRole(row.role))
    }
  }
}

export async function crearUsuario(data) {
  await ensureUsersTable()
  const role = normalizeRole(data.role)
  const permissions = normalizePermissions(role, data.permissions)
  const passwordHash = hashPassword(data.password)
  const activo = data.activo ?? 1

  await execute(
    `INSERT INTO usuarios (nombre, username, password_hash, role, permissions_json, activo)
     VALUES ( ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       nombre = VALUES(nombre),
       password_hash = VALUES(password_hash),
       role = VALUES(role),
       permissions_json = VALUES(permissions_json),
       activo = VALUES(activo)`,
    [data.nombre, data.username, passwordHash, role, JSON.stringify(permissions), activo]
  )

  await registrarAuditoria({
    actor_username: data.actor_username || 'sistema',
    actor_role: data.actor_role || 'system',
    accion: 'USUARIO_CREADO',
    target_username: data.username,
    detalle: 'Rol: ' + role
  })
}

export async function actualizarUsuario(data) {
  await ensureUsersTable()
  const role = normalizeRole(data.role)
  const permissions = normalizePermissions(role, data.permissions)
  const activo = data.activo ?? 1

  await execute(
    `UPDATE usuarios SET nombre = ?, username = ?, role = ?, permissions_json = ?, activo = ?
     WHERE id = ?`,
    [data.nombre, data.username, role, JSON.stringify(permissions), activo, data.id]
  )

  await registrarAuditoria({
    actor_username: data.actor_username || 'sistema',
    actor_role: data.actor_role || 'system',
    accion: 'USUARIO_ACTUALIZADO',
    target_username: data.username,
    detalle: 'Rol: ' + role + ' | activo: ' + activo
  })
}

export async function eliminarUsuario(id, actor) {
  const username = await obtenerUsernamePorId(id)
  await ensureUsersTable()
  await execute('DELETE FROM usuarios WHERE id = ?', [id])

  await registrarAuditoria({
    actor_username: actor?.username || 'sistema',
    actor_role: actor?.role || 'system',
    accion: 'USUARIO_ELIMINADO',
    target_username: username,
    detalle: 'ID: ' + id
  })
}

export async function actualizarPassword(id, password, actor) {
  const username = await obtenerUsernamePorId(id)
  await ensureUsersTable()
  const passwordHash = hashPassword(password)
  await execute('UPDATE usuarios SET password_hash = ? WHERE id = ?', [passwordHash, id])

  await registrarAuditoria({
    actor_username: actor?.username || 'sistema',
    actor_role: actor?.role || 'system',
    accion: 'PASSWORD_CAMBIADA',
    target_username: username,
    detalle: 'ID: ' + id
  })
}

export const PermissionsCatalog = ALL_PERMISSIONS

async function obtenerUsernamePorId(id) {
  const rows = await execute('SELECT username FROM usuarios WHERE id = ? LIMIT 1', [id])
  return rows[0]?.username || null
}

