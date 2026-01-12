const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage } = require('electron')
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('url')
const { autoUpdater } = require('electron-updater')
const log = require('electron-log')

/** @type {BrowserWindow | null} */
let mainWindow = null

// Configure logging for auto-updater
log.transports.file.level = 'info'
autoUpdater.logger = log

// Disable auto-download - we'll trigger it manually when user confirms
autoUpdater.autoDownload = false

function getUserDataFile() {
  return path.join(app.getPath('userData'), 'checkspree2.settings.json')
}

function getBackupDirectory() {
  const backupDir = path.join(app.getPath('userData'), 'backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
  return backupDir
}

function getAvailableBackups() {
  try {
    const backupDir = getBackupDirectory()
    const files = fs.readdirSync(backupDir)

    const backups = files
      .filter(f => f.endsWith('.json'))
      .map(filename => {
        const filePath = path.join(backupDir, filename)
        const stats = fs.statSync(filePath)
        return {
          filename,
          path: filePath,
          created: stats.mtime.toISOString(),
          size: stats.size
        }
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created)) // Most recent first

    return backups
  } catch (e) {
    return []
  }
}

function readSettings() {
  try {
    const file = getUserDataFile()
    if (!fs.existsSync(file)) return {}

    const buffer = fs.readFileSync(file)

    // Attempt to decrypt (for encrypted data)
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const decrypted = safeStorage.decryptString(buffer)
        return JSON.parse(decrypted)
      } catch (decryptError) {
        // Decryption failed - this is likely legacy plain-text data
        console.log('Decryption failed, attempting legacy plain-text parse...')

        try {
          // Try reading as plain text (legacy format)
          const plainText = buffer.toString('utf8')
          const data = JSON.parse(plainText)

          // Successfully parsed legacy data - auto-upgrade to encrypted format
          console.log('Legacy data detected. Auto-upgrading to encrypted format...')
          writeSettings(data)
          console.log('Data successfully encrypted.')

          return data
        } catch (legacyError) {
          console.error('Failed to parse as legacy data:', legacyError)
          return {}
        }
      }
    } else {
      // Encryption not available - fallback to plain text
      console.warn('Encryption not available on this system. Using plain text storage.')
      return JSON.parse(buffer.toString('utf8') || '{}')
    }
  } catch (error) {
    console.error('Failed to read settings:', error)
    return {}
  }
}

function writeSettings(next) {
  const file = getUserDataFile()
  const json = JSON.stringify(next, null, 2)

  // Encrypt if available
  if (safeStorage.isEncryptionAvailable()) {
    try {
      const encrypted = safeStorage.encryptString(json)
      fs.writeFileSync(file, encrypted)
    } catch (error) {
      console.error('Encryption failed, falling back to plain text:', error)
      fs.writeFileSync(file, json, 'utf8')
    }
  } else {
    // Encryption not available - write plain text
    console.warn('Encryption not available on this system. Writing plain text.')
    fs.writeFileSync(file, json, 'utf8')
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 920,
    backgroundColor: '#0b1220',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('settings:get', async () => readSettings())

ipcMain.handle('settings:set', async (_evt, partial) => {
  const current = readSettings()
  const next = { ...current, ...(partial || {}) }
  writeSettings(next)
  return { success: true }
})

ipcMain.handle('template:select', async () => {
  if (!mainWindow) return { success: false, error: 'No window' }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }]
  })

  if (result.canceled || !result.filePaths?.length) return { success: false }
  return { success: true, path: result.filePaths[0] }
})

ipcMain.handle('file:readAsDataURL', async (_evt, filePath) => {
  try {
    const buf = fs.readFileSync(filePath)
    const ext = (path.extname(filePath).slice(1) || 'png').toLowerCase()
    const mime =
      ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'png'
          ? 'image/png'
          : ext === 'gif'
            ? 'image/gif'
            : ext === 'bmp'
              ? 'image/bmp'
              : ext === 'webp'
                ? 'image/webp'
                : `image/${ext}`

    return {
      success: true,
      dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
      mime,
      byteLength: buf.length
    }
  } catch (e) {
    return { success: false, error: e?.message || String(e) }
  }
})

// Import CSV/Excel file
ipcMain.handle('import:select', async () => {
  if (!mainWindow) return { success: false, error: 'No window' }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Spreadsheet Files', extensions: ['csv', 'tsv', 'txt', 'xlsx', 'xls'] }
    ]
  })

  if (result.canceled || !result.filePaths?.length) return { success: false }
  return { success: true, path: result.filePaths[0] }
})

ipcMain.handle('import:read', async (_evt, filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase()

    // Read Excel files as binary buffer, text files as UTF-8 string
    if (ext === '.xlsx' || ext === '.xls') {
      const buffer = fs.readFileSync(filePath)
      // Convert buffer to base64 for transmission to renderer
      const content = buffer.toString('base64')
      return { success: true, content, ext, isBinary: true }
    } else {
      const content = fs.readFileSync(filePath, 'utf8')
      return { success: true, content, ext, isBinary: false }
    }
  } catch (e) {
    return { success: false, error: e?.message || String(e) }
  }
})

