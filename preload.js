const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => ipcRenderer.send('open-external', url),
  openFolder: (folderPath) => ipcRenderer.send('open-folder', folderPath),
  setMinimizeToTray: (value) => ipcRenderer.send('set-minimize-to-tray', value),
  selectDirectory: () => ipcRenderer.invoke('select-directory')
});