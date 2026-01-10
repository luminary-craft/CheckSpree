const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('url')

/** @type {BrowserWindow | null} */
let mainWindow = null

function getUserDataFile() {
  return path.join(app.getPath('userData'), 'checkspree2.settings.json')
}

function readSettings() {
  try {
    const file = getUserDataFile()
    if (!fs.existsSync(file)) return {}
    return JSON.parse(fs.readFileSync(file, 'utf8') || '{}')
  } catch {
    return {}
  }
}

function writeSettings(next) {
  const file = getUserDataFile()
  fs.writeFileSync(file, JSON.stringify(next, null, 2), 'utf8')
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

ipcMain.handle('print:dialog', async () => {
  if (!mainWindow) return { success: false, error: 'No window' }
  try {
    await mainWindow.webContents.print({
      silent: false,
      printBackground: false,
      color: true,
      margins: { marginType: 'printableArea' },
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
