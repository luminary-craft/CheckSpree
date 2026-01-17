import React, { useEffect, useMemo, useRef, useState } from 'react'
import { numberToWords } from '../shared/numberToWords'
import { getLocalDateString } from './utils/date'
import { generateId, formatCurrency, sanitizeCurrencyInput } from './utils/helpers'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useAutoIncrement } from './hooks/useAutoIncrement'
import { usePersistenceSaver } from './hooks/usePersistenceSaver'
import * as XLSX from 'xlsx'
import { AddressInput } from './AddressInput'
import UpdateNotification from './UpdateNotification'
import logoImg from './assets/logo.png'

// App version from package.json (injected by Vite)
const APP_VERSION = __APP_VERSION__ || '0.0.0'
const PX_PER_IN = 96

// Available fonts for check printing
const AVAILABLE_FONTS = [
  { id: 'courier', name: 'Courier New', family: '"Courier New", Courier, monospace' },
  { id: 'arial', name: 'Arial', family: 'Arial, Helvetica, sans-serif' },
  { id: 'times', name: 'Times New Roman', family: '"Times New Roman", Times, serif' },
  { id: 'georgia', name: 'Georgia', family: 'Georgia, serif' },
  { id: 'verdana', name: 'Verdana', family: 'Verdana, Geneva, sans-serif' },
  { id: 'trebuchet', name: 'Trebuchet MS', family: '"Trebuchet MS", sans-serif' },
  { id: 'lucida', name: 'Lucida Console', family: '"Lucida Console", Monaco, monospace' },
  { id: 'consolas', name: 'Consolas', family: 'Consolas, "Courier New", monospace' },
  { id: 'palatino', name: 'Palatino', family: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  { id: 'garamond', name: 'Garamond', family: 'Garamond, Baskerville, serif' }
]

const DEFAULT_LAYOUT = {
  widthIn: 8.5,
  checkHeightIn: 3.0,
  stub1Enabled: false,
  stub1HeightIn: 3.0,
  stub2Enabled: false,
  stub2HeightIn: 3.0,
  // Three-up cut line positions (relative to placement offset)
  cutLine1In: 3.66,
  cutLine2In: 7.33
}

const DEFAULT_FIELDS = {
  date: { x: 6.65, y: 0.50, w: 1.6, h: 0.40, fontIn: 0.28, label: 'Date' },
  payee: { x: 0.75, y: 1.05, w: 6.2, h: 0.45, fontIn: 0.32, label: 'Pay to the Order of' },
  amount: { x: 6.95, y: 1.05, w: 1.25, h: 0.45, fontIn: 0.32, label: 'Amount ($)' },
  amountWords: { x: 0.75, y: 1.55, w: 7.5, h: 0.45, fontIn: 0.30, label: 'Amount in Words' },
  memo: { x: 0.75, y: 2.35, w: 3.8, h: 0.45, fontIn: 0.28, label: 'Memo' },
  checkNumber: { x: 7.8, y: 0.15, w: 0.6, h: 0.30, fontIn: 0.24, label: 'Check #' },
  glCode: { x: 0.75, y: 2.85, w: 2.0, h: 0.30, fontIn: 0.26, label: 'GL Code' },
  glDescription: { x: 0.75, y: 3.15, w: 3.8, h: 0.30, fontIn: 0.26, label: 'GL Description' },
  address: { x: 0.75, y: 1.85, w: 3.0, h: 0.90, fontIn: 0.22, label: 'Address' }
}

const DEFAULT_PROFILE = {
  id: 'default',
  name: 'Standard Check',
  layoutMode: 'standard', // 'standard' or 'three_up'
  layout: DEFAULT_LAYOUT,
  fields: DEFAULT_FIELDS,
  template: { path: null, opacity: 0.9, fit: 'cover' },
  placement: { offsetXIn: 0, offsetYIn: 0 },
  nextCheckNumber: 1001, // Next check number to use
  dateFormat: {
    dateSlot1: 'MM',
    dateSlot2: 'DD',
    dateSlot3: 'YYYY',
    dateSeparator: '/',
    useLongDate: false
  }
}

const DEFAULT_PREFERENCES = {
  fontScale: 1.0,
  checkFontScale: 1.0,
  stubFontScale: 1.0,
  checkFontSizePt: 12,
  stubFontSizePt: 10,
  labelSize: 9,
  fontFamily: 'courier',
  dateSlot1: 'MM',
  dateSlot2: 'DD',
  dateSlot3: 'YYYY',
  dateSeparator: '/',
  useLongDate: false,
  stub1ShowLedger: true,
  stub1ShowApproved: true,
  stub1ShowGLCode: true,
  stub1ShowLineItems: true,
  stub1ShowCheckNumber: true,
  stub1ShowDate: true,
  stub2ShowLedger: true,
  stub2ShowApproved: true,
  stub2ShowGLCode: true,
  stub2ShowLineItems: true,
  stub2ShowCheckNumber: true,
  stub2ShowDate: true,
  showCheckNumber: true, // Show/hide check number field on check itself
  showDate: true, // Show/hide date field on check itself
  adminLocked: true,
  adminPin: '0000',
  enableSnapping: false,
  // Batch print preferences
  batchPrintMode: 'interactive', // 'interactive' | 'silent' | 'pdf'
  batchPrinterDeviceName: null,
  batchPrinterFriendlyName: null,
  batchPdfExportPath: null,
  allowUserLedgerManagement: false,
  // Address/envelope visibility per section
  showAddressOnCheck: true,
  showAddressOnStub1: false,
  showAddressOnStub2: false
}

const DEFAULT_MODEL = {
  page: { size: 'Letter', widthIn: 8.5, heightIn: 11 },
  placement: { offsetXIn: 0, offsetYIn: 0 },
  layout: DEFAULT_LAYOUT,
  view: { zoom: 0.9 },
  template: { path: null, opacity: 0.9, fit: 'cover' },
  fields: DEFAULT_FIELDS,
  // Three-up mode: independent field positions per slot
  slotFields: {
    top: DEFAULT_FIELDS,
    middle: DEFAULT_FIELDS,
    bottom: DEFAULT_FIELDS
  }
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function roundTo(n, step) {
  const s = step || 1
  return Math.round(n / s) * s
}





// Format a number for display with 2 decimal places
function formatAmountForDisplay(value) {
  const num = sanitizeCurrencyInput(value)
  return num.toFixed(2)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Format date based on user preference using date builder
function formatDateByPreference(dateStr, prefs) {
  if (!dateStr) return ''

  // Try to parse the date - handle various formats
  let d
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    // YYYY-MM-DD format
    d = new Date(dateStr + 'T00:00:00')
  } else {
    // Try parsing as-is
    d = new Date(dateStr)
  }

  // If date is invalid, return empty string
  if (isNaN(d.getTime())) {
    console.warn('Invalid date format:', dateStr)
    return ''
  }

  // If long date is enabled, use full written format
  if (prefs.useLongDate) {
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Build date using slots and separator
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const year = d.getFullYear()
  const yearShort = String(year).slice(-2)

  // Map slot values to actual date parts
  const slotMap = {
    'MM': month,
    'DD': day,
    'YY': yearShort,
    'YYYY': String(year),
    'Empty': ''
  }

  // Build the date string from slots
  const parts = [
    slotMap[prefs.dateSlot1] || '',
    slotMap[prefs.dateSlot2] || '',
    slotMap[prefs.dateSlot3] || ''
  ].filter(part => part !== '')

  // Get separator (empty string if 'Empty' selected)
  const separator = prefs.dateSeparator === 'Empty' ? '' : (prefs.dateSeparator || '/')

  return parts.join(separator)
}

function formatLineItems(lineItems, maxLines = 5) {
  if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) return ''

  const displayItems = lineItems.slice(0, maxLines)
  const hasMore = lineItems.length > maxLines

  let text = displayItems.map((item, idx) => {
    const desc = item.description || item.desc || ''
    const amt = item.amount ? formatCurrency(sanitizeCurrencyInput(item.amount)) : ''
    return `${idx + 1}. ${desc}${amt ? ' - ' + amt : ''}`
  }).join('\n')

  if (hasMore) {
    const remaining = lineItems.length - maxLines
    text += `\n\n... and ${remaining} more item${remaining > 1 ? 's' : ''}`
    text += '\nSee Attached for Full Detail'
  }

  return text
}

function formatLedgerSnapshot(snapshot, ledgerName) {
  if (!snapshot) return ''

  const prev = formatCurrency(snapshot.previous_balance || 0)
  const amt = formatCurrency(snapshot.transaction_amount || 0)
  const remaining = formatCurrency(snapshot.new_balance || 0)
  const ledgerLine = ledgerName ? `Ledger: ${ledgerName}\n` : ''

  return `${ledgerLine}Previous Balance: ${prev}\nCheck Amount:     ${amt}\nRemaining Balance: ${remaining}`
}

// Calculate date range for export filtering
function getDateRangeForFilter(rangeType, customStart = null, customEnd = null) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (rangeType) {
    case 'all':
      return { start: null, end: null }

    case 'custom':
      return {
        start: customStart ? new Date(customStart + 'T00:00:00') : null,
        end: customEnd ? new Date(customEnd + 'T23:59:59') : null
      }

    case 'thisWeek': {
      const dayOfWeek = today.getDay()
      const start = new Date(today)
      start.setDate(today.getDate() - dayOfWeek) // Sunday
      const end = new Date(today)
      end.setDate(today.getDate() + (6 - dayOfWeek)) // Saturday
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }

    case 'lastWeek': {
      const dayOfWeek = today.getDay()
      const start = new Date(today)
      start.setDate(today.getDate() - dayOfWeek - 7) // Last Sunday
      const end = new Date(today)
      end.setDate(today.getDate() - dayOfWeek - 1) // Last Saturday
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }

    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
      return { start, end }
    }

    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999)
      return { start, end }
    }

    case 'thisQuarter': {
      const quarter = Math.floor(today.getMonth() / 3)
      const start = new Date(today.getFullYear(), quarter * 3, 1)
      const end = new Date(today.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999)
      return { start, end }
    }

    case 'ytd': {
      const start = new Date(today.getFullYear(), 0, 1)
      const end = new Date(today)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }

    case 'last60': {
      const start = new Date(today)
      start.setDate(today.getDate() - 60)
      const end = new Date(today)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }

    default:
      return { start: null, end: null }
  }
}

function normalizeModel(maybeModel) {
  const m = maybeModel || {}
  const layout =
    m.layout ||
    (m.check
      ? {
        widthIn: m.check.widthIn ?? DEFAULT_LAYOUT.widthIn,
        checkHeightIn: m.check.heightIn ?? DEFAULT_LAYOUT.checkHeightIn,
        stub1Enabled: false,
        stub1HeightIn: DEFAULT_LAYOUT.stub1HeightIn,
        stub2Enabled: false,
        stub2HeightIn: DEFAULT_LAYOUT.stub2HeightIn
      }
      : DEFAULT_LAYOUT)

  const template = {
    ...DEFAULT_MODEL.template,
    ...(m.template || {})
  }

  // Merge fields with defaults to ensure all required fields exist
  const fields = {
    ...DEFAULT_FIELDS,
    ...(m.fields || {})
  }

  // FORCE MIGRATION: Ensure stub address fields exist if stubs are enabled
  // Stub 1 (Payee Copy)
  if (layout.stub1Enabled && !fields.stub1_address) {
    const baseY = layout.checkHeightIn
    fields.stub1_address = { x: 2.0, y: baseY + 0.55, w: 3.5, h: 0.60, fontIn: 0.18, label: 'Address' }
  }

  // Stub 2 (Bookkeeper Copy)
  if (layout.stub2Enabled && !fields.stub2_address) {
    const stub1Offset = layout.stub1Enabled ? layout.stub1HeightIn : 0
    const baseY = layout.checkHeightIn + stub1Offset
    fields.stub2_address = { x: 2.0, y: baseY + 0.55, w: 3.5, h: 0.60, fontIn: 0.18, label: 'Address' }
  }

  // Ensure 3-Up slotFields have address and glCode
  if (m.slotFields) {
    ['top', 'middle', 'bottom'].forEach(slot => {
      if (m.slotFields[slot]) {
        if (!m.slotFields[slot].address) {
          m.slotFields[slot].address = DEFAULT_FIELDS.address
        }
        if (!m.slotFields[slot].glCode) {
          m.slotFields[slot].glCode = DEFAULT_FIELDS.glCode
        }
        if (!m.slotFields[slot].glDescription) {
          m.slotFields[slot].glDescription = DEFAULT_FIELDS.glDescription
        }
      }
    })
  }

  // Merge slotFields for three-up mode - ensure each slot has all required fields
  const slotFields = {
    top: { ...DEFAULT_FIELDS, ...(m.slotFields?.top || {}) },
    middle: { ...DEFAULT_FIELDS, ...(m.slotFields?.middle || {}) },
    bottom: { ...DEFAULT_FIELDS, ...(m.slotFields?.bottom || {}) }
  }

  return {
    ...DEFAULT_MODEL,
    ...m,
    layout,
    template,
    fields,
    slotFields
  }
}

// Parse CSV content into array of check data objects
function parseCSV(content, delimiter = ',') {
  const lines = content.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  // Parse header row
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''))

  // Map common header variations
  const fieldMap = {
    date: ['date', 'check date', 'checkdate', 'dt'],
    payee: ['payee', 'pay to', 'payto', 'recipient', 'name', 'to'],
    amount: ['amount', 'amt', 'value', 'check amount', 'sum', 'total'],
    memo: ['memo', 'description', 'desc', 'note', 'notes', 'for', 'purpose'],
    external_memo: ['external memo', 'external_memo', 'public memo', 'public_memo', 'payee memo'],
    internal_memo: ['internal memo', 'internal_memo', 'private memo', 'private_memo', 'bookkeeper memo', 'admin memo'],
    ledger: ['ledger', 'account', 'fund', 'ledger name', 'account name', 'fund name'],
    glCode: ['gl code', 'glcode', 'gl', 'general ledger', 'accounting code', 'account code'],
    glDescription: ['gl description', 'gldescription', 'gl desc', 'account description', 'code description']
  }

  // Find column indices
  const columnIndices = {}
  for (const [field, variations] of Object.entries(fieldMap)) {
    const idx = headers.findIndex(h => variations.includes(h))
    if (idx !== -1) columnIndices[field] = idx
  }

  // Parse data rows
  const results = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Handle quoted values
    const values = []
    let current = ''
    let inQuotes = false
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const entry = {
      date: columnIndices.date !== undefined ? values[columnIndices.date] || '' : '',
      payee: columnIndices.payee !== undefined ? values[columnIndices.payee] || '' : '',
      amount: columnIndices.amount !== undefined ? values[columnIndices.amount]?.replace(/[$,]/g, '') || '' : '',
      memo: columnIndices.memo !== undefined ? values[columnIndices.memo] || '' : '',
      external_memo: columnIndices.external_memo !== undefined ? values[columnIndices.external_memo] || '' : '',
      internal_memo: columnIndices.internal_memo !== undefined ? values[columnIndices.internal_memo] || '' : '',
      ledger: columnIndices.ledger !== undefined ? values[columnIndices.ledger] || '' : '',
      glCode: columnIndices.glCode !== undefined ? values[columnIndices.glCode] || '' : '',
      glDescription: columnIndices.glDescription !== undefined ? values[columnIndices.glDescription] || '' : ''
    }

    // Only include if we have at least payee or amount
    if (entry.payee || entry.amount) {
      results.push(entry)
    }
  }

  return results
}

// Parse Excel (.xlsx, .xls) files
function parseExcel(base64Content) {
  try {
    // Convert base64 to binary
    const binaryString = atob(base64Content)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Read the workbook
    const workbook = XLSX.read(bytes, { type: 'array', cellDates: true })

    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // Convert to JSON with header row
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,  // Convert dates to strings
      defval: ''   // Default value for empty cells
    })

    if (rawData.length === 0) return []

    // Normalize headers to lowercase for matching
    const normalizedData = rawData.map(row => {
      const normalizedRow = {}
      for (const [key, value] of Object.entries(row)) {
        normalizedRow[key.trim().toLowerCase()] = value
      }
      return normalizedRow
    })

    // Map common header variations
    const fieldMap = {
      date: ['date', 'check date', 'checkdate', 'dt'],
      payee: ['payee', 'pay to', 'payto', 'recipient', 'name', 'to'],
      amount: ['amount', 'amt', 'value', 'check amount', 'sum', 'total'],
      memo: ['memo', 'description', 'desc', 'note', 'notes', 'for', 'purpose'],
      external_memo: ['external memo', 'external_memo', 'public memo', 'public_memo', 'payee memo'],
      internal_memo: ['internal memo', 'internal_memo', 'private memo', 'private_memo', 'bookkeeper memo', 'admin memo'],
      ledger: ['ledger', 'account', 'fund', 'ledger name', 'account name', 'fund name'],
      glCode: ['gl code', 'glcode', 'gl', 'general ledger', 'accounting code', 'account code'],
      glDescription: ['gl description', 'gldescription', 'gl desc', 'account description', 'code description']
    }

    // Process each row
    const results = []
    for (const row of normalizedData) {
      const entry = {}

      // Find and map each field
      for (const [field, variations] of Object.entries(fieldMap)) {
        let value = ''
        for (const variation of variations) {
          if (row[variation] !== undefined && row[variation] !== '') {
            value = row[variation]
            break
          }
        }

        // Handle date conversion
        if (field === 'date' && value) {
          value = convertExcelDate(value)
        }

        // Handle amount - strip currency symbols
        if (field === 'amount' && value) {
          value = String(value).replace(/[$,]/g, '')
        }

        entry[field] = value
      }

      // Only include if we have at least payee or amount
      if (entry.payee || entry.amount) {
        results.push(entry)
      }
    }

    return results
  } catch (error) {
    console.error('Excel parsing error:', error)
    return []
  }
}

// Convert Excel date serial numbers to YYYY-MM-DD format
function convertExcelDate(value) {
  // If already a valid date string, try to parse it
  if (typeof value === 'string') {
    // Check if it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value
    }

    // Try to parse common date formats
    const parsed = new Date(value)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10)
    }
  }

  // Handle Excel serial date number
  if (typeof value === 'number') {
    // Excel date serial number (days since 1900-01-01, with leap year bug)
    const excelEpoch = new Date(1899, 11, 30) // Dec 30, 1899
    const msPerDay = 86400000
    const jsDate = new Date(excelEpoch.getTime() + value * msPerDay)

    if (!isNaN(jsDate.getTime())) {
      return jsDate.toISOString().slice(0, 10)
    }
  }

  // If it's a Date object already (from cellDates: true)
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  // Fallback to current date if parsing fails
  return new Date().toISOString().slice(0, 10)
}

// Parse Excel with custom column mapping
function parseExcelWithMapping(base64Content, mapping) {
  try {
    const binaryString = atob(base64Content)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const workbook = XLSX.read(bytes, { type: 'array', cellDates: true })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' })

    if (rawData.length === 0) return []

    const results = []
    for (const row of rawData) {
      const entry = {}

      // Map each field using the custom mapping
      for (const [field, header] of Object.entries(mapping)) {
        if (header && row[header] !== undefined) {
          let value = row[header]

          // Handle date conversion
          if (field === 'date' && value) {
            value = convertExcelDate(value)
          }

          // Handle amount - strip currency symbols
          if (field === 'amount' && value) {
            value = String(value).replace(/[$,]/g, '')
          }

          entry[field] = value
        } else {
          entry[field] = ''
        }
      }

      // Explicitly capture address if mapped
      if (mapping.address && row[mapping.address] !== undefined) {
        entry.address = row[mapping.address]
      }

      // Only include if we have at least payee or amount
      if (entry.payee || entry.amount) {
        results.push(entry)
      }
    }

    return results
  } catch (error) {
    console.error('Excel parsing with mapping error:', error)
    return []
  }
}

// Parse CSV with custom column mapping
function parseCSVWithMapping(content, delimiter, mapping) {
  const lines = content.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  // Parse header row
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/['"]/g, ''))

  // Find indices for mapped columns
  const columnIndices = {}
  for (const [field, header] of Object.entries(mapping)) {
    if (header) {
      const idx = headers.indexOf(header)
      if (idx !== -1) {
        columnIndices[field] = idx
      }
    }
  }

  // Parse data rows
  const results = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Handle quoted values
    const values = []
    let current = ''
    let inQuotes = false
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const entry = {
      date: columnIndices.date !== undefined ? values[columnIndices.date] || '' : '',
      payee: columnIndices.payee !== undefined ? values[columnIndices.payee] || '' : '',
      amount: columnIndices.amount !== undefined ? values[columnIndices.amount]?.replace(/[$,]/g, '') || '' : '',
      memo: columnIndices.memo !== undefined ? values[columnIndices.memo] || '' : '',
      external_memo: columnIndices.external_memo !== undefined ? values[columnIndices.external_memo] || '' : '',
      internal_memo: columnIndices.internal_memo !== undefined ? values[columnIndices.internal_memo] || '' : '',
      ledger: columnIndices.ledger !== undefined ? values[columnIndices.ledger] || '' : '',
      glCode: columnIndices.glCode !== undefined ? values[columnIndices.glCode] || '' : '',
      glDescription: columnIndices.glDescription !== undefined ? values[columnIndices.glDescription] || '' : '',
      address: columnIndices.address !== undefined ? values[columnIndices.address] || '' : ''
    }

    // Only include if we have at least payee or amount
    if (entry.payee || entry.amount) {
      results.push(entry)
    }
  }

  return results
}

async function readTemplateDataUrl(path) {
  if (!path) return null
  const res = await window.cs2.readFileAsDataURL(path)
  if (!res?.success) return { url: null, error: res?.error || 'Failed to read template image' }

  // Load image to get dimensions for auto-detection
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        url: res.dataUrl,
        error: null,
        mime: res.mime,
        byteLength: res.byteLength,
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }
    img.onerror = () => {
      resolve({ url: res.dataUrl, error: null, mime: res.mime, byteLength: res.byteLength, width: 0, height: 0 })
    }
    img.src = res.dataUrl
  })
}

