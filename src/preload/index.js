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

  printDialog: (filename, options) => ipcRenderer.invoke('print:dialog', filename, options),
  previewPdf: (options) => ipcRenderer.invoke('print:previewPdf', options),
  getPrinters: () => ipcRenderer.invoke('print:getPrinters'),
  printSilent: (options) => ipcRenderer.invoke('print:silent', options),
  savePdfToFile: (folderPath, filename, options) => ipcRenderer.invoke('print:savePdfToFile', { folderPath, filename, ...options }),
  selectPdfFolder: () => ipcRenderer.invoke('print:selectPdfFolder'),
  invoiceSavePdf: (options) => ipcRenderer.invoke('invoice:savePdf', options),

  // Backup
  backupSave: (password) => ipcRenderer.invoke('backup:save', password),
  backupRestore: (password) => ipcRenderer.invoke('backup:restore', password),
  backupList: () => ipcRenderer.invoke('backup:list'),
  backupRestoreLatest: () => ipcRenderer.invoke('backup:restore-latest'),
  backupRestoreFile: (filePath, password) => ipcRenderer.invoke('backup:restore-file', filePath, password),
  backupTriggerAuto: () => ipcRenderer.invoke('backup:trigger-auto'),

  // Auto-Updater
  updaterCheck: () => ipcRenderer.invoke('updater:check'),
  updaterDownload: () => ipcRenderer.invoke('updater:download'),
  updaterInstall: () => ipcRenderer.invoke('updater:install'),
  onUpdateStatus: (callback) => {
    const subscription = (_event, data) => callback(data)
    ipcRenderer.on('update-status', subscription)
    // Return cleanup function
    return () => ipcRenderer.removeListener('update-status', subscription)
  },

  // Open external URL in default browser
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
})
