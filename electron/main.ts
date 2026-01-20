import { app, BrowserWindow } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { setupHandlers } from './ipcHandlers'
import path from 'node:path'
import { initDatabase } from './persistence/database'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null // Una sola variable global

function createWindow() {
  win = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024, // Mínimo para que no se rompa el diseño
    minHeight: 700,
    title: "ReserveRosas - Taller Central",
    autoHideMenuBar: true,
    frame: true, // Mantenemos el marco de Windows (cerrar, minimizar)
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // 1. ELIMINAR MENÚ DE RAÍZ
  win.setMenu(null); // Elimina el menú de la instancia
  win.removeMenu();  // Refuerza la eliminación

  // 2. FORZAR MAXIMIZADO AL ARRANCAR
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
app.whenReady().then(() => {
  initDatabase() // Inicializamos la base de datos
  setupHandlers() // Activamos los cables
  createWindow()  // Creamos la ventana
})
