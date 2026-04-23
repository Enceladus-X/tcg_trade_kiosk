const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  verifyPin: (pin) => ipcRenderer.invoke('verify-pin', pin),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
})
