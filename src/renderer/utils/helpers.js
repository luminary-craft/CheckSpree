export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount)
}

// Sanitize currency input by stripping commas and other non-numeric characters (except decimal point)
// Sanitize currency input by stripping commas and other non-numeric characters (except decimal point)
export function sanitizeCurrencyInput(value) {
    if (value === null || value === undefined || value === '') return 0
    // Remove commas, dollar signs, and spaces, but keep digits and decimal point
    const cleaned = String(value).replace(/[$,\s]/g, '')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
}
