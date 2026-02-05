import { ipcMain } from 'electron'
import {
  actualizarPassword,
  actualizarUsuario,
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
    await crearUsuario(data)
    return { ok: true }
  })

  ipcMain.handle('usuarios:update', async (_event, data: any) => {
    await actualizarUsuario(data)
    return { ok: true }
  })

  ipcMain.handle('usuarios:delete', async (_event, id: number) => {
    await eliminarUsuario(id)
    return { ok: true }
  })

  ipcMain.handle('usuarios:password', async (_event, id: number, password: string) => {
    await actualizarPassword(id, password)
    return { ok: true }
  })
}
