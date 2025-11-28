const path = require('path')
const url = require('url')
const fs = require('fs')
const fsp = require('fs/promises')
const os = require('os')
const { spawn, exec } = require('child_process')
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

const PROJECT_ROOT = process.cwd()

// Keep terminal commands safe and predictable
const SAFE_COMMANDS = [
  'cd', // Change directory (needed for navigation)
  'ls',
  'pwd',
  'cat',
  'mkdir',
  'touch',
  'rm',
  'rmdir',
  'cp',
  'mv',
  'npm',
  'npx',
  'pnpm',
  'yarn',
  'bun',
  'bunx',
  'node',
  'python',
  'python3',
  'pip',
  'pip3',
  'uvicorn',
  'gunicorn',
  'flask',
  'django-admin',
  'tsx',
  'ts-node',
  'deno',
  'go',
  'cargo',
  'git',
]

// Map<id, { child, cwd }>
const ACTIVE_PROCESSES = new Map()

// Map<url, BrowserWindow> for embedded websites
const WEBSITE_WINDOWS = new Map()

let mainWindow = null

function sanitizeCommand(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Command is required.')
  }
  if (/[;&|><]/.test(input)) {
    throw new Error('Command chaining and redirection are not allowed.')
  }
  const parts = input.trim().split(/\s+/)
  const base = parts[0]
  if (!SAFE_COMMANDS.includes(base)) {
    throw new Error(`"${base}" is not permitted in the MEOS terminal.`)
  }
  return { base, args: parts.slice(1) }
}

function resolveCwd(requestedCwd) {
  if (!requestedCwd) return PROJECT_ROOT
  const resolved = path.resolve(PROJECT_ROOT, requestedCwd)
  if (!resolved.startsWith(PROJECT_ROOT)) {
    throw new Error('Invalid working directory.')
  }
  return resolved
}

