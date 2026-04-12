import { app, BrowserWindow, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'

const UPDATE_INTERVAL_MS = Number(process.env.AUTO_UPDATE_INTERVAL_MS || 30 * 60 * 1000)

function isAutoUpdateEnabled() {
  if (!app.isPackaged) return false
  const flag = String(process.env.AUTO_UPDATE_ENABLED || '1').trim().toLowerCase()
  return flag !== '0' && flag !== 'false' && flag !== 'off'
}

export function startAutoUpdateFlow(getWindow: () => BrowserWindow | null) {
  if (!isAutoUpdateEnabled()) {
    console.log('[Updater] Disabled (dev mode or AUTO_UPDATE_ENABLED=0).')
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = String(process.env.AUTO_UPDATE_ALLOW_PRERELEASE || '0') === '1'

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info?.version || 'unknown')
  })

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] App is up to date.')
  })

  autoUpdater.on('error', (error) => {
    console.error('[Updater] Error:', error?.message || error)
  })

  autoUpdater.on('download-progress', (progress) => {
    const percent = Number(progress?.percent || 0).toFixed(1)
    console.log(`[Updater] Download progress: ${percent}%`)
  })

  autoUpdater.on('update-downloaded', async (info) => {
    console.log('[Updater] Update downloaded:', info?.version || 'unknown')

    const win = getWindow()
    const options: Electron.MessageBoxOptions = {
      type: 'info',
      title: 'Actualizacion disponible',
      message: 'Se descargo una nueva version de ReserveRosas.',
      detail: '¿Deseas reiniciar ahora para instalar la actualizacion?',
      buttons: ['Reiniciar ahora', 'Mas tarde'],
      defaultId: 0,
      cancelId: 1
    }
    const response = win
      ? await dialog.showMessageBox(win, options)
      : await dialog.showMessageBox(options)

    if (response.response === 0) {
      setImmediate(() => {
        autoUpdater.quitAndInstall()
      })
    }
  })

  const checkNow = () => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error('[Updater] checkForUpdates failed:', error?.message || error)
    })
  }

  checkNow()
  setInterval(checkNow, UPDATE_INTERVAL_MS)
}
