const { app, BrowserWindow, ipcMain, screen } = require('electron')
const serve = require('electron-serve')
const path = require('path')
const fs = require('fs')

const isProd = app.isPackaged
const loadURL = serve({ directory: path.join(__dirname, '..', 'out') })

let config = { adminPin: '1234' }

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
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8')
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

ipcMain.handle('verify-pin', (_, pin) => pin === config.adminPin)
