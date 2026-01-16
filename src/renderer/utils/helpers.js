// ========================================
// PURE HELPER FUNCTIONS
// ========================================
// These functions have been extracted from App_MONOLITH.jsx
// They are pure utility functions with no React state dependencies

// Re-export existing utilities (already in this file)
export { generateId, formatCurrency, sanitizeCurrencyInput }

// ========================================
// MATH UTILITIES
// ========================================

/**
 * Clamp a number between min and max values
 */
export function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n))
}

/**
 * Round a number to a specific step/increment
 */
export function roundTo(n, step) {
    const s = step || 1
    return Math.round(n / s) * s
}

// ========================================
// FORMATTING UTILITIES
// ========================================

/**
 * Format a number for display with 2 decimal places
 */
export function formatAmountForDisplay(value) {
    const num = sanitizeCurrencyInput(value)
    return num.toFixed(2)
}

/**
 * Format date string to short locale format
 */
export function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Format date based on user preference using date builder
 */
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

/**
 * Format line items array into displayable text
 */
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

/**
 * Format ledger snapshot for display
 */
export function formatLedgerSnapshot(snapshot, ledgerName) {
    if (!snapshot) return ''

    const prev = formatCurrency(snapshot.previous_balance || 0)
    const amt = formatCurrency(snapshot.transaction_amount || 0)
    const remaining = formatCurrency(snapshot.new_balance || 0)
    const ledgerLine = ledgerName ? `Ledger: ${ledgerName}\n` : ''

    return `${ledgerLine}Previous Balance: ${prev}\nCheck Amount:     ${amt}\nRemaining Balance: ${remaining}`
}

// ========================================
// DATE UTILITIES
// ========================================

/**
 * Calculate date range for export filtering
 */
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

/**
 * Convert Excel date serial numbers to YYYY-MM-DD format
 */
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
    return new Date().toISOString().slice(0, 10)
}

// ========================================
// DATA NORMALIZATION
// ========================================

/**
 * Normalize model with defaults
 */
export function normalizeModel(maybeModel, DEFAULT_MODEL, DEFAULT_LAYOUT, DEFAULT_FIELDS) {
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

// ========================================
// FILE PARSING UTILITIES
// ========================================

/**
 * Parse CSV content into array of check data objects
 */
export function parseCSV(content, delimiter = ',') {
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
        glCode: ['gl code', 'glcode', 'gl', 'account code', 'account number'],
        address: ['address', 'addr', 'recipient address', 'payee address'],
        ledger: ['ledger', 'account', 'fund', 'ledger name', 'account name', 'fund name']
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
            glCode: columnIndices.glCode !== undefined ? values[columnIndices.glCode] || '' : '',
            address: columnIndices.address !== undefined ? values[columnIndices.address] || '' : '',
            ledger: columnIndices.ledger !== undefined ? values[columnIndices.ledger] || '' : ''
        }

        // Only include if we have at least payee or amount
        if (entry.payee || entry.amount) {
            results.push(entry)
        }
    }

    return results
}

/**
 * Parse Excel (.xlsx, .xls) files
 * Note: Requires XLSX library to be imported where this is used
 */
export function parseExcel(base64Content, XLSX) {
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
            glCode: ['gl code', 'glcode', 'gl', 'account code', 'account number'],
            address: ['address', 'addr', 'recipient address', 'payee address'],
            ledger: ['ledger', 'account', 'fund', 'ledger name', 'account name', 'fund name']
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

/**
 * Parse Excel with custom column mapping
 */
export function parseExcelWithMapping(base64Content, mapping, XLSX) {
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

/**
 * Parse CSV with custom column mapping
 */
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
            ledger: columnIndices.ledger !== undefined ? values[columnIndices.ledger] || '' : ''
        }

        // Only include if we have at least payee or amount
        if (entry.payee || entry.amount) {
            results.push(entry)
        }
    }

    return results
}
