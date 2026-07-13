const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  startServer: (config) => ipcRenderer.send('start-server', config),
  stopServer: () => ipcRenderer.send('stop-server'),
  checkSetup: () => ipcRenderer.invoke('check-setup'),
  downloadOllama: () => ipcRenderer.send('download-ollama'),
  purgeData: () => ipcRenderer.invoke('purge-data'),
  onLog: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('log-message', listener);
    return () => ipcRenderer.removeListener('log-message', listener);
  },
  onStatus: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('status-update', listener);
    return () => ipcRenderer.removeListener('status-update', listener);
  }
});
