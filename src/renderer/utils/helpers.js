import { LOCALES } from '../../config/locales'

// Module-level locale config — defaults to US, updated by App.jsx on startup
let _currencyLocale = LOCALES.US.currency

/**
 * Set the active currency locale for formatCurrency/formatAmount.
 * Call this once at app startup when preferences are loaded.
 */
export function setCurrencyLocale(currencyConfig) {
    _currencyLocale = currencyConfig || LOCALES.US.currency
}

/** Return the active currency locale config object */
export function getCurrencyLocale() {
    return _currencyLocale
}

/** Format a number with locale grouping (no currency symbol). Used for raw numeric displays. */
export function formatNumberLocale(n) {
    return (n || 0).toLocaleString(_currencyLocale.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat(_currencyLocale.locale, {
        style: 'currency',
        currency: _currencyLocale.code
    }).format(amount)
}

/**
 * Format a number as a currency amount string using the active locale.
 * Handles null/undefined/NaN gracefully.
 */
export function formatAmount(n) {
    return _currencyLocale.symbol + (n || 0).toLocaleString(_currencyLocale.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
    // Remove currency symbols, commas, and spaces, but keep digits and decimal point
    const cleaned = String(value).replace(/[^0-9.-]/g, '')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
}
