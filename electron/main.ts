import 'dotenv/config'
import { app, BrowserWindow, ipcMain } from 'electron'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { setupIpcHandlers } from './ipc/index.ts'
import { initDatabase, isLocalDbDisabled } from './db/database'
import { startBackupScheduler } from './services/backup.service'
import { loadUserEnv } from './config/env'
import { bootstrapSuperAdmin } from './services/users.service'
import { setSettings } from './settings'
import { startDailySummaryScheduler } from './services/daily-summary.service'
import { startAprontesGarantiaAlertScheduler } from './services/aprontes-garantia-alert.service'
import { isRemoteBackendEnabled } from './ipc/remote-proxy'
import { startAutoUpdateFlow } from './services/updater.service'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-direct-composition')

  try {
    const sessionDataPath = path.join(app.getPath('userData'), 'session-data')
    fs.mkdirSync(sessionDataPath, { recursive: true })
    app.setPath('sessionData', sessionDataPath)
    app.commandLine.appendSwitch('disk-cache-dir', path.join(sessionDataPath, 'Cache'))
  } catch (error) {
    console.warn('[Main] No se pudo configurar cache de Chromium:', error)
  }
}

// Hacer disponibles globalmente para módulos que los necesitan
globalThis.__filename = __filename
globalThis.__dirname = __dirname




// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null // Una sola variable global

const getAppIconPath = () => {
  const fromPublic = path.join(process.env.VITE_PUBLIC, 'logo-app.png')
  if (fs.existsSync(fromPublic)) return fromPublic
  return path.join(process.env.APP_ROOT, 'src', 'assets', 'Logo_principal.png')
}

function createWindow() {
  win = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024, // Mínimo para que no se rompa el diseño
    minHeight: 700,
    icon: getAppIconPath(),
    title: "ReserveRosas - Taller Central", autoHideMenuBar: true,
    frame: true, // Mantenemos el marco de Windows (cerrar, minimizar)
    webPreferences: {
      preload: path.join(MAIN_DIST, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })
  if (VITE_DEV_SERVER_URL && String(process.env.ELECTRON_OPEN_DEVTOOLS || '') === '1') {
    win.webContents.openDevTools({ mode: 'detach' })
  }
  // 1. ELIMINAR MENÚ DE RAÍZ
 // win.setMenu(null); // Elimina el menú de la instancia
 // win.removeMenu();  // Refuerza la eliminación

  win.maximize(); 

  // 3. EVITAR QUE VITE CAMBIE EL TÍTULO
  win.on('page-title-updated', (e) => e.preventDefault());

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// UN SOLO whenReady para todo
app.whenReady().then(async () => {
  loadUserEnv() // Cargar .env guardado por el usuario (si existe)
  const remoteMode = isRemoteBackendEnabled()
  const localDbDisabled = isLocalDbDisabled()
  if (!remoteMode && !localDbDisabled) {
    initDatabase() // Inicializamos la base de datos local
    await bootstrapSuperAdmin()
  } else if (localDbDisabled) {
    console.log('[Main] DB local deshabilitada. Se omite inicialización y backups.')
  } else {
    console.log('[Main] Modo API remota activo. Se omite DB local y schedulers locales.')
  }
  setupIpcHandlers() // Activamos los cables
  if (!remoteMode && !localDbDisabled) {
    startBackupScheduler() // Backups horarios locales
  }
  if (!remoteMode) {
    startDailySummaryScheduler()
  }
  if (!remoteMode && !localDbDisabled) {
    startAprontesGarantiaAlertScheduler()
  }
  createWindow()  // Creamos la ventana
  startAutoUpdateFlow(() => win)

  ipcMain.on('settings:update', (_event, payload) => {
    if (!payload || typeof payload !== 'object') return
    const soundEnabled = payload.soundEnabled
    const theme = payload.theme
    setSettings({
      soundEnabled: typeof soundEnabled === 'boolean' ? soundEnabled : true,
      theme: theme === 'light' ? 'light' : 'dark'
    })
  })

})