// Icon components
function ChevronIcon({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ transition: 'transform 200ms ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1.5 3.5H12.5M5.5 1.5H8.5M5.5 6V10.5M8.5 6V10.5M2.5 3.5L3 11.5C3 12.0523 3.44772 12.5 4 12.5H10C10.5523 12.5 11 12.0523 11 11.5L11.5 3.5"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1V9M7 9L4 6M7 9L10 6M2 11V12C2 12.5523 2.44772 13 3 13H11C11.5523 13 12 12.5523 12 12V11"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 9V1M7 1L4 4M7 1L10 4M2 11V12C2 12.5523 2.44772 13 3 13H11C11.5523 13 12 12.5523 12 12V11"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ATM-style currency input - digits build from right (typing 123 shows $1.23)
function AtmCurrencyInput({ value, onChange, isWarning, placeholder = '$0.00' }) {
  const inputRef = useRef(null)

  // Convert external value (string like "1.23") to cents (123)
  const valueToCents = (val) => {
    if (!val || val === '') return 0
    const cleaned = String(val).replace(/[^0-9.]/g, '')
    const num = parseFloat(cleaned)
    if (isNaN(num)) return 0
    return Math.round(num * 100)
  }

  // Convert cents to display string with comma formatting
  const centsToDisplay = (cents) => {
    if (cents === 0) return '0.00'
    const dollars = cents / 100
    // Format with commas and always 2 decimal places
    return dollars.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  // Convert cents to external value (for onChange)
  const centsToValue = (cents) => {
    if (cents === 0) return ''
    return (cents / 100).toFixed(2)
  }

  const cents = valueToCents(value)
  const displayValue = centsToDisplay(cents)

  const handleKeyDown = (e) => {
    const input = e.target
    const isAllSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length

    // Allow: backspace, delete, tab, escape, enter, arrows
    if ([8, 46, 9, 27, 13, 37, 38, 39, 40].includes(e.keyCode)) {
      if (e.keyCode === 8) { // Backspace
        e.preventDefault()
        // If all selected, clear to zero
        if (isAllSelected) {
          onChange('')
        } else {
          // Remove rightmost digit
          const newCents = Math.floor(cents / 10)
          onChange(centsToValue(newCents))
        }
      }
      return
    }

    // Block non-numeric keys
    if (e.key < '0' || e.key > '9') {
      e.preventDefault()
      return
    }

    e.preventDefault()

    // If entire value is selected, start fresh with this digit
    const digit = parseInt(e.key, 10)
    let newCents
    if (isAllSelected) {
      newCents = digit // Start fresh from this digit
    } else {
      // Append digit and shift value left
      newCents = (cents * 10) + digit
    }

    // Limit to reasonable max (e.g., $999,999,999.99 - nearly $1 billion)
    if (newCents > 99999999999) return

    onChange(centsToValue(newCents))
  }

  const handleFocus = (e) => {
    // Select all on focus for easy replacement
    e.target.select()
  }

  const handleChange = (e) => {
    // Ignore direct input - we handle everything through keyDown
    // This prevents issues with paste and other input methods
  }

  return (
    <div className={`input-prefix ${isWarning ? 'warning' : ''}`}>
      <span>$</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder="0.00"
        style={{ textAlign: 'right' }}
      />
    </div>
  )
}

// Payee autocomplete - suggests previously used payees from history
function PayeeAutocomplete({ value, onChange, checkHistory = [], placeholder = 'Recipient name' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Get unique payees from check history (only checks, not deposits)
  const uniquePayees = useMemo(() => {
    if (!checkHistory || !Array.isArray(checkHistory)) return []
    const payees = new Set()
    checkHistory
      .filter(entry => entry.type === 'check' || !entry.type) // Include legacy entries
      .forEach(entry => {
        if (entry.payee?.trim()) {
          payees.add(entry.payee.trim())
        }
      })
    return Array.from(payees).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
  }, [checkHistory])

  // Filter suggestions based on current input
  const suggestions = useMemo(() => {
    if (!value || value.trim() === '') return uniquePayees.slice(0, 50) // Show top 50 if empty
    const searchTerm = value.toLowerCase().trim()
    return uniquePayees.filter(payee =>
      payee.toLowerCase().includes(searchTerm) &&
      payee.toLowerCase() !== searchTerm // Don't show if exact match
    ).slice(0, 8) // Limit to 8 suggestions
  }, [value, uniquePayees])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e) => {
    onChange(e.target.value)
    setIsOpen(true)
    setHighlightedIndex(-1)
  }

  const handleSelect = (payee) => {
    onChange(payee)
    setIsOpen(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (!isOpen) { // Removed empty check to allow opening on arrow down even if empty
      if (e.key === 'ArrowDown') {
        setIsOpen(true)
        setHighlightedIndex(0)
        e.preventDefault()
      }
      return
    }

    if (suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault()
          handleSelect(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  const showDropdown = isOpen && suggestions.length > 0

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)} // Open on focus
        onClick={() => setIsOpen(true)} // Open on click
        placeholder={placeholder}
        autoComplete="off"
      />
      {showDropdown && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {suggestions.map((payee, index) => (
            <div
              key={payee}
              onMouseDown={(e) => {
                e.preventDefault() // Prevent blur
                handleSelect(payee)
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: index === highlightedIndex ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: index === highlightedIndex ? '#60a5fa' : '#e2e8f0',
                borderBottom: index < suggestions.length - 1 ? '1px solid #334155' : 'none',
                fontSize: '13px',
                transition: 'background-color 0.1s'
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {payee}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PasswordModal({ title, message, value, onChange, onSubmit, onCancel, error, confirmButtonText = 'Submit', allowEmpty = false }) {
  return (
    <div className="modal-overlay no-print" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn-icon" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          {message && <p style={{ marginBottom: '16px', color: '#94a3b8' }}>{message}</p>}
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (allowEmpty || value)) onSubmit()
              }}
              autoFocus
              placeholder="Enter password..."
            />
            {error && (
              <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px' }}>
                {error}
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={onSubmit} disabled={!allowEmpty && !value}>
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  )
}

// GL Code Input with Autocomplete
function GlCodeInput({ value, onChange, glCodes = [], placeholder = 'GL Code', ...props }) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Filter suggestions based on current input
  const suggestions = useMemo(() => {
    if (!value || value.trim() === '') return glCodes.slice(0, 50) // Show top 50 if empty
    const searchTerm = value.toLowerCase().trim()
    return glCodes.filter(item =>
      item.code.toLowerCase().includes(searchTerm) ||
      (item.description && item.description.toLowerCase().includes(searchTerm))
    ).slice(0, 8)
  }, [value, glCodes])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e) => {
    onChange(e.target.value)
    setIsOpen(true)
    setHighlightedIndex(-1)
  }

  const handleSelect = (item) => {
    // Explicitly pass the structure expected by App.jsx
    if (typeof item === 'object') {
      if (props.onSelect) {
        props.onSelect(item)
      } else {
        onChange({
          code: item.code,
          description: item.description
        })
      }
    } else {
      onChange(item)
    }

    setIsOpen(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true)
        setHighlightedIndex(0)
        e.preventDefault()
      }
      return
    }

    if (suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault()
          handleSelect(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  const showDropdown = isOpen && suggestions.length > 0

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {showDropdown && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {suggestions.map((item, index) => (
            <div
              key={item.code}
              onMouseDown={(e) => {
                e.preventDefault() // Prevent blur
                handleSelect(item)
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: index === highlightedIndex ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: index === highlightedIndex ? '#60a5fa' : '#e2e8f0',
                borderBottom: index < suggestions.length - 1 ? '1px solid #334155' : 'none',
                fontSize: '13px',
                transition: 'background-color 0.1s',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '8px'
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <span style={{ fontWeight: 600 }}>{item.code}</span>
              <span style={{ opacity: 0.7, fontSize: '0.9em' }}>{item.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GlDescriptionModal({ code, onClose, onSave }) {
  const [description, setDescription] = useState('')

  return (
    <div className="modal-overlay no-print" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New GL Code: {code}</h2>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '16px', color: '#94a3b8' }}>
            This GL Code is not recognized. Would you like to add a description for future reference?
          </p>
          <div className="field">
            <label>Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Office Supplies"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSave(code, description)
              }}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose}>Skip</button>
          <button
            className="btn primary"
            onClick={() => onSave(code, description)}
          >
            Save GL Code
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [model, setModel] = useState(DEFAULT_MODEL)

  // Layout Editor State
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState([]) // Array of selected field keys
  const [selectionBox, setSelectionBox] = useState(null) // { startX, startY, currentX, currentY } for marquee
  const [showFriendlyLabel, setShowFriendlyLabel] = useState(true)
  const paperRef = useRef(null)

  const [isPrinting, setIsPrinting] = useState(false)
  const [templateDataUrl, setTemplateDataUrl] = useState(null)
  const [templateLoadError, setTemplateLoadError] = useState(null)
  const [templateMeta, setTemplateMeta] = useState(null)
  const [templateDecodeError, setTemplateDecodeError] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Preferences
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)

  // Profile system
  const [profiles, setProfiles] = useState([DEFAULT_PROFILE])
  const [activeProfileId, setActiveProfileId] = useState('default')
  const [editingProfileName, setEditingProfileName] = useState(null)
  const [showProfileManager, setShowProfileManager] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Three-up layout mode
  const [threeUpSlot, setThreeUpSlot] = useState('top') // 'top', 'middle', 'bottom'

  // Multi-Ledger system
  const [ledgers, setLedgers] = useState([
    {
      id: 'default',
      name: 'Primary Ledger',
      balance: 0,
      startingBalance: 0,
      lockLedgerStart: true
    }
  ])
  const [activeLedgerId, setActiveLedgerId] = useState('default')
  const [checkHistory, setCheckHistory] = useState([])
  const [showLedger, setShowLedger] = useState(false)
  const [editingBalance, setEditingBalance] = useState(false)
  const [tempBalance, setTempBalance] = useState('')
  const [showLedgerManager, setShowLedgerManager] = useState(false)
  const [editingLedgerName, setEditingLedgerName] = useState(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [selectedLedgersForExport, setSelectedLedgersForExport] = useState([])
  const [exportDateRange, setExportDateRange] = useState('all')
  const [exportStartDate, setExportStartDate] = useState('')
  const [exportEndDate, setExportEndDate] = useState('')
  const [exportFormat, setExportFormat] = useState('csv') // 'csv' or 'pdf'
  const [exportGlCodeFilter, setExportGlCodeFilter] = useState('') // '' means all GL codes
  const [showHistory, setShowHistory] = useState(false)
  const [historyViewMode, setHistoryViewMode] = useState('all') // 'all' or 'current'
  const [historySearchTerm, setHistorySearchTerm] = useState('')
  const [historySortOrder, setHistorySortOrder] = useState('date-desc')
  const [historyGlCodeFilter, setHistoryGlCodeFilter] = useState('all') // 'all' or specific GL Code
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null)

  // GL Codes state
  const [glCodes, setGlCodes] = useState([]) // Array of { code, description }

  // Compiled GL Codes (Saved + History)
  const compiledGlCodes = useMemo(() => {
    const map = new Map()
    // 1. Add saved codes
    glCodes.forEach(item => map.set(item.code, item))
    // 2. Add from history
    checkHistory.forEach(c => {
      if (c.glCode && !map.has(c.glCode)) {
        map.set(c.glCode, {
          code: c.glCode,
          description: c.glDescription || c.description || c.desc || ''
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code))
  }, [glCodes, checkHistory])

  // Import queue
  const [importQueue, setImportQueue] = useState([])
  const [showImportQueue, setShowImportQueue] = useState(false)
  const [selectedQueueItems, setSelectedQueueItems] = useState([]) // Track selected items (up to 3 in three-up mode)

  // Batch print & record
  const [isBatchPrinting, setIsBatchPrinting] = useState(false)
  const [batchPrintProgress, setBatchPrintProgress] = useState({ current: 0, total: 0 })
  const [batchPrintCancelled, setBatchPrintCancelled] = useState(false)

  // Column mapping modal
  const [showColumnMapping, setShowColumnMapping] = useState(false)
  const [fileHeaders, setFileHeaders] = useState([])
  const [columnMapping, setColumnMapping] = useState({
    date: '',
    payee: '',
    amount: '',
    memo: '',
    external_memo: '',
    internal_memo: '',
    ledger: '',
    glCode: '',
    glDescription: '',
    address: ''
  })
  const [rawFileData, setRawFileData] = useState(null)
  const [fileExtension, setFileExtension] = useState('')
  const [previewRow, setPreviewRow] = useState(null)

  // Stub friendly labels
  const [showStub1Labels, setShowStub1Labels] = useState(false)
  const [showStub2Labels, setShowStub2Labels] = useState(false)

  // Password protection for backups
  const [backupPassword, setBackupPassword] = useState('')
  const [showBackupPasswordModal, setShowBackupPasswordModal] = useState(false)
  const [restorePassword, setRestorePassword] = useState('')
  const [showRestorePasswordModal, setShowRestorePasswordModal] = useState(false)
  const [pendingRestorePath, setPendingRestorePath] = useState(null)
  const [restoreError, setRestoreError] = useState(null)

  // Admin PIN modal
  const [showPinModal, setShowPinModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')

  // Change PIN modal
  const [showChangePinModal, setShowChangePinModal] = useState(false)
  const [currentPinInput, setCurrentPinInput] = useState('')
  const [newPinInput, setNewPinInput] = useState('')
  const [confirmPinInput, setConfirmPinInput] = useState('')
  const [changePinError, setChangePinError] = useState('')

  // Generic confirm modal
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: null })


  // Toast notification state
  const [toast, setToast] = useState(null)

  // Print failure confirmation modal state (for pausing batch on error)
  const [showPrintFailureModal, setShowPrintFailureModal] = useState(false)
  const [printFailureInfo, setPrintFailureInfo] = useState({ payee: '', error: '' })
  const printFailureResolveRef = useRef(null)

  // Batch completion modal state
  const [showBatchCompleteModal, setShowBatchCompleteModal] = useState(false)
  const [batchCompleteData, setBatchCompleteData] = useState({ processed: 0, total: 0, cancelled: false, failed: 0 })


  // Batch print confirmation modal state
  const [showBatchPrintConfirm, setShowBatchPrintConfirm] = useState(false)
  const [availablePrinters, setAvailablePrinters] = useState([])

  // Backup restore modal state
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [availableBackups, setAvailableBackups] = useState([])
  const [selectedBackup, setSelectedBackup] = useState(null)

  // Manual backup modal state
  const [showManualBackupModal, setShowManualBackupModal] = useState(false)
  const [backupFilename, setBackupFilename] = useState('')
  const [backupLocation, setBackupLocation] = useState('downloads')
  const [batchAutoNumber, setBatchAutoNumber] = useState(true)
  const [batchStartNumber, setBatchStartNumber] = useState('1001')

  const [data, setData] = useState({
    date: (() => {
      const d = new Date()
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })(),
    payee: '',
    amount: '',
    amountWords: '',
    memo: '',
    external_memo: '',
    internal_memo: '',
    line_items: [],
    line_items_text: '',
    ledger_snapshot: null,
    checkNumber: '', // For optional check numbering
    glCode: '',
    glDescription: '',
    address: '' // For window envelope - auto-populated with payee name
  })

  // Three-up sheet editor state
  const [sheetData, setSheetData] = useState({
    top: {
      date: (() => {
        const d = new Date()
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      })(),
      payee: '',
      amount: '',
      amountWords: '',
      memo: '',
      external_memo: '',
      internal_memo: '',
      line_items: [],
      line_items_text: '',
      ledger_snapshot: null,
      checkNumber: ''
    },
    middle: {
      date: (() => {
        const d = new Date()
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      })(),
      payee: '',
      amount: '',
      amountWords: '',
      memo: '',
      external_memo: '',
      internal_memo: '',
      line_items: [],
      line_items_text: '',
      ledger_snapshot: null,
      checkNumber: '',
      glCode: '',
      glDescription: ''
    },
    bottom: {
      date: (() => {
        const d = new Date()
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      })(),
      payee: '',
      amount: '',
      amountWords: '',
      memo: '',
      external_memo: '',
      internal_memo: '',
      line_items: [],
      line_items_text: '',
      ledger_snapshot: null,
      checkNumber: '',
      glCode: '',
      glDescription: ''
    }
  })

  // Helper for local date string


  const [activeSlot, setActiveSlot] = useState('top') // 'top' | 'middle' | 'bottom'
  const [autoIncrementCheckNumbers, setAutoIncrementCheckNumbers] = useState(false)

  // Deposit/Adjustment modal state
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositData, setDepositData] = useState({
    date: getLocalDateString(),
    description: '',
    amount: ''
  })

  // Check Builder mode state
  const [checkMode, setCheckMode] = useState('simple') // 'simple' or 'itemized'
  const [lineItems, setLineItems] = useState([])
  const [nextLineItemId, setNextLineItemId] = useState(1)

  // ===== DRAFT PERSISTENCE =====
  // Form data (data/sheetData) is automatically persisted to disk:
  // - On startup: settingsGet() restores all data including form drafts (lines below)
  // - On change: Debounced settingsSet() saves data within 250ms (see useEffect below)
  // This ensures that if the app closes, drafts are preserved and restored on reopen.

  // Load settings from disk on launch
  useEffect(() => {
    let cancelled = false
      ; (async () => {
        const persisted = await window.cs2.settingsGet()
        if (cancelled) return

        if (persisted?.model) setModel(normalizeModel(persisted.model))
        if (persisted?.data) {
          // Restore data but RESET the date to today (Local Time)
          const { date, ...rest } = persisted.data
          const d = new Date()
          const year = d.getFullYear()
          const month = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          const today = `${year}-${month}-${day}`

          console.log('Restoring data (FORCE RESET). Date was:', date, 'Now:', today)
          setData((prev) => ({ ...prev, ...rest, date: today }))
        }
        if (persisted?.sheetData) {
          // Restore sheet data but RESET dates to today (Local Time)
          const newSheetData = { ...persisted.sheetData }

          const d = new Date()
          const year = d.getFullYear()
          const month = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          const today = `${year}-${month}-${day}`

          Object.keys(newSheetData).forEach(slot => {
            if (newSheetData[slot]) {
              newSheetData[slot] = { ...newSheetData[slot], date: today }
            }
          })
          setSheetData(newSheetData)
        }
        if (persisted?.activeSlot) setActiveSlot(persisted.activeSlot)
        if (persisted?.autoIncrementCheckNumbers != null) setAutoIncrementCheckNumbers(persisted.autoIncrementCheckNumbers)
        if (persisted?.editMode != null) setEditMode(!!persisted.editMode)
        if (persisted?.profiles?.length) {
          // Migration: Ensure all profiles have the new address fields
          const migratedProfiles = persisted.profiles.map(p => {
            // Merge defaults to get 'address' on check face
            const fields = { ...DEFAULT_FIELDS, ...p.fields }

            // Check Layout dimensions for proper placement
            const checkHeight = p.layout?.checkHeightIn || 3.0
            const stub1Height = p.layout?.stub1HeightIn || 3.5

            // Ensure Stub 1 Address exists if enabled
            if (p.layout?.stub1Enabled && !fields.stub1_address) {
              fields.stub1_address = { x: 2.0, y: checkHeight + 0.55, w: 3.5, h: 0.60, fontIn: 0.18, label: 'Address' }
            }

            // Ensure Stub 2 Address exists if enabled
            if (p.layout?.stub2Enabled && !fields.stub2_address) {
              const s1h = p.layout.stub1Enabled ? stub1Height : 0
              fields.stub2_address = { x: 2.0, y: checkHeight + s1h + 0.55, w: 3.5, h: 0.60, fontIn: 0.18, label: 'Address' }
            }

            return { ...p, fields }
          })
          setProfiles(migratedProfiles)
        }
        if (persisted?.activeProfileId) setActiveProfileId(persisted.activeProfileId)

        // Migrate old single-ledger system to multi-ledger
        if (persisted?.ledgers?.length) {
          // Ensure all ledgers have the new hybrid ledger fields
          const migratedLedgers = persisted.ledgers.map(ledger => ({
            ...ledger,
            startingBalance: ledger.startingBalance ?? 0,
            lockLedgerStart: ledger.lockLedgerStart ?? true
          }))
          setLedgers(migratedLedgers)
          if (persisted?.activeLedgerId) setActiveLedgerId(persisted.activeLedgerId)
        } else if (persisted?.ledgerBalance != null) {
          // Migration: old system had a single ledgerBalance, convert to new system
          setLedgers([{
            id: 'default',
            name: 'Primary Ledger',
            balance: persisted.ledgerBalance,
            startingBalance: 0,
            lockLedgerStart: true
          }])
          setActiveLedgerId('default')
        }

        if (persisted?.checkHistory) setCheckHistory(persisted.checkHistory)
        if (persisted?.glCodes) setGlCodes(persisted.glCodes)
        if (persisted?.preferences) {
          // Always force admin to be locked on startup for security
          setPreferences({ ...DEFAULT_PREFERENCES, ...persisted.preferences, adminLocked: true })
        }
        if (persisted?.importQueue && persisted.importQueue.length > 0) {
          setImportQueue(persisted.importQueue)
          // Automatically show the import queue modal if there are items
          setShowImportQueue(true)
        }
      })()
    return () => { cancelled = true }
  }, [])

  // ===== DRAFT PERSISTENCE SAVER =====
  usePersistenceSaver({
    model, data, sheetData, activeSlot, autoIncrementCheckNumbers,
    editMode, profiles, activeProfileId, ledgers, activeLedgerId,
    checkHistory, glCodes, preferences, importQueue
  })

  // Force exit Edit Layout mode when Admin is locked
  useEffect(() => {
    if (preferences.adminLocked && editMode) {
      setEditMode(false)
    }
  }, [preferences.adminLocked, editMode])

  // Handle pending actions after GL Code save
  // Dependency on glCodes ensures we run after the update

  // ===== HELPER FUNCTIONS FOR THREE-UP MODE =====

  // Get default empty slot data
  const getEmptySlotData = () => ({
    date: getLocalDateString(),
    payee: '',
    amount: '',
    amountWords: '',
    memo: '',
    external_memo: '',
    internal_memo: '',
    line_items: [],
    line_items_text: '',
    ledger_snapshot: null,
    checkNumber: '',
    glCode: '',
    glDescription: ''
  })

  // Check if a slot is empty (no meaningful data)
  const isSlotEmpty = (slotData) => {
    if (!slotData) return true
    return !slotData.payee?.trim() &&
      !slotData.amount?.trim() &&
      !slotData.memo?.trim() &&
      !slotData.external_memo?.trim() &&
      !slotData.internal_memo?.trim() &&
      !slotData.line_items_text?.trim()
  }

  // Get the current data based on active mode
  const getCurrentCheckData = () => {
    if (activeProfile?.layoutMode === 'three_up') {
      return sheetData[activeSlot]
    }
    return data
  }

  // Update current check data based on active mode
  const updateCurrentCheckData = (updates) => {
    // Note: This function will be called after activeProfile is defined,
    // so it's safe to use activeProfile here
    const profile = profiles.find(p => p.id === activeProfileId) || profiles[0]
    if (profile?.layoutMode === 'three_up') {
      setSheetData(prev => {
        const newData = {
          ...prev,
          [activeSlot]: { ...prev[activeSlot], ...updates }
        }

        // If check number is being updated and auto-increment is on, update slots below
        if (updates.checkNumber && autoIncrementCheckNumbers) {
          const baseNumber = parseInt(updates.checkNumber)
          if (!isNaN(baseNumber)) {
            const slots = ['top', 'middle', 'bottom']
            const currentIndex = slots.indexOf(activeSlot)

            // Only update slots BELOW the current one
            for (let i = currentIndex + 1; i < slots.length; i++) {
              const slotName = slots[i]
              const incrementedNumber = baseNumber + (i - currentIndex)
              newData[slotName] = {
                ...newData[slotName],
                checkNumber: String(incrementedNumber)
              }
            }
          }
        }

        return newData
      })
    } else {
      setData(prev => ({ ...prev, ...updates }))
    }
  }

  const clearCurrentSlot = () => {
    if (activeProfile?.layoutMode === 'three_up') {
      setSheetData(prev => ({
        ...prev,
        [activeSlot]: getEmptySlotData()
      }))
    } else {
      setData(getEmptySlotData())
    }
  }

  const clearAllSlots = () => {
    if (activeProfile?.layoutMode === 'three_up') {
      showConfirm(
        'Clear All Slots?',
        'This will clear all three slots (Top, Middle, and Bottom). This cannot be undone.',
        () => {
          setSheetData({
            top: getEmptySlotData(),
            middle: getEmptySlotData(),
            bottom: getEmptySlotData()
          })
          setActiveSlot('top')
        }
      )
    } else {
      setData(getEmptySlotData())
    }
  }

  // Parent-to-child data flow: Check details (parent) ALWAYS update stub details (children)
  // This is one-way only - stub edits don't affect parent, but parent edits always overwrite stubs
  const parentFieldsRef = useRef({ date: '', payee: '', address: '', amount: '', memo: '', external_memo: '', internal_memo: '' })

  useEffect(() => {
    const currentParent = {
      date: data.date,
      payee: data.payee,
      address: data.address,
      amount: data.amount,
      memo: data.memo,
      external_memo: data.external_memo,
      internal_memo: data.internal_memo,
      glCode: data.glCode,
      glDescription: data.glDescription
    }

    // Check if any parent field changed
    const parentChanged = Object.keys(currentParent).some(
      key => parentFieldsRef.current[key] !== currentParent[key]
    )

    if (parentChanged) {
      parentFieldsRef.current = currentParent

      // Update stub fields based on parent values
      setData((d) => {
        const updates = {}

        if (model.layout.stub1Enabled) {
          updates.stub1_glcode = currentParent.glCode
          updates.stub1_glDescription = currentParent.glDescription
          updates.stub1_address = currentParent.address // Sync address
        }

        if (model.layout.stub2Enabled) {
          updates.stub2_date = currentParent.date
          updates.stub2_payee = currentParent.payee
          updates.stub2_address = currentParent.address // Sync address
          updates.stub2_amount = currentParent.amount
          updates.stub2_memo = currentParent.internal_memo || currentParent.memo || ''
          updates.stub2_glCode = currentParent.glCode
          updates.stub2_glDescription = currentParent.glDescription
        }

        return Object.keys(updates).length > 0 ? { ...d, ...updates } : d
      })
    }
  }, [data.date, data.payee, data.address, data.amount, data.memo, data.external_memo, data.internal_memo, data.glCode, data.glDescription, model.layout.stub1Enabled, model.layout.stub2Enabled])

  // Load template dataURL when template path changes
  useEffect(() => {
    let cancelled = false
      ; (async () => {
        if (!model.template?.path) {
          if (!cancelled) {
            setTemplateDataUrl(null)
            setTemplateLoadError(null)
            setTemplateMeta(null)
            setTemplateDecodeError(null)
          }
          return
        }

        const res = await readTemplateDataUrl(model.template?.path)
        if (cancelled) return
        setTemplateDataUrl(res?.url || null)
        setTemplateLoadError(res?.error || null)
        setTemplateMeta(res?.url ? { mime: res?.mime, byteLength: res?.byteLength, width: res?.width, height: res?.height } : null)
        setTemplateDecodeError(null)
      })()
    return () => { cancelled = true }
  }, [model.template?.path])

  // Get active font family
  const activeFontFamily = AVAILABLE_FONTS.find(f => f.id === preferences.fontFamily)?.family || AVAILABLE_FONTS[0].family

  // Profile helpers
  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0]

  // Initialize slotFields if not present (backward compatibility)
  useEffect(() => {
    if (!model.slotFields) {
      setModel(m => ({
        ...m,
        slotFields: {
          top: { ...DEFAULT_FIELDS },
          middle: { ...DEFAULT_FIELDS },
          bottom: { ...DEFAULT_FIELDS }
        }
      }))
    }
  }, [model.slotFields])

  // Initialize cut lines if not present (backward compatibility for three-up mode)
  useEffect(() => {
    if (model.layout && (model.layout.cutLine1In === undefined || model.layout.cutLine2In === undefined)) {
      setModel(m => ({
        ...m,
        layout: {
          ...m.layout,
          cutLine1In: m.layout.cutLine1In ?? DEFAULT_LAYOUT.cutLine1In,
          cutLine2In: m.layout.cutLine2In ?? DEFAULT_LAYOUT.cutLine2In
        }
      }))
    }
  }, [model.layout])

  // Migrate profiles to include cut lines (backward compatibility)
  useEffect(() => {
    let needsMigration = false
    const migratedProfiles = profiles.map(profile => {
      if (profile.layout && (profile.layout.cutLine1In === undefined || profile.layout.cutLine2In === undefined)) {
        needsMigration = true
        return {
          ...profile,
          layout: {
            ...profile.layout,
            cutLine1In: profile.layout.cutLine1In ?? DEFAULT_LAYOUT.cutLine1In,
            cutLine2In: profile.layout.cutLine2In ?? DEFAULT_LAYOUT.cutLine2In
          }
        }
      }
      return profile
    })

    if (needsMigration) {
      setProfiles(migratedProfiles)
    }
  }, [profiles])

  // Migrate model to add missing stub fields (checkNumber and line_items for both stubs)
  useEffect(() => {
    if (!model.layout.stub1Enabled && !model.layout.stub2Enabled) return

    const nextFields = { ...model.fields }
    let hasChanges = false

    // Add missing stub1 fields if stub1 is enabled
    if (model.layout.stub1Enabled) {
      const checkY = model.layout.checkHeightIn
      const stub1Y = checkY
      const baseY = stub1Y

      if (!nextFields.stub1_checkNumber) {
        nextFields.stub1_checkNumber = { x: 6.35, y: baseY + 0.25, w: 0.85, h: 0.30, fontIn: 0.18, label: 'Check #' }
        hasChanges = true
      }
      if (!nextFields.stub1_line_items) {
        nextFields.stub1_line_items = { x: 0.55, y: baseY + 1.15, w: model.layout.widthIn - 1.10, h: 1.20, fontIn: 0.16, label: 'Line Items' }
        hasChanges = true
      }
      if (!nextFields.stub1_ledger) {
        nextFields.stub1_ledger = { x: 0.55, y: baseY + 2.45, w: 3.5, h: 0.85, fontIn: 0.16, label: 'Ledger Snapshot' }
        hasChanges = true
      }
      if (!nextFields.stub1_approved) {
        nextFields.stub1_approved = { x: 4.25, y: baseY + 2.45, w: 1.85, h: 0.35, fontIn: 0.16, label: 'Approved By' }
        hasChanges = true
      }
      if (!nextFields.stub1_glcode) {
        nextFields.stub1_glcode = { x: 4.25, y: baseY + 2.95, w: 1.85, h: 0.35, fontIn: 0.16, label: 'GL Code' }
        hasChanges = true
      }
      if (!nextFields.stub1_glDescription) {
        nextFields.stub1_glDescription = { x: 0.55, y: baseY + 2.95, w: 3.6, h: 0.35, fontIn: 0.16, label: 'GL Description' }
        hasChanges = true
      }
    }

    // Add missing stub2 fields if stub2 is enabled
    if (model.layout.stub2Enabled) {
      const checkY = model.layout.checkHeightIn
      const stub2Y = checkY + (model.layout.stub1Enabled ? model.layout.stub1HeightIn : 0)
      const baseY = stub2Y

      if (!nextFields.stub2_checkNumber) {
        nextFields.stub2_checkNumber = { x: 6.35, y: baseY + 0.25, w: 0.85, h: 0.30, fontIn: 0.18, label: 'Check #' }
        hasChanges = true
      }
      if (!nextFields.stub2_line_items) {
        nextFields.stub2_line_items = { x: 6.35, y: baseY + 1.15, w: 1.60, h: 0.85, fontIn: 0.16, label: 'Line Items' }
        hasChanges = true
      }
      if (!nextFields.stub2_glCode) {
        nextFields.stub2_glCode = { x: 6.35, y: baseY + 2.10, w: 0.75, h: 0.35, fontIn: 0.16, label: 'GL Code' }
        hasChanges = true
      }
      if (!nextFields.stub2_glDescription) {
        nextFields.stub2_glDescription = { x: 7.20, y: baseY + 2.10, w: 1.2, h: 0.35, fontIn: 0.16, label: 'GL Description' }
        hasChanges = true
      }
    }

    if (hasChanges) {
      setModel(m => ({ ...m, fields: nextFields }))
    }
  }, [model.layout.stub1Enabled, model.layout.stub2Enabled, model.layout.widthIn])

  // Migration effect: handle switching between standard and three_up modes
  useEffect(() => {
    if (activeProfile?.layoutMode === 'three_up') {
      // Entering three_up mode - check if sheetData is initialized
      const hasInitializedSheet = sheetData.top.payee || sheetData.top.amount ||
        sheetData.middle.payee || sheetData.middle.amount ||
        sheetData.bottom.payee || sheetData.bottom.amount

      if (!hasInitializedSheet) {
        // First time entering three_up mode - initialize from current data if it has data
        if (data.payee || data.amount) {
          setSheetData({
            top: { ...data },
            middle: getEmptySlotData(),
            bottom: getEmptySlotData()
          })
          setActiveSlot('top')
        }
      }
    } else if (activeProfile?.layoutMode === 'standard') {
      // Exiting three_up mode - preserve current slot data back to single data
      const currentSlot = sheetData[activeSlot]
      if (currentSlot && !isSlotEmpty(currentSlot)) {
        setData(currentSlot)
      }
    }
  }, [activeProfile?.layoutMode])

  // Auto-increment check numbers
  useAutoIncrement(autoIncrementCheckNumbers, activeProfile, activeSlot, sheetData, setSheetData)

  // Keyboard shortcuts (Alt+1/2/3)
  useKeyboardShortcuts(activeProfile, setActiveSlot)

  // Auto-generate amount words
  useEffect(() => {
    if (activeProfile?.layoutMode === 'three_up') {
      const currentSlot = sheetData[activeSlot]
      if (!currentSlot?.amount) {
        setSheetData(prev => ({
          ...prev,
          [activeSlot]: { ...prev[activeSlot], amountWords: '' }
        }))
        return
      }
      setSheetData(prev => ({
        ...prev,
        [activeSlot]: { ...prev[activeSlot], amountWords: numberToWords(currentSlot.amount) }
      }))
    } else {
      if (!data.amount) {
        setData((p) => ({ ...p, amountWords: '' }))
        return
      }
      setData((p) => ({ ...p, amountWords: numberToWords(p.amount) }))
    }
  }, [activeProfile?.layoutMode === 'three_up' ? sheetData[activeSlot]?.amount : data.amount, activeSlot, activeProfile?.layoutMode])

  // Auto-load queue items into slots based on layout mode
  // Load selected queue items into slots
  useEffect(() => {
    if (activeProfile?.layoutMode === 'three_up') {
      // Three-up mode: Load selected items into top/middle/bottom slots (overwrite existing data)
      const slots = ['top', 'middle', 'bottom']
      const newSheetData = {
        top: getEmptySlotData(),
        middle: getEmptySlotData(),
        bottom: getEmptySlotData()
      }

      // Fill slots with selected items (in order)
      for (let i = 0; i < selectedQueueItems.length; i++) {
        const item = selectedQueueItems[i]
        const slot = slots[i]

        // Normalize date to YYYY-MM-DD format
        let normalizedDate = item.date || new Date().toISOString().slice(0, 10)
        if (item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
          // Date is not in YYYY-MM-DD format, convert it
          const parsedDate = new Date(item.date)
          if (!isNaN(parsedDate.getTime())) {
            normalizedDate = parsedDate.toISOString().slice(0, 10)
          }
        }

        newSheetData[slot] = {
          date: normalizedDate,
          payee: item.payee || '',
          address: item.address || '',
          amount: item.amount || '',
          amountWords: item.amount ? numberToWords(item.amount) : '',
          memo: item.memo || '',
          external_memo: item.external_memo || '',
          internal_memo: item.internal_memo || '',
          line_items: item.line_items || [],
          line_items_text: item.line_items_text || '',
          ledger_snapshot: null,
          checkNumber: item.checkNumber || '',
          glCode: item.glCode || '',
          glDescription: item.glDescription || ''
        }
      }
      setSheetData(newSheetData)
    } else if (selectedQueueItems.length === 0) {
      // Standard mode: clear data when no items selected
      setData(getEmptySlotData())
    }
    // Standard mode: data is already loaded in loadFromQueue function when item is selected
  }, [selectedQueueItems, activeProfile?.layoutMode])

  // Detect unsaved changes by comparing current model with saved profile
  useEffect(() => {
    if (!activeProfile) {
      setHasUnsavedChanges(false)
      return
    }

    // Deep comparison of layout, fields, template, and placement
    const hasChanges =
      JSON.stringify(model.layout) !== JSON.stringify(activeProfile.layout) ||
      JSON.stringify(model.fields) !== JSON.stringify(activeProfile.fields) ||
      JSON.stringify(model.template) !== JSON.stringify(activeProfile.template) ||
      JSON.stringify(model.placement) !== JSON.stringify(activeProfile.placement)

    setHasUnsavedChanges(hasChanges)
  }, [model.layout, model.fields, model.template, model.placement, activeProfile])

  // Sync line items with check data in itemized mode
  useEffect(() => {
    if (checkMode === 'itemized') {
      // Calculate total amount from line items
      const total = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)

      // Generate line items text (for the stub)
      const lineItemsText = lineItems
        .filter(item => item.description || item.amount)
        .map(item => `${item.description} - $${parseFloat(item.amount || 0).toFixed(2)}`)
        .join('\n')

      // Update current check data with calculated values
      updateCurrentCheckData({
        amount: total.toFixed(2),
        line_items_text: lineItemsText,
        line_items: lineItems.map(item => ({
          description: item.description,
          amount: parseFloat(item.amount || 0)
        }))
      })
    }
  }, [checkMode, lineItems])

  const createNewProfile = () => {
    const newProfile = {
      id: generateId(),
      name: `Check Profile ${profiles.length + 1}`,
      layout: { ...DEFAULT_LAYOUT },
      fields: JSON.parse(JSON.stringify(DEFAULT_FIELDS)),
      template: { path: null, opacity: 0.9, fit: 'cover' },
      placement: { offsetXIn: 0, offsetYIn: 0 },
      dateFormat: {
        dateSlot1: 'MM',
        dateSlot2: 'DD',
        dateSlot3: 'YYYY',
        dateSeparator: '/',
        useLongDate: false
      }
    }
    setProfiles([...profiles, newProfile])
    setActiveProfileId(newProfile.id)

    // Load the clean profile immediately
    setModel(m => ({
      ...m,
      layout: { ...DEFAULT_LAYOUT },
      fields: JSON.parse(JSON.stringify(DEFAULT_FIELDS)),
      template: { path: null, opacity: 0.9, fit: 'cover' },
      placement: { offsetXIn: 0, offsetYIn: 0 }
    }))

    // Reset date format to defaults
    setPreferences(p => ({
      ...p,
      dateSlot1: 'MM',
      dateSlot2: 'DD',
      dateSlot3: 'YYYY',
      dateSeparator: '/',
      useLongDate: false
    }))

    // Reset dirty state for new profile
    setHasUnsavedChanges(false)
  }

  const saveCurrentProfile = () => {
    setProfiles(profiles.map(p =>
      p.id === activeProfileId
        ? {
          ...p,
          layout: { ...model.layout },
          fields: JSON.parse(JSON.stringify(model.fields)),
          template: { ...model.template },
          placement: { ...model.placement },
          dateFormat: {
            dateSlot1: preferences.dateSlot1,
            dateSlot2: preferences.dateSlot2,
            dateSlot3: preferences.dateSlot3,
            dateSeparator: preferences.dateSeparator,
            useLongDate: preferences.useLongDate
          }
        }
        : p
    ))

    // Reset dirty state and show save feedback
    setHasUnsavedChanges(false)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  const loadProfile = (profileId) => {
    const profile = profiles.find(p => p.id === profileId)
    if (!profile) return
    setActiveProfileId(profileId)
    setModel(m => ({
      ...m,
      layout: { ...profile.layout },
      fields: JSON.parse(JSON.stringify(profile.fields)),
      template: { ...profile.template },
      placement: { ...profile.placement }
    }))

    // Restore date format settings if they exist in the profile
    if (profile.dateFormat) {
      setPreferences(p => ({
        ...p,
        dateSlot1: profile.dateFormat.dateSlot1,
        dateSlot2: profile.dateFormat.dateSlot2,
        dateSlot3: profile.dateFormat.dateSlot3,
        dateSeparator: profile.dateFormat.dateSeparator,
        useLongDate: profile.dateFormat.useLongDate
      }))
    }
  }

  const deleteProfile = (profileId) => {
    if (profiles.length <= 1) return

    showConfirm('Delete Profile?', 'Are you sure you want to delete this profile?', () => {
      const newProfiles = profiles.filter(p => p.id !== profileId)

      // If deleting the active profile, switch to another one first
      if (activeProfileId === profileId) {
        if (newProfiles.length > 0) {
          // Select the first remaining profile
          loadProfile(newProfiles[0].id)
        } else {
          // Create and select a new default profile if none remain
          const defaultProfile = createNewProfile()
          setProfiles([defaultProfile])
          loadProfile(defaultProfile.id)
          return // Early return since we already set the profiles
        }
      }

      setProfiles(newProfiles)
    })
  }

  const renameProfile = (profileId, newName) => {
    setProfiles(profiles.map(p =>
      p.id === profileId ? { ...p, name: newName } : p
    ))
    setEditingProfileName(null)
  }

  // Ledger management helpers
  const activeLedger = ledgers.find(l => l.id === activeLedgerId) || ledgers[0]
  const ledgerBalance = activeLedger?.balance || 0

  // Hybrid Ledger: Calculate balance from startingBalance + deposits - checks
  const calculateHybridBalance = (ledgerId) => {
    const ledger = ledgers.find(l => l.id === ledgerId)
    if (!ledger) return 0

    const startingBalance = ledger.startingBalance || 0
    const transactions = checkHistory.filter(t => t.ledgerId === ledgerId)

    const deposits = transactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    const checks = transactions
      .filter(t => t.type === 'check' || !t.type) // Include legacy entries without type
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    return startingBalance + deposits - checks
  }

  const hybridBalance = calculateHybridBalance(activeLedgerId)

  const createNewLedger = () => {
    // Find the highest ledger number from existing ledgers
    const ledgerNumbers = ledgers
      .map(l => {
        const match = l.name.match(/Ledger (\d+)/)
        return match ? parseInt(match[1], 10) : 0
      })
      .filter(n => !isNaN(n))
    const maxNumber = ledgerNumbers.length > 0 ? Math.max(...ledgerNumbers) : 0

    const newLedger = {
      id: generateId(),
      name: `Ledger ${maxNumber + 1}`,
      balance: 0,
      startingBalance: 0,
      lockLedgerStart: true
    }
    setLedgers([...ledgers, newLedger])
    setActiveLedgerId(newLedger.id)
  }

  const deleteLedger = (ledgerId) => {
    if (ledgers.length <= 1) {
      alert('You must have at least one ledger')
      return
    }
    const ledger = ledgers.find(l => l.id === ledgerId)
    const checksInLedger = checkHistory.filter(c => c.ledgerId === ledgerId).length

    if (checksInLedger > 0) {
      showConfirm(
        'Delete Ledger with Checks?',
        `This ledger has ${checksInLedger} checks. Deleting it will also delete all associated checks. Continue?`,
        () => {
          // Remove checks associated with this ledger
          setCheckHistory(checkHistory.filter(c => c.ledgerId !== ledgerId))
          const newLedgers = ledgers.filter(l => l.id !== ledgerId)
          setLedgers(newLedgers)
          if (activeLedgerId === ledgerId) {
            setActiveLedgerId(newLedgers[0].id)
          }
        }
      )
    } else {
      const newLedgers = ledgers.filter(l => l.id !== ledgerId)
      setLedgers(newLedgers)
      if (activeLedgerId === ledgerId) {
        setActiveLedgerId(newLedgers[0].id)
      }
    }
  }

  const renameLedger = (ledgerId, newName, shouldClose = true) => {
    setLedgers(ledgers.map(l =>
      l.id === ledgerId ? { ...l, name: newName } : l
    ))
    if (shouldClose) setEditingLedgerName(null)
  }

  const updateLedgerBalance = (ledgerId, newBalance) => {
    setLedgers(prev => prev.map(l =>
      l.id === ledgerId ? { ...l, balance: newBalance } : l
    ))
  }

  // Quick Fill: populate form from a history entry (for "Copy Previous" feature)
  const fillFromHistoryEntry = (entry) => {
    if (!entry || entry.type === 'deposit') return // Don't fill from deposits

    const today = new Date().toISOString().slice(0, 10)

    updateCurrentCheckData({
      date: today, // Use today's date, not historical
      payee: entry.payee || '',
      amount: entry.amount ? String(entry.amount) : '',
      memo: entry.memo || '',
      external_memo: entry.external_memo || '',
      internal_memo: entry.internal_memo || '',
      line_items: entry.line_items || [],
      line_items_text: entry.line_items_text || '',
      checkNumber: '' // Clear - user assigns new number
    })
  }

  // Ledger helpers
  const recordCheck = (checkData = data) => {
    const amount = sanitizeCurrencyInput(checkData.amount)
    if (amount <= 0) return false
    if (!checkData.payee?.trim()) return false

    // Use hybridBalance for accurate balance tracking
    const previousBalance = hybridBalance
    const newBalance = hybridBalance - amount

    const checkEntry = {
      id: generateId(),
      type: 'check', // Transaction type
      date: checkData.date || getLocalDateString(),
      payee: checkData.payee,
      address: checkData.address || '',
      amount: amount,
      memo: checkData.memo || '',
      external_memo: checkData.external_memo || '',
      internal_memo: checkData.internal_memo || '',
      line_items: checkData.line_items || [],
      line_items_text: checkData.line_items_text || '',
      ledgerId: activeLedgerId,
      profileId: activeProfileId,
      ledger_snapshot: {
        previous_balance: previousBalance,
        transaction_amount: amount,
        new_balance: newBalance
      },
      timestamp: Date.now(),
      balanceAfter: newBalance,
      checkNumber: checkData.checkNumber || '',
      glCode: checkData.glCode || '',
      glDescription: checkData.glDescription || ''
    }

    setCheckHistory(prev => [checkEntry, ...prev])
    // Note: We don't update ledger.balance anymore - hybrid balance is calculated from transactions

    // Learning Mode: Update GL Codes list
    if (checkEntry.glCode) {
      const code = checkEntry.glCode
      const desc = checkEntry.glDescription || ''
      const existing = glCodes.find(g => g.code === code)

      // Update if new code OR if description changed (and new description is not empty)
      if (!existing || (desc && desc !== existing.description)) {
        const newGlEntry = { code, description: desc }
        setGlCodes(prev => {
          const existingIdx = prev.findIndex(g => g.code === code)
          if (existingIdx >= 0) {
            const copy = [...prev]
            copy[existingIdx] = newGlEntry
            return copy
          }
          return [...prev, newGlEntry].sort((a, b) => a.code.localeCompare(b.code))
        })
      }
    }

    // Trigger auto-backup (debounced, silent)
    window.cs2.backupTriggerAuto().catch(err => {
      console.error('Auto-backup trigger failed:', err)
    })

    return true
  }

  const recordDeposit = (depositInfo = depositData) => {
    const amount = sanitizeCurrencyInput(depositInfo.amount)
    if (amount <= 0) return false
    if (!depositInfo.description?.trim()) return false

    // Use hybridBalance for accurate balance tracking
    const previousBalance = hybridBalance
    const newBalance = hybridBalance + amount

    const depositEntry = {
      id: generateId(),
      type: 'deposit', // Transaction type
      date: depositInfo.date || getLocalDateString(),
      payee: depositInfo.description, // Using payee field for deposit description
      amount: amount,
      memo: depositInfo.description || '',
      external_memo: '',
      internal_memo: '',
      line_items: [],
      line_items_text: '',
      ledgerId: activeLedgerId,
      profileId: activeProfileId,
      ledger_snapshot: {
        previous_balance: previousBalance,
        transaction_amount: amount,
        new_balance: newBalance
      },
      timestamp: Date.now(),
      balanceAfter: newBalance
    }

    setCheckHistory(prev => [depositEntry, ...prev])
    // Note: We don't update ledger.balance anymore - hybrid balance is calculated from transactions

    // Trigger auto-backup (debounced, silent)
    window.cs2.backupTriggerAuto().catch(err => {
      console.error('Auto-backup trigger failed:', err)
    })

    return true
  }

  const deleteHistoryEntry = (entryId) => {
    const entry = checkHistory.find(e => e.id === entryId)
    if (!entry) return

    // Show custom modal instead of native confirm to avoid focus issues
    setDeleteTarget(entry)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteHistoryEntry = () => {
    if (!deleteTarget) return

    // Use functional updates to ensure we're working with latest state
    setCheckHistory(prev => prev.filter(e => e.id !== deleteTarget.id))

    // Note: We don't update ledger.balance anymore - hybrid balance is calculated from transactions
    // Deleting a transaction will automatically update the hybrid balance calculation

    // Close modal and clear target
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
  }

  const cancelDeleteHistoryEntry = () => {
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
  }

  // Generic confirm helper to avoid focus-stealing native confirm()
  const showConfirm = (title, message, onConfirm) => {
    setConfirmConfig({ title, message, onConfirm })
    setShowConfirmModal(true)
  }

  const handleConfirmModalConfirm = () => {
    if (confirmConfig.onConfirm) {
      confirmConfig.onConfirm()
    }
    setShowConfirmModal(false)
    setConfirmConfig({ title: '', message: '', onConfirm: null })
  }

  const handleConfirmModalCancel = () => {
    setShowConfirmModal(false)
    setConfirmConfig({ title: '', message: '', onConfirm: null })
  }

  const updateBalance = () => {
    // Validate that we have a valid active ledger
    if (!activeLedgerId || !ledgers.find(l => l.id === activeLedgerId)) {
      setEditingBalance(false)
      return
    }

    const newBal = parseFloat(tempBalance) || 0
    // Update startingBalance instead of balance for hybrid ledger
    setLedgers(ledgers.map(l =>
      l.id === activeLedgerId ? { ...l, startingBalance: newBal } : l
    ))
    setEditingBalance(false)
    setTempBalance('')
  }

  // Admin PIN authentication
  const handleUnlockRequest = () => {
    setPinInput('')
    setPinError('')
    setShowPinModal(true)
  }

  const handlePinSubmit = () => {
    if (pinInput === preferences.adminPin) {
      setPreferences(p => ({ ...p, adminLocked: false }))
      setShowPinModal(false)
      setPinInput('')
      setPinError('')
    } else {
      setPinError('Incorrect PIN')
      setPinInput('')
    }
  }

  const handleLock = () => {
    setPreferences(p => ({ ...p, adminLocked: true }))
  }

  const handleChangePinRequest = () => {
    setCurrentPinInput('')
    setNewPinInput('')
    setConfirmPinInput('')
    setChangePinError('')
    setShowChangePinModal(true)
  }

  const handleChangePinSubmit = () => {
    // Verify current PIN
    if (currentPinInput !== preferences.adminPin) {
      setChangePinError('Current PIN is incorrect')
      return
    }

    // Validate new PIN format
    if (!/^\d{4}$/.test(newPinInput)) {
      setChangePinError('New PIN must be exactly 4 digits')
      return
    }

    // Verify PINs match
    if (newPinInput !== confirmPinInput) {
      setChangePinError('New PINs do not match')
      return
    }

    // Update PIN
    setPreferences(p => ({ ...p, adminPin: newPinInput }))
    setShowChangePinModal(false)
    showToast('PIN updated successfully', 'success')
  }

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Promise-based print failure confirmation (returns true to continue, false to abort)
  const confirmPrintFailure = (payee, error) => {
    return new Promise((resolve) => {
      setPrintFailureInfo({ payee, error: error || 'Unknown error' })
      printFailureResolveRef.current = resolve
      setShowPrintFailureModal(true)
    })
  }

  const handlePrintFailureContinue = () => {
    setShowPrintFailureModal(false)
    if (printFailureResolveRef.current) {
      printFailureResolveRef.current('continue')
      printFailureResolveRef.current = null
    }
  }

  const handlePrintFailureAbort = () => {
    setShowPrintFailureModal(false)
    if (printFailureResolveRef.current) {
      printFailureResolveRef.current('abort')
      printFailureResolveRef.current = null
    }
  }


  // Helper: Format backup with friendly name and grouping
  const formatBackup = (backup) => {
    const date = new Date(backup.created)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    let friendlyName = ''
    let group = ''

    if (diffMinutes < 1) {
      friendlyName = 'Just now'
      group = 'Recent (Last 3 Days)'
    } else if (diffMinutes < 60) {
      friendlyName = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
      group = 'Recent (Last 3 Days)'
    } else if (diffHours < 24) {
      friendlyName = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
      group = 'Recent (Last 3 Days)'
    } else if (diffDays === 1) {
      friendlyName = `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      group = 'Recent (Last 3 Days)'
    } else if (diffDays <= 3) {
      friendlyName = `${diffDays} days ago at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      group = 'Recent (Last 3 Days)'
    } else if (diffDays <= 365) {
      friendlyName = date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      group = 'This Year'
    } else if (diffDays / 365 <= 3) {
      friendlyName = date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
      group = `${date.getFullYear()}`
    } else {
      const quarter = Math.floor(date.getMonth() / 3) + 1
      friendlyName = date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
      group = `${date.getFullYear()} Q${quarter}`
    }

    return {
      ...backup,
      friendlyName,
      group,
      fullDate: date.toLocaleString()
    }
  }

  // Helper: Group backups by time period
  const groupBackups = (backups) => {
    const formatted = backups.map(formatBackup)
    const groups = {}

    formatted.forEach(backup => {
      if (!groups[backup.group]) {
        groups[backup.group] = []
      }
      groups[backup.group].push(backup)
    })

    return groups
  }

  const handleBackupData = async () => {
    // Set default filename
    const today = new Date().toISOString().slice(0, 10)
    setBackupFilename(`CheckSpree_Backup_${today}`)
    setShowManualBackupModal(true)
  }

  const confirmManualBackup = async () => {
    setShowManualBackupModal(false)
    setBackupPassword('')
    setShowBackupPasswordModal(true)
  }

  const handleBackupPasswordSubmit = async () => {
    setShowBackupPasswordModal(false)
    try {
      const result = await window.cs2.backupSave(backupPassword)
      if (result.success) {
        showToast(`Backup saved successfully!${result.isEncrypted ? ' (Encrypted)' : ''}`, 'success')
      } else {
        showToast('Backup cancelled or failed', 'error')
      }
    } catch (e) {
      showToast(`Error creating backup: ${e.message}`, 'error')
    }
    setBackupPassword('')
  }

  const handleRestoreResult = (result, path = null) => {
    if (result.success) {
      showToast('Backup restored successfully. Reloading application...', 'success')
      setShowBackupModal(false)
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } else if (result.error === 'PASSWORD_REQUIRED') {
      setPendingRestorePath(result.path || path)
      setRestoreError(null)
      setRestorePassword('')
      setShowRestorePasswordModal(true)
    } else if (result.error === 'INVALID_PASSWORD') {
      setRestoreError('Invalid password')
      setShowRestorePasswordModal(true) // Re-show modal
    } else if (result.error) {
      showToast(`Restore failed: ${result.error}`, 'error')
    } else {
      showToast('Restore cancelled', 'info')
    }
  }

  const handleRestorePasswordSubmit = async () => {
    setShowRestorePasswordModal(false)
    try {
      let result
      if (pendingRestorePath) {
        result = await window.cs2.backupRestoreFile(pendingRestorePath, restorePassword)
      } else {
        // Fallback, though pendingRestorePath should always be set for password flow
        result = await window.cs2.backupRestore(restorePassword)
      }
      handleRestoreResult(result, pendingRestorePath)
    } catch (e) {
      showToast(`Error restoring backup: ${e.message}`, 'error')
    }
  }

  const handleRestoreBackup = async () => {
    try {
      // Check if there are any auto-backups available
      const backupsResult = await window.cs2.backupList()

      if (backupsResult.success && backupsResult.backups.length > 0) {
        // Show backup selection modal
        setAvailableBackups(backupsResult.backups)
        setSelectedBackup(backupsResult.backups[0]) // Select most recent by default
        setShowBackupModal(true)
      } else {
        // No auto-backups available, ask user to select a file
        showToast('No auto-backups found. Please select a backup file.', 'info')
        handleRestoreFromFile()
      }
    } catch (e) {
      showToast(`Error checking backups: ${e.message}`, 'error')
    }
  }

  const handleRestoreFromFile = async () => {
    try {
      const result = await window.cs2.backupRestore(null)
      handleRestoreResult(result)
    } catch (e) {
      showToast(`Error restoring backup: ${e.message}`, 'error')
    }
  }

  const confirmRestoreBackup = async (backupPath = null) => {
    // No confirmation dialog - warnings are in the modal itself
    try {
      let result
      if (backupPath) {
        // Restore from specific backup file
        result = await window.cs2.backupRestoreFile(backupPath, null)
      } else {
        // Restore from latest auto-backup
        result = await window.cs2.backupRestoreLatest()
      }
      handleRestoreResult(result, backupPath)
    } catch (e) {
      showToast(`Error restoring backup: ${e.message}`, 'error')
    }
  }

  // Auto-detect column mappings based on header keywords
  const autoDetectMapping = (headers) => {
    const fieldMap = {
      date: ['date', 'check date', 'checkdate', 'dt', 'transaction date'],
      payee: ['payee', 'pay to', 'payto', 'recipient', 'name', 'to', 'vendor'],
      address: ['address', 'payee address', 'recipient address'],
      amount: ['amount', 'amt', 'value', 'check amount', 'sum', 'total', 'cost', 'price'],
      memo: ['memo', 'description', 'desc', 'note', 'notes', 'for', 'purpose'],
      external_memo: ['external memo', 'external_memo', 'public memo', 'public_memo', 'payee memo'],
      internal_memo: ['internal memo', 'internal_memo', 'private memo', 'private_memo', 'bookkeeper memo', 'admin memo'],
      ledger: ['ledger', 'account', 'fund', 'ledger name', 'account name', 'fund name'],
      glCode: ['gl code', 'glcode', 'gl', 'general ledger', 'accounting code', 'account code'],
      glDescription: ['gl description', 'gldescription', 'gl desc', 'account description', 'code description']
    }

    const mapping = {
      date: '',
      payee: '',
      address: '',
      amount: '',
      memo: '',
      external_memo: '',
      internal_memo: '',
      ledger: '',
      glCode: '',
      glDescription: ''
    }

    const normalizedHeaders = headers.map(h => h.trim().toLowerCase())

    // Find best match for each field
    for (const [field, variations] of Object.entries(fieldMap)) {
      const matchIndex = normalizedHeaders.findIndex(h => variations.includes(h))
      if (matchIndex !== -1) {
        mapping[field] = headers[matchIndex] // Use original case header
      }
    }

    return mapping
  }

  // Extract headers from raw file data
  const extractHeaders = (content, ext) => {
    if (ext === '.xlsx' || ext === '.xls') {
      // Parse Excel to get headers
      try {
        const binaryString = atob(content)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const workbook = XLSX.read(bytes, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (jsonData.length > 0) {
          return jsonData[0].map(h => String(h || '').trim()).filter(h => h)
        }
      } catch (error) {
        console.error('Failed to extract Excel headers:', error)
      }
    } else {
      // Parse CSV/TSV headers
      const delimiter = ext === '.tsv' ? '\t' : ','
      const lines = content.trim().split(/\r?\n/)
      if (lines.length > 0) {
        return lines[0].split(delimiter).map(h => h.trim().replace(/['"]/g, ''))
      }
    }
    return []
  }

  // Get preview of first data row
  const getPreviewRow = (content, ext, mapping) => {
    try {
      let firstDataRow = {}

      if (ext === '.xlsx' || ext === '.xls') {
        const binaryString = atob(content)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const workbook = XLSX.read(bytes, { type: 'array', cellDates: true })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' })

        if (rawData.length > 0) {
          const row = rawData[0]
          // Map according to current mapping
          for (const [field, header] of Object.entries(mapping)) {
            if (header && row[header] !== undefined) {
              firstDataRow[field] = row[header]
            }
          }
        }
      } else {
        const delimiter = ext === '.tsv' ? '\t' : ','
        const lines = content.trim().split(/\r?\n/)
        if (lines.length > 1) {
          const headers = lines[0].split(delimiter).map(h => h.trim().replace(/['"]/g, ''))
          const values = []
          const line = lines[1]

          // Simple CSV parsing for preview
          let current = ''
          let inQuotes = false
          for (let j = 0; j < line.length; j++) {
            const char = line[j]
            if (char === '"') {
              inQuotes = !inQuotes
            } else if (char === delimiter && !inQuotes) {
              values.push(current.trim())
              current = ''
            } else {
              current += char
            }
          }
          values.push(current.trim())

          // Map according to current mapping
          for (const [field, header] of Object.entries(mapping)) {
            if (header) {
              const headerIndex = headers.indexOf(header)
              if (headerIndex !== -1 && values[headerIndex] !== undefined) {
                firstDataRow[field] = values[headerIndex]
              }
            }
          }
        }
      }

      return firstDataRow
    } catch (error) {
      console.error('Failed to get preview row:', error)
      return null
    }
  }

  // Import/Export handlers
  const handleImport = async () => {
    const res = await window.cs2.importSelect()
    if (!res?.success) return

    const fileRes = await window.cs2.importRead(res.path)
    if (!fileRes?.success) {
      alert(`Failed to read file: ${fileRes.error}`)
      return
    }

    // Extract headers from file
    const headers = extractHeaders(fileRes.content, fileRes.ext)

    if (headers.length === 0) {
      alert('No headers found in file. Make sure your file has a header row.')
      return
    }

    // Auto-detect column mapping
    const detectedMapping = autoDetectMapping(headers)

    // Store raw file data and show mapping modal
    setRawFileData(fileRes.content)
    setFileExtension(fileRes.ext)
    setFileHeaders(headers)
    setColumnMapping(detectedMapping)
    setPreviewRow(getPreviewRow(fileRes.content, fileRes.ext, detectedMapping))
    setShowColumnMapping(true)
  }

  // Process file with user-confirmed column mapping
  const processImportWithMapping = () => {
    // Validate that at least payee or amount is mapped
    if (!columnMapping.payee && !columnMapping.amount) {
      alert('Please map at least Payee or Amount field to continue.')
      return
    }

    let parsed = []

    // Parse based on file type with custom mapping
    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      parsed = parseExcelWithMapping(rawFileData, columnMapping)
    } else {
      const delimiter = fileExtension === '.tsv' ? '\t' : ','
      parsed = parseCSVWithMapping(rawFileData, delimiter, columnMapping)
    }

    if (parsed.length === 0) {
      alert('No valid check data found in file.')
      return
    }

    // Close mapping modal and show import queue
    setShowColumnMapping(false)
    const enrichedQueue = parsed.map((item, idx) => ({ ...item, id: generateId(), index: idx }))
    setImportQueue(enrichedQueue)
    setShowImportQueue(true)

    // Learn GL Codes from imported data immediately
    const newGlCodes = []
    enrichedQueue.forEach(item => {
      if (item.glCode) {
        const existing = glCodes.find(g => g.code === item.glCode) || newGlCodes.find(g => g.code === item.glCode)
        if (!existing || (item.glDescription && item.glDescription !== existing.description)) {
          newGlCodes.push({ code: item.glCode, description: item.glDescription || '' })
        }
      }
    })
    if (newGlCodes.length > 0) {
      setGlCodes(prev => {
        const updated = [...prev]
        newGlCodes.forEach(newCode => {
          const idx = updated.findIndex(g => g.code === newCode.code)
          if (idx >= 0) {
            updated[idx] = newCode
          } else {
            updated.push(newCode)
          }
        })
        return updated.sort((a, b) => a.code.localeCompare(b.code))
      })
    }

    // Auto-load first item in standard mode
    if (activeProfile?.layoutMode !== 'three_up' && enrichedQueue.length > 0) {
      const firstItem = enrichedQueue[0]
      const normalizedDate = firstItem.date && !/^\d{4}-\d{2}-\d{2}$/.test(firstItem.date)
        ? new Date(firstItem.date).toISOString().slice(0, 10)
        : firstItem.date || new Date().toISOString().slice(0, 10)

      setData({
        date: normalizedDate,
        payee: firstItem.payee || '',
        address: firstItem.address || '',
        amount: firstItem.amount || '',
        amountWords: firstItem.amount ? numberToWords(firstItem.amount) : '',
        memo: firstItem.memo || '',
        external_memo: firstItem.external_memo || '',
        internal_memo: firstItem.internal_memo || '',
        line_items: firstItem.line_items || [],
        line_items_text: firstItem.line_items_text || '',
        ledger_snapshot: null,
        checkNumber: firstItem.checkNumber || '',
        glCode: firstItem.glCode || '',
        glDescription: firstItem.glDescription || ''
      })
      setSelectedQueueItems([firstItem])
    }
  }

  const handleExport = () => {
    if (checkHistory.length === 0) {
      alert('No check history to export')
      return
    }
    // Initialize with all ledgers selected and default date range
    setSelectedLedgersForExport(ledgers.map(l => l.id))
    setExportDateRange('all')
    setExportStartDate('')
    setExportEndDate('')
    setExportFormat('csv') // Initialize format selection
    setExportGlCodeFilter('') // Reset GL filter ('' = all)
    setShowExportDialog(true)
  }

  const executeExport = async () => {
    if (selectedLedgersForExport.length === 0) {
      alert('Please select at least one ledger to export')
      return
    }

    // Get date range for filtering
    const dateRange = getDateRangeForFilter(exportDateRange, exportStartDate, exportEndDate)

    // Filter checks by selected ledgers and date range
    let selectedChecks = checkHistory.filter(c =>
      selectedLedgersForExport.includes(c.ledgerId)
    )

    // Apply date range filter if specified
    if (dateRange.start || dateRange.end) {
      selectedChecks = selectedChecks.filter(check => {
        const checkDate = new Date(check.date + 'T00:00:00')
        if (dateRange.start && checkDate < dateRange.start) return false
        if (dateRange.end && checkDate > dateRange.end) return false
        return true
      })
    }

    // Apply GL Code filter if specified
    if (exportGlCodeFilter) {
      selectedChecks = selectedChecks.filter(check => check.glCode === exportGlCodeFilter)
    }

    if (selectedChecks.length === 0) {
      alert('No checks found matching the selected filters')
      return
    }

    // Calculate totals
    const ledgerTotals = {}
    const profileLedgerTotals = {}

    selectedLedgersForExport.forEach(ledgerId => {
      const ledger = ledgers.find(l => l.id === ledgerId)
      ledgerTotals[ledgerId] = {
        name: ledger?.name || 'Unknown',
        balance: ledger?.balance || 0,
        totalSpent: 0,
        checkCount: 0,
        profileBreakdown: {}
      }
    })

    selectedChecks.forEach(check => {
      const ledgerId = check.ledgerId || 'default'
      const profileId = check.profileId || 'default'

      if (ledgerTotals[ledgerId]) {
        ledgerTotals[ledgerId].totalSpent += check.amount
        ledgerTotals[ledgerId].checkCount++

        if (!ledgerTotals[ledgerId].profileBreakdown[profileId]) {
          const profile = profiles.find(p => p.id === profileId)
          ledgerTotals[ledgerId].profileBreakdown[profileId] = {
            name: profile?.name || 'Unknown Profile',
            totalSpent: 0,
            checkCount: 0
          }
        }
        ledgerTotals[ledgerId].profileBreakdown[profileId].totalSpent += check.amount
        ledgerTotals[ledgerId].profileBreakdown[profileId].checkCount++
      }
    })

    // Calculate grand total
    const grandTotal = {
      totalBalance: selectedLedgersForExport.reduce((sum, id) => {
        const ledger = ledgers.find(l => l.id === id)
        return sum + (ledger?.balance || 0)
      }, 0),
      totalSpent: Object.values(ledgerTotals).reduce((sum, l) => sum + l.totalSpent, 0),
      totalChecks: selectedChecks.length
    }

    // Enrich checks with ledger and profile names
    const enrichedChecks = selectedChecks.map(check => {
      const ledger = ledgers.find(l => l.id === check.ledgerId)
      const profile = profiles.find(p => p.id === check.profileId)
      // Fallback description lookup if not stored in entry
      const glDescription = check.glDescription || (check.glCode ? (glCodes.find(g => g.code === check.glCode)?.description || '') : '')
      return {
        ...check,
        ledgerName: ledger?.name || 'Unknown',
        profileName: profile?.name || 'Unknown',
        glDescription: glDescription
      }
    })

    const res = await window.cs2.exportHistory({
      checks: enrichedChecks,
      ledgerTotals,
      grandTotal,
      exportDate: new Date().toISOString(),
      format: exportFormat
    })

    if (res?.success) {
      setShowExportDialog(false)
      // File saved and folder opened
    } else if (res?.error) {
      alert(`Export failed: ${res.error}`)
    }
  }

  const loadFromQueue = (queueItem) => {
    if (activeProfile?.layoutMode === 'three_up') {
      // Three-up mode: Toggle selection (up to 3 items)
      setSelectedQueueItems(prev => {
        const isSelected = prev.some(item => item.id === queueItem.id)
        if (isSelected) {
          // Unselect: remove from selection
          return prev.filter(item => item.id !== queueItem.id)
        } else {
          // Select: add if less than 3 items selected
          if (prev.length < 3) {
            return [...prev, queueItem]
          }
          return prev // Already have 3 selected
        }
      })
    } else {
      // Standard mode: Toggle selection
      setSelectedQueueItems(prev => {
        const isSelected = prev.some(item => item.id === queueItem.id)
        if (isSelected) {
          // Unselect: clear the form and remove from selection
          setData({
            date: new Date().toISOString().slice(0, 10),
            payee: '',
            amount: '',
            amountWords: '',
            memo: '',
            external_memo: '',
            internal_memo: '',
            line_items: [],
            line_items_text: '',
            ledger_snapshot: null,
            checkNumber: '',
            glCode: '',
            glDescription: ''
          })
          return []
        } else {
          // Select: Load into single check form
          // Normalize date to YYYY-MM-DD format
          let normalizedDate = queueItem.date || new Date().toISOString().slice(0, 10)
          if (queueItem.date && !/^\d{4}-\d{2}-\d{2}$/.test(queueItem.date)) {
            const parsedDate = new Date(queueItem.date)
            if (!isNaN(parsedDate.getTime())) {
              normalizedDate = parsedDate.toISOString().slice(0, 10)
            }
          }

          setData({
            date: normalizedDate,
            payee: queueItem.payee || '',
            amount: queueItem.amount || '',
            amountWords: queueItem.amount ? numberToWords(queueItem.amount) : '',
            memo: queueItem.memo || '',
            external_memo: queueItem.external_memo || '',
            internal_memo: queueItem.internal_memo || '',
            line_items: queueItem.line_items || [],
            line_items_text: queueItem.line_items_text || '',
            ledger_snapshot: null,
            checkNumber: queueItem.checkNumber || '',
            glCode: queueItem.glCode || '',
            glDescription: queueItem.glDescription || ''
          })
          return [queueItem]
        }
      })
    }
  }

  // Helper to find address from history
  const getAddressFromHistory = (payee) => {
    if (!payee) return ''
    const match = checkHistory.find(c =>
      c.payee && c.payee.toLowerCase() === payee.toLowerCase() &&
      c.address && c.address.trim() !== '' &&
      c.address.trim().toLowerCase() !== c.payee.trim().toLowerCase()
    )
    return match ? match.address : ''
  }

  // Helper to find GL details from history
  const getGlDetailsFromHistory = (payee) => {
    if (!payee) return { code: '', description: '' }
    const match = checkHistory.find(c =>
      c.payee && c.payee.toLowerCase() === payee.toLowerCase() &&
      c.glCode && c.glCode.trim() !== ''
    )
    return match ? { code: match.glCode, description: match.glDescription || '' } : { code: '', description: '' }
  }

  const processAllQueue = async () => {
    if (importQueue.length === 0) return

    showConfirm(
      'Record All Checks?',
      `Record ${importQueue.length} checks from import queue? This will deduct from your current ledger balance.`,
      async () => {
        await executeProcessAllQueue()
      }
    )
  }

  const executeProcessAllQueue = async () => {

    let processed = 0
    const newHistory = [...checkHistory]

    // Create a local copy of ledgers to track new ones created during this batch
    let tempLedgers = [...ledgers]
    const newLedgersToAdd = []

    // Track balances per ledger (ledgerId -> balance) using hybrid balance calculation
    const ledgerBalances = {}
    tempLedgers.forEach(l => {
      ledgerBalances[l.id] = calculateHybridBalance(l.id)
    })

    // Helper to find or create ledger LOCALLY within this batch
    const getLedgerId = (name) => {
      if (!name || !name.trim()) return activeLedgerId
      const trimmed = name.trim().toLowerCase()
      const existing = tempLedgers.find(l => l.name.toLowerCase() === trimmed)
      if (existing) return existing.id

      const newId = generateId()
      const newLedger = { id: newId, name: name.trim(), balance: 0 }
      tempLedgers.push(newLedger)
      newLedgersToAdd.push(newLedger)
      // Initialize balance for new ledger
      ledgerBalances[newId] = 0
      return newId
    }

    for (const item of importQueue) {
      const amount = sanitizeCurrencyInput(item.amount)
      if (amount > 0 && item.payee?.trim()) {
        // Determine which ledger to use
        const targetLedgerId = getLedgerId(item.ledger)

        // Initialize balance if somehow missing (safety check)
        if (ledgerBalances[targetLedgerId] === undefined) {
          ledgerBalances[targetLedgerId] = 0
        }

        const previousBalance = ledgerBalances[targetLedgerId]
        const newBalance = previousBalance - amount

        newHistory.unshift({
          id: generateId(),
          date: item.date || getLocalDateString(),
          payee: item.payee,
          address: item.address || getAddressFromHistory(item.payee) || item.payee, // Smart address lookup
          amount: amount,
          memo: item.memo || '',
          external_memo: item.external_memo || '',
          internal_memo: item.internal_memo || '',
          line_items: item.line_items || [],
          line_items_text: item.line_items_text || '',
          ledgerId: targetLedgerId,
          profileId: activeProfileId,
          ledgerName: tempLedgers.find(l => l.id === targetLedgerId)?.name || '',
          profileName: profiles.find(p => p.id === activeProfileId)?.name || '',
          ledger_snapshot: {
            previous_balance: previousBalance,
            transaction_amount: amount,
            new_balance: newBalance
          },
          timestamp: Date.now(),
          balanceAfter: newBalance,
          checkNumber: item.checkNumber || '',
          glCode: item.glCode || getGlDetailsFromHistory(item.payee).code || '',
          glDescription: item.glDescription || getGlDetailsFromHistory(item.payee).description || ''
        })

        // Update local balance tracker
        ledgerBalances[targetLedgerId] = newBalance
        processed++
      }
    }

    // Atomic update for ledgers (add new ones + update balances)
    setLedgers(prev => {
      // 1. Start with existing ledgers + new ones
      let nextLedgers = [...prev, ...newLedgersToAdd]

      // 2. Update balances for all affected ledgers
      nextLedgers = nextLedgers.map(l => {
        if (ledgerBalances[l.id] !== undefined) {
          return { ...l, balance: ledgerBalances[l.id] }
        }
        return l
      })

      return nextLedgers
    })

    setCheckHistory(newHistory)
    setImportQueue([])
    setShowImportQueue(false)

    // Show completion modal instead of alert
    setBatchCompleteData({ processed, total: importQueue.length, cancelled: false })
    setShowBatchCompleteModal(true)
  }

  const clearQueue = () => {
    setImportQueue([])
  }

  const handleBatchPrintAndRecord = async () => {
    if (importQueue.length === 0) return

    // Show batch print confirmation modal
    setShowBatchPrintConfirm(true)
  }

  const confirmBatchPrint = async () => {
    // Validate printer mode settings
    if (preferences.batchPrintMode === 'silent' && !preferences.batchPrinterDeviceName) {
      alert('Please select a printer for silent printing mode')
      return
    }
    if (preferences.batchPrintMode === 'pdf' && !preferences.batchPdfExportPath) {
      alert('Please select a folder for PDF export')
      return
    }

    setShowBatchPrintConfirm(false)
    await executeBatchPrintAndRecord()
  }

  const cancelBatchPrintConfirm = () => {
    setShowBatchPrintConfirm(false)
  }

  // Helper function to find or create a ledger by name (case-insensitive match)
  const findOrCreateLedger = (ledgerName) => {
    if (!ledgerName || !ledgerName.trim()) {
      return activeLedgerId // Default to active ledger if no name provided
    }

    const trimmedName = ledgerName.trim()

    // Try to find existing ledger (case-insensitive)
    const existingLedger = ledgers.find(l =>
      l.name.toLowerCase() === trimmedName.toLowerCase()
    )

    if (existingLedger) {
      return existingLedger.id
    }

    // Create new ledger if not found
    const newLedgerId = generateId()
    const newLedger = {
      id: newLedgerId,
      name: trimmedName,
      balance: 0
    }

    // Add to ledgers state
    setLedgers(prev => [...prev, newLedger])

    return newLedgerId
  }

  // Standard mode: One check at a time
  const executeBatchPrintStandard = async () => {
    // Initialize batch print state
    setIsBatchPrinting(true)
    setBatchPrintCancelled(false)
    setBatchPrintProgress({ current: 0, total: importQueue.length })

    let processed = 0
    let failed = 0
    const newHistory = [...checkHistory]

    // Create a local copy of ledgers to track new ones created during this batch
    let tempLedgers = [...ledgers]
    const newLedgersToAdd = []

    // Track balances per ledger (ledgerId -> balance) using hybrid balance calculation
    const ledgerBalances = {}
    tempLedgers.forEach(l => {
      ledgerBalances[l.id] = calculateHybridBalance(l.id)
    })

    // Helper to find or create ledger LOCALLY within this batch
    const getLedgerId = (name) => {
      if (!name || !name.trim()) return activeLedgerId
      const trimmed = name.trim().toLowerCase()
      const existing = tempLedgers.find(l => l.name.toLowerCase() === trimmed)
      if (existing) return existing.id

      const newId = generateId()
      const newLedger = { id: newId, name: name.trim(), balance: 0 }
      tempLedgers.push(newLedger)
      newLedgersToAdd.push(newLedger)
      // Initialize balance for new ledger
      ledgerBalances[newId] = 0
      return newId
    }

    // Create a copy of the queue to iterate through
    const queueCopy = [...importQueue]

    // Apply check numbering if enabled
    let currentCheckNumber = batchAutoNumber ? parseInt(batchStartNumber) || 1001 : null

    for (let i = 0; i < queueCopy.length; i++) {
      // Check if user cancelled
      if (batchPrintCancelled) {
        break
      }

      const item = queueCopy[i]
      const amount = sanitizeCurrencyInput(item.amount)

      // Skip invalid items
      if (amount <= 0 || !item.payee?.trim()) {
        setBatchPrintProgress({ current: i + 1, total: queueCopy.length })
        continue
      }

      // Update progress
      setBatchPrintProgress({ current: i + 1, total: queueCopy.length })

      // Determine which ledger to use
      const targetLedgerId = getLedgerId(item.ledger)

      // Initialize balance if somehow missing
      if (ledgerBalances[targetLedgerId] === undefined) {
        ledgerBalances[targetLedgerId] = 0
      }

      // Normalize the date to YYYY-MM-DD format
      let normalizedDate = item.date || new Date().toISOString().slice(0, 10)
      if (item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
        // Date is not in YYYY-MM-DD format, try to parse it
        normalizedDate = convertExcelDate(item.date)
      }

      // Calculate ledger snapshot for display on check
      const previousBalanceForCheck = ledgerBalances[targetLedgerId]
      const newBalanceForCheck = previousBalanceForCheck - amount
      const ledgerSnapshotForDisplay = {
        previous_balance: previousBalanceForCheck,
        transaction_amount: amount,
        new_balance: newBalanceForCheck
      }

      // Load check data into the form for printing
      setData({
        date: normalizedDate,
        payee: item.payee,
        address: item.address || getAddressFromHistory(item.payee) || item.payee, // Smart address lookup
        amount: item.amount,
        amountWords: numberToWords(item.amount),
        memo: item.memo || '',
        external_memo: item.external_memo || '',
        internal_memo: item.internal_memo || '',
        line_items: item.line_items || [],
        line_items_text: item.line_items_text || '',
        ledger_snapshot: ledgerSnapshotForDisplay,
        checkNumber: batchAutoNumber ? String(currentCheckNumber) : (item.checkNumber || ''),
        glCode: item.glCode || getGlDetailsFromHistory(item.payee).code || '',
        glDescription: item.glDescription || getGlDetailsFromHistory(item.payee).description || ''
      })

      // Wait a brief moment for the UI to update with the new data
      await new Promise(resolve => setTimeout(resolve, 300))

      // Set document title for PDF filename
      const originalTitle = document.title
      const filename = generatePrintFilename(item, i + 1)
      document.title = filename

      // Trigger print based on mode
      setIsPrinting(true)
      let printSuccess = false
      let printError = null

      try {
        let res

        if (preferences.batchPrintMode === 'pdf') {
          // PDF Export Mode - auto-save to folder
          res = await window.cs2.savePdfToFile(preferences.batchPdfExportPath, filename)
        } else if (preferences.batchPrintMode === 'silent' && preferences.batchPrinterDeviceName) {
          // Silent Mode - print to saved printer
          res = await window.cs2.printSilent({ deviceName: preferences.batchPrinterDeviceName })
        } else {
          // Interactive Mode - show dialog (current behavior)
          res = await window.cs2.printDialog(filename)
        }

        // Restore original title
        document.title = originalTitle

        if (res?.success === false) {
          console.error(`Print failed for ${item.payee}:`, res.error)
          printError = res.error || 'Print was cancelled or failed'
        } else {
          printSuccess = true
        }
      } catch (error) {
        console.error(`Print error for ${item.payee}:`, error)
        printError = error.message || 'Unknown print error'
        // Restore original title on error
        document.title = originalTitle
      }
      setIsPrinting(false)

      // Handle print failure - pause and ask user
      if (!printSuccess) {
        const decision = await confirmPrintFailure(item.payee, printError)
        if (decision === 'abort') {
          // User chose to stop - mark as cancelled and break
          setBatchPrintCancelled(true)
          break
        }
        // User chose to continue - skip ledger update for this failed check
        failed++
        continue
      }

      // Wait for printer spooler to receive the job
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Record to ledger/history ONLY after confirmed success
      ledgerBalances[targetLedgerId] = newBalanceForCheck

      newHistory.unshift({
        id: generateId(),
        type: 'check',
        date: item.date || getLocalDateString(),
        payee: item.payee,
        address: item.address || getAddressFromHistory(item.payee) || item.payee, // Smart address lookup
        amount: amount,
        memo: item.memo || '',
        external_memo: item.external_memo || '',
        internal_memo: item.internal_memo || '',
        line_items: item.line_items || [],
        line_items_text: item.line_items_text || '',
        ledgerId: targetLedgerId,
        profileId: activeProfileId,
        ledgerName: tempLedgers.find(l => l.id === targetLedgerId)?.name || '',
        profileName: profiles.find(p => p.id === activeProfileId)?.name || '',
        ledger_snapshot: {
          previous_balance: previousBalanceForCheck,
          transaction_amount: amount,
          new_balance: newBalanceForCheck
        },
        timestamp: Date.now(),
        balanceAfter: newBalanceForCheck,
        checkNumber: batchAutoNumber ? String(currentCheckNumber) : (item.checkNumber || ''),
        glCode: item.glCode || getGlDetailsFromHistory(item.payee).code || '',
        glDescription: item.glDescription || getGlDetailsFromHistory(item.payee).description || ''
      })
      processed++

      // Increment check number if auto-numbering
      if (batchAutoNumber) {
        currentCheckNumber++
      }

    }

    // Atomic update for ledgers (add new ones + update balances)
    setLedgers(prev => {
      // 1. Start with existing ledgers + new ones
      let nextLedgers = [...prev, ...newLedgersToAdd]

      // 2. Update balances for all affected ledgers
      nextLedgers = nextLedgers.map(l => {
        if (ledgerBalances[l.id] !== undefined) {
          return { ...l, balance: ledgerBalances[l.id] }
        }
        return l
      })

      return nextLedgers
    })
    setCheckHistory(newHistory)

    // Update profile's next check number if auto-numbering was used
    if (batchAutoNumber && processed > 0) {
      setProfiles(prev => prev.map(p =>
        p.id === activeProfileId
          ? { ...p, nextCheckNumber: parseInt(batchStartNumber) + processed }
          : p
      ))
    }

    // Clear the queue and reset batch state
    setImportQueue([])
    setIsBatchPrinting(false)
    setBatchPrintProgress({ current: 0, total: 0 })

    // Clear the form fields
    setData({
      date: getLocalDateString(),
      payee: '',
      amount: '',
      amountWords: '',
      memo: '',
      external_memo: '',
      internal_memo: '',
      line_items: [],
      line_items_text: '',
      ledger_snapshot: null,
      checkNumber: ''
    })

    // Show completion modal
    setBatchCompleteData({ processed, total: queueCopy.length, cancelled: batchPrintCancelled, failed })
    setShowBatchCompleteModal(true)


    if (!batchPrintCancelled) {
      setShowImportQueue(false)
    }
  }

  // Three-up mode: Chunks of 3 checks per sheet
  const executeBatchPrintThreeUp = async () => {
    // Initialize batch print state
    setIsBatchPrinting(true)
    setBatchPrintCancelled(false)
    setBatchPrintProgress({ current: 0, total: importQueue.length })

    let processed = 0
    let failed = 0
    const newHistory = [...checkHistory]

    // Create a local copy of ledgers to track new ones created during this batch
    let tempLedgers = [...ledgers]
    const newLedgersToAdd = []

    // Track balances per ledger (ledgerId -> balance) using hybrid balance calculation
    const ledgerBalances = {}
    tempLedgers.forEach(l => {
      ledgerBalances[l.id] = calculateHybridBalance(l.id)
    })

    // Helper to find or create ledger LOCALLY within this batch
    const getLedgerId = (name) => {
      if (!name || !name.trim()) return activeLedgerId
      const trimmed = name.trim().toLowerCase()
      const existing = tempLedgers.find(l => l.name.toLowerCase() === trimmed)
      if (existing) return existing.id

      const newId = generateId()
      const newLedger = { id: newId, name: name.trim(), balance: 0 }
      tempLedgers.push(newLedger)
      newLedgersToAdd.push(newLedger)
      // Initialize balance for new ledger
      ledgerBalances[newId] = 0
      return newId
    }

    // Create a copy of the queue to iterate through
    const queueCopy = [...importQueue]

    // Apply check numbering if enabled
    let currentCheckNumber = batchAutoNumber ? parseInt(batchStartNumber) || 1001 : null

    // Process in chunks of 3
    for (let chunkStart = 0; chunkStart < queueCopy.length; chunkStart += 3) {
      // Check if user cancelled
      if (batchPrintCancelled) {
        break
      }

      const chunk = queueCopy.slice(chunkStart, chunkStart + 3)
      const slotNames = ['top', 'middle', 'bottom']
      const newSheetData = {
        top: getEmptySlotData(),
        middle: getEmptySlotData(),
        bottom: getEmptySlotData()
      }

      // Load items into sheet slots
      const slotMetadata = []
      for (let i = 0; i < chunk.length; i++) {
        const item = chunk[i]
        const slot = slotNames[i]
        const amount = sanitizeCurrencyInput(item.amount)

        // Skip invalid items
        if (amount <= 0 || !item.payee?.trim()) {
          continue
        }

        // Determine which ledger to use
        const targetLedgerId = getLedgerId(item.ledger)

        // Initialize balance for newly created ledgers
        if (ledgerBalances[targetLedgerId] === undefined) {
          ledgerBalances[targetLedgerId] = 0
        }

        // Normalize the date
        let normalizedDate = item.date || getLocalDateString()
        if (item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
          normalizedDate = convertExcelDate(item.date)
        }

        // Calculate ledger snapshot BEFORE deducting (so check shows correct balance)
        const previousBalance = ledgerBalances[targetLedgerId]
        const ledgerSnapshotForDisplay = {
          previous_balance: previousBalance,
          transaction_amount: amount,
          new_balance: previousBalance - amount
        }

        // Populate slot data
        newSheetData[slot] = {
          date: normalizedDate,
          payee: item.payee,
          address: item.address || getAddressFromHistory(item.payee) || item.payee, // Smart address lookup
          amount: item.amount,
          amountWords: numberToWords(item.amount),
          memo: item.memo || '',
          external_memo: item.external_memo || '',
          internal_memo: item.internal_memo || '',
          line_items: item.line_items || [],
          line_items_text: item.line_items_text || '',
          ledger_snapshot: ledgerSnapshotForDisplay,
          checkNumber: batchAutoNumber ? String(currentCheckNumber) : (item.checkNumber || ''),
          glCode: item.glCode || getGlDetailsFromHistory(item.payee).code || '',
          glDescription: item.glDescription || getGlDetailsFromHistory(item.payee).description || ''
        }

        // Deduct from balance NOW so next check in this batch gets the updated balance
        ledgerBalances[targetLedgerId] -= amount

        // Store metadata for recording (with the already-calculated new balance)
        slotMetadata.push({
          slot,
          item,
          targetLedgerId,
          amount,
          previousBalance: previousBalance,
          newBalance: ledgerBalances[targetLedgerId],
          checkNumber: batchAutoNumber ? String(currentCheckNumber) : (item.checkNumber || ''),
          glCode: item.glCode || getGlDetailsFromHistory(item.payee).code || '',
          glDescription: item.glDescription || getGlDetailsFromHistory(item.payee).description || ''
        })

        // Increment check number if auto-numbering
        if (batchAutoNumber) {
          currentCheckNumber++
        }
      }

      // Skip this chunk if no valid items
      if (slotMetadata.length === 0) {
        setBatchPrintProgress({ current: chunkStart + chunk.length, total: queueCopy.length })
        continue
      }

      // Load sheet data into state
      setSheetData(newSheetData)

      // Update progress
      setBatchPrintProgress({ current: chunkStart + chunk.length, total: queueCopy.length })

      // Wait for the UI to update with the new data - increased delay for heavier DOM
      await new Promise(resolve => setTimeout(resolve, 800))

      // Set document title for PDF filename (use first slot's data)
      const originalTitle = document.title
      const sheetNumber = Math.floor(chunkStart / 3) + 1
      const filename = generatePrintFilename(slotMetadata[0].item, sheetNumber)
      document.title = filename

      // Trigger print ONCE for the entire sheet
      setIsPrinting(true)
      let printSuccess = false
      let printError = null

      try {
        let res

        if (preferences.batchPrintMode === 'pdf') {
          // PDF Export Mode - auto-save to folder
          res = await window.cs2.savePdfToFile(preferences.batchPdfExportPath, filename)
        } else if (preferences.batchPrintMode === 'silent' && preferences.batchPrinterDeviceName) {
          // Silent Mode - print to saved printer
          res = await window.cs2.printSilent({ deviceName: preferences.batchPrinterDeviceName })
        } else {
          // Interactive Mode - show dialog (current behavior)
          res = await window.cs2.printDialog(filename)
        }

        // Restore original title
        document.title = originalTitle

        if (res?.success === false) {
          console.error(`Print failed for sheet:`, res.error)
          printError = res.error || 'Print was cancelled or failed'
        } else {
          printSuccess = true
        }
      } catch (error) {
        console.error(`Print error for sheet:`, error)
        printError = error.message || 'Unknown print error'
        // Restore original title on error
        document.title = originalTitle
      }
      setIsPrinting(false)

      // Handle print failure - pause and ask user
      if (!printSuccess) {
        const firstPayee = slotMetadata[0]?.item?.payee || 'Sheet'
        const decision = await confirmPrintFailure(`Sheet (${slotMetadata.length} checks starting with ${firstPayee})`, printError)
        if (decision === 'abort') {
          // User chose to stop - mark as cancelled and break
          setBatchPrintCancelled(true)
          // Revert the ledger changes for this failed sheet
          for (const { targetLedgerId, amount } of slotMetadata) {
            ledgerBalances[targetLedgerId] += amount
          }
          break
        }
        // User chose to continue - revert ledger changes for this sheet and skip recording
        for (const { targetLedgerId, amount } of slotMetadata) {
          ledgerBalances[targetLedgerId] += amount
        }
        failed += slotMetadata.length
        continue
      }

      // Wait for printer spooler to receive the job
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Record all filled slots to history (balances already calculated and deducted)
      const timestamp = Date.now()
      for (const { slot, item, targetLedgerId, amount, previousBalance, newBalance, checkNumber, glCode, glDescription } of slotMetadata) {
        newHistory.unshift({
          id: generateId(),
          type: 'check',
          date: item.date || getLocalDateString(),
          payee: item.payee,
          address: item.address || getAddressFromHistory(item.payee) || item.payee, // Smart address lookup
          amount: amount,
          memo: item.memo || '',
          external_memo: item.external_memo || '',
          internal_memo: item.internal_memo || '',
          line_items: item.line_items || [],
          line_items_text: item.line_items_text || '',
          ledgerId: targetLedgerId,
          profileId: activeProfileId,
          ledgerName: tempLedgers.find(l => l.id === targetLedgerId)?.name || '',
          profileName: profiles.find(p => p.id === activeProfileId)?.name || '',
          ledger_snapshot: {
            previous_balance: previousBalance,
            transaction_amount: amount,
            new_balance: newBalance
          },
          timestamp: timestamp,
          balanceAfter: newBalance,
          sheetSlot: slot,
          checkNumber: checkNumber,
          glCode: glCode || '',
          glDescription: glDescription || ''
        })
        processed++
      }
    }

    // Update global ledgers state if we created any new ones
    if (newLedgersToAdd.length > 0) {
      setLedgers(prev => [...prev, ...newLedgersToAdd])
    }

    // Update all affected ledger balances
    Object.entries(ledgerBalances).forEach(([ledgerId, balance]) => {
      updateLedgerBalance(ledgerId, balance)
    })
    setCheckHistory(newHistory)

    // Update profile's next check number if auto-numbering was used
    if (batchAutoNumber && processed > 0) {
      setProfiles(prev => prev.map(p =>
        p.id === activeProfileId
          ? { ...p, nextCheckNumber: parseInt(batchStartNumber) + processed }
          : p
      ))
    }

    // Clear the queue and reset batch state
    setImportQueue([])
    setIsBatchPrinting(false)
    setBatchPrintProgress({ current: 0, total: 0 })

    // Clear the form fields
    setData({
      date: getLocalDateString(),
      payee: '',
      amount: '',
      amountWords: '',
      memo: '',
      external_memo: '',
      internal_memo: '',
      line_items: [],
      line_items_text: '',
      ledger_snapshot: null,
      checkNumber: ''
    })

    // Show completion modal
    setBatchCompleteData({ processed, total: queueCopy.length, cancelled: batchPrintCancelled, failed })
    setShowBatchCompleteModal(true)

    if (!batchPrintCancelled) {
      setShowImportQueue(false)
    }
  }
  const executeBatchPrintAndRecord = async () => {
    if (activeProfile?.layoutMode === 'three_up') {
      return executeBatchPrintThreeUp()
    } else {
      return executeBatchPrintStandard()
    }
  }

  const cancelBatchPrint = () => {
    showConfirm(
      'Cancel Batch Print?',
      'Cancel the batch print operation? Already processed checks will remain recorded.',
      () => {
        setBatchPrintCancelled(true)
      }
    )
  }

  const paperStyle = useMemo(() => {
    return {
      transform: isPrinting ? 'none' : `scale(${model.view.zoom})`
    }
  }, [isPrinting, model.view.zoom])

  const stageHeightIn = useMemo(() => {
    const l = model.layout
    return (
      l.checkHeightIn +
      (l.stub1Enabled ? l.stub1HeightIn : 0) +
      (l.stub2Enabled ? l.stub2HeightIn : 0)
    )
  }, [model.layout])

  const stageVars = useMemo(() => {
    return {
      '--stage-w': `${model.layout.widthIn}in`,
      '--stage-h': `${stageHeightIn}in`
    }
  }, [model.layout.widthIn, stageHeightIn])

  const checkPlacementStyle = useMemo(() => {
    return {
      transform: `translate(${model.placement.offsetXIn}in, ${model.placement.offsetYIn}in)`
    }
  }, [model.placement.offsetXIn, model.placement.offsetYIn])

  // Snap to grid: 0.125 inches when enabled, 0.01 inches (fine) when disabled
  const snapStepIn = preferences.enableSnapping ? 0.125 : 0.01
  const dragRef = useRef(null)

  const setField = (key, patch) => {
    // In three-up mode, update slot-specific fields instead of shared fields
    if (activeProfile?.layoutMode === 'three_up') {
      setModel((m) => ({
        ...m,
        slotFields: {
          ...m.slotFields,
          [activeSlot]: {
            ...m.slotFields[activeSlot],
            [key]: { ...m.slotFields[activeSlot][key], ...patch }
          }
        }
      }))
    } else {
      setModel((m) => ({
        ...m,
        fields: { ...m.fields, [key]: { ...m.fields[key], ...patch } }
      }))
    }
  }

  const ensureStub = (which, enabled) => {
    setModel((m) => {
      const l = m.layout
      const nextLayout =
        which === 'stub1'
          ? { ...l, stub1Enabled: enabled }
          : which === 'stub2'
            ? { ...l, stub2Enabled: enabled }
            : l

      if (!enabled) return { ...m, layout: nextLayout }

      const checkY = nextLayout.checkHeightIn
      const stub1Y = checkY
      const stub2Y = checkY + (nextLayout.stub1Enabled ? nextLayout.stub1HeightIn : 0)
      const baseY = which === 'stub1' ? stub1Y : stub2Y
      const prefix = which === 'stub1' ? 'stub1_' : 'stub2_'

      // Stub 1 (Payee Copy) - External memo and line items
      // Stub 2 (Bookkeeper Copy) - Internal memo, ledger snapshot, and admin fields
      const isPayeeCopy = which === 'stub1'
      const defaults = isPayeeCopy
        ? {
          // PAYEE COPY (Stub 1) - External Memo, Line Items & Admin Fields
          [`${prefix}date`]: { x: 0.55, y: baseY + 0.25, w: 1.3, h: 0.30, fontIn: 0.20, label: 'Date' },
          [`${prefix}payee`]: { x: 2.0, y: baseY + 0.25, w: 3.5, h: 0.30, fontIn: 0.20, label: 'Pay To' },
          [`${prefix}address`]: { x: 2.0, y: baseY + 0.55, w: 3.5, h: 0.60, fontIn: 0.18, label: 'Address' },
          [`${prefix}amount`]: { x: nextLayout.widthIn - 1.75, y: baseY + 0.25, w: 1.20, h: 0.30, fontIn: 0.20, label: 'Amount' },
          [`${prefix}checkNumber`]: { x: 6.35, y: baseY + 0.25, w: 0.85, h: 0.30, fontIn: 0.18, label: 'Check #' },
          [`${prefix}memo`]: { x: 0.55, y: baseY + 0.70, w: nextLayout.widthIn - 1.10, h: 0.30, fontIn: 0.18, label: 'Memo' },
          [`${prefix}line_items`]: { x: 0.55, y: baseY + 1.25, w: nextLayout.widthIn - 1.10, h: 1.10, fontIn: 0.16, label: 'Line Items' },
          [`${prefix}ledger`]: { x: 0.55, y: baseY + 2.45, w: 3.5, h: 0.85, fontIn: 0.16, label: 'Ledger Snapshot' },
          [`${prefix}approved`]: { x: 4.25, y: baseY + 2.45, w: 1.85, h: 0.35, fontIn: 0.16, label: 'Approved By' },
          [`${prefix}glcode`]: { x: 4.25, y: baseY + 2.95, w: 1.85, h: 0.35, fontIn: 0.16, label: 'GL Code' }
        }
        : {
          // BOOKKEEPER COPY (Stub 2) - Internal Memo, Ledger Snapshot, Admin
          [`${prefix}date`]: { x: 0.55, y: baseY + 0.25, w: 1.3, h: 0.30, fontIn: 0.20, label: 'Date' },
          [`${prefix}payee`]: { x: 2.0, y: baseY + 0.25, w: 3.5, h: 0.30, fontIn: 0.20, label: 'Pay To' },
          [`${prefix}address`]: { x: 2.0, y: baseY + 0.55, w: 3.5, h: 0.60, fontIn: 0.18, label: 'Address' },
          [`${prefix}amount`]: { x: nextLayout.widthIn - 1.75, y: baseY + 0.25, w: 1.20, h: 0.30, fontIn: 0.20, label: 'Amount' },
          [`${prefix}checkNumber`]: { x: 6.35, y: baseY + 0.25, w: 0.85, h: 0.30, fontIn: 0.18, label: 'Check #' },
          [`${prefix}memo`]: { x: 0.55, y: baseY + 0.70, w: nextLayout.widthIn - 1.10, h: 0.30, fontIn: 0.18, label: 'Internal Memo' },
          [`${prefix}ledger`]: { x: 0.55, y: baseY + 1.15, w: 3.5, h: 0.85, fontIn: 0.16, label: 'Ledger Snapshot' },
          [`${prefix}approved`]: { x: 4.25, y: baseY + 1.15, w: 1.85, h: 0.35, fontIn: 0.16, label: 'Approved By' },
          [`${prefix}glcode`]: { x: 4.25, y: baseY + 1.65, w: 1.85, h: 0.35, fontIn: 0.16, label: 'GL Code' },
          [`${prefix}line_items`]: { x: 6.35, y: baseY + 1.15, w: 1.60, h: 0.85, fontIn: 0.16, label: 'Line Items' }
        }

      const nextFields = { ...m.fields }
      for (const [k, v] of Object.entries(defaults)) {
        if (!nextFields[k]) nextFields[k] = v
      }

      return { ...m, layout: nextLayout, fields: nextFields }
    })

    if (enabled) {
      const prefix = which === 'stub1' ? 'stub1_' : 'stub2_'
      setData((d) => {
        // Parent-to-child flow: When stub is enabled, sync from parent check fields
        // Stub 1 (Payee Copy) gets external_memo by default
        // Stub 2 (Bookkeeper Copy) gets internal_memo by default
        const defaultMemo = which === 'stub1'
          ? (d.external_memo || d.memo || '')
          : (d.internal_memo || d.memo || '')

        return {
          ...d,
          [`${prefix}date`]: d.date,
          [`${prefix}payee`]: d.payee,
          [`${prefix}amount`]: d.amount,
          [`${prefix}memo`]: defaultMemo
        }
      })
    }
  }

  const onPointerDownField = (e, key) => {
    if (!editMode) return
    e.preventDefault()
    e.stopPropagation()

    let newSelected = [...selected]
    const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey

    if (isMultiSelect) {
      if (newSelected.includes(key)) {
        newSelected = newSelected.filter(k => k !== key)
      } else {
        newSelected.push(key)
      }
    } else {
      if (!newSelected.includes(key)) {
        newSelected = [key]
      }
    }

    setSelected(newSelected)

    // If we just deselected the item with a modifier click, don't start dragging
    if (isMultiSelect && selected.includes(key)) {
      return
    }

    // Capture start positions for all selected fields
    const startFields = {}
    newSelected.forEach(k => {
      let f = null
      if (activeProfile?.layoutMode === 'three_up') {
        f = model.slotFields?.[activeSlot]?.[k]
      } else {
        f = model.fields[k]
      }

      if (f) {
        startFields[k] = { ...f }
      }
    })

    dragRef.current = {
      mode: 'move',
      startX: e.clientX,
      startY: e.clientY,
      startFields
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerDownHandle = (e, key) => {
    if (!editMode) return
    e.preventDefault()
    e.stopPropagation()

    setSelected([key]) // Force single selection for resize

    let f = null
    if (activeProfile?.layoutMode === 'three_up') {
      f = model.slotFields?.[activeSlot]?.[key]
    } else {
      f = model.fields[key]
    }

    dragRef.current = {
      key,
      mode: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      startField: { ...f }
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerDownCutLine = (e, lineNumber) => {
    e.stopPropagation()
    const fieldName = lineNumber === 1 ? 'cutLine1In' : 'cutLine2In'
    const startValue = model.layout[fieldName]

    dragRef.current = {
      mode: 'cutLine',
      lineNumber,
      fieldName,
      startY: e.clientY,
      startValue
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerDownStage = (e) => {
    if (!editMode) return
    if (e.button !== 0) return // Only left click

    const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey
    if (!isMultiSelect) {
      setSelected([])
    }

    if (!paperRef.current) return
    const paperRect = paperRef.current.getBoundingClientRect()
    const startX = (e.clientX - paperRect.left) / (PX_PER_IN * model.view.zoom)
    const startY = (e.clientY - paperRect.top) / (PX_PER_IN * model.view.zoom)

    setSelectionBox({
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      initialSelected: isMultiSelect ? [...selected] : []
    })

    dragRef.current = {
      mode: 'marquee'
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e) => {
    const d = dragRef.current
    if (!d) return
    const dxIn = (e.clientX - d.startX) / (PX_PER_IN * model.view.zoom)
    const dyIn = (e.clientY - d.startY) / (PX_PER_IN * model.view.zoom)

    if (d.mode === 'move') {
      // Calculate new positions for all selected fields
      const updates = {}
      Object.entries(d.startFields).forEach(([key, startField]) => {
        const nx = roundTo(startField.x + dxIn, snapStepIn)
        const ny = roundTo(startField.y + dyIn, snapStepIn)
        updates[key] = {
          x: clamp(nx, 0, model.layout.widthIn - 0.2),
          y: clamp(ny, 0, stageHeightIn - 0.2)
        }
      })

      // Batch update
      if (activeProfile?.layoutMode === 'three_up') {
        setModel(m => {
          const currentSlotFields = m.slotFields[activeSlot]
          const newSlotFields = { ...currentSlotFields }
          let changed = false
          Object.entries(updates).forEach(([key, patch]) => {
            if (newSlotFields[key]) {
              newSlotFields[key] = { ...newSlotFields[key], ...patch }
              changed = true
            }
          })
          if (!changed) return m
          return {
            ...m,
            slotFields: {
              ...m.slotFields,
              [activeSlot]: newSlotFields
            }
          }
        })
      } else {
        setModel(m => {
          const newFields = { ...m.fields }
          let changed = false
          Object.entries(updates).forEach(([key, patch]) => {
            if (newFields[key]) {
              newFields[key] = { ...newFields[key], ...patch }
              changed = true
            }
          })
          if (!changed) return m
          return { ...m, fields: newFields }
        })
      }
    } else if (d.mode === 'resize') {
      const nw = roundTo(d.startField.w + dxIn, snapStepIn)
      const nh = roundTo(d.startField.h + dyIn, snapStepIn)

      setField(d.key, {
        w: clamp(nw, 0.2, model.layout.widthIn - d.startField.x),
        h: clamp(nh, 0.18, stageHeightIn - d.startField.y)
      })
    } else if (d.mode === 'marquee') {
      // Calculate selection box
      if (!paperRef.current) return
      const paperRect = paperRef.current.getBoundingClientRect()
      const currentX = (e.clientX - paperRect.left) / (PX_PER_IN * model.view.zoom)
      const currentY = (e.clientY - paperRect.top) / (PX_PER_IN * model.view.zoom)

      setSelectionBox(prev => ({ ...prev, currentX, currentY }))

      // Calculate intersection
      const boxX = Math.min(selectionBox.startX, currentX)
      const boxY = Math.min(selectionBox.startY, currentY)
      const boxW = Math.abs(currentX - selectionBox.startX)
      const boxH = Math.abs(currentY - selectionBox.startY)

      const newSelection = [...selectionBox.initialSelected]

      const fieldsToCheck = activeProfile?.layoutMode === 'three_up'
        ? Object.entries(model.slotFields[activeSlot] || {})
        : Object.entries(model.fields)

      fieldsToCheck.forEach(([key, f]) => {
        let fieldY = f.y
        // Handle stub offsets
        const isStub1Field = key.startsWith('stub1_')
        const isStub2Field = key.startsWith('stub2_')

        if (isStub1Field) {
          const originalStub1Start = 3.0
          const relativeY = f.y - originalStub1Start
          fieldY = model.layout.checkHeightIn + relativeY
        } else if (isStub2Field) {
          const originalStub2Start = 6.0
          const relativeY = f.y - originalStub2Start
          fieldY = model.layout.checkHeightIn + model.layout.stub1HeightIn + relativeY
        }

        if (
          boxX < f.x + f.w &&
          boxX + boxW > f.x &&
          boxY < fieldY + f.h &&
          boxY + boxH > fieldY
        ) {
          if (!newSelection.includes(key)) {
            newSelection.push(key)
          }
        }
      })

      setSelected(newSelection)
    } else if (d.mode === 'cutLine') {
      const newY = roundTo(d.startValue + dyIn, snapStepIn)
      // Constrain cut line 1 between 1" and 6" (before second cut line)
      // Constrain cut line 2 between cutLine1 + 1" and 10"
      const minY = d.lineNumber === 1 ? 1.0 : (model.layout.cutLine1In ?? DEFAULT_LAYOUT.cutLine1In) + 1.0
      const maxY = d.lineNumber === 1 ? (model.layout.cutLine2In ?? DEFAULT_LAYOUT.cutLine2In) - 1.0 : 10.0

      setModel(m => ({
        ...m,
        layout: {
          ...m.layout,
          [d.fieldName]: clamp(newY, minY, maxY)
        }
      }))
    }
  }

  const onPointerUp = (e) => {
    if (dragRef.current) {
      if (dragRef.current.mode === 'marquee') {
        setSelectionBox(null)
      }
      dragRef.current = null
      // Release pointer capture if it was set
      if (e?.target?.releasePointerCapture && e.pointerId) {
        try {
          e.target.releasePointerCapture(e.pointerId)
        } catch (err) {
          // Ignore errors if capture wasn't set
        }
      }
    }
  }

  const handleSelectTemplate = async () => {
    const res = await window.cs2.selectTemplate()
    if (!res?.success) return
    setModel((m) => ({ ...m, template: { ...m.template, path: res.path } }))
  }

  // Generate PDF filename from check data
  const generatePrintFilename = (checkData, batchIndex = null) => {
    const payee = (checkData.payee || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_')

    // FIX: Replace slashes with dashes to prevent folder errors (01/20/2026 -> 01-20-2026)
    let rawDate = checkData.date || getLocalDateString()
    const date = rawDate.replace(/\//g, '-')

    const amount = sanitizeCurrencyInput(checkData.amount).toFixed(2).replace('.', '')
    const prefix = batchIndex !== null ? `${String(batchIndex).padStart(3, '0')}_` : ''

    return `Check_${prefix}${payee}_${date}_${amount}`
  }

  // Load available printers for batch print configuration
  const loadAvailablePrinters = async () => {
    try {
      const res = await window.cs2.getPrinters()
      if (res?.success && res.printers) {
        setAvailablePrinters(res.printers)
      }
    } catch (error) {
      console.error('Failed to load printers:', error)
    }
  }

  const handlePreviewPdf = async () => {
    setIsPrinting(true)
    setTimeout(async () => {
      const res = await window.cs2.previewPdf()
      if (res?.success === false) alert(`Preview failed: ${res.error || 'Unknown error'}`)
      setIsPrinting(false)
    }, 250)
  }

  const handlePrint = async () => {
    // Temporarily disable edit mode for printing
    const wasInEditMode = editMode
    if (wasInEditMode) setEditMode(false)

    setIsPrinting(true)

    // Set document title for PDF filename
    const originalTitle = document.title
    document.title = generatePrintFilename(data)

    setTimeout(async () => {
      const filename = generatePrintFilename(data)
      const res = await window.cs2.printDialog(filename)

      // Restore original title and edit mode
      document.title = originalTitle
      if (wasInEditMode) setEditMode(true)

      if (res?.success === false) alert(`Print failed: ${res.error || 'Unknown error'}`)
      setIsPrinting(false)
    }, 250)
  }

  // Save new GL Code from modal
  const handleSaveGlCode = (code, description) => {
    setGlCodes(prev => {
      // Avoid duplicates just in case
      if (prev.some(g => g.code.toLowerCase() === code.toLowerCase())) return prev
      return [...prev, { code, description }]
    })
    setShowGlModal(false)
    setPendingGlCode(null)
  }

  // Single check print and record (standard mode)
  const handlePrintAndRecordSingle = async () => {
    const amount = sanitizeCurrencyInput(data.amount)
    if (amount <= 0) {
      alert('Please enter a valid amount')
      return
    }
    if (!data.payee.trim()) {
      alert('Please enter a payee')
      return
    }

    // Check for novel GL Code
    if (data.glCode && data.glCode.trim()) {
      const code = data.glCode.trim()
      const exists = glCodes.some(g => g.code.toLowerCase() === code.toLowerCase())
      if (!exists) {
        setPendingGlCode(code)
        setPendingAction('print_single')
        setShowGlModal(true)
        return
      }
    }

    // Capture the current check data BEFORE any async operations
    const checkDataSnapshot = {
      date: data.date,
      payee: data.payee,
      amount: data.amount,
      amountWords: data.amountWords,
      memo: data.memo,
      external_memo: data.external_memo,
      internal_memo: data.internal_memo,
      line_items: data.line_items,
      line_items_text: data.line_items_text,
      ledger_snapshot: data.ledger_snapshot,
      checkNumber: data.checkNumber,
      glCode: data.glCode,
      glDescription: data.glDescription
    }

    // Temporarily disable edit mode for printing
    const wasInEditMode = editMode
    if (wasInEditMode) setEditMode(false)

    setIsPrinting(true)

    // Set document title for PDF filename
    const originalTitle = document.title
    document.title = generatePrintFilename(checkDataSnapshot)

    // Small delay to ensure DOM is ready for printing
    setTimeout(async () => {
      try {
        // Set up afterprint handler BEFORE opening print dialog
        let afterPrintFired = false
        const handleAfterPrint = () => {
          afterPrintFired = true
          window.removeEventListener('afterprint', handleAfterPrint)
        }
        window.addEventListener('afterprint', handleAfterPrint)

        // Open print dialog and wait for it to close
        const filename = generatePrintFilename(checkDataSnapshot)
        const res = await window.cs2.printDialog(filename)

        // Restore original title
        document.title = originalTitle

        // Remove the event listener if dialog failed
        if (res?.success === false) {
          window.removeEventListener('afterprint', handleAfterPrint)
          setIsPrinting(false)
          if (wasInEditMode) setEditMode(true)
          alert(`Print failed: ${res.error || 'Unknown error'}`)
          return
        }

        // Give afterprint a chance to fire (Electron may fire it synchronously or async)
        // Wait up to 2 seconds for afterprint, or continue if it already fired
        if (!afterPrintFired) {
          await new Promise(resolve => {
            const checkInterval = setInterval(() => {
              if (afterPrintFired) {
                clearInterval(checkInterval)
                clearTimeout(fallbackTimeout)
                resolve()
              }
            }, 50)

            // Fallback after 2 seconds
            const fallbackTimeout = setTimeout(() => {
              clearInterval(checkInterval)
              resolve()
            }, 2000)
          })
        }

        // Clean up listener
        window.removeEventListener('afterprint', handleAfterPrint)
        setIsPrinting(false)
        if (wasInEditMode) setEditMode(true)

        // NOW it's safe to record and clear - print has fully completed
        recordCheck(checkDataSnapshot)

        // Increment the profile's next check number
        setProfiles(prev => prev.map(p =>
          p.id === activeProfileId
            ? { ...p, nextCheckNumber: (p.nextCheckNumber || 1001) + 1 }
            : p
        ))

        // Remove printed items from import queue
        if (selectedQueueItems.length > 0) {
          setImportQueue(prev => prev.filter(item =>
            !selectedQueueItems.some(selected => selected.id === item.id)
          ))
          setSelectedQueueItems([])
        }

        // Clear form for next check
        setData({
          date: getLocalDateString(),
          payee: '',
          amount: '',
          amountWords: '',
          memo: '',
          external_memo: '',
          internal_memo: '',
          line_items: [],
          line_items_text: '',
          ledger_snapshot: null,
          checkNumber: ''
        })

        // Clear itemized mode line items and reset to simple mode
        setLineItems([])
        setCheckMode('simple')
      } catch (error) {
        setIsPrinting(false)
        if (wasInEditMode) setEditMode(true)
        alert(`Print error: ${error?.message || 'Unknown error'}`)
      }
    }, 250)
  }

  // Sheet print and record (three-up mode)
  const handlePrintAndRecordSheet = async () => {
    // Collect all filled slots
    const filledSlots = []
    const slotNames = ['top', 'middle', 'bottom']

    for (const slot of slotNames) {
      const slotData = sheetData[slot]
      if (!isSlotEmpty(slotData)) {
        const amount = sanitizeCurrencyInput(slotData.amount)
        if (amount <= 0) {
          alert(`Please enter a valid amount for ${slot} slot`)
          return
        }
        if (!slotData.payee?.trim()) {
          alert(`Please enter a payee for ${slot} slot`)
          return
        }
        filledSlots.push({
          slot,
          data: {
            date: slotData.date,
            payee: slotData.payee,
            amount: slotData.amount,
            amountWords: slotData.amountWords,
            memo: slotData.memo,
            external_memo: slotData.external_memo,
            internal_memo: slotData.internal_memo,
            line_items: slotData.line_items,
            line_items_text: slotData.line_items_text,
            ledger_snapshot: slotData.ledger_snapshot,
            checkNumber: slotData.checkNumber
          }
        })
      }
    }

    if (filledSlots.length === 0) {
      alert('Please fill at least one slot before printing')
      return
    }

    // Check for novel GL Codes
    for (const { data: checkData } of filledSlots) {
      if (checkData.glCode && checkData.glCode.trim()) {
        const code = checkData.glCode.trim()
        const exists = glCodes.some(g => g.code.toLowerCase() === code.toLowerCase())
        if (!exists) {
          setPendingGlCode(code)
          setPendingAction('print_sheet')
          setShowGlModal(true)
          return
        }
      }
    }

    // Temporarily disable edit mode for printing
    const wasInEditMode = editMode
    if (wasInEditMode) setEditMode(false)

    setIsPrinting(true)

    // Set document title for PDF filename (use first slot's data)
    const originalTitle = document.title
    document.title = generatePrintFilename(filledSlots[0].data)

    // Small delay to ensure DOM is ready for printing
    setTimeout(async () => {
      try {
        // Set up afterprint handler BEFORE opening print dialog
        let afterPrintFired = false
        const handleAfterPrint = () => {
          afterPrintFired = true
          window.removeEventListener('afterprint', handleAfterPrint)
        }
        window.addEventListener('afterprint', handleAfterPrint)

        // Open print dialog and wait for it to close
        const filename = generatePrintFilename(filledSlots[0].data)
        const res = await window.cs2.printDialog(filename)

        // Restore original title
        document.title = originalTitle

        // Remove the event listener if dialog failed
        if (res?.success === false) {
          window.removeEventListener('afterprint', handleAfterPrint)
          setIsPrinting(false)
          if (wasInEditMode) setEditMode(true)
          alert(`Print failed: ${res.error || 'Unknown error'}`)
          return
        }

        // Give afterprint a chance to fire
        if (!afterPrintFired) {
          await new Promise(resolve => {
            const checkInterval = setInterval(() => {
              if (afterPrintFired) {
                clearInterval(checkInterval)
                clearTimeout(fallbackTimeout)
                resolve()
              }
            }, 50)

            const fallbackTimeout = setTimeout(() => {
              clearInterval(checkInterval)
              resolve()
            }, 2000)
          })
        }

        // Clean up listener
        window.removeEventListener('afterprint', handleAfterPrint)
        setIsPrinting(false)
        if (wasInEditMode) setEditMode(true)

        // Record all filled slots to history (each gets its own entry with sheetSlot field)
        const timestamp = Date.now()
        let currentBalance = hybridBalance

        for (const { slot, data: checkData } of filledSlots) {
          const amount = sanitizeCurrencyInput(checkData.amount)
          const previousBalance = currentBalance
          const newBalance = currentBalance - amount

          const checkEntry = {
            id: generateId(),
            type: 'check', // Transaction type
            date: checkData.date || getLocalDateString(),
            payee: checkData.payee,
            amount: amount,
            memo: checkData.memo || '',
            external_memo: checkData.external_memo || '',
            internal_memo: checkData.internal_memo || '',
            line_items: checkData.line_items || [],
            line_items_text: checkData.line_items_text || '',
            ledgerId: activeLedgerId,
            profileId: activeProfileId,
            ledger_snapshot: {
              previous_balance: previousBalance,
              transaction_amount: amount,
              new_balance: newBalance
            },
            timestamp: timestamp,
            balanceAfter: newBalance,
            sheetSlot: slot,
            checkNumber: checkData.checkNumber || '',
            glCode: checkData.glCode || '',
            glDescription: checkData.glDescription || ''
          }

          setCheckHistory(prev => [checkEntry, ...prev])
          currentBalance = newBalance
        }

        // Note: We don't update ledger.balance anymore - hybrid balance is calculated from transactions

        // Increment the profile's next check number by the number of checks printed
        setProfiles(prev => prev.map(p =>
          p.id === activeProfileId
            ? { ...p, nextCheckNumber: (p.nextCheckNumber || 1001) + filledSlots.length }
            : p
        ))

        // Remove printed items from import queue
        if (selectedQueueItems.length > 0) {
          setImportQueue(prev => prev.filter(item =>
            !selectedQueueItems.some(selected => selected.id === item.id)
          ))
          setSelectedQueueItems([])
        }

        // Clear all slots
        setSheetData({
          top: getEmptySlotData(),
          middle: getEmptySlotData(),
          bottom: getEmptySlotData()
        })
        setActiveSlot('top')

        // Clear itemized mode line items and reset to simple mode
        setLineItems([])
        setCheckMode('simple')
      } catch (error) {
        setIsPrinting(false)
        if (wasInEditMode) setEditMode(true)
        alert(`Print error: ${error?.message || 'Unknown error'}`)
      }
    }, 250)
  }

  // Wrapper function that routes to single or sheet version
  const handlePrintAndRecord = async () => {
    if (activeProfile?.layoutMode === 'three_up') {
      return handlePrintAndRecordSheet()
    } else {
      return handlePrintAndRecordSingle()
    }
  }

  const resetModel = () => {
    showConfirm(
      'Reset All Settings?',
      'Reset all settings to defaults? This cannot be undone.',
      () => {
        setModel(DEFAULT_MODEL)
      }
    )
  }

  const templateName = useMemo(() => {
    const p = model.template?.path
    if (!p) return null
    const parts = String(p).split(/[\\/]/)
    return parts[parts.length - 1] || p
  }, [model.template?.path])

  // Auto-detect template fit mode based on aspect ratio
  // Full-page images (tall) cover the entire paper, check-only images (wide) fit at the top
  const isFullPageTemplate = templateMeta?.width && templateMeta?.height && (templateMeta.height / templateMeta.width > 1.2)
  const templateObjectFit = isFullPageTemplate ? 'cover' : 'contain'
  const templateBgSize = isFullPageTemplate ? 'cover' : 'contain'
  const templateBgPosition = isFullPageTemplate ? 'center' : 'top left'

  // Calculate if balance will go negative
  const currentData = getCurrentCheckData()
  const pendingAmount = sanitizeCurrencyInput(currentData.amount)
  const projectedBalance = hybridBalance - pendingAmount
  const isOverdrawn = pendingAmount > 0 && projectedBalance < 0

  // Calculate Y-offset for three-up mode
  const threeUpYOffset = activeProfile?.layoutMode === 'three_up'
    ? (threeUpSlot === 'top' ? 0 : threeUpSlot === 'middle' ? 3.66 : 7.33)
    : 0

  const downloadTemplate = () => {
    const headers = ['Date', 'Payee', 'Amount', 'Memo', 'GL Code', 'GL Description', 'External Memo', 'Internal Memo', 'Ledger', 'Check Number', 'Address']
    const csvContent = headers.join(',') + '\n'
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', 'check_import_template.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div
      className={`app ${isPrinting ? 'printing' : ''}`}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="topbar">

        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={logoImg} alt="CheckSpree" className="logo-img" style={{ height: '44px', width: 'auto' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#f1f5f9', lineHeight: 1.2 }}>CheckSpree</span>
            <span style={{ fontSize: '10px', color: '#64748b', opacity: 0.8 }}>Version {APP_VERSION}</span>
          </div>
        </div>

        {/* Ledger & History Tabs */}
        <div className="ledger-history-tabs">
          <button
            className={`tab-button ${showLedger && !showHistory ? 'active' : ''}`}
            onClick={() => { setShowLedger(true); setShowHistory(false); }}
          >
            <span className="tab-label">Total Balance</span>
            <span className={`tab-value ${(() => {
              const totalBalance = ledgers.reduce((sum, l) => sum + calculateHybridBalance(l.id), 0)
              return totalBalance < 0 ? 'negative' : ''
            })()}`}>
              {formatCurrency(ledgers.reduce((sum, l) => sum + calculateHybridBalance(l.id), 0))}
            </span>
          </button>
          <button
            className={`tab-button ${showHistory ? 'active' : ''}`}
            onClick={() => { setHistoryViewMode('all'); setShowHistory(true); setShowLedger(false); }}
          >
            <span className="tab-label">All History</span>
            <span className="tab-value">{checkHistory.length}</span>
          </button>
        </div>

        <div className="topbar-actions">
          <button className="btn ghost" onClick={downloadTemplate} title="Download CSV import template">
            <DownloadIcon /> Template
          </button>
          <button className="btn ghost" onClick={handleImport} title="Import checks from CSV">
            <UploadIcon /> Import
          </button>
          <button className="btn ghost" onClick={handleExport} title="Export check history">
            <DownloadIcon /> Export
          </button>
          <button
            className={`btn ghost ${preferences.adminLocked ? '' : 'active'}`}
            onClick={preferences.adminLocked ? handleUnlockRequest : handleLock}
            title={preferences.adminLocked ? 'Unlock admin settings' : 'Lock admin settings'}
          >
            {preferences.adminLocked ? '🔒' : '🔓'} Admin
          </button>
          {!preferences.adminLocked && (
            <>
              <button className="btn ghost" onClick={handleBackupData} title="Backup all data to file">
                💾 Backup
              </button>
              <button className="btn ghost" onClick={handleRestoreBackup} title="Restore data from backup file">
                📥 Restore
              </button>
              <button className="btn ghost" onClick={() => setEditMode((v) => !v)}>
                <span className={`status-dot ${editMode ? 'active' : ''}`} />
                Edit Layout
              </button>
              {editMode && (
                <label className="toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '0 12px' }}>
                  <input
                    type="checkbox"
                    checked={preferences.enableSnapping}
                    onChange={(e) => setPreferences(p => ({ ...p, enableSnapping: e.target.checked }))}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: 'var(--text)', whiteSpace: 'nowrap' }}>Snap to Grid</span>
                </label>
              )}
            </>
          )}


          <button className="btn secondary" onClick={handlePreviewPdf}>Preview</button>
          <button className="btn" onClick={() => {
            if (!data.payee?.trim()) {
              alert('Please enter a payee name')
              return
            }
            const amount = sanitizeCurrencyInput(data.amount)
            if (amount <= 0) {
              alert('Please enter a valid amount')
              return
            }
            recordCheck(data)
            clearForm()
            showToast('Check recorded to ledger!', 'success')
          }} title="Record without printing">
            <CheckIcon /> Record Only
          </button>
          <button className="btn primary" onClick={handlePrintAndRecord}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6V1H12V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="2" y="6" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 12V15H12V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Print & Record
          </button>
        </div>
      </div>

      <div className="layout">
        <div className="side">
          {/* Scrollable Content Area */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px' }}>
            {/* Unified Ledger Widget - Always Visible */}
            <section className="section">
              <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                {/* Active Ledger Selector */}
                <div style={{ marginBottom: '16px' }}>
                  <div
                    className="ledger-selector-trigger"
                    onClick={() => setShowLedgerManager(!showLedgerManager)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Ledger:</span>
                      <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{activeLedger?.name || 'Select Ledger'}</span>
                    </div>
                    <ChevronIcon open={showLedgerManager} />
                  </div>

                  {/* Ledger Manager */}
                  {showLedgerManager && (
                    <div className="ledger-dropdown-list" style={{
                      marginTop: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}>
                      {ledgers.map(l => {
                        const isEditing = editingLedgerName === l.id
                        const canEdit = !preferences.adminLocked || preferences.allowUserLedgerManagement

                        return (
                          <div key={l.id} style={{ borderBottom: '1px solid #334155' }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                backgroundColor: l.id === activeLedgerId ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                borderLeft: l.id === activeLedgerId ? '3px solid #3b82f6' : '3px solid transparent'
                              }}
                            >
                              <div
                                onClick={() => {
                                  setActiveLedgerId(l.id)
                                  setShowLedgerManager(false)
                                }}
                                style={{ flex: 1, cursor: 'pointer', fontWeight: l.id === activeLedgerId ? 600 : 400 }}
                              >
                                {l.name}
                              </div>

                              {canEdit && (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    className="btn-icon"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingLedgerName(isEditing ? null : l.id)
                                    }}
                                    title="Edit ledger settings"
                                    style={{ color: isEditing ? '#3b82f6' : '#94a3b8' }}
                                  >
                                    <PencilIcon />
                                  </button>
                                  {ledgers.length > 1 && (!preferences.adminLocked || preferences.allowUserLedgerManagement) && (
                                    <button
                                      className="btn-icon danger"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        deleteLedger(l.id)
                                      }}
                                      title="Delete ledger"
                                    >
                                      <TrashIcon />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Inline Edit Form */}
                            {isEditing && (
                              <div style={{
                                padding: '12px',
                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                borderTop: '1px solid #334155'
                              }}>
                                {/* Name Edit */}
                                <div style={{ marginBottom: '12px' }}>
                                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Ledger Name</label>
                                  <input
                                    className="profile-name-input"
                                    defaultValue={l.name}
                                    autoFocus
                                    onBlur={(e) => {
                                      if (e.target.value.trim()) renameLedger(l.id, e.target.value.trim(), false)
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && e.target.value.trim()) {
                                        renameLedger(l.id, e.target.value.trim())
                                        setEditingLedgerName(null)
                                      } else if (e.key === 'Escape') {
                                        setEditingLedgerName(null)
                                      }
                                    }}
                                    style={{ width: '100%' }}
                                  />
                                </div>

                                {/* Initial Balance - ATM-style input */}
                                <div style={{ marginBottom: '12px' }} onClick={(e) => e.stopPropagation()}>
                                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Initial Balance</label>
                                  <div className="input-prefix">
                                    <span>$</span>
                                    <input
                                      key={`balance-input-${l.id}`}
                                      type="text"
                                      inputMode="numeric"
                                      defaultValue={l.startingBalance ? (l.startingBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                      placeholder="0.00"
                                      onFocus={(e) => e.target.select()}
                                      onKeyDown={(e) => {
                                        // Check if entire text is selected
                                        const isAllSelected = e.target.selectionStart === 0 && e.target.selectionEnd === e.target.value.length

                                        // ATM-style logic: get current value as cents
                                        const currentVal = parseFloat(e.target.value.replace(/,/g, '')) || 0
                                        let cents = Math.round(currentVal * 100)

                                        if (e.key === 'Enter') {
                                          e.target.blur()
                                          return
                                        } else if (e.key === 'Escape') {
                                          setEditingLedgerName(null)
                                          return
                                        } else if (e.key === 'Backspace') {
                                          e.preventDefault()
                                          // If all selected, clear to zero
                                          if (isAllSelected) {
                                            cents = 0
                                          } else {
                                            // Remove rightmost digit
                                            cents = Math.floor(cents / 10)
                                          }
                                        } else if (e.key >= '0' && e.key <= '9') {
                                          e.preventDefault()
                                          // If all selected, start fresh with this digit
                                          if (isAllSelected) {
                                            cents = parseInt(e.key, 10)
                                          } else if (cents < 99999999999) { // Max $999,999,999.99
                                            // Shift left and add new digit
                                            cents = (cents * 10) + parseInt(e.key, 10)
                                          }
                                        } else if (!['Tab', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(e.key)) {
                                          e.preventDefault()
                                          return
                                        } else {
                                          return // Let navigation keys through
                                        }

                                        // Update display and state
                                        const newVal = cents / 100
                                        e.target.value = newVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                        setLedgers(ledgers.map(ledger =>
                                          ledger.id === l.id ? { ...ledger, startingBalance: newVal } : ledger
                                        ))
                                      }}
                                      onBlur={(e) => {
                                        // Ensure properly formatted on blur
                                        const val = parseFloat(e.target.value.replace(/,/g, '')) || 0
                                        e.target.value = val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                      }}
                                      style={{
                                        width: '100%',
                                        textAlign: 'right'
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {(!preferences.adminLocked || preferences.allowUserLedgerManagement) && (
                        <button
                          className="btn ghost full-width"
                          onClick={createNewLedger}
                          style={{ borderRadius: 0, borderTop: '1px solid #334155', justifyContent: 'center', padding: '10px' }}
                        >
                          <PlusIcon /> New Ledger
                        </button>
                      )}

                      {!preferences.adminLocked && (
                        <div style={{
                          padding: '12px',
                          borderTop: '1px solid #334155',
                          backgroundColor: 'rgba(0, 0, 0, 0.2)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 500 }}>User Management</div>
                              <div style={{ fontSize: '10px', color: '#64748b' }}>Allow standard users to manage ledgers</div>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={preferences.allowUserLedgerManagement}
                                onChange={(e) => {
                                  setPreferences(prev => ({ ...prev, allowUserLedgerManagement: !prev.allowUserLedgerManagement }))
                                }}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Balance Display */}
                <div style={{ borderTop: '1px solid #334155', paddingTop: '16px', marginBottom: '16px' }}>
                  {editingBalance ? (
                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center'
                    }}>
                      <div style={{ flexGrow: 1 }}>
                        <AtmCurrencyInput
                          value={tempBalance}
                          onChange={setTempBalance}
                          autoFocus
                        />
                      </div>
                      <button
                        className="btn-icon"
                        onClick={updateBalance}
                        title="Save balance"
                        style={{
                          flexShrink: 0,
                          width: '40px',
                          height: '40px',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <CheckIcon />
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Current Balance</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <div
                          onClick={() => {
                            setHistoryViewMode('current')
                            setShowHistory(true)
                            setShowLedger(false)
                          }}
                          style={{
                            cursor: 'pointer',
                            fontSize: '32px',
                            fontWeight: '700',
                            color: hybridBalance < 0 ? '#ef4444' : '#10b981'
                          }}
                        >
                          {formatCurrency(hybridBalance)}
                        </div>
                        <button
                          onClick={() => {
                            setDepositData({
                              date: getLocalDateString(),
                              description: '',
                              amount: ''
                            })
                            setShowDepositModal(true)
                          }}
                          className="btn-icon"
                          title="Add Deposit/Adjustment"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '20px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                          }}
                        >
                          +
                        </button>
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        {(!preferences.adminLocked || preferences.allowUserLedgerManagement) ? 'Click to view ledger history' : 'Click to view • Use + to adjust'}
                      </div>
                    </div>
                  )}

                  {pendingAmount > 0 && (
                    <div style={{
                      marginTop: '12px',
                      padding: '8px 12px',
                      backgroundColor: isOverdrawn ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                      fontWeight: '500',
                      border: isOverdrawn ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#e2e8f0'
                    }}>
                      <span>After this check:</span>
                      <span style={{ color: isOverdrawn ? '#f87171' : '#34d399', fontWeight: '600' }}>
                        {formatCurrency(projectedBalance)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Recent History */}
                <div style={{ borderTop: '1px solid #334155', paddingTop: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>
                    Recent Activity
                  </h4>
                  {checkHistory.filter(c => c.ledgerId === activeLedgerId).length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '12px 0' }}>
                      No recent activity
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                      {checkHistory.filter(c => c.ledgerId === activeLedgerId).slice(0, 2).map(entry => (
                        <div
                          key={entry.id}
                          onClick={() => entry.type !== 'deposit' && fillFromHistoryEntry(entry)}
                          title={entry.type !== 'deposit' ? 'Click to fill form with this check' : 'Deposits cannot be copied'}
                          style={{
                            position: 'relative',
                            padding: '8px 40px 8px 10px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '6px',
                            fontSize: '13px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            cursor: entry.type !== 'deposit' ? 'pointer' : 'default',
                            transition: 'background-color 0.15s, border-color 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            if (entry.type !== 'deposit') {
                              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'
                              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                          }}
                        >
                          <div style={{ marginBottom: '4px' }}>
                            <div style={{ fontWeight: '500', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {entry.payee}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {formatDate(entry.date)}
                            </div>
                          </div>
                          <div style={{ fontWeight: '600', color: entry.type === 'deposit' ? '#10b981' : '#f87171', whiteSpace: 'nowrap' }}>
                            {entry.type === 'deposit' ? '+' : '-'}{formatCurrency(entry.amount)}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteHistoryEntry(entry.id) }}
                            title="Delete and restore amount"
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              color: '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* View History Button */}
                  {checkHistory.filter(c => c.ledgerId === activeLedgerId).length > 0 && (
                    <button
                      className="btn btn-sm full-width"
                      onClick={() => { setHistoryViewMode('current'); setShowHistory(true); setShowLedger(false); }}
                    >
                      View Ledger History ({checkHistory.filter(c => c.ledgerId === activeLedgerId).length})
                    </button>
                  )}
                </div>
              </div >
            </section >

            {/* Import Queue Panel */}
            {
              showImportQueue && importQueue.length > 0 && (
                <section className="section-import">
                  <div className="card card-import">
                    <div className="import-header">
                      <h2>Import Queue ({importQueue.length})</h2>
                      <button className="btn-icon" onClick={() => setShowImportQueue(false)}>×</button>
                    </div>

                    <div className="import-actions">
                      {/* Primary Action - Full Width */}
                      <button className="btn btn-sm primary full-width" onClick={handleBatchPrintAndRecord}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M4 6V1H12V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <rect x="2" y="6" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M4 12V15H12V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Print & Record All
                      </button>

                      {/* Secondary Actions - Split Row */}
                      <div className="import-actions-row">
                        <button className="btn btn-sm" onClick={processAllQueue}>
                          <CheckIcon /> Record Only
                        </button>
                        <button className="btn btn-sm danger" onClick={clearQueue}>
                          <TrashIcon /> Clear Queue
                        </button>
                      </div>
                    </div>

                    <div className="import-list">
                      {importQueue.map(item => {
                        const isSelected = selectedQueueItems.some(selected => selected.id === item.id)
                        return (
                          <div
                            key={item.id}
                            className={`import-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => loadFromQueue(item)}
                          >
                            <div className="import-main">
                              <span className="import-payee">{item.payee || '(no payee)'}</span>
                              <span className="import-amount">{item.amount ? formatCurrency(sanitizeCurrencyInput(item.amount)) : '-'}</span>
                            </div>
                            <div className="import-meta">
                              {item.date && <span>{item.date}</span>}
                              {item.memo && <span>{item.memo}</span>}
                            </div>
                            <button
                              className="btn btn-sm danger"
                              onClick={(e) => {
                                e.stopPropagation()
                                setImportQueue(prev => prev.filter(i => i.id !== item.id))
                                setSelectedQueueItems(prev => prev.filter(i => i.id !== item.id))
                              }}
                              title="Remove from queue"
                              style={{ marginLeft: 'auto', minWidth: 'fit-content', padding: '4px 8px', cursor: 'pointer' }}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    <p className="hint">
                      {activeProfile?.layoutMode === 'three_up'
                        ? 'Click items to select (up to 3 for sheet)'
                        : 'Click an item to load it into the form'}
                    </p>
                  </div>
                </section>
              )
            }

            {/* Profile Selector - Always Visible */}
            <section className="section">
              <h3>Check Profile</h3>
              <div className="card">
                <div className="profile-bar">
                  <select
                    className="profile-select"
                    value={activeProfileId}
                    onChange={(e) => loadProfile(e.target.value)}
                  >
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.id === activeProfileId && hasUnsavedChanges ? '●' : ''}
                      </option>
                    ))}
                  </select>
                  {!preferences.adminLocked && (
                    <button className="btn-icon" onClick={() => setShowProfileManager(!showProfileManager)} title="Rename or delete profiles">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="3" r="1.5" fill="currentColor" />
                        <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                        <circle cx="8" cy="13" r="1.5" fill="currentColor" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Layout Mode Selector - Admin Only */}
                {!preferences.adminLocked && activeProfile && (
                  <div className="field" style={{ marginTop: '12px' }}>
                    <label>Layout Mode</label>
                    <select
                      value={activeProfile.layoutMode || 'standard'}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text)',
                        fontSize: '14px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                      onChange={(e) => {
                        const newMode = e.target.value
                        setProfiles(profiles.map(p =>
                          p.id === activeProfileId
                            ? { ...p, layoutMode: newMode }
                            : p
                        ))
                        // Auto-adjust check height for three_up mode
                        if (newMode === 'three_up' && model.layout.heightIn !== 3.66) {
                          setModel(m => ({
                            ...m,
                            layout: { ...m.layout, heightIn: 3.66 }
                          }))
                        }
                      }}
                    >
                      <option value="standard" style={{ backgroundColor: '#1e293b', color: '#f1f5f9' }}>Standard (Check + 2 Stubs)</option>
                      <option value="three_up" style={{ backgroundColor: '#1e293b', color: '#f1f5f9' }}>3-Up (3 Checks per Page)</option>
                    </select>
                  </div>
                )}

                {/* Admin-only action buttons */}
                {!preferences.adminLocked && (
                  <>
                    <div className="profile-actions-bar">
                      <button className="btn btn-sm" onClick={createNewProfile}>
                        <PlusIcon /> New
                      </button>
                      <button
                        className={`btn btn-sm ${profileSaved ? 'success' : hasUnsavedChanges ? 'primary pulse' : 'primary'}`}
                        onClick={saveCurrentProfile}
                      >
                        {hasUnsavedChanges && <span className="unsaved-dot">●</span>}
                        <CheckIcon /> {profileSaved ? 'Saved!' : 'Save'}
                      </button>
                    </div>

                    {/* Collapsible profile manager for rename/delete */}
                    {showProfileManager && (
                      <div className="profile-manager" style={{ marginTop: '12px' }}>
                        <div className="profile-list">
                          {profiles.map(p => (
                            <div key={p.id} className={`profile-item ${p.id === activeProfileId ? 'active' : ''}`}>
                              {editingProfileName === p.id ? (
                                <input
                                  className="profile-name-input"
                                  defaultValue={p.name}
                                  autoFocus
                                  onBlur={(e) => {
                                    if (e.target.value.trim()) {
                                      renameProfile(p.id, e.target.value.trim())
                                    } else {
                                      setEditingProfileName(null)
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                      renameProfile(p.id, e.target.value.trim())
                                    } else if (e.key === 'Escape') {
                                      setEditingProfileName(null)
                                    }
                                  }}
                                />
                              ) : (
                                <span className="profile-name">
                                  {p.name}
                                </span>
                              )}
                              <div className="profile-actions">
                                <button
                                  className="btn-icon-sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingProfileName(p.id)
                                  }}
                                  title="Rename"
                                >
                                  ✎
                                </button>
                                {profiles.length > 1 && (
                                  <button
                                    className="btn-icon-sm danger"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteProfile(p.id)
                                    }}
                                    title="Delete"
                                  >
                                    <TrashIcon />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* Check Data - Main focus */}
            <section className="section-main">
              {/* Sheet Editor Tabs - only in three_up mode */}
              {activeProfile?.layoutMode === 'three_up' && (
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: '16px'
                }}>
                  {['top', 'middle', 'bottom'].map(slot => {
                    const slotData = sheetData[slot]
                    const isEmpty = isSlotEmpty(slotData)
                    const isActive = activeSlot === slot

                    return (
                      <button
                        key={slot}
                        onClick={() => setActiveSlot(slot)}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          background: isActive ? 'var(--accent-soft)' : 'transparent',
                          color: isActive ? 'var(--accent)' : 'var(--text)',
                          border: 'none',
                          borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: isActive ? '600' : '400',
                          transition: 'all 0.2s',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.target.style.background = 'var(--surface-hover)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.target.style.background = 'transparent'
                          }
                        }}
                      >
                        {slot.charAt(0).toUpperCase() + slot.slice(1)}
                        {!isEmpty && (
                          <span style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: 'var(--success)'
                          }} />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Clear Slot Buttons (three-up mode only) */}
              {activeProfile?.layoutMode === 'three_up' && (
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <button
                    className="btn btn-sm"
                    onClick={clearCurrentSlot}
                    style={{
                      flex: 1,
                      background: 'var(--surface-hover)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)'
                    }}
                    title="Clear the current slot"
                  >
                    Clear {activeSlot.charAt(0).toUpperCase() + activeSlot.slice(1)}
                  </button>
                  <button
                    className="btn btn-sm danger"
                    onClick={clearAllSlots}
                    style={{ flex: 1 }}
                    title="Clear all three slots"
                  >
                    Clear All
                  </button>
                </div>
              )}

              <h2>Check Details</h2>
              <div className="card card-main" style={{ overflow: 'visible' }}>
                <div className="field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={getCurrentCheckData().date || ''}
                    onChange={(e) => updateCurrentCheckData({ date: e.target.value })}
                  />
                </div>
                <div className="field">
                  <PayeeAutocomplete
                    value={getCurrentCheckData().payee || ''}
                    onChange={(newPayee) => {
                      const currentAddress = getCurrentCheckData().address || ''
                      // Auto-populate address if empty or if it only contains the old payee name
                      // But effectively, simplified: just default to payee name if address empty
                      // or if user wants it sync'd. For now, we'll append/replace first line logic
                      // simpler: If address is empty, set it to payee.
                      // If it's not empty, we leave it alone (user might have edited it).
                      // User requested "automatically added to the top of the field"
                      // So we should ensure the first line matches the payee.

                      const lines = currentAddress.split('\n')
                      if (lines.length === 0 || !currentAddress.trim()) {
                        updateCurrentCheckData({ payee: newPayee, address: newPayee })
                      } else {
                        // Update first line to match new payee
                        lines[0] = newPayee
                        updateCurrentCheckData({ payee: newPayee, address: lines.join('\n') })
                      }
                    }}
                    checkHistory={checkHistory}
                    placeholder="Recipient name"
                  />
                </div>
                {/* Address Field (for Window Envelopes) */}
                <div className="field">
                  <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Address</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'normal' }}>Window Envelope</span>
                  </label>
                  <AddressInput
                    value={getCurrentCheckData().address || ''}
                    onChange={(val) => updateCurrentCheckData({ address: val })}
                    history={checkHistory}
                    placeholder="Recipient Address"
                  />
                </div>
                <div className="field">
                  <label>GL Code & Description</label>
                  <div style={{ display: 'flex', gap: '0' }}>
                    <div style={{ flex: '0 0 120px' }}>
                      <GlCodeInput
                        value={getCurrentCheckData().glCode || ''}
                        onChange={(val) => {
                          console.log('DEBUG: GlCodeInput onChange', val)
                          if (val && typeof val === 'object') {
                            // Object selection from dropdown
                            updateCurrentCheckData({
                              glCode: val.code || '',
                              glDescription: val.description || val.desc || val.glDescription || ''
                            })
                          } else {
                            // String input (typing)
                            const newCode = val || ''
                            const updates = { glCode: newCode }

                            // Rule: If GL Code is cleared, clear description
                            if (!newCode) {
                              updates.glDescription = ''
                            }
                            // Optional: Could attempt lookup here if we wanted auto-fill on type

                            updateCurrentCheckData(updates)
                          }
                        }}
                        glCodes={compiledGlCodes}
                        placeholder="Code"
                        onClick={() => { }} // Dummy click handler to ensure click works if needed, handled by component now
                        style={{
                          borderTopRightRadius: 0,
                          borderBottomRightRadius: 0,
                          borderRight: 'none',
                          width: '100%',
                          padding: '6px 10px',
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#f1f5f9',
                          fontSize: '13px',
                          outline: 'none',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => {
                          e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'
                          e.target.style.borderColor = 'rgba(56, 189, 248, 0.5)'
                          // We need to maintain boundary with adjacent input
                          e.target.style.borderRight = 'none'
                        }}
                        onBlur={(e) => {
                          e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.2)'
                          e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                          e.target.style.borderRight = 'none'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={getCurrentCheckData().glDescription || ''}
                        onChange={(e) => updateCurrentCheckData({ glDescription: e.target.value })}
                        placeholder="Description"
                        style={{
                          borderTopLeftRadius: 0,
                          borderBottomLeftRadius: 0,
                          width: '100%',
                          padding: '6px 10px',
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#f1f5f9',
                          fontSize: '13px',
                          outline: 'none',
                          transition: 'all 0.2s',
                          borderLeft: 'none'
                        }}
                        onFocus={(e) => {
                          e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'
                          e.target.style.borderColor = 'rgba(56, 189, 248, 0.5)'
                          e.target.style.borderLeft = 'none'
                        }}
                        onBlur={(e) => {
                          e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.2)'
                          e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                          e.target.style.borderLeft = 'none'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Check Builder Mode Toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Mode:</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setCheckMode('simple')
                        // When switching to simple, keep the current calculated amount if in itemized mode
                        if (checkMode === 'itemized' && lineItems.length > 0) {
                          const total = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
                          updateCurrentCheckData({ amount: total.toFixed(2) })
                        }
                      }}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '4px',
                        border: checkMode === 'simple' ? '1px solid #3b82f6' : '1px solid #475569',
                        backgroundColor: checkMode === 'simple' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                        color: checkMode === 'simple' ? '#60a5fa' : '#94a3b8',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Simple
                    </button>
                    <button
                      onClick={() => setCheckMode('itemized')}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '4px',
                        border: checkMode === 'itemized' ? '1px solid #3b82f6' : '1px solid #475569',
                        backgroundColor: checkMode === 'itemized' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                        color: checkMode === 'itemized' ? '#60a5fa' : '#94a3b8',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Itemized
                    </button>
                  </div>
                </div>

                {checkMode === 'simple' ? (
                  // Simple Mode: ATM-style Amount Entry
                  <div className="field-row">
                    <div className="field">
                      <label>Amount</label>
                      <AtmCurrencyInput
                        value={getCurrentCheckData().amount || ''}
                        onChange={(newAmount) => updateCurrentCheckData({ amount: newAmount })}
                        isWarning={isOverdrawn}
                      />
                    </div>
                  </div>
                ) : (
                  // Itemized Mode: Line Items Table
                  <div className="field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label>Amount (Calculated from Line Items)</label>
                      <span style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#10b981',
                        padding: '4px 12px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        borderRadius: '4px',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        {formatCurrency(lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0))}
                      </span>
                    </div>

                    {/* Line Items Table */}
                    <div style={{
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      marginBottom: '8px'
                    }}>
                      {lineItems.length === 0 ? (
                        <div style={{
                          padding: '20px',
                          textAlign: 'center',
                          color: '#64748b',
                          fontSize: '13px'
                        }}>
                          No line items yet. Click "Add Item" below.
                        </div>
                      ) : (
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                          {lineItems.map((item, index) => (
                            <div key={item.id} style={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 1fr auto',
                              gap: '8px',
                              padding: '8px',
                              borderBottom: index < lineItems.length - 1 ? '1px solid #334155' : 'none',
                              alignItems: 'center',
                              backgroundColor: index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent'
                            }}>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => {
                                  const updated = lineItems.map(li =>
                                    li.id === item.id ? { ...li, description: e.target.value } : li
                                  )
                                  setLineItems(updated)
                                }}
                                placeholder="Description / Invoice #"
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  borderRadius: '4px',
                                  color: 'var(--text)',
                                  fontSize: '13px',
                                  width: '100%',
                                  outline: 'none',
                                  transition: 'all 0.2s'
                                }}
                                onFocus={(e) => {
                                  e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'
                                  e.target.style.borderColor = 'rgba(56, 189, 248, 0.5)'
                                  e.target.style.boxShadow = '0 0 0 2px rgba(56, 189, 248, 0.2)'
                                }}
                                onBlur={(e) => {
                                  e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.2)'
                                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                                  e.target.style.boxShadow = 'none'
                                }}
                              />
                              <input
                                type="text"
                                value={item.amount}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9.]/g, '')
                                  const updated = lineItems.map(li =>
                                    li.id === item.id ? { ...li, amount: val } : li
                                  )
                                  setLineItems(updated)
                                }}
                                placeholder="Amount"
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  borderRadius: '4px',
                                  color: 'var(--text)',
                                  fontSize: '13px',
                                  textAlign: 'right',
                                  width: '100%',
                                  outline: 'none',
                                  transition: 'all 0.2s'
                                }}
                                onFocus={(e) => {
                                  e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'
                                  e.target.style.borderColor = 'rgba(56, 189, 248, 0.5)'
                                  e.target.style.boxShadow = '0 0 0 2px rgba(56, 189, 248, 0.2)'
                                }}
                                onBlur={(e) => {
                                  e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.2)'
                                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                                  e.target.style.boxShadow = 'none'
                                }}
                              />
                              <button
                                onClick={() => {
                                  setLineItems(lineItems.filter(li => li.id !== item.id))
                                }}
                                title="Remove item"
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '4px',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '16px',
                                  fontWeight: '700',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setLineItems([...lineItems, { id: nextLineItemId, description: '', amount: '' }])
                        setNextLineItemId(nextLineItemId + 1)
                      }}
                      className="btn btn-sm"
                      style={{ width: '100%' }}
                    >
                      + Add Item
                    </button>
                  </div>
                )}
                {isOverdrawn && (
                  <div className="overdraft-warning">
                    ⚠️ This will overdraw your account
                  </div>
                )}
                <div className="field">
                  <label>Amount in Words</label>
                  <input value={getCurrentCheckData().amountWords || ''} readOnly className="readonly" />
                </div>
                <div className="field">
                  <label>Memo</label>
                  <input
                    value={getCurrentCheckData().memo || ''}
                    onChange={(e) => updateCurrentCheckData({ memo: e.target.value })}
                    placeholder="Optional note"
                  />
                </div>

                {/* Check Number Input Field */}
                {preferences.showCheckNumber && (
                  <div className="field">
                    <label>Check Number</label>
                    <input
                      value={getCurrentCheckData().checkNumber || activeProfile.nextCheckNumber || ''}
                      onChange={(e) => updateCurrentCheckData({ checkNumber: e.target.value })}
                      placeholder="Check #"
                    />
                  </div>
                )}

                {/* External/Internal Memo - Only in standard mode (not in three-up) */}
                {activeProfile?.layoutMode !== 'three_up' && (
                  <>
                    <div className="field">
                      <label>External Memo (Payee Copy)</label>
                      <input
                        value={getCurrentCheckData().external_memo || ''}
                        onChange={(e) => updateCurrentCheckData({ external_memo: e.target.value })}
                        placeholder="Public memo for payee stub"
                      />
                    </div>
                    <div className="field">
                      <label>Internal Memo (Bookkeeper Copy)</label>
                      <input
                        value={getCurrentCheckData().internal_memo || ''}
                        onChange={(e) => updateCurrentCheckData({ internal_memo: e.target.value })}
                        placeholder="Private memo for bookkeeper stub"
                      />
                    </div>
                  </>
                )}
                <div className="field">
                  <label>Line Items / Detail</label>
                  <textarea
                    value={getCurrentCheckData().line_items_text || ''}
                    onChange={(e) => updateCurrentCheckData({ line_items_text: e.target.value })}
                    placeholder="Enter line items, one per line (e.g., Item 1 - $100.00)"
                    rows="4"
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      resize: 'vertical',
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '4px',
                      color: 'var(--text)',
                      width: '100%',
                      outline: 'none',
                      padding: '8px',
                      transition: 'all 0.2s'
                    }}
                  />
                  <small style={{ color: '#888', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    This will appear in the Line Items section on the check and Remittance Advice on stubs
                  </small>
                </div>
              </div>
            </section>

            {/* Check Display Preferences */}
            {
              !preferences.adminLocked && (
                <section className="section">
                  <h3>Check Display</h3>
                  <div className="card">
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={!!preferences.showCheckNumber}
                          onChange={(e) => {
                            const isChecked = e.target.checked
                            setPreferences(p => ({ ...p, showCheckNumber: isChecked }))
                            // In three-up mode, sync autoIncrementCheckNumbers with showCheckNumber
                            if (activeProfile?.layoutMode === 'three_up') {
                              setAutoIncrementCheckNumbers(isChecked)
                            }
                          }}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">
                          {activeProfile?.layoutMode === 'three_up' ? 'Show Check Number & Auto-increment' : 'Show Check Number'}
                        </span>
                      </label>
                    </div>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={!!preferences.showDate}
                          onChange={(e) => setPreferences(p => ({ ...p, showDate: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show Date</span>
                      </label>
                    </div>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={!!preferences.showGlOnCheck}
                          onChange={(e) => setPreferences(p => ({ ...p, showGlOnCheck: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show GL Code on Check</span>
                      </label>
                    </div>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={!!preferences.showAddressOnCheck}
                          onChange={(e) => setPreferences(p => ({ ...p, showAddressOnCheck: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show Address (Window Envelope)</span>
                      </label>
                    </div>
                    <small style={{ color: '#888', fontSize: '11px', marginTop: '8px', display: 'block' }}>
                      {activeProfile?.layoutMode === 'three_up'
                        ? 'Toggle visibility of fields on all checks. Hide check numbers if using pre-numbered check stock.'
                        : 'Toggle visibility of fields on the check. Hide check numbers if using pre-numbered check stock.'}
                    </small>
                  </div>
                </section>
              )
            }

            {/* Text & Font Settings */}
            {
              !preferences.adminLocked && (
                <section className="section">
                  <h3>Text Settings</h3>
                  <div className="card">
                    <div className="field">
                      <label>Font Family</label>
                      <select
                        value={preferences.fontFamily}
                        onChange={(e) => setPreferences(p => ({ ...p, fontFamily: e.target.value }))}
                      >
                        {AVAILABLE_FONTS.map(font => (
                          <option key={font.id} value={font.id}>{font.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Check Font Size (pt)</label>
                      <div className="field-row" style={{ gap: '8px', alignItems: 'center' }}>
                        <input
                          type="range"
                          min="6"
                          max="20"
                          step="0.5"
                          value={preferences.checkFontSizePt}
                          onChange={(e) => setPreferences(p => ({ ...p, checkFontSizePt: parseFloat(e.target.value) }))}
                          style={{ flex: 1 }}
                        />
                        <input
                          type="number"
                          min="6"
                          max="20"
                          step="0.5"
                          value={preferences.checkFontSizePt}
                          onChange={(e) => setPreferences(p => ({ ...p, checkFontSizePt: parseFloat(e.target.value) || 12 }))}
                          style={{ width: '70px' }}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label>Stub Font Size (pt)</label>
                      <div className="field-row" style={{ gap: '8px', alignItems: 'center' }}>
                        <input
                          type="range"
                          min="6"
                          max="16"
                          step="0.5"
                          value={preferences.stubFontSizePt}
                          onChange={(e) => setPreferences(p => ({ ...p, stubFontSizePt: parseFloat(e.target.value) }))}
                          style={{ flex: 1 }}
                        />
                        <input
                          type="number"
                          min="6"
                          max="16"
                          step="0.5"
                          value={preferences.stubFontSizePt}
                          onChange={(e) => setPreferences(p => ({ ...p, stubFontSizePt: parseFloat(e.target.value) || 10 }))}
                          style={{ width: '70px' }}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label>Label Size: {preferences.labelSize}px</label>
                      <input
                        type="range"
                        min="7"
                        max="14"
                        step="1"
                        value={preferences.labelSize}
                        onChange={(e) => setPreferences(p => ({ ...p, labelSize: parseInt(e.target.value) }))}
                      />
                    </div>
                    {/* Date Builder */}
                    <div className="field">
                      <label>Date Format Builder</label>
                      <div className="field-row" style={{ gap: '8px', alignItems: 'center' }}>
                        <select
                          value={preferences.dateSlot1}
                          onChange={(e) => setPreferences(p => ({ ...p, dateSlot1: e.target.value }))}
                          title="Slot 1"
                          style={{ flex: 1 }}
                        >
                          <option value="MM">MM</option>
                          <option value="DD">DD</option>
                          <option value="YY">YY</option>
                          <option value="YYYY">YYYY</option>
                          <option value="Empty">Empty</option>
                        </select>
                        <select
                          value={preferences.dateSeparator}
                          onChange={(e) => setPreferences(p => ({ ...p, dateSeparator: e.target.value }))}
                          title="Separator"
                          style={{ width: '60px' }}
                        >
                          <option value="/">/</option>
                          <option value="-">-</option>
                          <option value=".">.</option>
                          <option value="Empty">None</option>
                        </select>
                        <select
                          value={preferences.dateSlot2}
                          onChange={(e) => setPreferences(p => ({ ...p, dateSlot2: e.target.value }))}
                          title="Slot 2"
                          style={{ flex: 1 }}
                        >
                          <option value="MM">MM</option>
                          <option value="DD">DD</option>
                          <option value="YY">YY</option>
                          <option value="YYYY">YYYY</option>
                          <option value="Empty">Empty</option>
                        </select>
                        <select
                          value={preferences.dateSeparator}
                          onChange={(e) => setPreferences(p => ({ ...p, dateSeparator: e.target.value }))}
                          title="Separator"
                          style={{ width: '60px' }}
                        >
                          <option value="/">/</option>
                          <option value="-">-</option>
                          <option value=".">.</option>
                          <option value="Empty">None</option>
                        </select>
                        <select
                          value={preferences.dateSlot3}
                          onChange={(e) => setPreferences(p => ({ ...p, dateSlot3: e.target.value }))}
                          title="Slot 3"
                          style={{ flex: 1 }}
                        >
                          <option value="MM">MM</option>
                          <option value="DD">DD</option>
                          <option value="YY">YY</option>
                          <option value="YYYY">YYYY</option>
                          <option value="Empty">Empty</option>
                        </select>
                      </div>
                      <small style={{ color: '#888', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                        Build your date format: Slot 1 + Sep + Slot 2 + Sep + Slot 3
                      </small>
                    </div>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={preferences.useLongDate}
                          onChange={(e) => setPreferences(p => ({ ...p, useLongDate: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Use Long Written Date</span>
                      </label>
                      <small style={{ color: '#888', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                        Enable for full format (e.g., "January 7, 2026"). Overrides date builder.
                      </small>
                    </div>
                  </div>
                </section>
              )
            }

            {/* Stub Management - Payee Copy */}
            {
              model.layout.stub1Enabled && activeProfile?.layoutMode !== 'three_up' && (
                <section className="section">
                  <div className="stub-section">
                    <div className="stub-header">
                      <div className="stub-title">
                        <span>Payee Copy Stub</span>
                        <span className="stub-badge">Stub 1</span>
                      </div>
                      <div className="stub-controls">
                        <button
                          className={`stub-toggle ${showStub1Labels ? 'active' : ''}`}
                          onClick={() => setShowStub1Labels(!showStub1Labels)}
                          title="Show/hide friendly field labels on check"
                        >
                          {showStub1Labels ? '👁' : '👁‍🗨'} Labels
                        </button>
                        <button
                          className="btn-icon-sm danger"
                          onClick={() => ensureStub('stub1', false)}
                          title="Remove this stub"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                    <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
                      Fields auto-sync from Check Details. Edit to customize (changes above will overwrite).
                    </p>
                    <div className="stub-group">
                      <div className="field-row">
                        <div className="field">
                          <label>Date (Synced)</label>
                          <input
                            value={activeProfile?.layoutMode === 'three_up' ? sheetData[activeSlot]?.date : data.date}
                            readOnly
                            className="readonly"
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer' }}
                            title="Date is synced from the main check"
                            onClick={() => document.querySelector('input[type="date"]')?.focus()} // Focus main date picker on click
                          />
                        </div>
                        <div className="field">
                          <label>Amount</label>
                          <input value={data.stub1_amount || ''} onChange={(e) => setData((p) => ({ ...p, stub1_amount: e.target.value }))} />
                        </div>
                      </div>
                      <div className="field">
                        <label>Payee</label>
                        <input value={data.stub1_payee || ''} onChange={(e) => setData((p) => ({ ...p, stub1_payee: e.target.value }))} />
                      </div>
                      <div className="field">
                        <label>Memo (External)</label>
                        <input value={data.stub1_memo || ''} onChange={(e) => setData((p) => ({ ...p, stub1_memo: e.target.value }))} />
                      </div>
                    </div>

                    {/* Stub Preferences */}
                    {!preferences.adminLocked && (
                      <div className="stub-group" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>Stub Preferences</h4>
                        <div className="field">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={preferences.stub1ShowLedger}
                              onChange={(e) => setPreferences(p => ({ ...p, stub1ShowLedger: e.target.checked }))}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">Show Ledger Snapshot</span>
                          </label>
                        </div>
                        <div className="field">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={!!preferences.showAddressOnStub1}
                              onChange={(e) => setPreferences(p => ({ ...p, showAddressOnStub1: e.target.checked }))}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">Show Address Block</span>
                          </label>
                        </div>
                        <div className="field">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={preferences.stub1ShowApproved}
                              onChange={(e) => setPreferences(p => ({ ...p, stub1ShowApproved: e.target.checked }))}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">Show Approved By</span>
                          </label>
                        </div>
                        <div className="field">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={preferences.stub1ShowGLCode}
                              onChange={(e) => setPreferences(p => ({ ...p, stub1ShowGLCode: e.target.checked }))}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">Show GL Code</span>
                          </label>
                        </div>
                        <div className="field">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={preferences.stub1ShowLineItems}
                              onChange={(e) => setPreferences(p => ({ ...p, stub1ShowLineItems: e.target.checked }))}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">Show Line Items</span>
                          </label>
                        </div>
                        <div className="field">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={preferences.stub1ShowCheckNumber}
                              onChange={(e) => setPreferences(p => ({ ...p, stub1ShowCheckNumber: e.target.checked }))}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">Show Check Number</span>
                          </label>
                        </div>
                        <div className="field">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={preferences.stub1ShowDate}
                              onChange={(e) => setPreferences(p => ({ ...p, stub1ShowDate: e.target.checked }))}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">Show Date</span>
                          </label>
                        </div>
                        <small style={{ color: '#888', fontSize: '11px', marginTop: '8px', display: 'block' }}>
                          Toggle which fields appear on the Payee Copy stub
                        </small>
                      </div>
                    )}
                  </div>
                </section>
              )
            }

            {/* Stub Management - Bookkeeper Copy */}
            {
              model.layout.stub2Enabled && activeProfile?.layoutMode !== 'three_up' && (
                <section className="section">
                  <div className="stub-section">
                    <div className="stub-header">
                      <div className="stub-title">
                        <span>Bookkeeper Copy Stub</span>
                        <span className="stub-badge">Stub 2</span>
                      </div>
                      <div className="stub-controls">
                        <button
                          className={`stub-toggle ${showStub2Labels ? 'active' : ''}`}
                          onClick={() => setShowStub2Labels(!showStub2Labels)}
                          title="Show/hide friendly field labels on check"
                        >
                          {showStub2Labels ? '👁' : '👁‍🗨'} Labels
                        </button>
                        <button
                          className="btn-icon-sm danger"
                          onClick={() => ensureStub('stub2', false)}
                          title="Remove this stub"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                    <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
                      Fields auto-sync from Check Details. Ledger snapshot and admin fields are auto-generated.
                    </p>
                    <div className="stub-group">
                      <div className="field-row">
                        <div className="field">
                          <label>Date (Synced)</label>
                          <input
                            value={activeProfile?.layoutMode === 'three_up' ? sheetData[activeSlot]?.date : data.date}
                            readOnly
                            className="readonly"
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer' }}
                            title="Date is synced from the main check"
                            onClick={() => document.querySelector('input[type="date"]')?.focus()} // Focus main date picker on click
                          />
                        </div>
                        <div className="field">
                          <label>Amount</label>
                          <input value={data.stub2_amount || ''} onChange={(e) => setData((p) => ({ ...p, stub2_amount: e.target.value }))} />
                        </div>
                      </div>
                      <div className="field">
                        <label>Payee</label>
                        <input value={data.stub2_payee || ''} onChange={(e) => setData((p) => ({ ...p, stub2_payee: e.target.value }))} />
                      </div>
                      <div className="field">
                        <label>Memo (Internal)</label>
                        <input value={data.stub2_memo || ''} onChange={(e) => setData((p) => ({ ...p, stub2_memo: e.target.value }))} />
                      </div>
                    </div>

                    {/* Stub Preferences */}
                    {!preferences.adminLocked && (
                      <div className="stub-group" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>Stub Preferences</h4>
                        <div className="field">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={preferences.stub2ShowLedger}
                              onChange={(e) => setPreferences(p => ({ ...p, stub2ShowLedger: e.target.checked }))}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">Show Ledger Snapshot</span>
                          </label>
                        </div>
                        <div className="field">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={!!preferences.showAddressOnStub2}
                              onChange={(e) => setPreferences(p => ({ ...p, showAddressOnStub2: e.target.checked }))}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">Show Address Block</span>
                          </label>
                        </div>
                        <div className="field">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={preferences.stub2ShowApproved}
                              onChange={(e) => setPreferences(p => ({ ...p, stub2ShowApproved: e.target.checked }))}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">Show Approved By</span>
                          </label>
                        </div>
                        <div className="field">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={preferences.stub2ShowGLCode}
                              onChange={(e) => setPreferences(p => ({ ...p, stub2ShowGLCode: e.target.checked }))}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">Show GL Code</span>
                          </label>
                        </div>
                        <div className="field">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={preferences.stub2ShowLineItems}
                              onChange={(e) => setPreferences(p => ({ ...p, stub2ShowLineItems: e.target.checked }))}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">Show Line Items</span>
                          </label>
                        </div>
                        <div className="field">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={preferences.stub2ShowCheckNumber}
                              onChange={(e) => setPreferences(p => ({ ...p, stub2ShowCheckNumber: e.target.checked }))}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">Show Check Number</span>
                          </label>
                        </div>
                        <div className="field">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={preferences.stub2ShowDate}
                              onChange={(e) => setPreferences(p => ({ ...p, stub2ShowDate: e.target.checked }))}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">Show Date</span>
                          </label>
                        </div>
                        <small style={{ color: '#888', fontSize: '11px', marginTop: '8px', display: 'block' }}>
                          Toggle which fields appear on the Bookkeeper Copy stub
                        </small>
                      </div>
                    )}
                  </div>
                </section>
              )
            }

            {/* Template - compact */}
            {
              !preferences.adminLocked && (
                <section className="section">
                  <h3>Check Template</h3>
                  <div className="card">
                    <button className="btn-template" onClick={handleSelectTemplate}>
                      {templateName ? (
                        <>
                          <span className="template-icon">🖼</span>
                          <span className="template-name">{templateName}</span>
                          <span className="template-change">Change</span>
                        </>
                      ) : (
                        <>
                          <span className="template-icon">+</span>
                          <span>Load check template image</span>
                        </>
                      )}
                    </button>
                    {templateLoadError && (
                      <div className="error-msg">{templateLoadError}</div>
                    )}
                    {templateDecodeError && (
                      <div className="error-msg">{templateDecodeError}</div>
                    )}
                    {/* Opacity slider - only show when template is loaded */}
                    {templateName && (
                      <div className="field" style={{ marginTop: '12px' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Opacity</span>
                          <span style={{ fontSize: '12px', color: '#888' }}>{Math.round((model.template.opacity ?? 0) * 100)}%</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={model.template.opacity ?? 0}
                          onChange={(e) => setModel((m) => ({ ...m, template: { ...m.template, opacity: clamp(parseFloat(e.target.value) || 0, 0, 1) } }))}
                          style={{ width: '100%' }}
                        />
                      </div>
                    )}
                  </div>
                </section>
              )
            }

            {/* Advanced Settings - Collapsible */}
            {
              !preferences.adminLocked && (
                <section className="section">
                  <button className="accordion-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
                    <span>Advanced Settings</span>
                    <ChevronIcon open={showAdvanced} />
                  </button>

                  {showAdvanced && (
                    <div className="accordion-content">
                      {/* Calibration */}
                      <div className="card">
                        <h4>Printer Calibration</h4>
                        <p className="hint">
                          Compensates for physical printer margins. Use negative numbers to shift Left/Up, positive to shift Right/Down.
                          Most laser printers need X = -0.25in.
                        </p>
                        <div className="field-row">
                          <div className="field">
                            <label>Global X Offset (in)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="-1.0"
                              max="1.0"
                              value={model.placement.offsetXIn}
                              onChange={(e) => setModel((m) => ({ ...m, placement: { ...m.placement, offsetXIn: parseFloat(e.target.value) || 0 } }))}
                            />
                          </div>
                          <div className="field">
                            <label>Global Y Offset (in)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="-1.0"
                              max="1.0"
                              value={model.placement.offsetYIn}
                              onChange={(e) => setModel((m) => ({ ...m, placement: { ...m.placement, offsetYIn: parseFloat(e.target.value) || 0 } }))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Layout */}
                      <div className="card">
                        <h4>Check Dimensions</h4>
                        <div className="field-row">
                          <div className="field">
                            <label>Width (in)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={model.layout.widthIn}
                              onChange={(e) => setModel((m) => ({ ...m, layout: { ...m.layout, widthIn: clamp(parseFloat(e.target.value) || 0, 4, 8.5) } }))}
                            />
                          </div>
                          <div className="field">
                            <label>Height (in)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={model.layout.checkHeightIn}
                              onChange={(e) => setModel((m) => ({ ...m, layout: { ...m.layout, checkHeightIn: clamp(parseFloat(e.target.value) || 0, 1, 6) } }))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Stub Height Adjustments - only show if stubs are enabled */}
                      {(model.layout.stub1Enabled || model.layout.stub2Enabled) && (
                        <div className="card">
                          <h4>Stub Height Adjustments</h4>
                          {model.layout.stub1Enabled && (
                            <div className="field">
                              <label>Payee Copy Stub Height (in)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.5"
                                value={model.layout.stub1HeightIn}
                                onChange={(e) => setModel((m) => ({ ...m, layout: { ...m.layout, stub1HeightIn: clamp(parseFloat(e.target.value) || 0, 0.5, 8) } }))}
                              />
                            </div>
                          )}
                          {model.layout.stub2Enabled && (
                            <div className="field" style={{ marginTop: model.layout.stub1Enabled ? 12 : 0 }}>
                              <label>Bookkeeper Copy Stub Height (in)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.5"
                                value={model.layout.stub2HeightIn}
                                onChange={(e) => setModel((m) => ({ ...m, layout: { ...m.layout, stub2HeightIn: clamp(parseFloat(e.target.value) || 0, 0.5, 8) } }))}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Zoom */}
                      <div className="card">
                        <h4>Preview Zoom</h4>
                        <div className="field">
                          <input
                            type="range"
                            min="0.4"
                            max="1.5"
                            step="0.05"
                            value={model.view.zoom}
                            onChange={(e) => setModel((m) => ({ ...m, view: { ...m.view, zoom: parseFloat(e.target.value) } }))}
                          />
                          <div className="range-value">{Math.round(model.view.zoom * 100)}%</div>
                        </div>
                      </div>

                      {/* Reset */}
                      <button className="btn danger full-width" onClick={resetModel}>
                        Reset All Settings
                      </button>
                    </div>
                  )}
                </section>
              )
            }

            {/* Selected Field - only in edit mode - MOVED OUTSIDE Advanced Settings */}
            {editMode && (
              <section className="section">
                <div className="card">
                  <h4>Selected Field</h4>
                  {selected.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>No field selected</div>
                  ) : selected.length > 1 ? (
                    <div>
                      <div style={{ marginBottom: '12px' }}>{selected.length} fields selected</div>

                      <div className="field" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        {/* Bold/Italic are now in floating toolbar */}
                      </div>

                      <button className="btn ghost small full-width" onClick={() => setSelected([])}>Clear Selection</button>
                    </div>
                  ) : (
                    (() => {
                      const key = selected[0]
                      const f = activeProfile?.layoutMode === 'three_up'
                        ? model.slotFields?.[activeSlot]?.[key]
                        : model.fields[key]

                      if (!f) return <div>Field not found</div>

                      return (
                        <>
                          <div className="field">
                            <label>Field</label>
                            <select value={key} onChange={(e) => setSelected([e.target.value])}>
                              {Object.keys(activeProfile?.layoutMode === 'three_up' ? model.slotFields?.[activeSlot] || {} : model.fields).map((k) => {
                                const field = activeProfile?.layoutMode === 'three_up' ? model.slotFields?.[activeSlot]?.[k] : model.fields[k]
                                return <option value={k} key={k}>{field?.label || k}</option>
                              })}
                            </select>
                          </div>
                          <div className="field-row">
                            <div className="field">
                              <label>X (in)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={f.x}
                                onChange={(e) => setField(key, { x: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="field">
                              <label>Y (in)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={f.y}
                                onChange={(e) => setField(key, { y: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                          <div className="field-row">
                            <div className="field">
                              <label>Width (in)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={f.w}
                                onChange={(e) => setField(key, { w: parseFloat(e.target.value) || 0.2 })}
                              />
                            </div>
                            <div className="field">
                              <label>Height (in)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={f.h}
                                onChange={(e) => setField(key, { h: parseFloat(e.target.value) || 0.18 })}
                              />
                            </div>
                          </div>
                          <div className="field">
                            <label>Font Size (in)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={f.fontIn}
                              onChange={(e) => setField(key, { fontIn: clamp(parseFloat(e.target.value) || 0.2, 0.12, 0.6) })}
                            />
                          </div>
                          <div className="field" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            {/* Bold/Italic are now in floating toolbar */}
                          </div>
                        </>
                      )
                    })()
                  )}
                </div>
              </section>
            )}

            {/* End of Scrollable Content Area */}
          </div>

          {/* Feedback - Sticky Footer */}
          <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => window.cs2?.openExternal?.('https://github.com/luminary-craft/CheckSpree/issues/new?labels=bug')}
                title="Report Bug"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#64748b'; e.currentTarget.style.color = '#e2e8f0' }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#94a3b8' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8l0 4" />
                  <path d="M12 16l.01 0" />
                </svg>
                Bug
              </button>
              <button
                onClick={() => window.cs2?.openExternal?.('https://github.com/luminary-craft/CheckSpree/issues/new?labels=enhancement')}
                title="Request Feature"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#64748b'; e.currentTarget.style.color = '#e2e8f0' }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#94a3b8' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                  <path d="M12 2a7 7 0 0 0-4.607 12.268c.644.598 1.107 1.398 1.107 2.232V18a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-1.5c0-.834.463-1.634 1.107-2.232A7 7 0 0 0 12 2z" />
                </svg>
                Idea
              </button>
            </div>
          </div>
        </div >

        <div className="workspace">
          {profiles.length === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '40px',
              textAlign: 'center'
            }}>
              <div style={{
                maxWidth: '400px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '32px',
                color: '#94a3b8'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                <h3 style={{ color: '#e2e8f0', marginBottom: '12px', fontSize: '20px' }}>No Check Profiles Found</h3>
                <p style={{ marginBottom: '20px', lineHeight: '1.6' }}>
                  Please unlock <strong>Admin Mode</strong> to create your first check layout.
                </p>
                <button
                  className="btn primary"
                  onClick={preferences.adminLocked ? handleUnlockRequest : () => { }}
                  style={{ marginTop: '8px' }}
                >
                  {preferences.adminLocked ? '🔓 Unlock Admin' : '✓ Admin Unlocked'}
                </button>
              </div>
            </div>
          ) : (
            <div className="paperWrap" onPointerDown={onPointerDownStage}>
              <div className="paper" style={paperStyle} ref={paperRef}>
                {/* Full-page template overlay */}
                {templateDataUrl && isFullPageTemplate && (
                  <img
                    className="full-page-template no-print"
                    src={templateDataUrl}
                    alt="Template"
                    draggable="false"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: model.template.opacity ?? 0,
                      pointerEvents: 'none',
                      zIndex: 1
                    }}
                  />
                )}
                {selectionBox && (
                  <div style={{
                    position: 'absolute',
                    left: Math.min(selectionBox.startX, selectionBox.currentX) + 'in',
                    top: Math.min(selectionBox.startY, selectionBox.currentY) + 'in',
                    width: Math.abs(selectionBox.currentX - selectionBox.startX) + 'in',
                    height: Math.abs(selectionBox.currentY - selectionBox.startY) + 'in',
                    border: '1px solid #3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    pointerEvents: 'none',
                    zIndex: 9999
                  }} />
                )}
                {/* Three-up visual cut lines (perforation marks) - FIXED position */}
                {activeProfile?.layoutMode === 'three_up' && (
                  <>
                    {/* Cut Line 1 - Draggable */}
                    <div
                      className="three-up-cut-line no-print"
                      onPointerDown={(e) => onPointerDownCutLine(e, 1)}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `calc(${model.placement.offsetYIn}in + ${model.layout.cutLine1In ?? DEFAULT_LAYOUT.cutLine1In}in)`,
                        height: '20px',
                        marginTop: '-10px',
                        borderTop: '2px dashed rgba(128, 128, 128, 0.5)',
                        zIndex: 100,
                        cursor: 'ns-resize',
                        pointerEvents: 'auto'
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        left: '4px',
                        top: '-10px',
                        background: 'rgba(128, 128, 128, 0.2)',
                        color: 'rgba(128, 128, 128, 0.9)',
                        padding: '2px 8px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: '600',
                        pointerEvents: 'none',
                        userSelect: 'none'
                      }}>
                        ✂ Cut 1 ({(model.layout.cutLine1In ?? DEFAULT_LAYOUT.cutLine1In).toFixed(2)}")
                      </div>
                    </div>

                    {/* Cut Line 2 - Draggable */}
                    <div
                      className="three-up-cut-line no-print"
                      onPointerDown={(e) => onPointerDownCutLine(e, 2)}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `calc(${model.placement.offsetYIn}in + ${model.layout.cutLine2In ?? DEFAULT_LAYOUT.cutLine2In}in)`,
                        height: '20px',
                        marginTop: '-10px',
                        borderTop: '2px dashed rgba(128, 128, 128, 0.5)',
                        zIndex: 100,
                        cursor: 'ns-resize',
                        pointerEvents: 'auto'
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        left: '4px',
                        top: '-10px',
                        background: 'rgba(128, 128, 128, 0.2)',
                        color: 'rgba(128, 128, 128, 0.9)',
                        padding: '2px 8px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: '600',
                        pointerEvents: 'none',
                        userSelect: 'none'
                      }}>
                        ✂ Cut 2 ({(model.layout.cutLine2In ?? DEFAULT_LAYOUT.cutLine2In).toFixed(2)}")
                      </div>
                    </div>
                  </>
                )}

                {/* Render check(s) - single for standard mode, multiple for three_up mode */}
                {(activeProfile?.layoutMode === 'three_up'
                  ? ['top', 'middle', 'bottom'].map((slot, index) => ({ slot, index, yOffset: [0, model.layout.cutLine1In ?? DEFAULT_LAYOUT.cutLine1In, model.layout.cutLine2In ?? DEFAULT_LAYOUT.cutLine2In][index] }))
                  : [{ slot: null, index: 0, yOffset: threeUpYOffset }]
                ).map(({ slot, index, yOffset }) => {
                  // Get data for this slot (three-up uses slot data, standard uses data)
                  const checkData = slot ? sheetData[slot] : data
                  const isActiveSlot = slot ? (activeSlot === slot) : true

                  // In three-up mode, skip empty slots unless:
                  // - It's the active slot in edit mode
                  // - Auto-increment is enabled (need to show check numbers)
                  // - Show Date is enabled (need to show date even on empty slots)
                  if (slot && isSlotEmpty(checkData) && !(editMode && isActiveSlot) && !autoIncrementCheckNumbers && !preferences.showDate) {
                    return null
                  }

                  return (
                    <div
                      key={slot || 'single'}
                      className="checkStage"
                      style={{
                        '--offset-x': `${model.placement.offsetXIn}in`,
                        '--offset-y': `${isPrinting ? yOffset : (model.placement.offsetYIn + yOffset)}in`,
                        ...stageVars,
                        opacity: editMode && !isActiveSlot ? 0.3 : 1,
                        pointerEvents: editMode && !isActiveSlot ? 'none' : 'auto'
                      }}
                    >
                      {/* Rigid check face container */}
                      <div
                        className="check-face-container"
                        style={{
                          '--check-height': `${model.layout.checkHeightIn}in`
                        }}
                      >
                        {/* Check-only template image (wide images) */}
                        {templateDataUrl && !isFullPageTemplate && (
                          <img
                            className="templateImg no-print"
                            src={templateDataUrl}
                            alt="Template"
                            draggable="false"
                            onError={() => setTemplateDecodeError('Template image failed to load.')}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: 'auto',
                              opacity: model.template.opacity ?? 0,
                              pointerEvents: 'none',
                              zIndex: 0
                            }}
                          />
                        )}
                      </div>

                      {/* Draggable Fold Lines (no-print) */}
                      {editMode && model.layout.stub1Enabled && activeProfile?.layoutMode !== 'three_up' && (
                        <div
                          className="fold-line no-print"
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `${model.layout.checkHeightIn}in`,
                            height: '2px',
                            borderTop: '2px dashed var(--accent)',
                            cursor: 'ns-resize',
                            zIndex: 1000
                          }}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', 'fold-line-1')
                          }}
                          onDrag={(e) => {
                            if (e.clientY === 0) return // Ignore invalid drag events
                            const paperRect = e.currentTarget.closest('.paper').getBoundingClientRect()
                            const relativeY = e.clientY - paperRect.top
                            const yInInches = relativeY / (96 * model.view.zoom)

                            // Constrain between 2.5 and 4.0 inches
                            const newHeight = Math.max(2.5, Math.min(4.0, yInInches))
                            setModel(m => ({
                              ...m,
                              layout: { ...m.layout, checkHeightIn: newHeight }
                            }))
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            left: '50%',
                            top: '-8px',
                            transform: 'translateX(-50%)',
                            background: 'var(--accent)',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600',
                            pointerEvents: 'none'
                          }}>
                            Check/Stub1 Fold
                          </div>
                        </div>
                      )}

                      {editMode && model.layout.stub2Enabled && activeProfile?.layoutMode !== 'three_up' && (
                        <div
                          className="fold-line no-print"
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `${model.layout.checkHeightIn + model.layout.stub1HeightIn}in`,
                            height: '2px',
                            borderTop: '2px dashed var(--accent)',
                            cursor: 'ns-resize',
                            zIndex: 1000
                          }}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', 'fold-line-2')
                          }}
                          onDrag={(e) => {
                            if (e.clientY === 0) return // Ignore invalid drag events
                            const paperRect = e.currentTarget.closest('.paper').getBoundingClientRect()
                            const relativeY = e.clientY - paperRect.top
                            const yInInches = relativeY / (96 * model.view.zoom)
                            const checkHeight = model.layout.checkHeightIn

                            // Calculate stub1 height (total Y minus check height)
                            const newStub1Height = Math.max(2.5, Math.min(4.0, yInInches - checkHeight))
                            setModel(m => ({
                              ...m,
                              layout: { ...m.layout, stub1HeightIn: newStub1Height }
                            }))
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            left: '50%',
                            top: '-8px',
                            transform: 'translateX(-50%)',
                            background: 'var(--accent)',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600',
                            pointerEvents: 'none'
                          }}>
                            Stub1/Stub2 Fold
                          </div>
                        </div>
                      )}

                      {/* Use slot-specific fields in three-up mode, shared fields in standard mode */}
                      {Object.entries(slot ? model.slotFields[slot] : model.fields)
                        .filter(([key]) => {
                          const isStub1 = key.startsWith('stub1_')
                          const isStub2 = key.startsWith('stub2_')

                          // Always hide if it's a stub field and that stub is disabled
                          if (isStub1 && !model.layout.stub1Enabled) return false
                          if (isStub2 && !model.layout.stub2Enabled) return false

                          // Hiding check number on check face check
                          if (key === 'checkNumber' && !preferences.showCheckNumber) return false

                          // Hiding date on check face
                          if (key === 'date' && !preferences.showDate) return false

                          // GL Code visibility (Check face ONLY)
                          // Stub fields should NOT be affected by 'showGlOnCheck'
                          if ((key === 'glCode' || key === 'glDescription') && !isStub1 && !isStub2 && (!preferences.showGlOnCheck && !editMode)) return false

                          return true
                        })
                        .map(([key, f]) => {
                          // Check if this field belongs to a disabled stub
                          const isStub1Field = key.startsWith('stub1_')
                          const isStub2Field = key.startsWith('stub2_')

                          // Skip rendering stub fields if their stub is disabled OR in three_up mode
                          if (isStub1Field && (!model.layout.stub1Enabled || activeProfile?.layoutMode === 'three_up')) return null
                          if (isStub2Field && (!model.layout.stub2Enabled || activeProfile?.layoutMode === 'three_up')) return null

                          // Apply Stub Preferences (Hide if toggle is off)
                          if (isStub1Field) {
                            if (key.includes('_ledger') && !preferences.stub1ShowLedger) return null
                            if (key.includes('_approved') && !preferences.stub1ShowApproved) return null
                            if ((key.includes('_glCode') || key.includes('_glcode') || key.includes('_glDescription')) && !preferences.stub1ShowGLCode) return null
                            if (key.includes('_line_items') && !preferences.stub1ShowLineItems) return null
                            if (key.includes('_checkNumber') && !preferences.stub1ShowCheckNumber) return null
                            if (key.includes('_date') && !preferences.stub1ShowDate) return null
                          }
                          if (isStub2Field) {
                            if (key.includes('_ledger') && !preferences.stub2ShowLedger) return null
                            if (key.includes('_approved') && !preferences.stub2ShowApproved) return null
                            if ((key.includes('_glCode') || key.includes('_glcode') || key.includes('_glDescription')) && !preferences.stub2ShowGLCode) return null
                            if (key.includes('_line_items') && !preferences.stub2ShowLineItems) return null
                            if (key.includes('_checkNumber') && !preferences.stub2ShowCheckNumber) return null
                            if (key.includes('_date') && !preferences.stub2ShowDate) return null
                          }
                          // Smart field value handling
                          let value = checkData[key] ?? ''
                          let isTextarea = false
                          let isReadOnly = editMode || key === 'amountWords'

                          // Force Hide MICR (legacy data cleanup)
                          if (key === 'micr') return null

                          // Clean up potential duplicate Stub 2 GL key (legacy)
                          if (key === 'stub2_glcode') return null

                          // Special Handling: Unified GL Field on Check Face
                          if (key === 'glCode' && !isStub1Field && !isStub2Field) {
                            // Apply Visibility Toggle (Check Face Only)
                            if (!preferences.showGlOnCheck && !editMode) return null

                            const desc = checkData.glDescription ? ` - ${checkData.glDescription}` : ''
                            value = `GL Code: ${checkData.glCode || ''}${desc}`
                          }

                          // Hide glDescription on check face
                          if (key === 'glDescription' && !isStub1Field && !isStub2Field) {
                            return null
                          }

                          // Unified GL Field on Stub 1 (Generic lowercase match)
                          if (isStub1Field && key.toLowerCase().endsWith('_glcode')) {
                            const codeVal = checkData[key] || checkData.glCode || ''
                            // Fallback to main glDescription
                            const descRaw = checkData.stub1_glDescription || checkData.glDescription
                            const descVal = descRaw ? ` - ${descRaw}` : ''
                            value = `GL Code: ${codeVal}${descVal}`
                          }
                          // Hide Stub 1 Description (Generic lowercase match)
                          if (isStub1Field && key.toLowerCase().endsWith('_gldescription')) return null


                          // Unified GL Field on Stub 2 (Generic lowercase match)
                          if (isStub2Field && key.toLowerCase().endsWith('_glcode')) {
                            const codeVal = checkData[key] || checkData.glCode || ''
                            // Fallback to main glDescription
                            const descRaw = checkData.stub2_glDescription || checkData.glDescription
                            const descVal = descRaw ? ` - ${descRaw}` : ''
                            value = `GL Code: ${codeVal}${descVal}`
                          }
                          // Hide Stub 2 Description (Generic lowercase match)
                          if (isStub2Field && key.toLowerCase().endsWith('_gldescription')) return null

                          // Special handling for check number - default to profile's nextCheckNumber
                          if (key === 'checkNumber' && !value) {
                            value = String(activeProfile.nextCheckNumber || '')
                          }

                          // Sync stub check numbers from check data
                          if ((key === 'stub1_checkNumber' || key === 'stub2_checkNumber')) {
                            value = checkData.checkNumber || String(activeProfile.nextCheckNumber || '')
                            isReadOnly = true
                          }

                          // Sync stub dates from check data
                          if ((key === 'stub1_date' || key === 'stub2_date')) {
                            value = checkData.date || ''
                            isReadOnly = true
                          }

                          // Address Field Logic (Check & Stubs)
                          if (key === 'address' && !isStub1Field && !isStub2Field) {
                            if (!preferences.showAddressOnCheck && !editMode) return null
                            value = checkData.address || ''
                            isTextarea = true
                          }
                          if ((key === 'stub1_address' || key === 'stub2_address')) {
                            const isStub1 = key === 'stub1_address'
                            const show = isStub1 ? preferences.showAddressOnStub1 : preferences.showAddressOnStub2
                            if (!show && !editMode) return null

                            // Sync from main address
                            value = checkData.address || ''
                            isReadOnly = true
                            isTextarea = true
                          }

                          // Special handling for date formatting (check and stubs)
                          if ((key === 'date' || key === 'stub1_date' || key === 'stub2_date') && value) {
                            value = formatDateByPreference(value, preferences)
                          }

                          // Special handling for amount fields - format with commas (1,250.00)
                          if ((key === 'amount' || key === 'stub1_amount' || key === 'stub2_amount') && value) {
                            const numValue = parseFloat(value)
                            if (!isNaN(numValue)) {
                              value = numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            }
                          }

                          // Special handling for smart stub fields
                          if (key.endsWith('_line_items')) {
                            value = checkData.line_items_text || ''
                            isTextarea = true
                            isReadOnly = true
                          } else if (key.endsWith('_ledger')) {
                            // Generate live ledger snapshot based on current hybrid balance and check amount
                            const checkAmount = sanitizeCurrencyInput(checkData.amount)
                            const snapshot = checkData.ledger_snapshot || {
                              previous_balance: hybridBalance,
                              transaction_amount: checkAmount,
                              new_balance: hybridBalance - checkAmount
                            }
                            value = formatLedgerSnapshot(snapshot, activeLedger?.name)
                            isTextarea = true
                            isReadOnly = true
                          } else if (key.endsWith('_approved')) {
                            value = 'Approved By: ___________________'
                            isReadOnly = true
                          } else if (key.toLowerCase().endsWith('_glcode') || key.toLowerCase().endsWith('_gldescription')) {
                            // Value is handled by early unification logic. Just ensure read-only.
                            isReadOnly = true
                          }

                          const isSelected = editMode && selected.includes(key)
                          // Use stub font size for stub fields, check font size for others
                          const fontSizePt = (isStub1Field || isStub2Field) ? preferences.stubFontSizePt : preferences.checkFontSizePt

                          // Don't show labels for stub2 approved/glcode fields since they already have labels in the value
                          const showFriendlyLabel = !editMode && (
                            (isStub1Field && showStub1Labels) ||
                            (isStub2Field && showStub2Labels && key !== 'stub2_approved' && key !== 'stub2_glcode')
                          )

                          // Calculate actual Y position for stub fields (they should stay pinned to their stub section)
                          // When stubs are created, fields get Y positions like checkHeight + 0.25
                          // We need to extract the relative offset and re-apply it to the current stub position
                          let actualY = f.y
                          if (isStub1Field) {
                            // Stub1 starts at checkHeightIn
                            // Find what the stub1 start was when this field was created (use 3.0 as default check height)
                            const originalStub1Start = 3.0
                            const relativeY = f.y - originalStub1Start
                            actualY = model.layout.checkHeightIn + relativeY
                          } else if (isStub2Field) {
                            // Stub2 starts at checkHeightIn + stub1HeightIn
                            // Find what the stub2 start was when this field was created
                            const originalStub2Start = 3.0 + 3.0 // default check + default stub1
                            const relativeY = f.y - originalStub2Start
                            actualY = model.layout.checkHeightIn + model.layout.stub1HeightIn + relativeY
                          }

                          return (
                            <div
                              key={key}
                              className={`fieldBox ${editMode ? 'editable' : ''} ${isSelected ? 'selected' : ''}`}
                              style={{
                                position: 'absolute',
                                left: `${f.x}in`,
                                top: `${actualY}in`,
                                minWidth: !isTextarea ? `${f.w}in` : undefined,
                                width: !isTextarea ? 'fit-content' : `${f.w}in`,
                                height: `${f.h}in`
                              }}
                              onPointerDown={(e) => onPointerDownField(e, key)}
                            >
                              {/* Ghost element for auto-width expansion (Inputs only) */}
                              {!isTextarea && (
                                <div style={{
                                  visibility: 'hidden',
                                  height: 0,
                                  overflow: 'hidden',
                                  whiteSpace: 'pre',
                                  fontSize: `${fontSizePt}pt`,
                                  fontFamily: activeFontFamily,
                                  fontWeight: f.bold ? 'bold' : 'normal',
                                  fontStyle: f.italic ? 'italic' : 'normal',
                                  paddingTop: showFriendlyLabel ? '14px' : '0',
                                  paddingLeft: '2px', // Match input default padding
                                  paddingRight: '10px' // Extra buffer to prevent cutoff
                                }}>
                                  {(value || ' ') + '  '}
                                </div>
                              )}

                              {editMode && (
                                <div className="label" style={{ fontSize: `${preferences.labelSize}px` }}>
                                  {f.label}
                                </div>
                              )}
                              {showFriendlyLabel && (
                                <div className="friendly-label" style={{ fontSize: `${Math.max(preferences.labelSize - 2, 7)}px` }}>
                                  {f.label}
                                </div>
                              )}
                              {isTextarea ? (
                                <textarea
                                  value={value}
                                  readOnly={isReadOnly}
                                  onChange={(e) => !isReadOnly && updateCurrentCheckData({ [key]: e.target.value })}
                                  style={{
                                    fontSize: `${fontSizePt}pt`,
                                    fontFamily: activeFontFamily,
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    background: 'transparent',
                                    resize: 'none',
                                    padding: showFriendlyLabel ? '14px 0 0 0' : '0',
                                    lineHeight: '1.3',
                                    fontWeight: f.bold ? 'bold' : 'normal',
                                    fontStyle: f.italic ? 'italic' : 'normal'
                                  }}
                                />
                              ) : (
                                <input
                                  value={value}
                                  readOnly={isReadOnly}
                                  onChange={(e) => updateCurrentCheckData({ [key]: e.target.value })}
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    fontSize: `${fontSizePt}pt`,
                                    fontFamily: activeFontFamily,
                                    paddingTop: showFriendlyLabel ? '14px' : '0',
                                    fontWeight: f.bold ? 'bold' : 'normal',
                                    fontStyle: f.italic ? 'italic' : 'normal',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none'
                                  }}
                                />
                              )}
                              {/* Floating Formatting Toolbar */}
                              {editMode && selected.includes(key) && selected.length === 1 && (
                                <div
                                  className="formatting-toolbar"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  style={{
                                    position: 'absolute',
                                    bottom: '-40px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    display: 'flex',
                                    gap: '8px',
                                    backgroundColor: '#1e293b',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                    border: '1px solid #334155',
                                    zIndex: 1000
                                  }}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setField(key, { bold: !f.bold })
                                    }}
                                    style={{
                                      background: f.bold ? '#3b82f6' : 'transparent',
                                      color: f.bold ? '#fff' : '#94a3b8',
                                      border: '1px solid',
                                      borderColor: f.bold ? '#3b82f6' : '#475569',
                                      borderRadius: '4px',
                                      width: '24px',
                                      height: '24px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      fontWeight: 'bold',
                                      fontSize: '14px'
                                    }}
                                    title="Bold"
                                  >
                                    B
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setField(key, { italic: !f.italic })
                                    }}
                                    style={{
                                      background: f.italic ? '#3b82f6' : 'transparent',
                                      color: f.italic ? '#fff' : '#94a3b8',
                                      border: '1px solid',
                                      borderColor: f.italic ? '#3b82f6' : '#475569',
                                      borderRadius: '4px',
                                      width: '24px',
                                      height: '24px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      fontStyle: 'italic',
                                      fontFamily: 'serif',
                                      fontSize: '14px'
                                    }}
                                    title="Italic"
                                  >
                                    I
                                  </button>
                                </div>
                              )}

                              {editMode && <div className="handle" onPointerDown={(e) => onPointerDownHandle(e, key)} />}
                            </div>
                          )
                        })}

                      {/* FORCE FIX: Manual Check Number Render */}
                      {preferences.showCheckNumber && !Object.keys(slot ? model.slotFields[slot] : model.fields).includes('checkNumber') && (
                        <div
                          key="manual-check-number"
                          className={`fieldBox ${editMode ? 'editable' : ''} ${editMode && selected.includes('checkNumber') ? 'selected' : ''}`}
                          style={{
                            left: '7.8in',
                            top: '0.15in',
                            width: '1.5in',
                            height: '0.30in'
                          }}
                          onPointerDown={(e) => {
                            if (!editMode) return
                            e.preventDefault()
                            e.stopPropagation()
                            setSelected(['checkNumber'])
                            // Create synthetic field in the model if it doesn't exist
                            const checkNumberField = DEFAULT_FIELDS.checkNumber
                            if (slot) {
                              // Three-up mode: add to slotFields
                              if (!model.slotFields[slot].checkNumber) {
                                setModel(m => ({
                                  ...m,
                                  slotFields: {
                                    ...m.slotFields,
                                    [slot]: {
                                      ...m.slotFields[slot],
                                      checkNumber: checkNumberField
                                    }
                                  }
                                }))
                              }
                              dragRef.current = {
                                key: 'checkNumber',
                                mode: 'move',
                                startX: e.clientX,
                                startY: e.clientY,
                                startField: { ...checkNumberField }
                              }
                            } else {
                              // Standard mode: add to fields
                              if (!model.fields.checkNumber) {
                                setModel(m => ({
                                  ...m,
                                  fields: {
                                    ...m.fields,
                                    checkNumber: checkNumberField
                                  }
                                }))
                              }
                              dragRef.current = {
                                key: 'checkNumber',
                                mode: 'move',
                                startX: e.clientX,
                                startY: e.clientY,
                                startField: { ...checkNumberField }
                              }
                            }
                            e.currentTarget.setPointerCapture?.(e.pointerId)
                          }}
                        >
                          {editMode && (
                            <div className="label" style={{ fontSize: `${preferences.labelSize}px` }}>
                              Check #
                            </div>
                          )}
                          <input
                            value={checkData.checkNumber || String(activeProfile.nextCheckNumber || '1001')}
                            readOnly={editMode}
                            onChange={(e) => !editMode && updateCurrentCheckData({ checkNumber: e.target.value })}
                            style={{
                              fontSize: `${preferences.checkFontSizePt}pt`,
                              fontFamily: activeFontFamily
                            }}
                          />
                          {editMode && <div className="handle" onPointerDown={(e) => {
                            if (!editMode) return
                            e.preventDefault()
                            e.stopPropagation()
                            setSelected('checkNumber')
                            const checkNumberField = DEFAULT_FIELDS.checkNumber
                            dragRef.current = {
                              key: 'checkNumber',
                              mode: 'resize',
                              startX: e.clientX,
                              startY: e.clientY,
                              startField: { ...checkNumberField }
                            }
                            e.currentTarget.setPointerCapture?.(e.pointerId)
                          }} />}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Stub Add/Remove Buttons - positioned at specific heights within the paper */}
                {!editMode && activeProfile?.layoutMode !== 'three_up' && (
                  <>
                    {/* After check section */}
                    <div
                      className="stub-control-row"
                      style={{
                        position: 'absolute',
                        top: `${model.layout.checkHeightIn}in`,
                        left: 0,
                        right: 0,
                        zIndex: 10
                      }}
                    >
                      {model.layout.stub1Enabled ? (
                        <div className="stub-divider-with-remove">
                          <div className="stub-divider-line" />
                          <button
                            className="stub-remove-button"
                            onClick={(e) => {
                              e.stopPropagation()
                              ensureStub('stub1', false)
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            title="Remove Payee Copy Stub"
                          >
                            <span>−</span> Remove Stub 1
                          </button>
                        </div>
                      ) : (
                        <button
                          className="stub-add-button"
                          onClick={(e) => {
                            e.stopPropagation()
                            ensureStub('stub1', true)
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <span className="stub-add-icon">+</span>
                          Add Payee Copy Stub
                        </button>
                      )}
                    </div>

                    {/* After stub 1 section */}
                    {model.layout.stub1Enabled && (
                      <div
                        className="stub-control-row"
                        style={{
                          position: 'absolute',
                          top: `${model.layout.checkHeightIn + model.layout.stub1HeightIn}in`,
                          left: 0,
                          right: 0,
                          zIndex: 10
                        }}
                      >
                        {model.layout.stub2Enabled ? (
                          <div className="stub-divider-with-remove">
                            <div className="stub-divider-line" />
                            <button
                              className="stub-remove-button"
                              onClick={(e) => {
                                e.stopPropagation()
                                ensureStub('stub2', false)
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                              title="Remove Bookkeeper Copy Stub"
                            >
                              <span>−</span> Remove Stub 2
                            </button>
                          </div>
                        ) : (
                          <button
                            className="stub-add-button"
                            onClick={(e) => {
                              e.stopPropagation()
                              ensureStub('stub2', true)
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <span className="stub-add-icon">+</span>
                            Add Bookkeeper Copy Stub
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div >

      {/* PIN Authentication Modal */}
      {
        showPinModal && (
          <div className="modal-overlay no-print" onClick={() => { setShowPinModal(false); setPinInput(''); setPinError(''); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h2>Enter Admin PIN</h2>
                <button className="btn-icon" onClick={() => { setShowPinModal(false); setPinInput(''); setPinError(''); }}>×</button>
              </div>
              <div className="modal-body">
                <div className="field">
                  <label>4-Digit PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength="4"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && pinInput.length === 4) {
                        handlePinSubmit()
                      }
                    }}
                    placeholder="0000"
                    autoFocus
                    style={{
                      fontSize: '24px',
                      letterSpacing: '8px',
                      textAlign: 'center',
                      fontFamily: 'monospace'
                    }}
                  />
                  {pinError && (
                    <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>
                      {pinError}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn ghost"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinInput('');
                    setPinError('');
                    setTimeout(handleChangePinRequest, 100);
                  }}
                  style={{ marginRight: 'auto' }}
                >
                  Change PIN
                </button>
                <button className="btn" onClick={() => { setShowPinModal(false); setPinInput(''); setPinError(''); }}>Cancel</button>
                <button
                  className="btn primary"
                  onClick={handlePinSubmit}
                  disabled={pinInput.length !== 4}
                >
                  Unlock
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Change PIN Modal */}
      {
        showChangePinModal && (
          <div className="modal-overlay no-print" onClick={() => setShowChangePinModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h2>Change Admin PIN</h2>
                <button className="btn-icon" onClick={() => setShowChangePinModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="field">
                  <label>Current PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength="4"
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="0000"
                    autoFocus
                    style={{
                      fontSize: '18px',
                      letterSpacing: '4px',
                      textAlign: 'center',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                <div className="field">
                  <label>New PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength="4"
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="0000"
                    style={{
                      fontSize: '18px',
                      letterSpacing: '4px',
                      textAlign: 'center',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                <div className="field">
                  <label>Confirm New PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength="4"
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && currentPinInput.length === 4 && newPinInput.length === 4 && confirmPinInput.length === 4) {
                        handleChangePinSubmit()
                      }
                    }}
                    placeholder="0000"
                    style={{
                      fontSize: '18px',
                      letterSpacing: '4px',
                      textAlign: 'center',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                {changePinError && (
                  <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>
                    {changePinError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn ghost" onClick={() => setShowChangePinModal(false)}>Cancel</button>
                <button
                  className="btn primary"
                  onClick={handleChangePinSubmit}
                  disabled={currentPinInput.length !== 4 || newPinInput.length !== 4 || confirmPinInput.length !== 4}
                >
                  Update PIN
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Deposit/Adjustment Modal */}
      {
        showDepositModal && (
          <div className="modal-overlay no-print" onClick={() => setShowDepositModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h2>Add Funds / Adjustment</h2>
                <button className="btn-icon" onClick={() => setShowDepositModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={depositData.date}
                    onChange={(e) => setDepositData({ ...depositData, date: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Description</label>
                  <input
                    type="text"
                    value={depositData.description}
                    onChange={(e) => setDepositData({ ...depositData, description: e.target.value })}
                    placeholder="e.g., Deposit, Cash Adjustment, Transfer In"
                    autoFocus
                  />
                </div>
                <div className="field">
                  <label>Amount</label>
                  <input
                    type="text"
                    value={depositData.amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '')
                      setDepositData({ ...depositData, amount: val })
                    }}
                    placeholder="0.00"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && depositData.amount && depositData.description) {
                        const success = recordDeposit(depositData)
                        if (success) {
                          setShowDepositModal(false)
                          setToast({ message: 'Deposit recorded successfully!', type: 'success' })
                          setTimeout(() => setToast(null), 3000)
                        }
                      }
                    }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn ghost" onClick={() => setShowDepositModal(false)}>Cancel</button>
                <button
                  className="btn primary"
                  onClick={() => {
                    const success = recordDeposit(depositData)
                    if (success) {
                      setShowDepositModal(false)
                      setToast({ message: 'Deposit recorded successfully!', type: 'success' })
                      setTimeout(() => setToast(null), 3000)
                    } else {
                      setToast({ message: 'Please enter a valid amount and description.', type: 'error' })
                      setTimeout(() => setToast(null), 3000)
                    }
                  }}
                  disabled={!depositData.amount || !depositData.description}
                >
                  Record Deposit
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Delete Check Confirmation Modal */}
      {
        showDeleteConfirm && deleteTarget && (
          <div className="modal-overlay confirm-modal no-print" onClick={cancelDeleteHistoryEntry}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h2>Delete {deleteTarget.type === 'deposit' ? 'Deposit' : 'Check'}?</h2>
                <button className="btn-icon" onClick={cancelDeleteHistoryEntry}>×</button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this {deleteTarget.type === 'deposit' ? 'deposit' : 'check'}?</p>
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#1e293b',
                  borderRadius: '6px',
                  border: '1px solid #334155'
                }}>
                  <div><strong>{deleteTarget.type === 'deposit' ? 'Description' : 'Payee'}:</strong> {deleteTarget.payee}</div>
                  <div><strong>Amount:</strong> {formatCurrency(deleteTarget.amount)}</div>
                  <div><strong>Date:</strong> {deleteTarget.date}</div>
                </div>
                <p style={{ marginTop: '16px', color: '#94a3b8', fontSize: '14px' }}>
                  {deleteTarget.type === 'deposit'
                    ? `This will remove ${formatCurrency(deleteTarget.amount)} from the ledger balance.`
                    : `This will restore ${formatCurrency(deleteTarget.amount)} to the ledger balance.`
                  }
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn ghost" onClick={cancelDeleteHistoryEntry}>Cancel</button>
                <button className="btn danger" onClick={confirmDeleteHistoryEntry}>
                  Delete {deleteTarget.type === 'deposit' ? 'Deposit' : 'Check'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Backup Restore Modal */}
      {
        showBackupModal && (
          <div className="modal-overlay no-print" onClick={() => setShowBackupModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
              <div className="modal-header">
                <h2>Restore from Backup</h2>
                <button className="btn-icon" onClick={() => setShowBackupModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: '#1e3a5f',
                  borderRadius: '6px',
                  border: '1px solid #3b82f6'
                }}>
                  <div style={{ fontSize: '13px', color: '#93c5fd', lineHeight: '1.6' }}>
                    🔒 <strong>Secure Auto-Backups:</strong> These backups are encrypted and stored securely in your app data folder. Select the most recent backup or choose an older version.
                  </div>
                </div>

                <div style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  backgroundColor: '#1e293b'
                }}>
                  {(() => {
                    const grouped = groupBackups(availableBackups)
                    const groupOrder = ['Recent (Last 3 Days)', 'This Year']

                    // Add year groups
                    const years = Object.keys(grouped).filter(k => /^\d{4}$/.test(k)).sort().reverse()
                    groupOrder.push(...years)

                    // Add quarter groups
                    const quarters = Object.keys(grouped).filter(k => /Q\d/.test(k)).sort().reverse()
                    groupOrder.push(...quarters)

                    return groupOrder.map(groupName => {
                      if (!grouped[groupName]) return null

                      return (
                        <div key={groupName}>
                          <div style={{
                            padding: '8px 12px',
                            backgroundColor: '#0f172a',
                            fontWeight: '600',
                            fontSize: '12px',
                            color: '#94a3b8',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            borderBottom: '1px solid #334155'
                          }}>
                            {groupName}
                          </div>
                          {grouped[groupName].map((backup, index) => (
                            <div
                              key={backup.path}
                              onClick={() => setSelectedBackup(backup)}
                              style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #1e293b',
                                backgroundColor: selectedBackup?.path === backup.path ? '#334155' : 'transparent',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (selectedBackup?.path !== backup.path) {
                                  e.currentTarget.style.backgroundColor = '#2d3748'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedBackup?.path !== backup.path) {
                                  e.currentTarget.style.backgroundColor = 'transparent'
                                }
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontWeight: '500', color: '#f1f5f9', fontSize: '14px' }}>
                                    {backup.friendlyName}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    {backup.fullDate} • {(backup.size / 1024).toFixed(1)} KB
                                  </div>
                                </div>
                                {selectedBackup?.path === backup.path && (
                                  <div style={{ color: '#3b82f6', fontSize: '20px', fontWeight: 'bold' }}>✓</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })
                  })()}
                </div>

                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  backgroundColor: '#7f1d1d',
                  borderRadius: '6px',
                  border: '1px solid #ef4444'
                }}>
                  <div style={{ fontWeight: '600', color: '#fecaca', marginBottom: '8px', fontSize: '14px' }}>
                    ⚠️ WARNING: This action cannot be undone
                  </div>
                  <div style={{ fontSize: '13px', color: '#fca5a5', lineHeight: '1.6' }}>
                    Restoring this backup will replace ALL current data:
                    <ul style={{ marginTop: '8px', marginBottom: '0', paddingLeft: '20px' }}>
                      <li>All profiles and settings</li>
                      <li>All field positions and layouts</li>
                      <li>All check history</li>
                      <li>All ledger data</li>
                      <li>Current session data</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn ghost"
                  onClick={() => {
                    setShowBackupModal(false)
                    handleRestoreFromFile()
                  }}
                >
                  Select File Instead
                </button>
                <button className="btn ghost" onClick={() => setShowBackupModal(false)}>Cancel</button>
                <button
                  className="btn primary"
                  onClick={() => confirmRestoreBackup(selectedBackup?.path)}
                  disabled={!selectedBackup}
                >
                  Restore Selected
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Backup Password Modal */}
      {
        showBackupPasswordModal && (
          <PasswordModal
            title="Encrypt Backup"
            message="Enter a password to encrypt this backup file. If you leave this blank, the file will be saved as plain text."
            value={backupPassword}
            onChange={setBackupPassword}
            onSubmit={handleBackupPasswordSubmit}
            onCancel={() => setShowBackupPasswordModal(false)}
            confirmButtonText={backupPassword ? "Save Encrypted" : "Save Unencrypted"}
            allowEmpty={true}
          />
        )
      }

      {/* Restore Password Modal */}
      {
        showRestorePasswordModal && (
          <PasswordModal
            title="Enter Password"
            message="This backup file is encrypted. Please enter the password to restore it."
            value={restorePassword}
            onChange={(val) => {
              setRestorePassword(val)
              setRestoreError(null)
            }}
            onSubmit={handleRestorePasswordSubmit}
            onCancel={() => {
              setShowRestorePasswordModal(false)
              setPendingRestorePath(null)
              setRestoreError(null)
            }}
            error={restoreError}
            confirmButtonText="Unlock & Restore"
            allowEmpty={false}
          />
        )
      }

      {/* Manual Backup Modal */}
      {
        showManualBackupModal && (
          <div className="modal-overlay no-print" onClick={() => setShowManualBackupModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
              <div className="modal-header">
                <h2>Create Manual Backup</h2>
                <button className="btn-icon" onClick={() => setShowManualBackupModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  backgroundColor: '#7f1d1d',
                  borderRadius: '6px',
                  border: '1px solid #ef4444'
                }}>
                  <div style={{ fontWeight: '600', color: '#fecaca', marginBottom: '8px', fontSize: '14px' }}>
                    🔒 SECURITY WARNING
                  </div>
                  <div style={{ fontSize: '13px', color: '#fca5a5', lineHeight: '1.6' }}>
                    This backup file will contain ALL your data in <strong>PLAIN TEXT</strong> (unencrypted) including:
                    <ul style={{ marginTop: '8px', marginBottom: '8px', paddingLeft: '20px' }}>
                      <li>All check history and transactions</li>
                      <li>Payee names and amounts</li>
                      <li>Ledger balances</li>
                      <li>All memo fields</li>
                    </ul>
                    <strong>⚠️ Save this file in a SECURE location.</strong> Anyone with access can read all your financial data.
                  </div>
                </div>

                <div style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: '#1e3a5f',
                  borderRadius: '6px',
                  border: '1px solid #3b82f6'
                }}>
                  <div style={{ fontSize: '13px', color: '#93c5fd', lineHeight: '1.6' }}>
                    ✓ An <strong>encrypted</strong> copy will also be saved automatically to your secure app data folder.
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#e2e8f0', fontSize: '14px' }}>
                    You will be prompted to choose where to save this file
                  </label>
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    Recommended locations: Password manager, encrypted drive, or secure cloud storage
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn ghost" onClick={() => setShowManualBackupModal(false)}>Cancel</button>
                <button className="btn primary" onClick={confirmManualBackup}>
                  Choose Location & Save
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Generic Confirmation Modal */}
      {
        showConfirmModal && (
          <div className="modal-overlay confirm-modal no-print" onClick={handleConfirmModalCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
              <div className="modal-header">
                <h2>{confirmConfig.title}</h2>
                <button className="btn-icon" onClick={handleConfirmModalCancel}>×</button>
              </div>
              <div className="modal-body">
                <p>{confirmConfig.message}</p>
              </div>
              <div className="modal-footer">
                <button className="btn ghost" onClick={handleConfirmModalCancel}>Cancel</button>
                <button className="btn primary" onClick={handleConfirmModalConfirm}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Batch Print Confirmation Modal */}
      {
        showBatchPrintConfirm && (
          <div className="modal-overlay no-print" onClick={cancelBatchPrintConfirm}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h2>Print & Record All Checks?</h2>
                <button className="btn-icon" onClick={cancelBatchPrintConfirm}>×</button>
              </div>
              <div className="modal-body" style={{ padding: '24px' }}>
                <p style={{ marginBottom: '20px' }}>
                  Print and record {importQueue.length} checks? This will {activeProfile?.layoutMode === 'three_up' ? 'print checks in sheets of 3' : 'print each check'} and deduct amounts from your ledger balance.
                </p>

                {/* Auto-number checkbox */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={batchAutoNumber}
                      onChange={(e) => setBatchAutoNumber(e.target.checked)}
                      style={{ marginRight: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Auto-number checks sequentially</span>
                  </label>
                </div>

                {/* Starting number input (only visible when auto-number is enabled) */}
                {batchAutoNumber && (
                  <div style={{ marginLeft: '26px', marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#6b7280' }}>
                      Starting check number:
                    </label>
                    <input
                      type="text"
                      value={batchStartNumber}
                      onChange={(e) => setBatchStartNumber(e.target.value)}
                      placeholder="1001"
                      style={{
                        padding: '8px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        fontSize: '14px',
                        width: '150px'
                      }}
                    />
                  </div>
                )}

                {/* Printer Mode Selection */}
                <div style={{ marginBottom: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>
                    Batch Print Mode:
                  </label>

                  {/* Interactive Mode Radio */}
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px' }}>
                    <input
                      type="radio"
                      checked={preferences.batchPrintMode === 'interactive'}
                      onChange={() => setPreferences(p => ({ ...p, batchPrintMode: 'interactive' }))}
                      style={{ marginRight: '8px', cursor: 'pointer' }}
                    />
                    <span>Interactive (show dialog for each check)</span>
                  </label>

                  {/* Silent Mode Radio */}
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px' }}>
                    <input
                      type="radio"
                      checked={preferences.batchPrintMode === 'silent'}
                      onChange={() => {
                        setPreferences(p => ({ ...p, batchPrintMode: 'silent' }))
                        if (availablePrinters.length === 0) loadAvailablePrinters()
                      }}
                      style={{ marginRight: '8px', cursor: 'pointer' }}
                    />
                    <span>Use saved printer (silent printing)</span>
                  </label>

                  {/* Printer Dropdown (only when silent mode selected) */}
                  {preferences.batchPrintMode === 'silent' && (
                    <div style={{ marginLeft: '26px', marginBottom: '8px' }}>
                      <select
                        value={preferences.batchPrinterDeviceName || ''}
                        onChange={(e) => {
                          const selectedPrinter = availablePrinters.find(p => p.name === e.target.value)
                          setPreferences(p => ({
                            ...p,
                            batchPrinterDeviceName: e.target.value,
                            batchPrinterFriendlyName: selectedPrinter?.displayName || e.target.value
                          }))
                        }}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          fontSize: '14px',
                          width: '100%'
                        }}
                      >
                        <option value="">-- Select Printer --</option>
                        {availablePrinters.map(printer => (
                          <option key={printer.name} value={printer.name}>
                            {printer.displayName || printer.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* PDF Export Mode Radio */}
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px' }}>
                    <input
                      type="radio"
                      checked={preferences.batchPrintMode === 'pdf'}
                      onChange={() => setPreferences(p => ({ ...p, batchPrintMode: 'pdf' }))}
                      style={{ marginRight: '8px', cursor: 'pointer' }}
                    />
                    <span>Export all as PDFs to folder</span>
                  </label>

                  {/* Folder selection (only when PDF mode selected) */}
                  {preferences.batchPrintMode === 'pdf' && (
                    <div style={{ marginLeft: '26px' }}>
                      <button
                        className="btn ghost"
                        onClick={async () => {
                          const res = await window.cs2.selectPdfFolder()
                          if (res?.success && res.path) {
                            setPreferences(p => ({ ...p, batchPdfExportPath: res.path }))
                          }
                        }}
                        style={{ fontSize: '14px' }}
                      >
                        {preferences.batchPdfExportPath || 'Select Folder...'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn ghost" onClick={cancelBatchPrintConfirm}>Cancel</button>
                <button className="btn primary" onClick={confirmBatchPrint}>
                  Print & Record
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Batch Print Progress Modal */}
      {
        isBatchPrinting && (
          <div className="modal-overlay no-print">
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h2>Batch Print & Record</h2>
              </div>
              <div className="modal-body" style={{ padding: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                    Printing check {batchPrintProgress.current} of {batchPrintProgress.total}...
                  </p>
                  <div style={{
                    width: '100%',
                    height: '24px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      width: `${(batchPrintProgress.current / batchPrintProgress.total) * 100}%`,
                      height: '100%',
                      backgroundColor: '#3b82f6',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    Please wait while each check is printed and recorded. Do not close this window.
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    className="btn danger"
                    onClick={cancelBatchPrint}
                    style={{ minWidth: '120px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Batch Complete Modal */}
      {
        showBatchCompleteModal && (
          <div className="modal-overlay no-print" onClick={() => setShowBatchCompleteModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
              <div className="modal-header">
                <h2>{batchCompleteData.cancelled ? 'Batch Cancelled' : 'Batch Complete'}</h2>
                <button className="btn-icon" onClick={() => setShowBatchCompleteModal(false)}>×</button>
              </div>
              <div className="modal-body" style={{ textAlign: 'center', padding: '32px' }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '16px'
                }}>
                  {batchCompleteData.cancelled ? '⚠️' : '✅'}
                </div>
                <p style={{ fontSize: '18px', marginBottom: '8px', color: '#f1f5f9' }}>
                  {batchCompleteData.cancelled
                    ? `Processed ${batchCompleteData.processed} of ${batchCompleteData.total} checks`
                    : `Successfully printed and recorded ${batchCompleteData.processed} checks`
                  }
                </p>
                {batchCompleteData.cancelled && (
                  <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '12px' }}>
                    Already processed checks have been recorded.
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn primary"
                  onClick={() => setShowBatchCompleteModal(false)}
                  style={{ width: '100%' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Column Mapping Modal */}
      {
        showColumnMapping && (
          <div className="modal-overlay no-print">
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
              <div className="modal-header">
                <h2>Map Import Columns</h2>
                <button className="btn-icon" onClick={() => setShowColumnMapping(false)}>×</button>
              </div>
              <div className="modal-body" style={{ padding: '24px' }}>
                <p style={{ marginBottom: '20px', color: '#6b7280' }}>
                  Match your file's columns to the check fields. We've auto-detected likely matches, but you can adjust them below.
                </p>

                <div style={{ display: 'grid', gap: '16px' }}>
                  {/* Date Field */}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', alignItems: 'center' }}>
                    <label style={{ fontWeight: '600' }}>Date:</label>
                    <select
                      value={columnMapping.date}
                      onChange={(e) => {
                        const newMapping = { ...columnMapping, date: e.target.value }
                        setColumnMapping(newMapping)
                        setPreviewRow(getPreviewRow(rawFileData, fileExtension, newMapping))
                      }}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    >
                      <option value="">(Skip this field)</option>
                      {fileHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>

                  {/* Payee Field */}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', alignItems: 'center' }}>
                    <label style={{ fontWeight: '600' }}>Payee: *</label>
                    <select
                      value={columnMapping.payee}
                      onChange={(e) => {
                        const newMapping = { ...columnMapping, payee: e.target.value }
                        setColumnMapping(newMapping)
                        setPreviewRow(getPreviewRow(rawFileData, fileExtension, newMapping))
                      }}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    >
                      <option value="">(Skip this field)</option>
                      {fileHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>

                  {/* Address Field */}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', alignItems: 'center' }}>
                    <label style={{ fontWeight: '600' }}>Address:</label>
                    <select
                      value={columnMapping.address}
                      onChange={(e) => {
                        const newMapping = { ...columnMapping, address: e.target.value }
                        setColumnMapping(newMapping)
                        setPreviewRow(getPreviewRow(rawFileData, fileExtension, newMapping))
                      }}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    >
                      <option value="">(Skip this field)</option>
                      {fileHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>

                  {/* Amount Field */}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', alignItems: 'center' }}>
                    <label style={{ fontWeight: '600' }}>Amount: *</label>
                    <select
                      value={columnMapping.amount}
                      onChange={(e) => {
                        const newMapping = { ...columnMapping, amount: e.target.value }
                        setColumnMapping(newMapping)
                        setPreviewRow(getPreviewRow(rawFileData, fileExtension, newMapping))
                      }}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    >
                      <option value="">(Skip this field)</option>
                      {fileHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>

                  {/* Memo Field */}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', alignItems: 'center' }}>
                    <label style={{ fontWeight: '600' }}>Memo:</label>
                    <select
                      value={columnMapping.memo}
                      onChange={(e) => {
                        const newMapping = { ...columnMapping, memo: e.target.value }
                        setColumnMapping(newMapping)
                        setPreviewRow(getPreviewRow(rawFileData, fileExtension, newMapping))
                      }}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    >
                      <option value="">(Skip this field)</option>
                      {fileHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>

                  {/* External Memo Field */}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', alignItems: 'center' }}>
                    <label style={{ fontWeight: '600' }}>External Memo:</label>
                    <select
                      value={columnMapping.external_memo}
                      onChange={(e) => {
                        const newMapping = { ...columnMapping, external_memo: e.target.value }
                        setColumnMapping(newMapping)
                        setPreviewRow(getPreviewRow(rawFileData, fileExtension, newMapping))
                      }}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    >
                      <option value="">(Skip this field)</option>
                      {fileHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>

                  {/* Internal Memo Field */}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', alignItems: 'center' }}>
                    <label style={{ fontWeight: '600' }}>Internal Memo:</label>
                    <select
                      value={columnMapping.internal_memo}
                      onChange={(e) => {
                        const newMapping = { ...columnMapping, internal_memo: e.target.value }
                        setColumnMapping(newMapping)
                        setPreviewRow(getPreviewRow(rawFileData, fileExtension, newMapping))
                      }}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    >
                      <option value="">(Skip this field)</option>
                      {fileHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>

                  {/* Ledger Field */}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', alignItems: 'center' }}>
                    <label style={{ fontWeight: '600' }}>Ledger:</label>
                    <select
                      value={columnMapping.ledger}
                      onChange={(e) => {
                        const newMapping = { ...columnMapping, ledger: e.target.value }
                        setColumnMapping(newMapping)
                        setPreviewRow(getPreviewRow(rawFileData, fileExtension, newMapping))
                      }}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    >
                      <option value="">(Use active ledger)</option>
                      {fileHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>

                  {/* GL Code Field */}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', alignItems: 'center' }}>
                    <label style={{ fontWeight: '600' }}>GL Code:</label>
                    <select
                      value={columnMapping.glCode}
                      onChange={(e) => {
                        const newMapping = { ...columnMapping, glCode: e.target.value }
                        setColumnMapping(newMapping)
                        setPreviewRow(getPreviewRow(rawFileData, fileExtension, newMapping))
                      }}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    >
                      <option value="">(Skip this field)</option>
                      {fileHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>

                  {/* GL Description Field */}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', alignItems: 'center' }}>
                    <label style={{ fontWeight: '600' }}>GL Description:</label>
                    <select
                      value={columnMapping.glDescription}
                      onChange={(e) => {
                        const newMapping = { ...columnMapping, glDescription: e.target.value }
                        setColumnMapping(newMapping)
                        setPreviewRow(getPreviewRow(rawFileData, fileExtension, newMapping))
                      }}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    >
                      <option value="">(Skip this field)</option>
                      {fileHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '12px' }}>
                  * At least one of Payee or Amount must be mapped
                </p>

                {/* Preview Section */}
                {previewRow && (
                  <div style={{
                    marginTop: '24px',
                    padding: '16px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#e2e8f0' }}>Preview (First Row)</h3>
                    <div style={{ display: 'grid', gap: '8px', fontSize: '13px', color: '#cbd5e1' }}>
                      {previewRow.date && (
                        <div><strong>Date:</strong> {previewRow.date}</div>
                      )}
                      {previewRow.payee && (
                        <div><strong>Payee:</strong> {previewRow.payee}</div>
                      )}
                      {previewRow.address && (
                        <div><strong>Address:</strong> {previewRow.address}</div>
                      )}
                      {previewRow.amount && (
                        <div><strong>Amount:</strong> ${previewRow.amount}</div>
                      )}
                      {previewRow.memo && (
                        <div><strong>Memo:</strong> {previewRow.memo}</div>
                      )}
                      {previewRow.external_memo && (
                        <div><strong>External Memo:</strong> {previewRow.external_memo}</div>
                      )}
                      {previewRow.internal_memo && (
                        <div><strong>Internal Memo:</strong> {previewRow.internal_memo}</div>
                      )}
                      {previewRow.ledger && (
                        <div><strong>Ledger:</strong> {previewRow.ledger}</div>
                      )}
                      {previewRow.glCode && (
                        <div><strong>GL Code:</strong> {previewRow.glCode}</div>
                      )}
                      {previewRow.glDescription && (
                        <div><strong>GL Description:</strong> {previewRow.glDescription}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                  <button
                    className="btn"
                    onClick={() => setShowColumnMapping(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn primary"
                    onClick={processImportWithMapping}
                  >
                    Import
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Export Dialog Modal */}
      {
        showExportDialog && (
          <div className="modal-overlay no-print" onClick={() => setShowExportDialog(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Export Check History</h2>
                <button className="btn-icon" onClick={() => setShowExportDialog(false)}>×</button>
              </div>
              <div className="modal-body">
                <p className="hint">Select which ledgers to include in the export. The CSV will include per-ledger totals, per-profile breakdowns, and a grand total across all selected ledgers.</p>

                <div className="ledger-checkbox-list">
                  {ledgers.map(ledger => {
                    const checksInLedger = checkHistory.filter(c => c.ledgerId === ledger.id).length
                    return (
                      <label key={ledger.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedLedgersForExport.includes(ledger.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLedgersForExport([...selectedLedgersForExport, ledger.id])
                            } else {
                              setSelectedLedgersForExport(selectedLedgersForExport.filter(id => id !== ledger.id))
                            }
                          }}
                        />
                        <span>
                          <strong>{ledger.name}</strong>
                          <span className="ledger-meta">
                            {formatCurrency(ledger.balance)} • {checksInLedger} check{checksInLedger !== 1 ? 's' : ''}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>

                {/* GL Code Filter */}
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>GL Code</h3>
                  <div className="field">
                    <select
                      value={exportGlCodeFilter}
                      onChange={(e) => setExportGlCodeFilter(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1e293b',
                        color: '#f1f5f9',
                        border: '1px solid #475569',
                        padding: '8px',
                        borderRadius: '6px'
                      }}
                    >
                      <option value="">All GL Codes</option>
                      {[...new Set(checkHistory.filter(c => c.glCode).map(c => c.glCode))].sort().map(code => (
                        <option key={code} value={code}>
                          {code} {glCodes.find(g => g.code === code)?.description ? `- ${glCodes.find(g => g.code === code).description}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date Range Filter */}
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Date Range</h3>
                  <div className="field">
                    <select
                      value={exportDateRange}
                      onChange={(e) => setExportDateRange(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1e293b',
                        color: '#f1f5f9',
                        border: '1px solid #475569',
                        padding: '8px',
                        borderRadius: '6px'
                      }}
                    >
                      <option value="all">All Time</option>
                      <option value="custom">Custom Range</option>
                      <option value="thisWeek">This Week</option>
                      <option value="lastWeek">Last Week</option>
                      <option value="thisMonth">This Month</option>
                      <option value="lastMonth">Last Month</option>
                      <option value="thisQuarter">This Quarter</option>
                      <option value="ytd">Year-to-Date</option>
                      <option value="last60">Last 60 Days</option>
                    </select>
                  </div>

                  {exportDateRange === 'custom' && (
                    <div className="field-row" style={{ marginTop: '12px', gap: '12px' }}>
                      <div className="field" style={{ flex: 1 }}>
                        <label>Start Date</label>
                        <input
                          type="date"
                          value={exportStartDate}
                          onChange={(e) => setExportStartDate(e.target.value)}
                        />
                      </div>
                      <div className="field" style={{ flex: 1 }}>
                        <label>End Date</label>
                        <input
                          type="date"
                          value={exportEndDate}
                          onChange={(e) => setExportEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Export Format */}
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Export Format</h3>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="exportFormatRadio"
                        value="csv"
                        checked={exportFormat === 'csv'}
                        onChange={(e) => setExportFormat(e.target.value)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>CSV (Spreadsheet)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="exportFormatRadio"
                        value="pdf"
                        checked={exportFormat === 'pdf'}
                        onChange={(e) => setExportFormat(e.target.value)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>PDF (Document)</span>
                    </label>
                  </div>
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
                    {exportFormat === 'csv'
                      ? 'Best for importing into Excel or Google Sheets'
                      : 'Best for printing or sharing as a formatted document'}
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => setShowExportDialog(false)}>Cancel</button>
                <button className="btn primary" onClick={executeExport}>
                  <DownloadIcon /> Export as {exportFormat.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* History Modal */}
      {
        showHistory && (
          <div className="modal-overlay history-modal-overlay" onClick={() => { setShowHistory(false); setSelectedHistoryItem(null); }}>
            <div className="history-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="history-modal-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2>
                    {historyViewMode === 'all'
                      ? `Full History - All Ledgers`
                      : `Check History - ${activeLedger?.name}`
                    }
                  </h2>
                  <button className="btn-icon" onClick={() => { setShowHistory(false); setSelectedHistoryItem(null); }}>×</button>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                    <input
                      type="text"
                      placeholder="Search payee, memo, amount..."
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                      style={{ width: '100%' }}
                      autoFocus
                    />
                  </div>
                  <div className="field" style={{ width: '175px', marginBottom: 0 }}>
                    <select
                      value={historyGlCodeFilter}
                      onChange={(e) => setHistoryGlCodeFilter(e.target.value)}
                      style={{ width: '100%' }}
                      title="Filter by GL Code"
                    >
                      <option value="all">All GL Codes</option>
                      {(() => {
                        const uniqueGlCodes = [...new Set((historyViewMode === 'all' ? checkHistory : checkHistory.filter(c => c.ledgerId === activeLedgerId)).map(c => c.glCode).filter(Boolean))].sort()
                        return uniqueGlCodes.map(code => (
                          <option key={code} value={code}>{code}</option>
                        ))
                      })()}
                    </select>
                  </div>
                  <div className="field" style={{ width: '200px', marginBottom: 0 }}>
                    <select
                      value={historySortOrder}
                      onChange={(e) => setHistorySortOrder(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="date-desc">Date (Newest First)</option>
                      <option value="date-asc">Date (Oldest First)</option>
                      <option value="amount-desc">Amount (High to Low)</option>
                      <option value="amount-asc">Amount (Low to High)</option>
                      <option value="payee-asc">Payee (A-Z)</option>
                    </select>
                  </div>
                </div>
              </div>

              {(historyViewMode === 'all' ? checkHistory.length : checkHistory.filter(c => c.ledgerId === activeLedgerId).length) === 0 ? (
                <div className="history-empty-state">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <path d="M32 8L8 20V42C8 51.9 18.8 56 32 56C45.2 56 56 51.9 56 42V20L32 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
                  </svg>
                  <h3>No checks recorded yet</h3>
                  <p>Checks you print and record will appear here</p>
                </div>
              ) : (
                <div className="history-modal-body">
                  <div className="history-list-column">
                    {(historyViewMode === 'all' ? checkHistory : checkHistory.filter(c => c.ledgerId === activeLedgerId))
                      .filter(entry => {
                        // GL Code filter
                        if (historyGlCodeFilter !== 'all' && entry.glCode !== historyGlCodeFilter) return false

                        // Search term filter
                        if (!historySearchTerm) return true
                        const term = historySearchTerm.toLowerCase()
                        return (
                          (entry.payee && entry.payee.toLowerCase().includes(term)) ||
                          (entry.memo && entry.memo.toLowerCase().includes(term)) ||
                          (entry.amount && entry.amount.toString().includes(term)) ||
                          (entry.checkNumber && entry.checkNumber.toString().includes(term)) ||
                          (entry.glCode && entry.glCode.toLowerCase().includes(term)) ||
                          (entry.glDescription && entry.glDescription.toLowerCase().includes(term))
                        )
                      })
                      .sort((a, b) => {
                        switch (historySortOrder) {
                          case 'date-asc': return new Date(a.date) - new Date(b.date)
                          case 'date-desc': return new Date(b.date) - new Date(a.date)
                          case 'amount-asc': return parseFloat(a.amount) - parseFloat(b.amount)
                          case 'amount-desc': return parseFloat(b.amount) - parseFloat(a.amount)
                          case 'payee-asc': return (a.payee || '').localeCompare(b.payee || '')
                          default: return 0
                        }
                      })
                      .map(entry => {
                        const ledger = ledgers.find(l => l.id === entry.ledgerId)
                        const profile = profiles.find(p => p.id === entry.profileId)
                        return (
                          <div
                            key={entry.id}
                            className={`history-card ${selectedHistoryItem?.id === entry.id ? 'selected' : ''}`}
                            onClick={() => setSelectedHistoryItem(entry)}
                          >
                            <div className="history-card-main">
                              <div className="history-card-payee">{entry.payee}</div>
                              <div className={`history-card-amount ${entry.type === 'deposit' ? 'income' : ''}`}>
                                {entry.type === 'deposit' ? '+' : '-'}{formatCurrency(Math.abs(parseFloat(entry.amount)))}
                              </div>
                            </div>
                            <div className="history-card-meta">
                              <span>{formatDate(entry.date)}</span>
                              {entry.glCode && <span className="history-card-memo" style={{ color: '#60a5fa' }}>• GL: {entry.glCode}{entry.glDescription ? ` - ${entry.glDescription}` : (() => {
                                const match = glCodes.find(g => g.code === entry.glCode)
                                return match && match.description ? ` - ${match.description}` : ''
                              })()}</span>}
                              {entry.memo && <span className="history-card-memo">• {entry.memo}</span>}
                            </div>
                            <div className="history-card-tags">
                              <span className="tag tag-ledger">{ledger?.name || entry.ledgerName || 'Unknown'}</span>
                              <span className="tag tag-profile">{profile?.name || 'Unknown'}</span>
                            </div>
                            <button
                              className="history-card-delete"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteHistoryEntry(entry.id)
                                if (selectedHistoryItem?.id === entry.id) {
                                  setSelectedHistoryItem(null)
                                }
                              }}
                              title="Delete and restore amount"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        )
                      })}
                  </div>

                  {selectedHistoryItem ? (
                    <div className="history-detail-column">
                      <div className="history-detail-header">
                        <h3>Check Details</h3>
                        <button className="btn btn-sm" onClick={() => setSelectedHistoryItem(null)} style={{ minWidth: 'fit-content', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
                          Close Preview
                        </button>
                      </div>

                      <div className="check-detail-grid">
                        <div className="detail-card">
                          <label>Date</label>
                          <div className="detail-value">{selectedHistoryItem.date}</div>
                        </div>

                        <div className="detail-card">
                          <label>Payee</label>
                          <div className="detail-value">{selectedHistoryItem.payee}</div>
                        </div>

                        {selectedHistoryItem.address && (
                          <div className="detail-card full-width">
                            <label>Address</label>
                            <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{selectedHistoryItem.address}</div>
                          </div>
                        )}

                        <div className="detail-card">
                          <label>Amount</label>
                          <div className={`detail-value amount ${selectedHistoryItem.type === 'deposit' ? 'positive' : 'negative'}`}>{formatCurrency(selectedHistoryItem.amount)}</div>
                        </div>

                        {selectedHistoryItem.memo && (
                          <div className="detail-card full-width">
                            <label>Memo</label>
                            <div className="detail-value">{selectedHistoryItem.memo}</div>
                          </div>
                        )}

                        {selectedHistoryItem.external_memo && (
                          <div className="detail-card full-width">
                            <label>External Memo</label>
                            <div className="detail-value">{selectedHistoryItem.external_memo}</div>
                          </div>
                        )}

                        {selectedHistoryItem.internal_memo && (
                          <div className="detail-card full-width">
                            <label>Internal Memo</label>
                            <div className="detail-value">{selectedHistoryItem.internal_memo}</div>
                          </div>
                        )}

                        {selectedHistoryItem.glCode && (
                          <div className="detail-card full-width">
                            <label>GL Code</label>
                            <div className="detail-value">
                              {selectedHistoryItem.glCode}
                              {selectedHistoryItem.glDescription ? ` - ${selectedHistoryItem.glDescription}` : (() => {
                                const match = glCodes.find(g => g.code === selectedHistoryItem.glCode)
                                return match && match.description ? ` - ${match.description}` : ''
                              })()}
                            </div>
                          </div>
                        )}

                        {selectedHistoryItem.line_items && selectedHistoryItem.line_items.length > 0 && (
                          <div className="detail-card full-width">
                            <label>Line Items</label>
                            <div className="line-items-table">
                              {selectedHistoryItem.line_items.map((item, idx) => (
                                <div key={idx} className="line-item-row">
                                  <span>{item.description}</span>
                                  <span>{formatCurrency(item.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedHistoryItem.ledger_snapshot && (
                          <div className="detail-card full-width ledger-snapshot-card">
                            <label>Ledger Snapshot</label>
                            <div className="snapshot-grid">
                              <div className="snapshot-item">
                                <span className="snapshot-label">Previous Balance</span>
                                <span className="snapshot-value">
                                  {formatCurrency(selectedHistoryItem.ledger_snapshot.previous_balance)}
                                </span>
                              </div>
                              <div className="snapshot-item">
                                <span className="snapshot-label">Transaction</span>
                                <span className={`snapshot-value ${selectedHistoryItem.type === 'deposit' ? 'positive' : 'negative'}`}>
                                  {selectedHistoryItem.type === 'deposit' ? '+' : '-'}{formatCurrency(Math.abs(parseFloat(selectedHistoryItem.ledger_snapshot.transaction_amount)))}
                                </span>
                              </div>
                              <div className="snapshot-item balance-row">
                                <span className="snapshot-label">New Balance</span>
                                <span className={`snapshot-value ${selectedHistoryItem.ledger_snapshot.new_balance < 0 ? 'negative' : ''}`}>
                                  {formatCurrency(selectedHistoryItem.ledger_snapshot.new_balance)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="detail-card full-width timestamp-card">
                          <label>Recorded</label>
                          <div className="detail-value">{new Date(selectedHistoryItem.timestamp).toLocaleString()}</div>
                        </div>
                      </div>

                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <button
                          className="btn btn-sm danger"
                          onClick={() => {
                            deleteHistoryEntry(selectedHistoryItem.id)
                            setSelectedHistoryItem(null)
                          }}
                          style={{ width: '100%' }}
                        >
                          <TrashIcon /> Delete & Restore to Ledger
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="history-detail-column history-detail-empty">
                      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                        <rect x="20" y="16" width="40" height="48" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                        <path d="M28 28H52M28 36H52M28 44H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
                      </svg>
                      <h3>Select a check</h3>
                      <p>Click on a check from the list to view its details</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* Print Failure Confirmation Modal */}
      {
        showPrintFailureModal && (
          <div className="modal-overlay" style={{ zIndex: 10001 }}>
            <div className="modal-content" style={{ maxWidth: '420px' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <h2 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚠️ Print Failed
                </h2>
              </div>
              <div className="modal-body" style={{ padding: '20px' }}>
                <p style={{ marginBottom: '12px', fontWeight: 600 }}>
                  Failed to print: {printFailureInfo.payee}
                </p>
                <p style={{ marginBottom: '16px', color: '#94a3b8', fontSize: '14px' }}>
                  Error: {printFailureInfo.error}
                </p>
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '8px'
                }}>
                  <p style={{ fontSize: '13px', color: '#fca5a5', margin: 0 }}>
                    <strong>Note:</strong> The ledger has NOT been deducted for this check.
                  </p>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  className="btn danger"
                  onClick={handlePrintFailureAbort}
                >
                  Stop Batch
                </button>
                <button
                  className="btn primary"
                  onClick={handlePrintFailureContinue}
                >
                  Skip & Continue
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Toast Notification */}

      {
        toast && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : toast.type === 'warning' ? '#f59e0b' : '#3b82f6',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 10000,
            maxWidth: '400px',
            wordWrap: 'break-word',
            animation: 'slideIn 0.3s ease-out'
          }}>
            {toast.message}
          </div>
        )
      }

      {/* Update Notification */}
      <UpdateNotification isAdmin={!preferences.adminLocked} />
    </div >
  )
}
