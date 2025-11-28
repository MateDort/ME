const { contextBridge, ipcRenderer } = require('electron')

const electronAPI = {
  ping: () => ipcRenderer.invoke('app:ping'),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

