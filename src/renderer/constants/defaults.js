import { sanitizeCurrencyInput, formatCurrency } from '../utils/helpers'
import { getLocalDateString } from '../utils/date'

// App version from package.json (injected by Vite)
export const APP_VERSION = __APP_VERSION__ || '0.0.0'
export const PX_PER_IN = 96

// Available fonts for check printing
export const AVAILABLE_FONTS = [
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

export const DEFAULT_LAYOUT = {
  widthIn: 8.5,
  checkHeightIn: 3.0,
  stub1Enabled: true,
  stub1HeightIn: 3.0,
  stub2Enabled: true,
  stub2HeightIn: 3.0,
  // Three-up cut line positions (relative to placement offset)
  cutLine1In: 3.66,
  cutLine2In: 7.33,
  // Order of sections: 'check', 'stub1', 'stub2'
  sectionOrder: ['check', 'stub1', 'stub2']
}

export const DEFAULT_FIELDS = {
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

export const DEFAULT_PROFILE = {
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

export const DEFAULT_PREFERENCES = {
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
  showAddressOnStub2: false,
  // Theme
  theme: 'dark',         // 'dark' | 'light'
  accentColor: 'amber'   // 'amber' | 'blue' | 'emerald' | 'rose' | 'purple'
}

export const DEFAULT_MODEL = {
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

// --- Pure helper functions ---

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export function roundTo(n, step) {
  const s = step || 1
  return Math.round(n / s) * s
}

// Helper to get the starting Y position for placing fields in a section
// Respects section order and only counts enabled sections
export function calculateBaseYForSection(sectionName, layout) {
  const order = layout.sectionOrder || ['check', 'stub1', 'stub2']
  let y = 0
  for (const s of order) {
    if (s === sectionName) return y
    // Always add check height, but only add stub heights if enabled
    if (s === 'check') {
      y += layout.checkHeightIn
    } else if (s === 'stub1' && layout.stub1Enabled) {
      y += layout.stub1HeightIn
    } else if (s === 'stub2' && layout.stub2Enabled) {
      y += layout.stub2HeightIn
    }
  }
  return y
}

// Format a number for display with 2 decimal places
export function formatAmountForDisplay(value) {
  const num = sanitizeCurrencyInput(value)
  return num.toFixed(2)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Format date based on user preference using date builder
export function formatDateByPreference(dateStr, prefs) {
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

export function formatLineItems(lineItems, maxLines = 5) {
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

export function formatLedgerSnapshot(snapshot, ledgerName) {
  if (!snapshot) return ''

  const prev = formatCurrency(snapshot.previous_balance || 0)
  const amt = formatCurrency(snapshot.transaction_amount || 0)
  const remaining = formatCurrency(snapshot.new_balance || 0)
  const ledgerLine = ledgerName ? `Ledger: ${ledgerName}\n` : ''

  return `${ledgerLine}Previous Balance: ${prev}\nCheck Amount:     ${amt}\nRemaining Balance: ${remaining}`
}

// Calculate date range for export filtering
export function getDateRangeForFilter(rangeType, customStart = null, customEnd = null) {
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

export function normalizeModel(maybeModel) {
  const m = maybeModel || {}
  const layout =
    m.layout ||
    (m.check
      ? {
        widthIn: m.check.widthIn ?? DEFAULT_LAYOUT.widthIn,
        checkHeightIn: m.check.heightIn ?? DEFAULT_LAYOUT.checkHeightIn,
        stub1Enabled: true,
        stub1HeightIn: DEFAULT_LAYOUT.stub1HeightIn,
        stub2Enabled: true,
        stub2HeightIn: DEFAULT_LAYOUT.stub2HeightIn,
        sectionOrder: ['check', 'stub1', 'stub2']
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

  // FORCE MIGRATION: Ensure ALL stub fields exist if stubs are enabled
  // Stub 1 (Payee Copy)
  if (layout.stub1Enabled) {
    const baseY = calculateBaseYForSection('stub1', layout)
    const prefix = 'stub1_'
    const stub1Defaults = {
      [`${prefix}date`]: { x: 0.55, y: baseY + 0.25, w: 1.3, h: 0.30, fontIn: 0.20, label: 'Date' },
      [`${prefix}payee`]: { x: 2.0, y: baseY + 0.25, w: 3.5, h: 0.30, fontIn: 0.20, label: 'Pay To' },
      [`${prefix}address`]: { x: 2.0, y: baseY + 0.55, w: 3.5, h: 0.60, fontIn: 0.18, label: 'Address' },
      [`${prefix}amount`]: { x: layout.widthIn - 1.75, y: baseY + 0.25, w: 1.20, h: 0.30, fontIn: 0.20, label: 'Amount' },
      [`${prefix}checkNumber`]: { x: 6.35, y: baseY + 0.25, w: 0.85, h: 0.30, fontIn: 0.18, label: 'Check #' },
      [`${prefix}memo`]: { x: 0.55, y: baseY + 0.70, w: layout.widthIn - 1.10, h: 0.30, fontIn: 0.18, label: 'Memo' },
      [`${prefix}line_items`]: { x: 0.55, y: baseY + 1.25, w: layout.widthIn - 1.10, h: 1.10, fontIn: 0.16, label: 'Line Items' },
      [`${prefix}ledger`]: { x: 0.55, y: baseY + 2.45, w: 3.5, h: 0.85, fontIn: 0.16, label: 'Ledger Snapshot' },
      [`${prefix}approved`]: { x: 4.25, y: baseY + 2.45, w: 1.85, h: 0.35, fontIn: 0.16, label: 'Approved By' },
      [`${prefix}glcode`]: { x: 4.25, y: baseY + 2.95, w: 1.85, h: 0.35, fontIn: 0.16, label: 'GL Code' }
    }
    for (const [k, v] of Object.entries(stub1Defaults)) {
      if (!fields[k]) fields[k] = v
    }
  }

  // Stub 2 (Bookkeeper Copy)
  if (layout.stub2Enabled) {
    const baseY = calculateBaseYForSection('stub2', layout)
    const prefix = 'stub2_'
    const stub2Defaults = {
      [`${prefix}date`]: { x: 0.55, y: baseY + 0.25, w: 1.3, h: 0.30, fontIn: 0.20, label: 'Date' },
      [`${prefix}payee`]: { x: 2.0, y: baseY + 0.25, w: 3.5, h: 0.30, fontIn: 0.20, label: 'Pay To' },
      [`${prefix}address`]: { x: 2.0, y: baseY + 0.55, w: 3.5, h: 0.60, fontIn: 0.18, label: 'Address' },
      [`${prefix}amount`]: { x: layout.widthIn - 1.75, y: baseY + 0.25, w: 1.20, h: 0.30, fontIn: 0.20, label: 'Amount' },
      [`${prefix}checkNumber`]: { x: 6.35, y: baseY + 0.25, w: 0.85, h: 0.30, fontIn: 0.18, label: 'Check #' },
      [`${prefix}memo`]: { x: 0.55, y: baseY + 0.70, w: layout.widthIn - 1.10, h: 0.30, fontIn: 0.18, label: 'Internal Memo' },
      [`${prefix}ledger`]: { x: 0.55, y: baseY + 1.15, w: 3.5, h: 0.85, fontIn: 0.16, label: 'Ledger Snapshot' },
      [`${prefix}approved`]: { x: 4.25, y: baseY + 1.15, w: 1.85, h: 0.35, fontIn: 0.16, label: 'Approved By' },
      [`${prefix}glcode`]: { x: 4.25, y: baseY + 1.65, w: 1.85, h: 0.35, fontIn: 0.16, label: 'GL Code' },
      [`${prefix}line_items`]: { x: 6.35, y: baseY + 1.15, w: 1.60, h: 0.85, fontIn: 0.16, label: 'Line Items' }
    }
    for (const [k, v] of Object.entries(stub2Defaults)) {
      if (!fields[k]) fields[k] = v
    }
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

export async function readTemplateDataUrl(path) {
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

// SNAP constant for grid snapping
export const SNAP = 0.125