// Export history to CSV
ipcMain.handle('export:history', async (_evt, exportData) => {
  if (!mainWindow) return { success: false, error: 'No window' }

  // Support both old format (array) and new format (object with checks, ledgerTotals, etc)
  const isLegacyFormat = Array.isArray(exportData)
  const checks = isLegacyFormat ? exportData : exportData.checks
  const ledgerTotals = isLegacyFormat ? null : exportData.ledgerTotals
  const grandTotal = isLegacyFormat ? null : exportData.grandTotal

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `checkspree-history-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (result.canceled || !result.filePath) return { success: false }

  try {
    // Build CSV content
    let csvContent = ''

    // Add summary section if available
    if (grandTotal && ledgerTotals) {
      csvContent += '=== EXPORT SUMMARY ===\n'
      csvContent += `Export Date,${new Date().toISOString()}\n`
      csvContent += `Total Checks,${grandTotal.totalChecks}\n`
      csvContent += `Total Amount Spent,$${grandTotal.totalSpent.toFixed(2)}\n`
      csvContent += `Combined Ledger Balance,$${grandTotal.totalBalance.toFixed(2)}\n`
      csvContent += '\n'

      // Ledger breakdowns
      csvContent += '=== LEDGER BREAKDOWN ===\n'
      Object.entries(ledgerTotals).forEach(([ledgerId, ledger]) => {
        csvContent += `\nLedger: ${ledger.name}\n`
        csvContent += `Current Balance,$${ledger.balance.toFixed(2)}\n`
        csvContent += `Total Spent,$${ledger.totalSpent.toFixed(2)}\n`
        csvContent += `Check Count,${ledger.checkCount}\n`

        if (Object.keys(ledger.profileBreakdown).length > 0) {
          csvContent += '\nProfile Breakdown:\n'
          Object.entries(ledger.profileBreakdown).forEach(([profileId, profile]) => {
            csvContent += `  ${profile.name},Checks: ${profile.checkCount},Amount: $${profile.totalSpent.toFixed(2)}\n`
          })
        }
      })
      csvContent += '\n'
    }

    // Add check details
    csvContent += '=== CHECK DETAILS ===\n'
    const headers = ['Date', 'Payee', 'Amount', 'Memo', 'Ledger', 'Profile', 'Recorded At', 'Balance After']
    const rows = checks.map(entry => [
      entry.date || '',
      `"${(entry.payee || '').replace(/"/g, '""')}"`,
      entry.amount || 0,
      `"${(entry.memo || '').replace(/"/g, '""')}"`,
      entry.ledgerName || '',
      entry.profileName || '',
      entry.timestamp ? new Date(entry.timestamp).toISOString() : '',
      entry.balanceAfter ?? ''
    ])

    csvContent += [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

    fs.writeFileSync(result.filePath, csvContent, 'utf8')

    // Open the file location
    shell.showItemInFolder(result.filePath)

    return { success: true, path: result.filePath }
  } catch (e) {
    return { success: false, error: e?.message || String(e) }
  }
})

ipcMain.handle('print:dialog', async (_evt, filename) => {
  if (!mainWindow) return { success: false, error: 'No window' }
  try {
    await mainWindow.webContents.print({
      silent: false,
      printBackground: true,
      color: true,
      margins: {
        marginType: 'custom',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      },
      pageSize: 'Letter'
    })
    return { success: true }
  } catch (e) {
    return { success: false, error: e?.message || String(e) }
  }
})

ipcMain.handle('print:previewPdf', async () => {
  if (!mainWindow) return { success: false, error: 'No window' }

  try {
    const pdfData = await mainWindow.webContents.printToPDF({
      pageSize: 'Letter',
      landscape: false,
      printBackground: false,
      preferCSSPageSize: true,
      margins: { marginType: 'printableArea' }
    })

    const pdfPath = path.join(app.getPath('temp'), `checkspree2-preview-${Date.now()}.pdf`)
    fs.writeFileSync(pdfPath, pdfData)

    const previewWindow = new BrowserWindow({
      width: 980,
      height: 760,
      backgroundColor: '#111827'
    })
    await previewWindow.loadURL(pathToFileURL(pdfPath).toString())

    return { success: true }
  } catch (e) {
    return { success: false, error: e?.message || String(e) }
  }
})

// Backup all settings data
ipcMain.handle('backup:save', async () => {
  if (!mainWindow) return { success: false, error: 'No window' }

  const today = new Date().toISOString().slice(0, 10)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) // Format: 2026-01-12T14-30-45

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `CheckSpree_Backup_${today}.json`,
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (result.canceled || !result.filePath) return { success: false }

  try {
    // Read the settings (decrypted if necessary)
    const settings = readSettings()
    // Write as plain JSON for portability
    const json = JSON.stringify(settings, null, 2)

    // Save to user-selected location
    fs.writeFileSync(result.filePath, json, 'utf8')

    // Also save auto-backup to app data directory
    const backupDir = getBackupDirectory()
    const autoBackupPath = path.join(backupDir, `CheckSpree_AutoBackup_${timestamp}.json`)
    fs.writeFileSync(autoBackupPath, json, 'utf8')

    // Open the file location
    shell.showItemInFolder(result.filePath)

    return { success: true, path: result.filePath, autoBackupPath }
  } catch (e) {
    return { success: false, error: e?.message || String(e) }
  }
})