function resolveSafePath(requestPath = '.') {
  const resolved = path.resolve(PROJECT_ROOT, requestPath)
  if (!resolved.startsWith(PROJECT_ROOT)) {
    throw new Error('Path outside project root is not allowed.')
  }
  return resolved
}

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

  //
  // OS-level API handlers (Phase 3)
  //

  // Terminal: run a command and stream output back to the renderer
  ipcMain.handle('terminal:run', (event, payload) => {
    const { command, cwd } = payload || {}
    
    // Validate command (but keep original for shell execution)
    sanitizeCommand(command)
    const workingDirectory = resolveCwd(cwd)

    // Build comprehensive PATH for cross-platform support
    const defaultPath =
      process.platform === 'darwin'
        ? '/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
        : process.platform === 'win32'
        ? 'C:\\Windows\\System32;C:\\Windows;C:\\Windows\\System32\\WindowsPowerShell\\v1.0'
        : '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
    const systemPath = process.env.PATH ? `${process.env.PATH}:${defaultPath}` : defaultPath

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    
    // Use exec for full command strings - it handles shell parsing better
    // exec automatically uses the system shell and handles command + arguments correctly
    const child = exec(command, {
      cwd: workingDirectory,
      env: {
        ...process.env,
        PATH: systemPath,
      },
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large outputs
    })

    ACTIVE_PROCESSES.set(id, { child, cwd: workingDirectory })

    const webContents = event.sender
    const dataChannel = `terminal:data:${id}`
    const exitChannel = `terminal:exit:${id}`

    const sendSafe = (channel, data) => {
      if (!webContents.isDestroyed()) {
        webContents.send(channel, data)
      }
    }

    // exec combines stdout and stderr, but we can still access them separately
    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        sendSafe(dataChannel, chunk.toString())
      })
    }
    
    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        sendSafe(dataChannel, chunk.toString())
      })
    }

    child.on('close', (code) => {
      sendSafe(exitChannel, { code: code || 0 })
      ACTIVE_PROCESSES.delete(id)
    })

    child.on('error', (error) => {
      sendSafe(dataChannel, `\nError: ${error.message}\n`)
      sendSafe(exitChannel, { code: -1, error: error.message })
      ACTIVE_PROCESSES.delete(id)
    })

    return { id }
  })

  ipcMain.handle('terminal:kill', (_event, id) => {
    const entry = ACTIVE_PROCESSES.get(id)
    if (!entry) return { ok: false, message: 'Command not found or already finished.' }
    try {
      entry.child.kill('SIGTERM')
      ACTIVE_PROCESSES.delete(id)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error.message || 'Failed to kill process.' }
    }
  })

  ipcMain.handle('processes:list', () => {
    const list = []
    ACTIVE_PROCESSES.forEach((value, id) => {
      list.push({
        id,
        pid: value.child.pid,
        cwd: value.cwd,
        command: value.child.spawnargs.join(' '),
      })
    })
    return list
  })

  ipcMain.handle('processes:kill', (_event, id) => {
    const entry = ACTIVE_PROCESSES.get(id)
    if (!entry) return { ok: false, message: 'Process not found.' }
    try {
      entry.child.kill('SIGTERM')
      ACTIVE_PROCESSES.delete(id)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error.message || 'Failed to kill process.' }
    }
  })

  // Filesystem APIs
  ipcMain.handle('fs:readFile', async (_event, relPath) => {
    const filePath = resolveSafePath(relPath)
    const data = await fsp.readFile(filePath, 'utf8')
    return data
  })

  ipcMain.handle('fs:writeFile', async (_event, payload) => {
    const { path: relPath, content } = payload || {}
    const filePath = resolveSafePath(relPath)
    await fsp.mkdir(path.dirname(filePath), { recursive: true })
    await fsp.writeFile(filePath, content ?? '', 'utf8')
    return { ok: true }
  })

  ipcMain.handle('fs:listDir', async (_event, relPath = '.') => {
    const dirPath = resolveSafePath(relPath)
    const entries = await fsp.readdir(dirPath, { withFileTypes: true })
    return entries.map((entry) => ({
      name: entry.name,
      path: path.relative(PROJECT_ROOT, path.join(dirPath, entry.name)),
      type: entry.isDirectory() ? 'directory' : 'file',
    }))
  })

  // Website utilities
  ipcMain.handle('websites:detect', (_event, text) => {
    if (!text || typeof text !== 'string') return []
    const regex =
      /(https?:\/\/(?:localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+\/?[^\s]*)/gi
    const matches = []
    let match
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[1])
    }
    return Array.from(new Set(matches))
  })

  ipcMain.handle('websites:open', (_event, payload) => {
    const { url: targetUrl, title } = payload || {}
    if (!targetUrl) {
      return { ok: false, message: 'URL is required.' }
    }

    if (!mainWindow || mainWindow.isDestroyed()) {
      return { ok: false, message: 'Main window is not available.' }
    }

    // If we already have a window for this URL, focus it
    const existing = WEBSITE_WINDOWS.get(targetUrl)
    if (existing && !existing.isDestroyed()) {
      existing.focus()
      return { ok: true, reused: true }
    }

    const child = new BrowserWindow({
      parent: mainWindow,
      width: 1200,
      height: 800,
      autoHideMenuBar: true,
      backgroundColor: '#000000',
      webPreferences: {
        sandbox: true,
      },
      title: title || targetUrl,
    })

    child.loadURL(targetUrl)
    WEBSITE_WINDOWS.set(targetUrl, child)

    child.on('closed', () => {
      WEBSITE_WINDOWS.delete(targetUrl)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('websites:closed', { url: targetUrl })
      }
    })

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('websites:opened', {
        url: targetUrl,
        title: child.getTitle(),
      })
    }

    return { ok: true, reused: false }
  })

  ipcMain.handle('websites:close', (_event, targetUrl) => {
    if (!targetUrl) {
      return { ok: false, message: 'URL is required.' }
    }
    const win = WEBSITE_WINDOWS.get(targetUrl)
    if (!win || win.isDestroyed()) {
      WEBSITE_WINDOWS.delete(targetUrl)
      return { ok: false, message: 'Website window not found.' }
    }
    win.close()
    WEBSITE_WINDOWS.delete(targetUrl)
    return { ok: true }
  })

  // System info
  ipcMain.handle('system:getInfo', () => {
    return {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      cpus: os.cpus()?.length || 0,
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      homeDir: os.homedir(),
      projectRoot: PROJECT_ROOT,
      isDev,
    }
  })

  ipcMain.handle('system:exit', () => {
    app.quit()
    return { ok: true }
  })

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

