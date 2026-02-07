import { ipcMain } from 'electron'
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
  ipcMain.handle('usuarios:bootstrap', async () => {
    await bootstrapSuperAdmin()
    return { ok: true }
  })

  ipcMain.handle('usuarios:login-list', async () => {
    return listarUsuariosLogin()
  })

  ipcMain.handle('auth:login', async (_event, username: string, password: string) => {
    return validarLogin(username, password)
  })

  ipcMain.handle('usuarios:list', async () => {
    return listarUsuarios()
  })

  ipcMain.handle('usuarios:create', async (_event, data: any) => {
    try {
      await crearUsuario(data)
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: error.message || 'Error al crear usuario' }
    }
  })

  ipcMain.handle('usuarios:update', async (_event, data: any) => {
    try {
      await actualizarUsuario(data)
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: error.message || 'Error al actualizar usuario' }
    }
  })

  ipcMain.handle('usuarios:delete', async (_event, data: { id: number; actor: { username: string; role: string } }) => {
    try {
      await eliminarUsuario(data.id, data.actor)
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: error.message || 'Error al eliminar usuario' }
    }
  })

  ipcMain.handle('usuarios:password', async (_event, data: { id: number; password: string; actor: { username: string; role: string } }) => {
    try {
      await actualizarPassword(data.id, data.password, data.actor)
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: error.message || 'Error al actualizar contraseña' }
    }
  })
}

