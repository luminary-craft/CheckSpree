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

  printDialog: (filename) => ipcRenderer.invoke('print:dialog', filename),
  previewPdf: () => ipcRenderer.invoke('print:previewPdf'),

  // Backup
  backupSave: () => ipcRenderer.invoke('backup:save'),
  backupRestore: () => ipcRenderer.invoke('backup:restore'),
  backupList: () => ipcRenderer.invoke('backup:list'),
  backupRestoreLatest: () => ipcRenderer.invoke('backup:restore-latest'),
  backupRestoreFile: (filePath) => ipcRenderer.invoke('backup:restore-file', filePath),

  // Auto-Updater
  updaterCheck: () => ipcRenderer.invoke('updater:check'),
  updaterDownload: () => ipcRenderer.invoke('updater:download'),
  updaterInstall: () => ipcRenderer.invoke('updater:install'),
  onUpdateStatus: (callback) => {
    const subscription = (_event, data) => callback(data)
    ipcRenderer.on('update-status', subscription)
    // Return cleanup function
    return () => ipcRenderer.removeListener('update-status', subscription)
  }
})
