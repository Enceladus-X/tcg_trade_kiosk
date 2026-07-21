const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  verifyPin: (pin) => ipcRenderer.invoke('verify-pin', pin),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getWindowMode: () => ipcRenderer.invoke('get-window-mode'),
  setWindowMode: (mode) => ipcRenderer.invoke('set-window-mode', mode),
})
