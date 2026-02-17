/**
 * Pure helper functions for filtering and sorting check history.
 */

/**
 * Filter history by ledger mode.
 * @param {Array} history - Full checkHistory array
 * @param {'all'|'current'} mode - View mode
 * @param {string} activeLedgerId - Current ledger ID
 * @returns {Array} Filtered array
 */
export function filterHistoryByLedger(history, mode, activeLedgerId) {
  if (!Array.isArray(history)) return []
  if (mode === 'all') return history
  return history.filter(c => c.ledgerId === activeLedgerId)
}

/**
 * Apply search, GL code, vendor filters and sort to a history array.
 * @param {Array} history - Pre-filtered (by ledger) history array
 * @param {Object} options
 * @param {string} options.searchTerm
 * @param {string} options.glCodeFilter - 'all' or a specific GL code
 * @param {string} options.vendorFilter - 'all' or a specific payee name
 * @param {string} options.sortOrder - 'date-desc'|'date-asc'|'amount-desc'|'amount-asc'|'payee-asc'
 * @returns {Array} Filtered and sorted array
 */
export function filterAndSortHistory(history, { searchTerm = '', glCodeFilter = 'all', vendorFilter = 'all', sortOrder = 'date-desc' } = {}) {
  if (!Array.isArray(history)) return []

  const filtered = history.filter(entry => {
    if (glCodeFilter !== 'all' && entry.glCode !== glCodeFilter) return false
    if (vendorFilter !== 'all' && entry.payee !== vendorFilter) return false
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      (entry.payee && entry.payee.toLowerCase().includes(term)) ||
      (entry.memo && entry.memo.toLowerCase().includes(term)) ||
      (entry.amount != null && entry.amount.toString().includes(term)) ||
      (entry.checkNumber && entry.checkNumber.toString().includes(term)) ||
      (entry.glCode && entry.glCode.toLowerCase().includes(term)) ||
      (entry.glDescription && entry.glDescription.toLowerCase().includes(term))
    )
  })

  return filtered.sort((a, b) => {
    let result = 0
    switch (sortOrder) {
      case 'date-asc':
        result = new Date(a.date) - new Date(b.date)
        if (result === 0) result = (a.timestamp || 0) - (b.timestamp || 0)
        break
      case 'date-desc':
        result = new Date(b.date) - new Date(a.date)
        if (result === 0) result = (b.timestamp || 0) - (a.timestamp || 0)
        break
      case 'amount-asc':
        result = parseFloat(a.amount) - parseFloat(b.amount)
        break
      case 'amount-desc':
        result = parseFloat(b.amount) - parseFloat(a.amount)
        break
      case 'payee-asc':
        result = (a.payee || '').localeCompare(b.payee || '')
        break
      default:
        result = (b.timestamp || 0) - (a.timestamp || 0)
    }
    return result
  })
}

/**
 * Extract unique non-empty values for a given field from a history array.
 * @param {Array} history
 * @param {string} field - e.g. 'glCode', 'payee'
 * @returns {string[]} Sorted unique values
 */
export function getUniqueFilterValues(history, field) {
  if (!Array.isArray(history)) return []
  return [...new Set(history.map(entry => entry[field]).filter(Boolean))].sort()
}
