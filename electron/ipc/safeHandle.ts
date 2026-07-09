import { ipcMain } from 'electron'
import { proxyIpcToRemote, shouldProxyChannel } from './remote-proxy'

type IpcHandler = (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any

export function safeHandle(channel: string, handler: IpcHandler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      if (shouldProxyChannel(channel)) {
        return await proxyIpcToRemote(channel, args)
      }
      return await handler(event, ...args)
    } catch (error: any) {
      console.error(`[IPC:${channel}]`, error)
      return {
        __ipc_error: true,
        message: error.message || String(error),
        stack: error.stack || ''
      }
    }
  })
}
