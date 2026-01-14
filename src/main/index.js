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

        // Parse timestamp from filename: backup_YYYY-MM-DD_HH-mm-ss.json
        const match = filename.match(/backup_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.json/)
        let timestamp = null
        if (match) {
          // Convert filename format to ISO format: 2026-01-12_14-30-45 -> 2026-01-12T14:30:45
          const dateTimeParts = match[1].split('_')
          const datePart = dateTimeParts[0] // 2026-01-12
          const timePart = dateTimeParts[1].replace(/-/g, ':') // 14:30:45
          const dateStr = `${datePart}T${timePart}`
          timestamp = new Date(dateStr)
        }

        return {
          filename,
          path: filePath,
          created: timestamp ? timestamp.toISOString() : stats.mtime.toISOString(),
          size: stats.size,
          timestamp: timestamp || new Date(stats.mtime)
        }
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created)) // Most recent first

    return backups
  } catch (e) {
    return []
  }
}

// Smart pruning with Time Machine retention policy
function pruneBackups() {
  try {
    const backups = getAvailableBackups()
    if (backups.length === 0) return

    const now = new Date()
    const toDelete = []

    // Group backups by age buckets
    const bucketA = [] // 0-3 days: Keep ALL
    const bucketB = [] // 4 days - 1 year: Keep last of each day
    const bucketC = [] // 1-3 years: Keep last of each week
    const bucketD = [] // 3+ years: Keep last of each quarter

    backups.forEach(backup => {
      const age = now - backup.timestamp
      const days = age / (1000 * 60 * 60 * 24)
      const years = days / 365

      if (days <= 3) {
        bucketA.push(backup)
      } else if (days <= 365) {
        bucketB.push(backup)
      } else if (years <= 3) {
        bucketC.push(backup)
      } else {
        bucketD.push(backup)
      }
    })

    // Bucket A: Keep all (no pruning)

    // Bucket B: Keep only last file of each day
    const bucketBByDay = {}
    bucketB.forEach(backup => {
      const day = backup.timestamp.toISOString().split('T')[0]
      if (!bucketBByDay[day]) {
        bucketBByDay[day] = []
      }
      bucketBByDay[day].push(backup)
    })
    Object.values(bucketBByDay).forEach(dayBackups => {
      dayBackups.sort((a, b) => b.timestamp - a.timestamp)
      // Keep first (most recent), delete rest
      for (let i = 1; i < dayBackups.length; i++) {
        toDelete.push(dayBackups[i].path)
      }
    })

    // Bucket C: Keep only last file of each week
    const bucketCByWeek = {}
    bucketC.forEach(backup => {
      const weekStart = new Date(backup.timestamp)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekKey = weekStart.toISOString().split('T')[0]
      if (!bucketCByWeek[weekKey]) {
        bucketCByWeek[weekKey] = []
      }
      bucketCByWeek[weekKey].push(backup)
    })
    Object.values(bucketCByWeek).forEach(weekBackups => {
      weekBackups.sort((a, b) => b.timestamp - a.timestamp)
      for (let i = 1; i < weekBackups.length; i++) {
        toDelete.push(weekBackups[i].path)
      }
    })

    // Bucket D: Keep only last file of each quarter
    const bucketDByQuarter = {}
    bucketD.forEach(backup => {
      const year = backup.timestamp.getFullYear()
      const month = backup.timestamp.getMonth()
      const quarter = Math.floor(month / 3) + 1
      const quarterKey = `${year}-Q${quarter}`
      if (!bucketDByQuarter[quarterKey]) {
        bucketDByQuarter[quarterKey] = []
      }
      bucketDByQuarter[quarterKey].push(backup)
    })
    Object.values(bucketDByQuarter).forEach(quarterBackups => {
      quarterBackups.sort((a, b) => b.timestamp - a.timestamp)
      for (let i = 1; i < quarterBackups.length; i++) {
        toDelete.push(quarterBackups[i].path)
      }
    })

    // Safety: Never delete the very last backup file
    if (backups.length > 0) {
      const lastBackupPath = backups[0].path
      const deleteIndex = toDelete.indexOf(lastBackupPath)
      if (deleteIndex !== -1) {
        toDelete.splice(deleteIndex, 1)
      }
    }

    // Execute deletions
    toDelete.forEach(filePath => {
      try {
        fs.unlinkSync(filePath)
        console.log(`Pruned backup: ${path.basename(filePath)}`)
      } catch (e) {
        console.error(`Failed to delete backup: ${filePath}`, e)
      }
    })

    if (toDelete.length > 0) {
      console.log(`Pruned ${toDelete.length} backup(s). Kept ${backups.length - toDelete.length} backup(s).`)
    }
  } catch (e) {
    console.error('Failed to prune backups:', e)
  }
}

