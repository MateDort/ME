const { contextBridge, ipcRenderer } = require('electron')

function createTerminalAPI() {
  return {
    run(command, options = {}) {
      return ipcRenderer.invoke('terminal:run', {
        command,
        cwd: options.cwd,
      })
    },
    kill(id) {
      return ipcRenderer.invoke('terminal:kill', id)
    },
    onData(id, listener) {
      const channel = `terminal:data:${id}`
      const handler = (_event, data) => listener(data)
      ipcRenderer.on(channel, handler)
      return () => {
        ipcRenderer.removeListener(channel, handler)
      }
    },
    onExit(id, listener) {
      const channel = `terminal:exit:${id}`
      const handler = (_event, payload) => listener(payload)
      ipcRenderer.on(channel, handler)
      return () => {
        ipcRenderer.removeListener(channel, handler)
      }
    },
  }
}

function createFilesystemAPI() {
  return {
    readFile(path) {
      return ipcRenderer.invoke('fs:readFile', path)
    },
    writeFile(path, content) {
      return ipcRenderer.invoke('fs:writeFile', { path, content })
    },
    listDir(path = '.') {
      return ipcRenderer.invoke('fs:listDir', path)
    },
  }
}

function createProcessesAPI() {
  return {
    list() {
      return ipcRenderer.invoke('processes:list')
    },
    kill(id) {
      return ipcRenderer.invoke('processes:kill', id)
    },
  }
}

function createWebsitesAPI() {
  return {
    detectURLs(text) {
      return ipcRenderer.invoke('websites:detect', text)
    },
    open(url, title) {
      return ipcRenderer.invoke('websites:open', { url, title })
    },
  }
}

function createSystemAPI() {
  return {
    getInfo() {
      return ipcRenderer.invoke('system:getInfo')
    },
    exit() {
      return ipcRenderer.invoke('system:exit')
    },
    ping() {
      return ipcRenderer.invoke('app:ping')
    },
  }
}

const electronAPI = {
  terminal: createTerminalAPI(),
  filesystem: createFilesystemAPI(),
  processes: createProcessesAPI(),
  websites: createWebsitesAPI(),
  system: createSystemAPI(),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

