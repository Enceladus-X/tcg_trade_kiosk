const { app, BrowserWindow, ipcMain, screen, shell } = require('electron')
const serve = require('electron-serve')
const path = require('path')
const fs = require('fs')

const isProd = app.isPackaged
const loadURL = serve({ directory: path.join(__dirname, '..', 'out') })

const DEFAULT_CONFIG = { adminPin: '' }
let config = { ...DEFAULT_CONFIG }

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

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay()

  const win = new BrowserWindow({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height,
    frame: false,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

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
  const win = createWindow()
  await loadURL(win)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('verify-pin', (_, pin) => {
  return typeof config.adminPin === 'string' && config.adminPin.length > 0 && pin === config.adminPin
})
ipcMain.handle('open-external', async (_, url) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return false
  await shell.openExternal(url)
  return true
})
