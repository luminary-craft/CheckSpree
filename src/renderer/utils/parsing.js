import * as XLSX from 'xlsx'
import { getLocalDateString } from './date'

// Common header variation mappings shared across parsers
const FIELD_MAP = {
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

// Convert Excel date serial numbers to YYYY-MM-DD format
export function convertExcelDate(value) {
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
  return getLocalDateString()
}

// Helper to parse a CSV line handling quoted values
function parseCSVLine(line, delimiter) {
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
  return values
}

// Parse CSV content into array of check data objects
export function parseCSV(content, delimiter = ',') {
  const lines = content.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  // Parse header row
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''))

  // Find column indices
  const columnIndices = {}
  for (const [field, variations] of Object.entries(FIELD_MAP)) {
    const idx = headers.findIndex(h => variations.includes(h))
    if (idx !== -1) columnIndices[field] = idx
  }

  // Parse data rows
  const results = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line, delimiter)

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
export function parseExcel(base64Content) {
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

    // Process each row
    const results = []
    for (const row of normalizedData) {
      const entry = {}

      // Find and map each field
      for (const [field, variations] of Object.entries(FIELD_MAP)) {
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

// Parse Excel with custom column mapping
export function parseExcelWithMapping(base64Content, mapping) {
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
export function parseCSVWithMapping(content, delimiter, mapping) {
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

    const values = parseCSVLine(line, delimiter)

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

// Extract headers from file content for column mapping
// ext can be with or without dot prefix (e.g. '.csv' or 'csv')
export function extractHeaders(content, ext) {
  const e = ext.replace(/^\./, '') // normalize: strip leading dot
  if (e === 'csv' || e === 'tsv' || e === 'txt') {
    const delimiter = e === 'tsv' ? '\t' : ','
    const lines = content.trim().split(/\r?\n/)
    if (lines.length === 0) return []
    return lines[0].split(delimiter).map(h => h.trim().replace(/['"]/g, '')).filter(h => h)
  } else if (e === 'xlsx' || e === 'xls') {
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
      if (jsonData.length === 0) return []
      return jsonData[0].map(h => String(h || '').trim()).filter(h => h)
    } catch (error) {
      console.error('Failed to extract Excel headers:', error)
      return []
    }
  }
  return []
}

// Auto-detect column mapping from headers
export function autoDetectMapping(headers) {
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

  // Extended field map for auto-detection including address and vendor
  const autoDetectFieldMap = {
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

  for (const [field, variations] of Object.entries(autoDetectFieldMap)) {
    const matchIndex = normalizedHeaders.findIndex(h => variations.includes(h))
    if (matchIndex !== -1) {
      mapping[field] = headers[matchIndex] // Use original case header
    }
  }

  return mapping
}

// Get a preview row from file data using mapping
// ext can be with or without dot prefix (e.g. '.csv' or 'csv')
export function getPreviewRow(content, ext, mapping) {
  const e = ext.replace(/^\./, '') // normalize: strip leading dot
  if (e === 'csv' || e === 'tsv' || e === 'txt') {
    const delimiter = e === 'tsv' ? '\t' : ','
    const lines = content.trim().split(/\r?\n/)
    if (lines.length < 2) return null

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/['"]/g, ''))
    const values = parseCSVLine(lines[1], delimiter)

    const preview = {}
    for (const [field, header] of Object.entries(mapping)) {
      if (header) {
        const idx = headers.indexOf(header)
        if (idx !== -1 && values[idx]) {
          preview[field] = values[idx]
        }
      }
    }
    return preview
  } else if (e === 'xlsx' || e === 'xls') {
    try {
      const binaryString = atob(content)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const workbook = XLSX.read(bytes, { type: 'array', cellDates: true })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' })

      if (rawData.length === 0) return null

      const row = rawData[0]
      const preview = {}
      for (const [field, header] of Object.entries(mapping)) {
        if (header && row[header] !== undefined) {
          preview[field] = row[header]
        }
      }
      return preview
    } catch (error) {
      console.error('Error getting Excel preview:', error)
      return null
    }
  }
  return null
}
