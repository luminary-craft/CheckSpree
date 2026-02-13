/**
 * Vendor Helper Utilities
 *
 * Pure functions for vendor data processing, 1099 generation,
 * and fuzzy matching. No React or state dependencies.
 */

/**
 * Calculate 1099 totals for all eligible vendors in a given year.
 *
 * @param {Array} vendors - All vendors
 * @param {Array} checkHistory - Full check history
 * @param {number} year - Calendar year
 * @param {number} threshold - Minimum amount (default $600)
 * @returns {Array} Vendors with computed yearTotal, sorted by total desc
 */
export function calculate1099Totals(vendors, checkHistory, year, threshold = 600) {
    if (!vendors || !checkHistory) return []

    // Pre-build a payment lookup map for efficiency
    const paymentsByPayee = {}
    for (const check of checkHistory) {
        if (!check.payee) continue
        const checkDate = new Date(check.date || check.printedAt)
        if (checkDate.getFullYear() !== year) continue
        // Skip voided checks
        if (check.status === 'void') continue

        const key = check.payee.toLowerCase()
        if (!paymentsByPayee[key]) paymentsByPayee[key] = 0

        const amount = typeof check.amount === 'string'
            ? parseFloat(check.amount.replace(/[^0-9.-]/g, ''))
            : (check.amount || 0)

        if (!isNaN(amount)) {
            paymentsByPayee[key] += amount
        }
    }

    return vendors
        .filter(v => v.is1099Eligible)
        .map(v => ({
            ...v,
            yearTotal: paymentsByPayee[v.name.toLowerCase()] || 0
        }))
        .filter(v => v.yearTotal >= threshold)
        .sort((a, b) => b.yearTotal - a.yearTotal)
}

/**
 * Generate 1099 data rows for export (CSV format).
 *
 * @param {Array} vendors - 1099-eligible vendors with yearTotals
 * @param {number} year - Tax year
 * @returns {string} CSV content for 1099 data
 */
export function generate1099CSV(vendors, year) {
    const headers = [
        'Vendor Name',
        'Tax ID',
        'Address',
        'City',
        'State',
        'ZIP',
        `${year} Total`,
        'Email'
    ]

    const rows = vendors.map(v => [
        escapeCSV(v.name),
        escapeCSV(v.taxId),
        escapeCSV(v.address),
        escapeCSV(v.city),
        escapeCSV(v.state),
        escapeCSV(v.zip),
        (v.yearTotal || 0).toFixed(2),
        escapeCSV(v.email)
    ].join(','))

    return [headers.join(','), ...rows].join('\n')
}

/**
 * Escape a CSV field — wraps in quotes if special chars present.
 *
 * @param {string} value - Raw value
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
 * Fuzzy match algorithm for vendor name search.
 * Scores based on: exact match > starts with > contains > subsequence.
 *
 * @param {string} query - User's search input
 * @param {Array} vendors - Vendor list to search
 * @param {number} limit - Max results
 * @returns {Array} Sorted matching vendors with scores
 */
export function fuzzyMatch(query, vendors, limit = 10) {
    if (!query || !query.trim() || !vendors) return []
    const q = query.toLowerCase().trim()

    const scored = vendors
        .map(v => {
            const name = v.name.toLowerCase()
            let score = 0

            if (name === q) {
                score = 100 // Exact match
            } else if (name.startsWith(q)) {
                score = 80 // Starts with
            } else if (name.includes(q)) {
                score = 60 // Contains
            } else {
                // Check if query chars appear in order (subsequence)
                let qi = 0
                for (let i = 0; i < name.length && qi < q.length; i++) {
                    if (name[i] === q[qi]) qi++
                }
                if (qi === q.length) {
                    score = 30 // Subsequence match
                }
            }

            return { vendor: v, score }
        })
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score || a.vendor.name.localeCompare(b.vendor.name))
        .slice(0, limit)

    return scored.map(r => r.vendor)
}

/**
 * Validate vendor data before saving.
 * Returns an array of error messages (empty = valid).
 *
 * @param {Object} vendor - Vendor data to validate
 * @returns {Array} Array of error message strings
 */
export function validateVendor(vendor) {
    const errors = []

    if (!vendor.name || !vendor.name.trim()) {
        errors.push('Vendor name is required')
    }

    if (vendor.email && !isValidEmail(vendor.email)) {
        errors.push('Invalid email address')
    }

    if (vendor.taxId && !isValidTaxId(vendor.taxId)) {
        errors.push('Tax ID should be XX-XXXXXXX (EIN) or XXX-XX-XXXX (SSN) format')
    }

    return errors
}

/**
 * Basic email validation.
 *
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid format
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Basic tax ID format validation (EIN or SSN).
 *
 * @param {string} taxId - Tax ID to validate
 * @returns {boolean} True if valid EIN or SSN format
 */
function isValidTaxId(taxId) {
    const cleaned = taxId.replace(/\s/g, '')
    // EIN format: XX-XXXXXXX
    if (/^\d{2}-?\d{7}$/.test(cleaned)) return true
    // SSN format: XXX-XX-XXXX
    if (/^\d{3}-?\d{2}-?\d{4}$/.test(cleaned)) return true
    return false
}
