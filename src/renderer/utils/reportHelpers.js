/**
 * Reporting Utility Functions
 *
 * Pure functions for generating check register, spending summaries,
 * and void tracking reports from check history data. No React deps.
 */

/**
 * Generate a check register — chronological list of all checks.
 *
 * @param {Array} checkHistory - Full check history
 * @param {Object} filters - Optional filters
 * @param {string} [filters.startDate] - Filter start date
 * @param {string} [filters.endDate] - Filter end date
 * @param {string} [filters.payee] - Filter by payee name (substring)
 * @param {string} [filters.status] - Filter by status ('printed', 'void', 'all')
 * @param {string} [filters.search] - General search across all fields
 * @returns {Array} Filtered, sorted check register entries
 */
export function generateCheckRegister(checkHistory, filters = {}) {
    if (!checkHistory) return []

    let list = [...checkHistory]

    // Date range filter
    if (filters.startDate) {
        const start = new Date(filters.startDate).getTime()
        list = list.filter(c => new Date(c.date || c.printedAt).getTime() >= start)
    }
    if (filters.endDate) {
        const end = new Date(filters.endDate).getTime()
        list = list.filter(c => new Date(c.date || c.printedAt).getTime() <= end)
    }

    // Payee filter
    if (filters.payee) {
        const q = filters.payee.toLowerCase()
        list = list.filter(c => c.payee && c.payee.toLowerCase().includes(q))
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
        list = list.filter(c => c.status === filters.status)
    }

    // General search (across check number, payee, memo, amount)
    if (filters.search) {
        const q = filters.search.toLowerCase()
        list = list.filter(c =>
            (c.checkNumber && String(c.checkNumber).includes(q)) ||
            (c.payee && c.payee.toLowerCase().includes(q)) ||
            (c.memo && c.memo.toLowerCase().includes(q)) ||
            (c.amount && String(c.amount).includes(q))
        )
    }

    // Sort by date descending (most recent first)
    list.sort((a, b) => {
        const dateA = new Date(a.date || a.printedAt).getTime()
        const dateB = new Date(b.date || b.printedAt).getTime()
        return dateB - dateA
    })

    return list
}

/**
 * Generate spending summary — group totals by payee, month, or category.
 *
 * @param {Array} checkHistory - Full check history
 * @param {string} groupBy - 'payee', 'month', or 'glCode'
 * @param {number} [year] - Optional year filter
 * @returns {Array} Array of { label, count, total } sorted by total desc
 */
export function generateSpendingSummary(checkHistory, groupBy = 'payee', year = null) {
    if (!checkHistory) return []

    let list = checkHistory.filter(c => c.status !== 'void')

    // Year filter
    if (year) {
        list = list.filter(c => {
            const d = new Date(c.date || c.printedAt)
            return d.getFullYear() === year
        })
    }

    const groups = {}

    for (const check of list) {
        let key

        if (groupBy === 'payee') {
            key = check.payee || 'Unknown Payee'
        } else if (groupBy === 'month') {
            const d = new Date(check.date || check.printedAt)
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        } else if (groupBy === 'glCode') {
            key = check.glCode || 'No GL Code'
        } else {
            key = 'Other'
        }

        if (!groups[key]) {
            groups[key] = { label: key, count: 0, total: 0 }
        }

        const amount = parseAmount(check.amount)
        groups[key].count++
        groups[key].total += amount
    }

    return Object.values(groups).sort((a, b) => b.total - a.total)
}

/**
 * Generate void tracking report.
 *
 * @param {Array} checkHistory - Full check history
 * @returns {Array} Voided checks sorted by void date, most recent first
 */
export function generateVoidReport(checkHistory) {
    if (!checkHistory) return []

    return checkHistory
        .filter(c => c.status === 'void')
        .sort((a, b) => {
            const dateA = new Date(a.voidedAt || a.date || a.printedAt).getTime()
            const dateB = new Date(b.voidedAt || b.date || b.printedAt).getTime()
            return dateB - dateA
        })
}

/**
 * Get dashboard statistics from check history.
 *
 * @param {Array} checkHistory - Full check history
 * @returns {Object} Stats: totalChecks, totalAmount, voidCount, thisMonthCount, thisMonthTotal
 */
export function getDashboardStats(checkHistory) {
    if (!checkHistory || !checkHistory.length) {
        return {
            totalChecks: 0,
            totalAmount: 0,
            voidCount: 0,
            thisMonthCount: 0,
            thisMonthTotal: 0,
            averageAmount: 0
        }
    }

    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()

    let totalAmount = 0
    let voidCount = 0
    let thisMonthCount = 0
    let thisMonthTotal = 0

    for (const check of checkHistory) {
        const amount = parseAmount(check.amount)

        if (check.status === 'void') {
            voidCount++
        } else {
            totalAmount += amount
        }

        const checkDate = new Date(check.date || check.printedAt)
        if (checkDate.getMonth() === thisMonth && checkDate.getFullYear() === thisYear) {
            thisMonthCount++
            if (check.status !== 'void') thisMonthTotal += amount
        }
    }

    const activeChecks = checkHistory.length - voidCount

    return {
        totalChecks: checkHistory.length,
        totalAmount,
        voidCount,
        thisMonthCount,
        thisMonthTotal,
        averageAmount: activeChecks > 0 ? totalAmount / activeChecks : 0
    }
}

/**
 * Export report data as CSV.
 *
 * @param {Array} data - Report data rows
 * @param {Array} columns - Column definitions [{key, label}]
 * @returns {string} CSV content
 */
export function exportReportCSV(data, columns) {
    const header = columns.map(c => c.label).join(',')
    const rows = data.map(item =>
        columns.map(c => {
            const val = item[c.key]
            const str = String(val ?? '')
            return str.includes(',') || str.includes('"')
                ? `"${str.replace(/"/g, '""')}"`
                : str
        }).join(',')
    )
    return [header, ...rows].join('\n')
}

/**
 * Parse a monetary amount from string or number.
 *
 * @param {string|number} amount - Amount value
 * @returns {number} Parsed amount
 */
function parseAmount(amount) {
    if (typeof amount === 'number') return isNaN(amount) ? 0 : amount
    const num = parseFloat(String(amount || '0').replace(/[^0-9.-]/g, ''))
    return isNaN(num) ? 0 : num
}