// Restore backup from JSON file
ipcMain.handle('backup:restore', async () => {
  if (!mainWindow) return { success: false, error: 'No window' }

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (result.canceled || !result.filePaths?.length) return { success: false }

  try {
    const filePath = result.filePaths[0]
    const fileContent = fs.readFileSync(filePath, 'utf8')
    const backupData = JSON.parse(fileContent)

    // Validate that this looks like a CheckSpree backup
    if (!backupData.model || !backupData.profiles) {
      return { success: false, error: 'Invalid backup file format' }
    }

    // Write the backup data as the new settings
    writeSettings(backupData)

    return { success: true, path: filePath }
  } catch (e) {
    return { success: false, error: e?.message || String(e) }
  }
})

// List available auto-backups
ipcMain.handle('backup:list', async () => {
  try {
    const backups = getAvailableBackups()
    return { success: true, backups }
  } catch (e) {
    return { success: false, error: e?.message || String(e), backups: [] }
  }
})

// Restore from latest auto-backup
ipcMain.handle('backup:restore-latest', async () => {
  try {
    const backups = getAvailableBackups()

    if (backups.length === 0) {
      return { success: false, error: 'No backups available' }
    }

    const latestBackup = backups[0] // Already sorted by most recent first
    const fileContent = fs.readFileSync(latestBackup.path, 'utf8')
    const backupData = JSON.parse(fileContent)

    // Validate that this looks like a CheckSpree backup
    if (!backupData.model || !backupData.profiles) {
      return { success: false, error: 'Invalid backup file format' }
    }

    // Write the backup data as the new settings
    writeSettings(backupData)

    return { success: true, backup: latestBackup }
  } catch (e) {
    return { success: false, error: e?.message || String(e) }
  }
})

// Restore from specific backup file path
ipcMain.handle('backup:restore-file', async (_evt, filePath) => {
  try {
    if (!filePath) {
      return { success: false, error: 'No file path provided' }
    }

    const fileContent = fs.readFileSync(filePath, 'utf8')
    const backupData = JSON.parse(fileContent)

    // Validate that this looks like a CheckSpree backup
    if (!backupData.model || !backupData.profiles) {
      return { success: false, error: 'Invalid backup file format' }
    }

    // Write the backup data as the new settings
    writeSettings(backupData)

    return { success: true, path: filePath }
  } catch (e) {
    return { success: false, error: e?.message || String(e) }
  }
})

// ==================== Auto-Updater ====================

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for updates...')
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { type: 'checking' })
  }
})

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info)
  if (mainWindow) {
    mainWindow.webContents.send('update-status', {
      type: 'available',
      version: info.version
    })
  }
})

autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available:', info)
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { type: 'not-available' })
  }
})

autoUpdater.on('download-progress', (progressObj) => {
  log.info('Download progress:', progressObj.percent)
  if (mainWindow) {
    mainWindow.webContents.send('update-status', {
      type: 'downloading',
      percent: Math.round(progressObj.percent)
    })
  }
})

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info)
  if (mainWindow) {
    mainWindow.webContents.send('update-status', {
      type: 'downloaded',
      version: info.version
    })
  }
})

autoUpdater.on('error', (err) => {
  log.error('Update error:', err)
  if (mainWindow) {
    mainWindow.webContents.send('update-status', {
      type: 'error',
      message: err?.message || String(err)
    })
  }
})

// IPC handlers for update actions
ipcMain.handle('updater:check', async () => {
  // Only check for updates in production
  if (process.env.NODE_ENV === 'development') {
    log.info('Skipping update check in development mode')
    return { success: false, error: 'Updates disabled in development mode' }
  }

  try {
    const result = await autoUpdater.checkForUpdates()
    return { success: true, updateInfo: result?.updateInfo }
  } catch (e) {
    log.error('Failed to check for updates:', e)
    return { success: false, error: e?.message || String(e) }
  }
})

ipcMain.handle('updater:download', async () => {
  try {
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (e) {
    log.error('Failed to download update:', e)
    return { success: false, error: e?.message || String(e) }
  }
})

ipcMain.handle('updater:install', () => {
  log.info('Installing update and restarting...')
  autoUpdater.quitAndInstall()
})

// Check for updates when app is ready (production only)
app.on('ready', () => {
  if (process.env.NODE_ENV !== 'development') {
    // Check for updates 3 seconds after app starts (gives UI time to load)
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
        log.error('Auto-update check failed:', err)
      })
    }, 3000)
  }
})
