import { safeHandle } from './safeHandle'
import {
  actualizarPassword, actualizarUsuario,
  bootstrapSuperAdmin,
  crearUsuario,
  eliminarUsuario,
  listarUsuarios,
  listarUsuariosLogin,
  validarLogin
} from '../services/users.service'

export function registrarHandlersUsuarios() {
  safeHandle('usuarios:bootstrap', async () => {
    await bootstrapSuperAdmin()
    return { ok: true }
  })

  safeHandle('usuarios:login-list', async () => {
    return listarUsuariosLogin()
  })

  safeHandle('auth:login', async (_event, username: string, password: string) => {
    return validarLogin(username, password)
  })

  safeHandle('usuarios:list', async () => {
    return listarUsuarios()
  })

  safeHandle('usuarios:create', async (_event, data: any) => {
    try {
      await crearUsuario(data)
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: error.message || 'Error al crear usuario' }
    }
  })

  safeHandle('usuarios:update', async (_event, data: any) => {
    try {
      await actualizarUsuario(data)
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: error.message || 'Error al actualizar usuario' }
    }
  })

  safeHandle('usuarios:delete', async (_event, data: { id: number; actor: { username: string; role: string } }) => {
    try {
      await eliminarUsuario(data.id, data.actor)
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: error.message || 'Error al eliminar usuario' }
    }
  })

  safeHandle('usuarios:password', async (_event, data: { id: number; password: string; actor: { username: string; role: string } }) => {
    try {
      await actualizarPassword(data.id, data.password, data.actor)
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: error.message || 'Error al actualizar contraseña' }
    }
  })
}

