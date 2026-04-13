import { api as electronApi, ipc as electronIpc } from './electron'
import { api as httpApi } from './http'

const isElectron = typeof window !== 'undefined' && Boolean((window as any).api)

export const api = isElectron ? electronApi : httpApi
export const ipc = isElectron ? electronIpc : null
