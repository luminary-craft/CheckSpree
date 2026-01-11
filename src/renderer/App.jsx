import React, { useEffect, useMemo, useRef, useState } from 'react'
import { numberToWords } from '../shared/numberToWords'
import * as XLSX from 'xlsx'
import UpdateNotification from './UpdateNotification'

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
  stub2HeightIn: 3.0
}

const DEFAULT_FIELDS = {
  date: { x: 6.65, y: 0.50, w: 1.6, h: 0.40, fontIn: 0.28, label: 'Date' },
  payee: { x: 0.75, y: 1.05, w: 6.2, h: 0.45, fontIn: 0.32, label: 'Pay to the Order of' },
  amount: { x: 6.95, y: 1.05, w: 1.25, h: 0.45, fontIn: 0.32, label: 'Amount ($)' },
  amountWords: { x: 0.75, y: 1.55, w: 7.5, h: 0.45, fontIn: 0.30, label: 'Amount in Words' },
  memo: { x: 0.75, y: 2.35, w: 3.8, h: 0.45, fontIn: 0.28, label: 'Memo' }
}

const DEFAULT_PROFILE = {
  id: 'default',
  name: 'Standard Check',
  layout: DEFAULT_LAYOUT,
  fields: DEFAULT_FIELDS,
  template: { path: null, opacity: 0, fit: 'cover' },
  placement: { offsetXIn: 0, offsetYIn: 0 },
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
  stub2ShowLedger: true,
  stub2ShowApproved: true,
  stub2ShowGLCode: true,
  adminLocked: true,
  adminPin: '0000',
  enableSnapping: false
}