// Debounced auto-backup trigger
let autoBackupTimeout = null
function triggerAutoBackup() {
  // Clear existing timeout
  if (autoBackupTimeout) {
    clearTimeout(autoBackupTimeout)
  }

  // Set new timeout (3 seconds debounce)
  autoBackupTimeout = setTimeout(async () => {
    try {
      const settings = readSettings()
      const json = JSON.stringify(settings, null, 2)

      // Generate filename with seconds precision
      const now = new Date()
      const timestamp = now.toISOString()
        .replace(/:/g, '-')
        .replace(/\..+/, '')
        .replace('T', '_')
      const filename = `backup_${timestamp}.json`

      const backupDir = getBackupDirectory()
      const backupPath = path.join(backupDir, filename)

      // Encrypt and save
      if (safeStorage.isEncryptionAvailable()) {
        try {
          const encrypted = safeStorage.encryptString(json)
          fs.writeFileSync(backupPath, encrypted)
          console.log(`Auto-backup created: ${filename}`)
        } catch (encryptError) {
          console.error('Failed to encrypt auto-backup:', encryptError)
          fs.writeFileSync(backupPath, json, 'utf8')
        }
      } else {
        fs.writeFileSync(backupPath, json, 'utf8')
      }

      // Run pruning after backup
      pruneBackups()
    } catch (e) {
      console.error('Auto-backup failed:', e)
    }
  }, 3000) // 3 second debounce
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

// Get list of available printers
ipcMain.handle('print:getPrinters', async () => {
  if (!mainWindow) return { success: false, error: 'No window' }
  try {
    const printers = await mainWindow.webContents.getPrintersAsync()
    return { success: true, printers }
  } catch (e) {
    return { success: false, error: e?.message || String(e) }
  }
})

// Silent print to specified printer
ipcMain.handle('print:silent', async (_evt, { deviceName }) => {
  if (!mainWindow) return { success: false, error: 'No window' }
  try {
    await mainWindow.webContents.print({
      silent: true,
      deviceName: deviceName,
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

// Save current page as PDF to specified file path
ipcMain.handle('print:savePdfToFile', async (_evt, { folderPath, filename }) => {
  if (!mainWindow) return { success: false, error: 'No window' }
  try {
    const filepath = path.join(folderPath, `${filename}.pdf`)
    const pdfData = await mainWindow.webContents.printToPDF({
      pageSize: 'Letter',
      landscape: false,
      printBackground: true,
      preferCSSPageSize: true,
      margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 }
    })
    fs.writeFileSync(filepath, pdfData)
    return { success: true, filepath }
  } catch (e) {
    return { success: false, error: e?.message || String(e) }
  }
})

// Select folder for batch PDF export
ipcMain.handle('print:selectPdfFolder', async () => {
  if (!mainWindow) return { success: false, error: 'No window' }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  })
  if (result.canceled || !result.filePaths?.length) return { success: false }
  return { success: true, path: result.filePaths[0] }
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

    // Save to user-selected location as PLAIN JSON (not encrypted)
    fs.writeFileSync(result.filePath, json, 'utf8')

    // Also save ENCRYPTED auto-backup to app data directory
    const backupDir = getBackupDirectory()
    const autoBackupPath = path.join(backupDir, `CheckSpree_AutoBackup_${timestamp}.json`)

    // Encrypt the auto-backup if encryption is available
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const encrypted = safeStorage.encryptString(json)
        fs.writeFileSync(autoBackupPath, encrypted)
      } catch (encryptError) {
        console.error('Failed to encrypt auto-backup, saving as plain text:', encryptError)
        fs.writeFileSync(autoBackupPath, json, 'utf8')
      }
    } else {
      // No encryption available - save plain text
      fs.writeFileSync(autoBackupPath, json, 'utf8')
    }

    // Open the file location
    shell.showItemInFolder(result.filePath)

    return { success: true, path: result.filePath, autoBackupPath, isEncrypted: false }
  } catch (e) {
    return { success: false, error: e?.message || String(e) }
  }
})

// Restore backup from JSON file (handles both encrypted and plain)
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
    const buffer = fs.readFileSync(filePath)
    let backupData

    // Try to decrypt first (in case it's an encrypted backup)
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const decrypted = safeStorage.decryptString(buffer)
        backupData = JSON.parse(decrypted)
      } catch (decryptError) {
        // Failed to decrypt - try as plain text
        try {
          backupData = JSON.parse(buffer.toString('utf8'))
        } catch (parseError) {
          return { success: false, error: 'Failed to read backup file' }
        }
      }
    } else {
      // No encryption available - read as plain text
      backupData = JSON.parse(buffer.toString('utf8'))
    }

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

// Restore from latest auto-backup (encrypted)
ipcMain.handle('backup:restore-latest', async () => {
  try {
    const backups = getAvailableBackups()

    if (backups.length === 0) {
      return { success: false, error: 'No backups available' }
    }

    const latestBackup = backups[0] // Already sorted by most recent first
    const buffer = fs.readFileSync(latestBackup.path)

    let backupData

    // Try to decrypt first (auto-backups are encrypted)
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const decrypted = safeStorage.decryptString(buffer)
        backupData = JSON.parse(decrypted)
      } catch (decryptError) {
        // Failed to decrypt - try as plain text (legacy or manual backups)
        try {
          backupData = JSON.parse(buffer.toString('utf8'))
        } catch (parseError) {
          return { success: false, error: 'Failed to read backup file' }
        }
      }
    } else {
      // No encryption available - read as plain text
      backupData = JSON.parse(buffer.toString('utf8'))
    }

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

// Restore from specific backup file path (handles both encrypted and plain)
ipcMain.handle('backup:restore-file', async (_evt, filePath) => {
  try {
    if (!filePath) {
      return { success: false, error: 'No file path provided' }
    }

    const buffer = fs.readFileSync(filePath)
    let backupData

    // Try to decrypt first (in case it's an encrypted backup)
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const decrypted = safeStorage.decryptString(buffer)
        backupData = JSON.parse(decrypted)
      } catch (decryptError) {
        // Failed to decrypt - try as plain text
        try {
          backupData = JSON.parse(buffer.toString('utf8'))
        } catch (parseError) {
          return { success: false, error: 'Failed to read backup file' }
        }
      }
    } else {
      // No encryption available - read as plain text
      backupData = JSON.parse(buffer.toString('utf8'))
    }

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

// Trigger auto-backup (debounced)
ipcMain.handle('backup:trigger-auto', async () => {
  try {
    triggerAutoBackup()
    return { success: true }
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
