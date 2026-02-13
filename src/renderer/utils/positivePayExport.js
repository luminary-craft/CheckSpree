/**
 * Positive Pay Export Utility
 *
 * Generates CSV files of issued checks for bank fraud prevention.
 * Banks require businesses to submit a list of issued checks
 * (number, date, amount, payee) to verify against presented checks.
 *
 * Supported formats:
 * - Standard CSV — universal, works with most banks
 * - Fixed-width — some banks require fixed-column-width format
 */

/**
 * Format a date for Positive Pay export (MM/DD/YYYY).
 *
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date string
 */
function formatPPDate(date) {
    try {
        const d = new Date(date)
        if (isNaN(d.getTime())) return ''
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const year = d.getFullYear()
        return `${month}/${day}/${year}`
    } catch {
        return ''
    }
}

/**
 * Format a date as YYYYMMDD for fixed-width exports.
 *
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date string (YYYYMMDD)
 */
function formatPPDateCompact(date) {
    try {
        const d = new Date(date)
        if (isNaN(d.getTime())) return '00000000'
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const year = d.getFullYear()
        return `${year}${month}${day}`
    } catch {
        return '00000000'
    }
}

/**
 * Clean and format amount for export.
 * Removes currency symbols and ensures two decimal places.
 *
 * @param {string|number} amount - The check amount
 * @returns {string} Formatted amount (e.g., "1234.56")
 */
function formatPPAmount(amount) {
    try {
        const num = typeof amount === 'string'
            ? parseFloat(amount.replace(/[^0-9.-]/g, ''))
            : amount
        if (isNaN(num)) return '0.00'
        return num.toFixed(2)
    } catch {
        return '0.00'
    }
}

/**
 * Escape a CSV field value.
 * Wraps in quotes if it contains commas, quotes, or newlines.
 *
 * @param {string} value - Raw field value
 * @returns {string} CSV-safe value
 */
function escapeCSV(value) {
    const str = String(value || '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

/**
 * Generate a Standard CSV positive pay file.
 *
 * Columns: Check Number, Date, Amount, Payee, Account Number (optional), Status
 *
 * @param {Array} checks - Array of check history entries
 * @param {Object} options - Export options
 * @param {string} [options.accountNumber] - Bank account number (optional)
 * @param {boolean} [options.includeVoided] - Whether to include voided checks
 * @returns {string} CSV content
 */
export function generatePositivePayCSV(checks, options = {}) {
    const { accountNumber = '', includeVoided = false } = options

    // Filter out voided checks unless explicitly included
    const filteredChecks = includeVoided
        ? checks
        : checks.filter(c => c.status !== 'void')

    // CSV header
    const headers = ['Check Number', 'Date', 'Amount', 'Payee']
    if (accountNumber) headers.push('Account Number')
    headers.push('Status')

    // Build rows
    const rows = filteredChecks.map(check => {
        const row = [
            escapeCSV(check.checkNumber || ''),
            escapeCSV(formatPPDate(check.date || check.printedAt)),
            formatPPAmount(check.amount),
            escapeCSV(check.payee || '')
        ]
        if (accountNumber) row.push(escapeCSV(accountNumber))
        row.push(escapeCSV(check.status === 'void' ? 'VOID' : 'ISSUED'))
        return row.join(',')
    })

    return [headers.join(','), ...rows].join('\n')
}

/**
 * Generate a Fixed-Width positive pay file.
 *
 * Some banks require fixed-column-width format instead of CSV.
 * Layout: CheckNumber(10) | Date(8) | Amount(12) | Payee(40) | Status(6)
 *
 * @param {Array} checks - Array of check history entries
 * @param {Object} options - Export options
 * @param {string} [options.accountNumber] - Bank account number
 * @param {boolean} [options.includeVoided] - Whether to include voided checks
 * @returns {string} Fixed-width content
 */
export function generatePositivePayFixedWidth(checks, options = {}) {
    const { accountNumber = '', includeVoided = false } = options

    const filteredChecks = includeVoided
        ? checks
        : checks.filter(c => c.status !== 'void')

    const rows = filteredChecks.map(check => {
        const checkNum = String(check.checkNumber || '').padStart(10, '0')
        const date = formatPPDateCompact(check.date || check.printedAt)
        // Amount in cents, right-justified, 12 chars
        const amountCents = Math.round(parseFloat(formatPPAmount(check.amount)) * 100)
        const amount = String(amountCents).padStart(12, '0')
        const payee = String(check.payee || '').substring(0, 40).padEnd(40, ' ')
        const status = (check.status === 'void' ? 'VOID  ' : 'ISSUED')

        let line = `${checkNum}${date}${amount}${payee}${status}`
        if (accountNumber) {
            line = String(accountNumber).padEnd(20, ' ') + line
        }
        return line
    })

    return rows.join('\n')
}

/**
 * Filter check history by date range.
 *
 * @param {Array} checks - Full check history
 * @param {string} startDate - ISO date string for range start
 * @param {string} endDate - ISO date string for range end
 * @returns {Array} Filtered checks within the date range
 */
export function filterChecksByDateRange(checks, startDate, endDate) {
    if (!checks || !checks.length) return []

    const start = startDate ? new Date(startDate).getTime() : 0
    const end = endDate ? new Date(endDate).getTime() : Infinity

    return checks.filter(check => {
        const checkDate = new Date(check.date || check.printedAt).getTime()
        return checkDate >= start && checkDate <= end
    })
}

/**
 * Get summary statistics for a set of checks.
 *
 * @param {Array} checks - Array of check entries
 * @returns {Object} Summary with count, totalAmount, dateRange
 */
export function getCheckSummary(checks) {
    if (!checks || !checks.length) {
        return { count: 0, totalAmount: 0, dateRange: { start: null, end: null } }
    }

    let total = 0
    let earliest = Infinity
    let latest = -Infinity

    for (const check of checks) {
        const amount = parseFloat(formatPPAmount(check.amount))
        total += amount

        const checkDate = new Date(check.date || check.printedAt).getTime()
        if (checkDate < earliest) earliest = checkDate
        if (checkDate > latest) latest = checkDate
    }

    return {
        count: checks.length,
        totalAmount: total,
        dateRange: {
            start: earliest === Infinity ? null : new Date(earliest).toLocaleDateString(),
            end: latest === -Infinity ? null : new Date(latest).toLocaleDateString()
        }
    }
}