const DEFAULT_MODEL = {
  page: { size: 'Letter', widthIn: 8.5, heightIn: 11 },
  placement: { offsetXIn: 0, offsetYIn: 0 },
  layout: DEFAULT_LAYOUT,
  view: { zoom: 0.9 },
  template: { path: null, opacity: 0, fit: 'cover' },
  fields: DEFAULT_FIELDS
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function roundTo(n, step) {
  const s = step || 1
  return Math.round(n / s) * s
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

// Sanitize currency input by stripping commas and other non-numeric characters (except decimal point)
function sanitizeCurrencyInput(value) {
  if (value === null || value === undefined || value === '') return 0
  // Remove commas, dollar signs, and spaces, but keep digits and decimal point
  const cleaned = String(value).replace(/[$,\s]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
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

  // If long date is enabled, use full written format
  if (prefs.useLongDate) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Build date using slots and separator
  const d = new Date(dateStr + 'T00:00:00') // Force local timezone
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

function formatLedgerSnapshot(snapshot) {
  if (!snapshot) return ''

  const prev = formatCurrency(snapshot.previous_balance || 0)
  const amt = formatCurrency(snapshot.transaction_amount || 0)
  const remaining = formatCurrency(snapshot.new_balance || 0)

  return `Previous Balance: ${prev}\nCheck Amount:     ${amt}\nRemaining Balance: ${remaining}`
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

  return {
    ...DEFAULT_MODEL,
    ...m,
    layout,
    template
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
    internal_memo: ['internal memo', 'internal_memo', 'private memo', 'private_memo', 'bookkeeper memo', 'admin memo']
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
      internal_memo: columnIndices.internal_memo !== undefined ? values[columnIndices.internal_memo] || '' : ''
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
      internal_memo: ['internal memo', 'internal_memo', 'private memo', 'private_memo', 'bookkeeper memo', 'admin memo']
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
      internal_memo: columnIndices.internal_memo !== undefined ? values[columnIndices.internal_memo] || '' : ''
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
  return { url: res.dataUrl, error: null, mime: res.mime, byteLength: res.byteLength }
}

// Icon components
function ChevronIcon({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ transition: 'transform 200ms ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1.5 3.5H12.5M5.5 1.5H8.5M5.5 6V10.5M8.5 6V10.5M2.5 3.5L3 11.5C3 12.0523 3.44772 12.5 4 12.5H10C10.5523 12.5 11 12.0523 11 11.5L11.5 3.5" 
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1V9M7 9L4 6M7 9L10 6M2 11V12C2 12.5523 2.44772 13 3 13H11C11.5523 13 12 12.5523 12 12V11" 
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 9V1M7 1L4 4M7 1L10 4M2 11V12C2 12.5523 2.44772 13 3 13H11C11.5523 13 12 12.5523 12 12V11" 
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function App() {
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState('payee')
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

  // Multi-Ledger system
  const [ledgers, setLedgers] = useState([
    { id: 'default', name: 'Primary Ledger', balance: 0 }
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
  const [showHistory, setShowHistory] = useState(false)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null)

  // Import queue
  const [importQueue, setImportQueue] = useState([])
  const [showImportQueue, setShowImportQueue] = useState(false)

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
    internal_memo: ''
  })
  const [rawFileData, setRawFileData] = useState(null)
  const [fileExtension, setFileExtension] = useState('')
  const [previewRow, setPreviewRow] = useState(null)

  // Stub friendly labels
  const [showStub1Labels, setShowStub1Labels] = useState(false)
  const [showStub2Labels, setShowStub2Labels] = useState(false)

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

  // Batch completion modal state
  const [showBatchCompleteModal, setShowBatchCompleteModal] = useState(false)
  const [batchCompleteData, setBatchCompleteData] = useState({ processed: 0, total: 0, cancelled: false })

  const [data, setData] = useState({
    date: new Date().toISOString().slice(0, 10),
    payee: '',
    amount: '',
    amountWords: '',
    memo: '',
    external_memo: '',
    internal_memo: '',
    line_items: [],
    line_items_text: '',
    ledger_snapshot: null
  })

  // Load settings from disk on launch
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const persisted = await window.cs2.settingsGet()
      if (cancelled) return

      if (persisted?.model) setModel(normalizeModel(persisted.model))
      if (persisted?.data) setData((prev) => ({ ...prev, ...persisted.data }))
      if (persisted?.editMode != null) setEditMode(!!persisted.editMode)
      if (persisted?.profiles?.length) setProfiles(persisted.profiles)
      if (persisted?.activeProfileId) setActiveProfileId(persisted.activeProfileId)

      // Migrate old single-ledger system to multi-ledger
      if (persisted?.ledgers?.length) {
        setLedgers(persisted.ledgers)
        if (persisted?.activeLedgerId) setActiveLedgerId(persisted.activeLedgerId)
      } else if (persisted?.ledgerBalance != null) {
        // Migration: old system had a single ledgerBalance, convert to new system
        setLedgers([{ id: 'default', name: 'Primary Ledger', balance: persisted.ledgerBalance }])
        setActiveLedgerId('default')
      }

      if (persisted?.checkHistory) setCheckHistory(persisted.checkHistory)
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

  // Immediate save for critical data (importQueue, checkHistory, ledgers)
  useEffect(() => {
    window.cs2.settingsSet({
      model,
      data,
      editMode,
      profiles,
      activeProfileId,
      ledgers,
      activeLedgerId,
      checkHistory,
      preferences,
      importQueue
    })
  }, [importQueue, checkHistory, ledgers, activeLedgerId, profiles, activeProfileId])

  // Debounced save for UI state changes (model, data, editMode, preferences)
  useEffect(() => {
    const t = setTimeout(() => {
      window.cs2.settingsSet({
        model,
        data,
        editMode,
        profiles,
        activeProfileId,
        ledgers,
        activeLedgerId,
        checkHistory,
        preferences,
        importQueue
      })
    }, 250)
    return () => clearTimeout(t)
  }, [model, data, editMode, preferences])

  // Force exit Edit Layout mode when Admin is locked
  useEffect(() => {
    if (preferences.adminLocked && editMode) {
      setEditMode(false)
    }
  }, [preferences.adminLocked, editMode])

  // Auto-generate amount words
  useEffect(() => {
    if (!data.amount) {
      setData((p) => ({ ...p, amountWords: '' }))
      return
    }
    setData((p) => ({ ...p, amountWords: numberToWords(p.amount) }))
  }, [data.amount])

  // Parent-to-child data flow: Check details (parent) ALWAYS update stub details (children)
  // This is one-way only - stub edits don't affect parent, but parent edits always overwrite stubs
  const parentFieldsRef = useRef({ date: '', payee: '', amount: '', memo: '', external_memo: '', internal_memo: '' })

  useEffect(() => {
    const currentParent = {
      date: data.date,
      payee: data.payee,
      amount: data.amount,
      memo: data.memo,
      external_memo: data.external_memo,
      internal_memo: data.internal_memo
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
          updates.stub1_date = currentParent.date
          updates.stub1_payee = currentParent.payee
          updates.stub1_amount = currentParent.amount
          updates.stub1_memo = currentParent.external_memo || currentParent.memo || ''
        }

        if (model.layout.stub2Enabled) {
          updates.stub2_date = currentParent.date
          updates.stub2_payee = currentParent.payee
          updates.stub2_amount = currentParent.amount
          updates.stub2_memo = currentParent.internal_memo || currentParent.memo || ''
        }

        return Object.keys(updates).length > 0 ? { ...d, ...updates } : d
      })
    }
  }, [data.date, data.payee, data.amount, data.memo, data.external_memo, data.internal_memo, model.layout.stub1Enabled, model.layout.stub2Enabled])

  // Load template dataURL when template path changes
  useEffect(() => {
    let cancelled = false
    ;(async () => {
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
      setTemplateMeta(res?.url ? { mime: res?.mime, byteLength: res?.byteLength } : null)
      setTemplateDecodeError(null)
    })()
    return () => { cancelled = true }
  }, [model.template?.path])

  // Get active font family
  const activeFontFamily = AVAILABLE_FONTS.find(f => f.id === preferences.fontFamily)?.family || AVAILABLE_FONTS[0].family

  // Profile helpers
  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0]

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

  const createNewProfile = () => {
    const newProfile = {
      id: generateId(),
      name: `Check Profile ${profiles.length + 1}`,
      layout: { ...DEFAULT_LAYOUT },
      fields: JSON.parse(JSON.stringify(DEFAULT_FIELDS)),
      template: { path: null, opacity: 0, fit: 'cover' },
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
      template: { path: null, opacity: 0, fit: 'cover' },
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

  const createNewLedger = () => {
    const newLedger = {
      id: generateId(),
      name: `Ledger ${ledgers.length + 1}`,
      balance: 0
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

  const renameLedger = (ledgerId, newName) => {
    setLedgers(ledgers.map(l =>
      l.id === ledgerId ? { ...l, name: newName } : l
    ))
    setEditingLedgerName(null)
  }

  const updateLedgerBalance = (ledgerId, newBalance) => {
    setLedgers(ledgers.map(l =>
      l.id === ledgerId ? { ...l, balance: newBalance } : l
    ))
  }

  // Ledger helpers
  const recordCheck = (checkData = data) => {
    const amount = sanitizeCurrencyInput(checkData.amount)
    if (amount <= 0) return false
    if (!checkData.payee?.trim()) return false

    const previousBalance = ledgerBalance
    const newBalance = ledgerBalance - amount

    const checkEntry = {
      id: generateId(),
      date: checkData.date || new Date().toISOString().slice(0, 10),
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
      timestamp: Date.now(),
      balanceAfter: newBalance
    }

    setCheckHistory(prev => [checkEntry, ...prev])
    updateLedgerBalance(activeLedgerId, newBalance)
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

    // Restore balance using functional update to avoid stale closure
    setLedgers(prev => {
      const ledger = prev.find(l => l.id === deleteTarget.ledgerId)
      if (!ledger) {
        console.warn(`Ledger ${deleteTarget.ledgerId} not found for deleted check entry`)
        return prev
      }

      return prev.map(l =>
        l.id === deleteTarget.ledgerId
          ? { ...l, balance: l.balance + deleteTarget.amount }
          : l
      )
    })

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
    updateLedgerBalance(activeLedgerId, newBal)
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

  const handleBackupData = async () => {
    try {
      const result = await window.cs2.backupSave()
      if (result.success) {
        showToast(`Backup saved: ${result.path}`, 'success')
      } else {
        showToast('Backup cancelled or failed', 'error')
      }
    } catch (e) {
      showToast(`Error creating backup: ${e.message}`, 'error')
    }
  }

  // Auto-detect column mappings based on header keywords
  const autoDetectMapping = (headers) => {
    const fieldMap = {
      date: ['date', 'check date', 'checkdate', 'dt', 'transaction date'],
      payee: ['payee', 'pay to', 'payto', 'recipient', 'name', 'to', 'vendor'],
      amount: ['amount', 'amt', 'value', 'check amount', 'sum', 'total', 'cost', 'price'],
      memo: ['memo', 'description', 'desc', 'note', 'notes', 'for', 'purpose'],
      external_memo: ['external memo', 'external_memo', 'public memo', 'public_memo', 'payee memo'],
      internal_memo: ['internal memo', 'internal_memo', 'private memo', 'private_memo', 'bookkeeper memo', 'admin memo'],
      ledger: ['ledger', 'account', 'fund', 'ledger name', 'account name', 'fund name']
    }

    const mapping = {
      date: '',
      payee: '',
      amount: '',
      memo: '',
      external_memo: '',
      internal_memo: '',
      ledger: ''
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
    setImportQueue(parsed.map((item, idx) => ({ ...item, id: generateId(), index: idx })))
    setShowImportQueue(true)
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

    if (selectedChecks.length === 0) {
      alert('No checks found in the selected ledgers for the specified date range')
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
      return {
        ...check,
        ledgerName: ledger?.name || 'Unknown',
        profileName: profile?.name || 'Unknown'
      }
    })

    const res = await window.cs2.exportHistory({
      checks: enrichedChecks,
      ledgerTotals,
      grandTotal,
      exportDate: new Date().toISOString()
    })

    if (res?.success) {
      setShowExportDialog(false)
      // File saved and folder opened
    } else if (res?.error) {
      alert(`Export failed: ${res.error}`)
    }
  }

  const loadFromQueue = (queueItem) => {
    setData({
      date: queueItem.date || new Date().toISOString().slice(0, 10),
      payee: queueItem.payee || '',
      amount: queueItem.amount || '',
      amountWords: queueItem.amount ? numberToWords(queueItem.amount) : '',
      memo: queueItem.memo || '',
      external_memo: queueItem.external_memo || '',
      internal_memo: queueItem.internal_memo || '',
      line_items: queueItem.line_items || [],
      line_items_text: queueItem.line_items_text || '',
      ledger_snapshot: null
    })
    // Remove from queue
    setImportQueue(prev => prev.filter(item => item.id !== queueItem.id))
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
    let newBalance = ledgerBalance
    const newHistory = [...checkHistory]

    for (const item of importQueue) {
      const amount = sanitizeCurrencyInput(item.amount)
      if (amount > 0 && item.payee?.trim()) {
        const previousBalance = newBalance
        newBalance -= amount
        newHistory.unshift({
          id: generateId(),
          date: item.date || new Date().toISOString().slice(0, 10),
          payee: item.payee,
          amount: amount,
          memo: item.memo || '',
          external_memo: item.external_memo || '',
          internal_memo: item.internal_memo || '',
          line_items: item.line_items || [],
          line_items_text: item.line_items_text || '',
          ledgerId: activeLedgerId,
          profileId: activeProfileId,
          ledger_snapshot: {
            previous_balance: previousBalance,
            transaction_amount: amount,
            new_balance: newBalance
          },
          timestamp: Date.now(),
          balanceAfter: newBalance
        })
        processed++
      }
    }

    updateLedgerBalance(activeLedgerId, newBalance)
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

    showConfirm(
      'Print & Record All Checks?',
      `Print and record ${importQueue.length} checks? This will print each check and deduct amounts from your ledger balance.`,
      async () => {
        await executeBatchPrintAndRecord()
      }
    )
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

  const executeBatchPrintAndRecord = async () => {

    // Initialize batch print state
    setIsBatchPrinting(true)
    setBatchPrintCancelled(false)
    setBatchPrintProgress({ current: 0, total: importQueue.length })

    let processed = 0
    const newHistory = [...checkHistory]

    // Track balances per ledger (ledgerId -> balance)
    const ledgerBalances = {}
    ledgers.forEach(l => {
      ledgerBalances[l.id] = l.balance
    })

    // Create a copy of the queue to iterate through
    const queueCopy = [...importQueue]

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

      // Determine which ledger to use (find or create based on item.ledger)
      const targetLedgerId = findOrCreateLedger(item.ledger)

      // Initialize balance for newly created ledgers
      if (ledgerBalances[targetLedgerId] === undefined) {
        ledgerBalances[targetLedgerId] = 0
      }

      // Normalize the date to YYYY-MM-DD format
      let normalizedDate = item.date || new Date().toISOString().slice(0, 10)
      if (item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
        // Date is not in YYYY-MM-DD format, try to parse it
        normalizedDate = convertExcelDate(item.date)
      }

      // Load check data into the form for printing
      setData({
        date: normalizedDate,
        payee: item.payee,
        amount: item.amount,
        amountWords: numberToWords(item.amount),
        memo: item.memo || '',
        external_memo: item.external_memo || '',
        internal_memo: item.internal_memo || '',
        line_items: item.line_items || [],
        line_items_text: item.line_items_text || '',
        ledger_snapshot: null
      })

      // Wait a brief moment for the UI to update with the new data
      await new Promise(resolve => setTimeout(resolve, 300))

      // Set document title for PDF filename
      const originalTitle = document.title
      document.title = generatePrintFilename(item)

      // Trigger print
      setIsPrinting(true)
      try {
        const filename = generatePrintFilename(item)
        const res = await window.cs2.printDialog(filename)

        // Restore original title
        document.title = originalTitle

        if (res?.success === false) {
          console.error(`Print failed for ${item.payee}:`, res.error)
          // Continue even if print fails - user might have cancelled
        }
      } catch (error) {
        console.error(`Print error for ${item.payee}:`, error)
        // Restore original title on error
        document.title = originalTitle
      }
      setIsPrinting(false)

      // Wait for printer spooler to receive the job
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Record to ledger/history
      const previousBalance = ledgerBalances[targetLedgerId]
      ledgerBalances[targetLedgerId] -= amount
      const newBalance = ledgerBalances[targetLedgerId]

      newHistory.unshift({
        id: generateId(),
        date: item.date || new Date().toISOString().slice(0, 10),
        payee: item.payee,
        amount: amount,
        memo: item.memo || '',
        external_memo: item.external_memo || '',
        internal_memo: item.internal_memo || '',
        line_items: item.line_items || [],
        line_items_text: item.line_items_text || '',
        ledgerId: targetLedgerId,
        profileId: activeProfileId,
        ledgerName: ledgers.find(l => l.id === targetLedgerId)?.name || '',
        profileName: profiles.find(p => p.id === activeProfileId)?.name || '',
        ledger_snapshot: {
          previous_balance: previousBalance,
          transaction_amount: amount,
          new_balance: newBalance
        },
        timestamp: Date.now(),
        balanceAfter: newBalance
      })
      processed++
    }

    // Update all affected ledger balances
    Object.entries(ledgerBalances).forEach(([ledgerId, balance]) => {
      updateLedgerBalance(ledgerId, balance)
    })
    setCheckHistory(newHistory)

    // Clear the queue and reset batch state
    setImportQueue([])
    setIsBatchPrinting(false)
    setBatchPrintProgress({ current: 0, total: 0 })

    // Show completion modal
    setBatchCompleteData({ processed, total: queueCopy.length, cancelled: batchPrintCancelled })
    setShowBatchCompleteModal(true)

    if (!batchPrintCancelled) {
      setShowImportQueue(false)
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
    setModel((m) => ({
      ...m,
      fields: { ...m.fields, [key]: { ...m.fields[key], ...patch } }
    }))
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
            // PAYEE COPY (Stub 1) - External Memo & Line Items
            [`${prefix}date`]: { x: 0.55, y: baseY + 0.25, w: 1.3, h: 0.30, fontIn: 0.20, label: 'Date' },
            [`${prefix}payee`]: { x: 2.0, y: baseY + 0.25, w: 3.5, h: 0.30, fontIn: 0.20, label: 'Pay To' },
            [`${prefix}amount`]: { x: nextLayout.widthIn - 1.75, y: baseY + 0.25, w: 1.20, h: 0.30, fontIn: 0.20, label: 'Amount' },
            [`${prefix}memo`]: { x: 0.55, y: baseY + 0.70, w: nextLayout.widthIn - 1.10, h: 0.30, fontIn: 0.18, label: 'Memo' },
            [`${prefix}line_items`]: { x: 0.55, y: baseY + 1.15, w: nextLayout.widthIn - 1.10, h: 1.20, fontIn: 0.16, label: 'Line Items' }
          }
        : {
            // BOOKKEEPER COPY (Stub 2) - Internal Memo, Ledger Snapshot, Admin
            [`${prefix}date`]: { x: 0.55, y: baseY + 0.25, w: 1.3, h: 0.30, fontIn: 0.20, label: 'Date' },
            [`${prefix}payee`]: { x: 2.0, y: baseY + 0.25, w: 3.5, h: 0.30, fontIn: 0.20, label: 'Pay To' },
            [`${prefix}amount`]: { x: nextLayout.widthIn - 1.75, y: baseY + 0.25, w: 1.20, h: 0.30, fontIn: 0.20, label: 'Amount' },
            [`${prefix}memo`]: { x: 0.55, y: baseY + 0.70, w: nextLayout.widthIn - 1.10, h: 0.30, fontIn: 0.18, label: 'Internal Memo' },
            [`${prefix}ledger`]: { x: 0.55, y: baseY + 1.15, w: 3.5, h: 0.85, fontIn: 0.16, label: 'Ledger Snapshot' },
            [`${prefix}approved`]: { x: 4.25, y: baseY + 1.15, w: 1.85, h: 0.35, fontIn: 0.16, label: 'Approved By' },
            [`${prefix}glcode`]: { x: 4.25, y: baseY + 1.65, w: 1.85, h: 0.35, fontIn: 0.16, label: 'GL Code' }
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

    setSelected(key)
    const f = model.fields[key]
    dragRef.current = {
      key,
      mode: 'move',
      startX: e.clientX,
      startY: e.clientY,
      startField: { ...f }
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerDownHandle = (e, key) => {
    if (!editMode) return
    e.preventDefault()
    e.stopPropagation()

    setSelected(key)
    const f = model.fields[key]
    dragRef.current = {
      key,
      mode: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      startField: { ...f }
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e) => {
    const d = dragRef.current
    if (!d) return
    const dxIn = (e.clientX - d.startX) / (PX_PER_IN * model.view.zoom)
    const dyIn = (e.clientY - d.startY) / (PX_PER_IN * model.view.zoom)

    if (d.mode === 'move') {
      const nx = roundTo(d.startField.x + dxIn, snapStepIn)
      const ny = roundTo(d.startField.y + dyIn, snapStepIn)
      setField(d.key, {
        x: clamp(nx, 0, model.layout.widthIn - 0.2),
        y: clamp(ny, 0, stageHeightIn - 0.2)
      })
    } else if (d.mode === 'resize') {
      const nw = roundTo(d.startField.w + dxIn, snapStepIn)
      const nh = roundTo(d.startField.h + dyIn, snapStepIn)
      setField(d.key, {
        w: clamp(nw, 0.2, model.layout.widthIn - d.startField.x),
        h: clamp(nh, 0.18, stageHeightIn - d.startField.y)
      })
    }
  }

  const onPointerUp = (e) => {
    if (dragRef.current) {
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
  const generatePrintFilename = (checkData) => {
    const payee = (checkData.payee || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_')
    const date = checkData.date || new Date().toISOString().slice(0, 10)
    const amount = sanitizeCurrencyInput(checkData.amount).toFixed(2).replace('.', '')
    return `Check_${payee}_${date}_${amount}`
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
    setIsPrinting(true)

    // Set document title for PDF filename
    const originalTitle = document.title
    document.title = generatePrintFilename(data)

    setTimeout(async () => {
      const filename = generatePrintFilename(data)
      const res = await window.cs2.printDialog(filename)

      // Restore original title
      document.title = originalTitle

      if (res?.success === false) alert(`Print failed: ${res.error || 'Unknown error'}`)
      setIsPrinting(false)
    }, 250)
  }

  const handlePrintAndRecord = async () => {
    const amount = sanitizeCurrencyInput(data.amount)
    if (amount <= 0) {
      alert('Please enter a valid amount')
      return
    }
    if (!data.payee.trim()) {
      alert('Please enter a payee')
      return
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
      ledger_snapshot: data.ledger_snapshot
    }

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

        // NOW it's safe to record and clear - print has fully completed
        recordCheck(checkDataSnapshot)

        // Clear form for next check
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
          ledger_snapshot: null
        })
      } catch (error) {
        setIsPrinting(false)
        alert(`Print error: ${error?.message || 'Unknown error'}`)
      }
    }, 250)
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

  const templateFit = model.template?.fit || 'cover'
  const templateObjectFit = templateFit === 'cover' ? 'cover' : templateFit === 'contain' ? 'contain' : 'fill'
  const templateBgSize = templateFit === 'cover' ? 'cover' : templateFit === 'contain' ? 'contain' : '100% 100%'

  // Calculate if balance will go negative
  const pendingAmount = sanitizeCurrencyInput(data.amount)
  const projectedBalance = ledgerBalance - pendingAmount
  const isOverdrawn = pendingAmount > 0 && projectedBalance < 0

  return (
    <div
      className={`app ${isPrinting ? 'printing' : ''}`}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="topbar">
        <div className="brand">
          <span className="logo">✓</span>
          <span>CheckSpree</span>
        </div>

        {/* Ledger & History Tabs */}
        <div className="ledger-history-tabs">
          <button
            className={`tab-button ${showLedger && !showHistory ? 'active' : ''}`}
            onClick={() => { setShowLedger(true); setShowHistory(false); }}
          >
            <span className="tab-label">Balance</span>
            <span className={`tab-value ${ledgerBalance < 0 ? 'negative' : ''}`}>
              {formatCurrency(ledgerBalance)}
            </span>
          </button>
          <button
            className={`tab-button ${showHistory ? 'active' : ''}`}
            onClick={() => { setShowHistory(true); setShowLedger(false); }}
          >
            <span className="tab-label">History</span>
            <span className="tab-value">{checkHistory.filter(c => c.ledgerId === activeLedgerId).length}</span>
          </button>
        </div>

        <div className="topbar-actions">
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
          <button className="btn primary" onClick={handlePrintAndRecord}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6V1H12V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="2" y="6" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4 12V15H12V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Print & Record
          </button>
        </div>
      </div>

      <div className="layout">
        <div className="side">
          {/* Unified Ledger Widget - Always Visible */}
          <section className="section">
            <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
              {/* Active Ledger Selector */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    className="profile-select"
                    value={activeLedgerId}
                    onChange={(e) => setActiveLedgerId(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {ledgers.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                  <button
                    className="btn-icon"
                    onClick={() => setShowLedgerManager(!showLedgerManager)}
                    title="Manage ledgers"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
                      <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                      <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
                    </svg>
                  </button>
                </div>

                {/* Ledger Manager */}
                {showLedgerManager && (
                  <div className="profile-manager" style={{ marginTop: '12px' }}>
                    <div className="profile-list">
                      {ledgers.map(l => (
                        <div key={l.id} className={`profile-item ${l.id === activeLedgerId ? 'active' : ''}`}>
                          {editingLedgerName === l.id ? (
                            <input
                              className="profile-name-input"
                              defaultValue={l.name}
                              autoFocus
                              onBlur={(e) => {
                                if (e.target.value.trim()) {
                                  renameLedger(l.id, e.target.value.trim())
                                } else {
                                  setEditingLedgerName(null)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.target.value.trim()) {
                                  renameLedger(l.id, e.target.value.trim())
                                } else if (e.key === 'Escape') {
                                  setEditingLedgerName(null)
                                }
                              }}
                            />
                          ) : (
                            <>
                              <span className="profile-name" onClick={() => setEditingLedgerName(l.id)}>
                                {l.name}
                              </span>
                              {ledgers.length > 1 && (
                                <button
                                  className="profile-delete"
                                  onClick={() => deleteLedger(l.id)}
                                  title="Delete ledger"
                                >
                                  <TrashIcon />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    <button className="btn btn-sm full-width" onClick={createNewLedger}>
                      <PlusIcon /> New Ledger
                    </button>
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
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tempBalance}
                      onChange={(e) => setTempBalance(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') updateBalance()
                        if (e.key === 'Escape') setEditingBalance(false)
                      }}
                      placeholder="0.00"
                      style={{
                        flexGrow: 1,
                        padding: '8px 12px',
                        fontSize: '16px',
                        backgroundColor: '#1e293b',
                        color: '#f1f5f9',
                        border: '1px solid #475569',
                        borderRadius: '6px'
                      }}
                    />
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
                  <div
                    onClick={() => { setTempBalance(ledgerBalance.toString()); setEditingBalance(true) }}
                    style={{ cursor: 'pointer', textAlign: 'center' }}
                  >
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Current Balance</div>
                    <div style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      color: ledgerBalance < 0 ? '#ef4444' : '#10b981',
                      marginBottom: '4px'
                    }}>
                      {formatCurrency(ledgerBalance)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Click to edit</div>
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
                      <div key={entry.id} style={{
                        position: 'relative',
                        padding: '8px 40px 8px 10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '6px',
                        fontSize: '13px',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}>
                        <div style={{ marginBottom: '4px' }}>
                          <div style={{ fontWeight: '500', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.payee}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {formatDate(entry.date)}
                          </div>
                        </div>
                        <div style={{ fontWeight: '600', color: '#f87171', whiteSpace: 'nowrap' }}>
                          -{formatCurrency(entry.amount)}
                        </div>
                        <button
                          onClick={() => deleteHistoryEntry(entry.id)}
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
                    onClick={() => { setShowHistory(true); setShowLedger(false); }}
                  >
                    View Full History ({checkHistory.filter(c => c.ledgerId === activeLedgerId).length})
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Import Queue Panel */}
          {showImportQueue && importQueue.length > 0 && (
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
                      <path d="M4 6V1H12V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="2" y="6" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M4 12V15H12V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
                  {importQueue.map(item => (
                    <div key={item.id} className="import-item" onClick={() => loadFromQueue(item)}>
                      <div className="import-main">
                        <span className="import-payee">{item.payee || '(no payee)'}</span>
                        <span className="import-amount">{item.amount ? formatCurrency(sanitizeCurrencyInput(item.amount)) : '-'}</span>
                      </div>
                      <div className="import-meta">
                        {item.date && <span>{item.date}</span>}
                        {item.memo && <span>{item.memo}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="hint">Click an item to load it into the form</p>
              </div>
            </section>
          )}

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
                      <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
                      <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                      <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
                    </svg>
                  </button>
                )}
              </div>

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
            <h2>Check Details</h2>
            <div className="card card-main">
              <div className="field">
                <label>Date</label>
                <input
                  type="date"
                  value={data.date}
                  onChange={(e) => setData((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Pay to the Order of</label>
                <input
                  value={data.payee}
                  onChange={(e) => setData((p) => ({ ...p, payee: e.target.value }))}
                  placeholder="Recipient name"
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Amount</label>
                  <div className={`input-prefix ${isOverdrawn ? 'warning' : ''}`}>
                    <span>$</span>
                    <input
                      value={data.amount}
                      onChange={(e) => setData((p) => ({ ...p, amount: e.target.value }))}
                      onBlur={(e) => {
                        const value = e.target.value.trim()
                        if (value && value !== '') {
                          setData((p) => ({ ...p, amount: formatAmountForDisplay(value) }))
                        }
                      }}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              {isOverdrawn && (
                <div className="overdraft-warning">
                  ⚠️ This will overdraw your account
                </div>
              )}
              <div className="field">
                <label>Amount in Words</label>
                <input value={data.amountWords} readOnly className="readonly" />
              </div>
              <div className="field">
                <label>Memo</label>
                <input
                  value={data.memo}
                  onChange={(e) => setData((p) => ({ ...p, memo: e.target.value }))}
                  placeholder="Optional note"
                />
              </div>
              <div className="field">
                <label>External Memo (Payee Copy)</label>
                <input
                  value={data.external_memo}
                  onChange={(e) => setData((p) => ({ ...p, external_memo: e.target.value }))}
                  placeholder="Public memo for payee stub"
                />
              </div>
              <div className="field">
                <label>Internal Memo (Bookkeeper Copy)</label>
                <input
                  value={data.internal_memo}
                  onChange={(e) => setData((p) => ({ ...p, internal_memo: e.target.value }))}
                  placeholder="Private memo for bookkeeper stub"
                />
              </div>
              <div className="field">
                <label>Line Items / Detail</label>
                <textarea
                  value={data.line_items_text || ''}
                  onChange={(e) => setData((p) => ({ ...p, line_items_text: e.target.value }))}
                  placeholder="Enter line items, one per line (e.g., Item 1 - $100.00)"
                  rows="4"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    resize: 'vertical',
                    backgroundColor: '#1e293b',
                    color: '#f1f5f9',
                    border: '1px solid #475569',
                    padding: '8px',
                    borderRadius: '6px'
                  }}
                />
                <small style={{ color: '#888', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  This will appear in the Line Items section on the check and Remittance Advice on stubs
                </small>
              </div>
            </div>
          </section>

          {/* Text & Font Settings */}
          {!preferences.adminLocked && (
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
          )}

          {/* Stub Management - Payee Copy */}
          {model.layout.stub1Enabled && (
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
                      <label>Date</label>
                      <input type="date" value={data.stub1_date || ''} onChange={(e) => setData((p) => ({ ...p, stub1_date: e.target.value }))} />
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
              </div>
            </section>
          )}

          {/* Stub Management - Bookkeeper Copy */}
          {model.layout.stub2Enabled && (
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
                      <label>Date</label>
                      <input type="date" value={data.stub2_date || ''} onChange={(e) => setData((p) => ({ ...p, stub2_date: e.target.value }))} />
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
                    <small style={{ color: '#888', fontSize: '11px', marginTop: '8px', display: 'block' }}>
                      Toggle which administrative fields appear on the Bookkeeper Copy stub
                    </small>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Template - compact */}
          {!preferences.adminLocked && (
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
            </div>
            </section>
          )}

          {/* Advanced Settings - Collapsible */}
          {!preferences.adminLocked && (
            <section className="section">
            <button className="accordion-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
              <span>Advanced Settings</span>
              <ChevronIcon open={showAdvanced} />
            </button>

            {showAdvanced && (
              <div className="accordion-content">
                {/* Template Display */}
                <div className="card">
                  <h4>Template Display</h4>
                  <div className="field-row">
                    <div className="field">
                      <label>Fit Mode</label>
                      <select
                        value={model.template.fit || 'cover'}
                        onChange={(e) => setModel((m) => ({ ...m, template: { ...m.template, fit: e.target.value } }))}
                      >
                        <option value="stretch">Stretch</option>
                        <option value="contain">Contain</option>
                        <option value="cover">Cover</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Opacity</label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={model.template.opacity ?? 0}
                        onChange={(e) => setModel((m) => ({ ...m, template: { ...m.template, opacity: clamp(parseFloat(e.target.value) || 0, 0, 1) } }))}
                      />
                    </div>
                  </div>
                </div>

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

                {/* Selected Field - only in edit mode */}
                {editMode && (
                  <div className="card">
                    <h4>Selected Field</h4>
                    <div className="field">
                      <label>Field</label>
                      <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                        {Object.keys(model.fields).map((k) => (
                          <option value={k} key={k}>{model.fields[k].label || k}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field-row">
                      <div className="field">
                        <label>X (in)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={model.fields[selected].x}
                          onChange={(e) => setField(selected, { x: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="field">
                        <label>Y (in)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={model.fields[selected].y}
                          onChange={(e) => setField(selected, { y: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="field-row">
                      <div className="field">
                        <label>Width (in)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={model.fields[selected].w}
                          onChange={(e) => setField(selected, { w: parseFloat(e.target.value) || 0.2 })}
                        />
                      </div>
                      <div className="field">
                        <label>Height (in)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={model.fields[selected].h}
                          onChange={(e) => setField(selected, { h: parseFloat(e.target.value) || 0.18 })}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label>Font Size (in)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={model.fields[selected].fontIn}
                        onChange={(e) => setField(selected, { fontIn: clamp(parseFloat(e.target.value) || 0.2, 0.12, 0.6) })}
                      />
                    </div>
                  </div>
                )}

                {/* Reset */}
                <button className="btn danger full-width" onClick={resetModel}>
                  Reset All Settings
                </button>
              </div>
            )}
            </section>
          )}
        </div>

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
                  onClick={preferences.adminLocked ? handleUnlockRequest : () => {}}
                  style={{ marginTop: '8px' }}
                >
                  {preferences.adminLocked ? '🔓 Unlock Admin' : '✓ Admin Unlocked'}
                </button>
              </div>
            </div>
          ) : (
            <div className="paperWrap">
              <div className="paper" style={paperStyle}>
                <div
                  className="checkStage"
                  style={{
                    '--offset-x': `${model.placement.offsetXIn}in`,
                    '--offset-y': `${model.placement.offsetYIn}in`,
                    ...stageVars
                  }}
                >
                  {/* Rigid check face container with background image */}
                  <div
                    className="check-face-container"
                    style={{
                      '--check-height': `${model.layout.checkHeightIn}in`,
                      ...(templateDataUrl
                        ? {
                            backgroundImage: `url(${templateDataUrl})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'top left',
                            backgroundSize: templateBgSize
                          }
                        : {})
                    }}
                  >
                    {templateDataUrl && (
                      <img
                        className="templateImg"
                        src={templateDataUrl}
                        alt="Template"
                      draggable="false"
                      onError={() => setTemplateDecodeError('Template image failed to load.')}
                      style={{
                        opacity: model.template.opacity ?? 0,
                        objectFit: templateObjectFit
                      }}
                    />
                  )}
                </div>

                {/* Draggable Fold Lines (no-print) */}
                {editMode && model.layout.stub1Enabled && (
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

                {editMode && model.layout.stub2Enabled && (
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

                {Object.entries(model.fields).map(([key, f]) => {
                  // Check if this field belongs to a disabled stub
                  const isStub1Field = key.startsWith('stub1_')
                  const isStub2Field = key.startsWith('stub2_')

                  // Skip rendering stub fields if their stub is disabled
                  if (isStub1Field && !model.layout.stub1Enabled) return null
                  if (isStub2Field && !model.layout.stub2Enabled) return null

                  // Skip stub2 admin fields if their preferences are disabled
                  if (key === 'stub2_ledger' && !preferences.stub2ShowLedger) return null
                  if (key === 'stub2_approved' && !preferences.stub2ShowApproved) return null
                  if (key === 'stub2_glcode' && !preferences.stub2ShowGLCode) return null

                  // Smart field value handling
                  let value = data[key] ?? ''
                  let isTextarea = false
                  let isReadOnly = editMode || key === 'amountWords'

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
                    value = data.line_items_text || ''
                    isTextarea = true
                    isReadOnly = true
                  } else if (key.endsWith('_ledger')) {
                    const snapshot = data.ledger_snapshot || {
                      previous_balance: ledgerBalance + sanitizeCurrencyInput(data.amount),
                      transaction_amount: sanitizeCurrencyInput(data.amount),
                      new_balance: ledgerBalance
                    }
                    value = formatLedgerSnapshot(snapshot)
                    isTextarea = true
                    isReadOnly = true
                  } else if (key.endsWith('_approved')) {
                    value = 'Approved By: ___________________'
                    isReadOnly = true
                  } else if (key.endsWith('_glcode')) {
                    value = 'GL Code: ___________________'
                    isReadOnly = true
                  }

                  const isSelected = editMode && selected === key
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
                        left: `${f.x}in`,
                        top: `${actualY}in`,
                        width: `${f.w}in`,
                        height: `${f.h}in`
                      }}
                      onPointerDown={(e) => onPointerDownField(e, key)}
                    >
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
                          onChange={(e) => !isReadOnly && setData((p) => ({ ...p, [key]: e.target.value }))}
                          style={{
                            fontSize: `${fontSizePt}pt`,
                            fontFamily: activeFontFamily,
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            background: 'transparent',
                            resize: 'none',
                            padding: showFriendlyLabel ? '14px 0 0 0' : '0',
                            lineHeight: '1.3'
                          }}
                        />
                      ) : (
                        <input
                          value={value}
                          readOnly={isReadOnly}
                          onChange={(e) => setData((p) => ({ ...p, [key]: e.target.value }))}
                          style={{
                            fontSize: `${fontSizePt}pt`,
                            fontFamily: activeFontFamily,
                            paddingTop: showFriendlyLabel ? '14px' : '0'
                          }}
                        />
                      )}
                      {editMode && <div className="handle" onPointerDown={(e) => onPointerDownHandle(e, key)} />}
                    </div>
                  )
                })}
              </div>

              {/* Stub Add/Remove Buttons - positioned at specific heights within the paper */}
              {!editMode && (
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
      </div>

      {/* PIN Authentication Modal */}
      {showPinModal && (
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
      )}

      {/* Change PIN Modal */}
      {showChangePinModal && (
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
      )}

      {/* Delete Check Confirmation Modal */}
      {showDeleteConfirm && deleteTarget && (
        <div className="modal-overlay no-print" onClick={cancelDeleteHistoryEntry}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Delete Check?</h2>
              <button className="btn-icon" onClick={cancelDeleteHistoryEntry}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this check?</p>
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#1e293b',
                borderRadius: '6px',
                border: '1px solid #334155'
              }}>
                <div><strong>Payee:</strong> {deleteTarget.payee}</div>
                <div><strong>Amount:</strong> {formatCurrency(deleteTarget.amount)}</div>
                <div><strong>Date:</strong> {deleteTarget.date}</div>
              </div>
              <p style={{ marginTop: '16px', color: '#94a3b8', fontSize: '14px' }}>
                This will restore {formatCurrency(deleteTarget.amount)} to the ledger balance.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={cancelDeleteHistoryEntry}>Cancel</button>
              <button className="btn danger" onClick={confirmDeleteHistoryEntry}>
                Delete Check
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay no-print" onClick={handleConfirmModalCancel}>
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
      )}

      {/* Batch Print Progress Modal */}
      {isBatchPrinting && (
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
      )}

      {/* Batch Complete Modal */}
      {showBatchCompleteModal && (
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
      )}

      {/* Column Mapping Modal */}
      {showColumnMapping && (
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
      )}

      {/* Export Dialog Modal */}
      {showExportDialog && (
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
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowExportDialog(false)}>Cancel</button>
              <button className="btn primary" onClick={executeExport}>
                <DownloadIcon /> Export Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="modal-overlay history-modal-overlay" onClick={() => { setShowHistory(false); setSelectedHistoryItem(null); }}>
          <div className="history-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="history-modal-header">
              <h2>Check History - {activeLedger?.name} ({checkHistory.filter(c => c.ledgerId === activeLedgerId).length})</h2>
              <button className="btn-icon" onClick={() => { setShowHistory(false); setSelectedHistoryItem(null); }}>×</button>
            </div>

            {checkHistory.filter(c => c.ledgerId === activeLedgerId).length === 0 ? (
              <div className="history-empty-state">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <path d="M32 8L8 20V42C8 51.9 18.8 56 32 56C45.2 56 56 51.9 56 42V20L32 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
                </svg>
                <h3>No checks recorded yet</h3>
                <p>Checks you print and record will appear here</p>
              </div>
            ) : (
              <div className="history-modal-body">
                <div className="history-list-column">
                  {checkHistory.filter(c => c.ledgerId === activeLedgerId).map(entry => {
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
                          <div className="history-card-amount">-{formatCurrency(entry.amount)}</div>
                        </div>
                        <div className="history-card-meta">
                          <span>{formatDate(entry.date)}</span>
                          {entry.memo && <span className="history-card-memo">• {entry.memo}</span>}
                        </div>
                        <div className="history-card-tags">
                          <span className="tag tag-ledger">{ledger?.name || 'Unknown'}</span>
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

                      <div className="detail-card">
                        <label>Amount</label>
                        <div className="detail-value amount">{formatCurrency(selectedHistoryItem.amount)}</div>
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
                              <span className="snapshot-value negative">
                                -{formatCurrency(selectedHistoryItem.ledger_snapshot.transaction_amount)}
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
                  </div>
                ) : (
                  <div className="history-detail-column history-detail-empty">
                    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                      <rect x="20" y="16" width="40" height="48" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
                      <path d="M28 28H52M28 36H52M28 44H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
                    </svg>
                    <h3>Select a check</h3>
                    <p>Click on a check from the list to view its details</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6',
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
      )}

      {/* Update Notification */}
      <UpdateNotification />
    </div>
  )
}
