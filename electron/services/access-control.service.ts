export type UserRole = 'superadmin' | 'administrador' | 'ventas' | 'caja' | 'taller'

export const APP_ROLES: UserRole[] = ['superadmin', 'administrador', 'ventas', 'caja', 'taller']

export const ALL_PERMISSIONS = [
  'agenda',
  'reservas',
  'registros',
  'aprontes',
  'historial',
  'ajustes',
  'vehiculos',
  'config',
  'usuarios',
  'auditoria'
]

const DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  superadmin: [...ALL_PERMISSIONS],
  administrador: ['agenda', 'reservas', 'registros', 'aprontes', 'historial', 'ajustes', 'vehiculos', 'usuarios', 'auditoria'],
  ventas: ['agenda', 'reservas', 'registros', 'aprontes', 'historial'],
  caja: ['agenda', 'reservas', 'registros', 'aprontes', 'historial'],
  taller: ['reservas', 'registros', 'aprontes', 'historial']
}

const ROLE_ALIASES: Record<string, UserRole> = {
  superadmin: 'superadmin',
  superAdmin: 'superadmin',
  super: 'superadmin',
  admin: 'administrador',
  administrador: 'administrador',
  user: 'ventas',
  ventas: 'ventas',
  caja: 'caja',
  taller: 'taller'
}

export function normalizeRole(role: string | null | undefined): UserRole {
  const raw = String(role || '').trim()
  return ROLE_ALIASES[raw] || 'ventas'
}

export function getDefaultPermissions(role: UserRole | string) {
  return [...DEFAULT_PERMISSIONS[normalizeRole(role)]]
}

export function normalizePermissions(role: UserRole | string, permissions: string[] | null | undefined) {
  const normalizedRole = normalizeRole(role)
  const allowed = new Set(ALL_PERMISSIONS)
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return getDefaultPermissions(normalizedRole)
  }
  const unique = new Set<string>()
  for (const permission of permissions) {
    if (allowed.has(permission)) unique.add(permission)
  }
  return Array.from(unique)
}

export function parsePermissions(raw: any, role: UserRole | string) {
  const normalizedRole = normalizeRole(role)
  if (!raw) return getDefaultPermissions(normalizedRole)
  try {
    const parsed = JSON.parse(raw)
    return normalizePermissions(normalizedRole, parsed)
  } catch {
    return getDefaultPermissions(normalizedRole)
  }
}

export function getActor(payload: any) {
  const actor = payload?.actor && typeof payload.actor === 'object' ? payload.actor : payload || {}
  return {
    username: String(actor.username || actor.actor_username || '').trim(),
    role: normalizeRole(actor.role || actor.actor_role || '')
  }
}

export function isTallerRole(role: UserRole | string) {
  return normalizeRole(role) === 'taller'
}

export function canApproveApronte(role: UserRole | string) {
  const normalizedRole = normalizeRole(role)
  return normalizedRole === 'superadmin' || normalizedRole === 'administrador' || normalizedRole === 'caja'
}

export function requiresCajaApproval(role: UserRole | string) {
  return normalizeRole(role) === 'ventas'
}

export function assertCanCreateReserva(role: UserRole | string) {
  if (isTallerRole(role)) {
    throw new Error('El taller no puede crear reservas')
  }
}

export function assertCanDeleteReserva(role: UserRole | string) {
  if (isTallerRole(role)) {
    throw new Error('El taller no puede eliminar reservas')
  }
}

export function assertCanMoveReserva(role: UserRole | string) {
  if (isTallerRole(role)) {
    throw new Error('El taller no puede mover reservas')
  }
}

export function assertCanUpdateReserva(role: UserRole | string) {
  if (isTallerRole(role)) {
    throw new Error('El taller no puede modificar reservas')
  }
}

export function assertCanEditReservaNotes(role: UserRole | string) {
  if (isTallerRole(role)) {
    throw new Error('El taller no puede editar notas de reservas')
  }
}

export function assertCanCreateApronte(role: UserRole | string) {
  if (isTallerRole(role)) {
    throw new Error('El taller no puede crear aprontes')
  }
}

export function assertCanDeleteApronte(role: UserRole | string) {
  if (isTallerRole(role)) {
    throw new Error('El taller no puede eliminar aprontes')
  }
}

export function assertCanUpdateApronte(role: UserRole | string) {
  if (isTallerRole(role)) {
    throw new Error('El taller no puede modificar aprontes')
  }
}