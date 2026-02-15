export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount)
}

/**
 * Format a number as a dollar amount string: $1,234.56
 * Handles null/undefined/NaN gracefully.
 */
export function formatAmount(n) {
    return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Parse a currency string (e.g. "$1,234.56") into a number.
 * Returns 0 for unparseable values.
 */
export function parseAmount(amount) {
    const num = typeof amount === 'string'
        ? parseFloat(amount.replace(/[^0-9.-]/g, ''))
        : (amount || 0)
    return isNaN(num) ? 0 : num
}

// Sanitize currency input by stripping commas and other non-numeric characters (except decimal point)
export function sanitizeCurrencyInput(value) {
    if (value === null || value === undefined || value === '') return 0
    // Remove commas, dollar signs, and spaces, but keep digits and decimal point
    const cleaned = String(value).replace(/[$,\s]/g, '')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
}
