export type SessionRole = 'superadmin' | 'administrador' | 'ventas' | 'caja' | 'taller'

export type SessionUser = {
  id: number
  nombre: string
  username: string
  role: SessionRole
  permissions: string[]
}

const STORAGE_KEY = 'rr_session'

const ROUTE_PERMISSIONS: Record<string, string> = {
  '/agenda': 'agenda',
  '/reservas': 'reservas',
  '/aprontes': 'aprontes',
  '/registros': 'registros',
  '/historial': 'historial',
  '/ajustes': 'ajustes',
  '/vehiculos': 'vehiculos',
  '/config': 'config',
  '/usuarios': 'usuarios',
  '/auditoria': 'auditoria'
}

const ROLE_ALIASES: Record<string, SessionRole> = {
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

const DEFAULT_ROUTES: Record<SessionUser['role'], string> = {
  superadmin: '/',
  administrador: '/',
  ventas: '/reservas',
  caja: '/aprontes',
  taller: '/aprontes'
}

export function normalizeRole(role: unknown): SessionRole {
  const raw = String(role || '').trim()
  return ROLE_ALIASES[raw] || 'ventas'
}

export function getSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionUser
    return {
      ...parsed,
      role: normalizeRole(parsed?.role),
      permissions: Array.isArray(parsed?.permissions) ? parsed.permissions : []
    }
  } catch {
    return null
  }
}

export function setSession(session: SessionUser) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...session,
    role: normalizeRole(session?.role),
    permissions: Array.isArray(session?.permissions) ? session.permissions : []
  }))
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}

export function hasPermission(session: SessionUser | null, permission: string) {
  if (!session) return false
  return session.permissions.includes(permission)
}

export function canAccessRoute(session: SessionUser | null, path: string) {
  const permission = ROUTE_PERMISSIONS[path]
  if (!permission) return true
  return hasPermission(session, permission)
}

export function getFallbackRoute(session: SessionUser | null) {
  if (!session) return '/reservas'
  return DEFAULT_ROUTES[normalizeRole(session.role)] || '/reservas'
}

export function isTallerRole(session: SessionUser | null) {
  return normalizeRole(session?.role) === 'taller'
}

export function canApproveApronte(session: SessionUser | null) {
  const role = normalizeRole(session?.role)
  return role === 'superadmin' || role === 'administrador' || role === 'caja'
}

export function canEditReservaCompleta(session: SessionUser | null) {
  return !isTallerRole(session)
}

export function canEditApronteCompleto(session: SessionUser | null) {
  return !isTallerRole(session)
}

export const PermissionsLabels: Record<string, string> = {
  agenda: 'Agenda',
  reservas: 'Reservas',
  registros: 'Registros',
  aprontes: 'Aprontes',
  historial: 'Historial',
  ajustes: 'Ajustes horarios',
  vehiculos: 'Historial BD Gestor',
  config: 'Configuracion DB',
  usuarios: 'Usuarios',
  auditoria: 'Auditoria'
}





