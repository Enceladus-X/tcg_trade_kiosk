const { app, BrowserWindow, ipcMain, screen, shell } = require('electron')
const serve = require('electron-serve')
const path = require('path')
const fs = require('fs')
const { requestKioskGateway } = require('./kiosk-gateway.cjs')

const isProd = app.isPackaged
const loadURL = serve({ directory: path.join(__dirname, '..', 'out') })

const DEFAULT_CONFIG = {
  adminPin: '',
  windowMode: 'kiosk',
  // These values stay in the Electron main process and are never exposed to
  // the renderer bundle. Set them in the adjacent config.json on this device.
  gatewayUrl: '',
  deviceToken: '',
}
let config = { ...DEFAULT_CONFIG }
let mainWindow = null

function getConfigPath() {
  return isProd
    ? path.join(path.dirname(process.execPath), 'config.json')
    : path.join(__dirname, '..', 'config.json')
}

function loadConfig() {
  const configPath = getConfigPath()
  try {
    if (fs.existsSync(configPath)) {
      config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) }
    } else {
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8')
    }
  } catch (e) {
    console.error('config load error:', e)
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf8')
  } catch (e) {
    console.error('config save error:', e)
  }
}

function applyWindowMode(win, mode) {
  const nextMode = mode === 'windowed' ? 'windowed' : 'kiosk'
  const { workArea } = screen.getDisplayMatching(win.getBounds())

  if (nextMode === 'windowed') {
    win.setKiosk(false)
    win.setFullScreen(false)
    win.setResizable(true)
    win.setMovable(true)
    const width = Math.min(1440, workArea.width)
    const height = Math.min(900, workArea.height)
    win.setBounds({
      x: workArea.x + Math.floor((workArea.width - width) / 2),
      y: workArea.y + Math.floor((workArea.height - height) / 2),
      width,
      height,
    })
    win.center()
  } else {
    win.setBounds(workArea)
    win.setKiosk(true)
    win.setResizable(false)
  }

  config.windowMode = nextMode
  saveConfig()
  return nextMode
}

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay()
  const isWindowed = config.windowMode === 'windowed'

  const win = new BrowserWindow({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height,
    frame: true,
    kiosk: !isWindowed,
    resizable: isWindowed,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isWindowed) applyWindowMode(win, 'windowed')

  if (!isProd) {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }

    return { action: 'allow' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (/^https?:\/\//i.test(url)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  return win
}

app.whenReady().then(async () => {
  loadConfig()
  mainWindow = createWindow()
  await loadURL(mainWindow)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('verify-pin', (_, pin) => {
  return typeof config.adminPin === 'string' && config.adminPin.length > 0 && pin === config.adminPin
})
ipcMain.handle('kiosk-gateway-request', async (_, request) => {
  return requestKioskGateway(config, request)
})
ipcMain.handle('open-external', async (_, url) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return false
  await shell.openExternal(url)
  return true
})
ipcMain.handle('get-window-mode', () => config.windowMode === 'windowed' ? 'windowed' : 'kiosk')
ipcMain.handle('set-window-mode', (_, mode) => {
  if (!mainWindow || mainWindow.isDestroyed()) return config.windowMode
  return applyWindowMode(mainWindow, mode)
})
