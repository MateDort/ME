const path = require('path')
const url = require('url')
const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const DEV_SERVER_URL = process.env.ELECTRON_START_URL || 'http://localhost:3000'
const PROD_INDEX_PATH =
  process.env.MEOS_PROD_URL ||
  url.format({
    pathname: path.join(__dirname, '../out/index.html'),
    protocol: 'file:',
    slashes: true,
  })

let mainWindow = null

function getDisplayBounds() {
  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    return primaryDisplay?.bounds || { width: 1920, height: 1080 }
  } catch (error) {
    console.warn('[MEOS] Unable to detect display bounds, using fallback:', error)
    return { width: 1920, height: 1080 }
  }
}

function createMainWindow() {
  const { width, height } = getDisplayBounds()

  mainWindow = new BrowserWindow({
    width,
    height,
    fullscreen: true,
    kiosk: !isDev,
    frame: false,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  const startUrl = isDev ? DEV_SERVER_URL : PROD_INDEX_PATH
  mainWindow.loadURL(startUrl)
  mainWindow.once('ready-to-show', () => mainWindow?.show())

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerGlobalShortcuts() {
  const quitShortcut = process.platform === 'darwin' ? 'Command+Q' : 'Control+Q'
  globalShortcut.register(quitShortcut, () => app.quit())

  const reloadShortcut = 'CommandOrControl+R'
  globalShortcut.register(reloadShortcut, () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.reload()
    }
  })

  const devToolsShortcut = 'CommandOrControl+Shift+I'
  globalShortcut.register(devToolsShortcut, () => {
    if (isDev && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.toggleDevTools()
    }
  })

  globalShortcut.register('CommandOrControl+Shift+F', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen())
    }
  })

  if (isDev) {
    globalShortcut.register('Escape', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setKiosk(false)
        mainWindow.setFullScreen(false)
      }
    })
  }
}

app.whenReady().then(() => {
  createMainWindow()
  registerGlobalShortcuts()
  ipcMain.handle('app:ping', () => 'pong')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

