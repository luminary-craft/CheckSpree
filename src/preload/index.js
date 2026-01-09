const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('cs2', {
  settingsGet: () => ipcRenderer.invoke('settings:get'),
  settingsSet: (partial) => ipcRenderer.invoke('settings:set', partial),

  selectTemplate: () => ipcRenderer.invoke('template:select'),
  readFileAsDataURL: (filePath) => ipcRenderer.invoke('file:readAsDataURL', filePath),

  // Import/Export
  importSelect: () => ipcRenderer.invoke('import:select'),
  importRead: (filePath) => ipcRenderer.invoke('import:read', filePath),
  exportHistory: (historyData) => ipcRenderer.invoke('export:history', historyData),

  printDialog: () => ipcRenderer.invoke('print:dialog'),
  previewPdf: () => ipcRenderer.invoke('print:previewPdf')
})
