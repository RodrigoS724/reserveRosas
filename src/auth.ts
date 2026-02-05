export type SessionUser = {
  id: number
  nombre: string
  username: string
  role: 'super' | 'admin' | 'user'
  permissions: string[]
}

const STORAGE_KEY = 'rr_session'

const ROUTE_PERMISSIONS: Record<string, string> = {
  '/': 'agenda',
  '/reservas': 'reservas',
  '/historial': 'historial',
  '/ajustes': 'ajustes',
  '/vehiculos': 'vehiculos',
  '/config': 'config',
  '/usuarios': 'usuarios'
}

const DEFAULT_ROUTES: Record<SessionUser['role'], string> = {
  super: '/',
  admin: '/',
  user: '/reservas'
}

export function getSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

export function setSession(session: SessionUser) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
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
  return DEFAULT_ROUTES[session.role] || '/reservas'
}

export const PermissionsLabels: Record<string, string> = {
  agenda: 'Agenda',
  reservas: 'Reservas',
  historial: 'Historial',
  ajustes: 'Ajustes horarios',
  vehiculos: 'Historial BD Gestor',
  config: 'Configuración DB',
  usuarios: 'Usuarios'
}
