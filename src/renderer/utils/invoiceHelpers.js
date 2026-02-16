/**
 * Invoice Utility Functions
 *
 * Pure functions for invoice calculations, formatting, CSV export,
 * and due date management. No React dependencies.
 */

/**
 * Calculate invoice totals from line items and tax rate.
 *
 * @param {Array} lineItems - Array of { description, quantity, rate, amount }
 * @param {number} taxRate - Tax rate as percentage (0-100)
 * @returns {{ subtotal: number, taxAmount: number, total: number }}
 */
export function calculateInvoiceTotals(lineItems, taxRate = 0) {
  if (!lineItems || !lineItems.length) {
    return { subtotal: 0, taxAmount: 0, total: 0 }
  }

  const subtotal = lineItems.reduce((sum, item) => {
    const amount = parseFloat(item.amount) || (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)
    return sum + amount
  }, 0)

  const rate = parseFloat(taxRate) || 0
  const taxAmount = subtotal * (rate / 100)
  const total = subtotal + taxAmount

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100
  }
}

/**
 * Format an invoice number with zero-padded prefix.
 *
 * @param {number} num - Sequential invoice number
 * @param {string} [prefix='INV'] - Prefix string
 * @returns {string} Formatted invoice number (e.g., 'INV-0001')
 */
export function formatInvoiceNumber(num, prefix = 'INV') {
  const n = parseInt(num) || 0
  return `${prefix}-${String(n).padStart(4, '0')}`
}

/**
 * Calculate due date from issue date and payment terms.
 *
 * @param {string} issueDate - Issue date in YYYY-MM-DD format
 * @param {string} terms - Payment terms: 'due_on_receipt' | 'net15' | 'net30' | 'net60' | 'custom'
 * @returns {string} Due date in YYYY-MM-DD format
 */
export function getPaymentTermsDueDate(issueDate, terms) {
  if (!issueDate) return ''

  const date = new Date(issueDate + 'T00:00:00')
  if (isNaN(date.getTime())) return ''

  const daysMap = {
    due_on_receipt: 0,
    net15: 15,
    net30: 30,
    net60: 60
  }

  const days = daysMap[terms]
  if (days === undefined) return '' // custom or unknown — user sets manually

  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

/**
 * Get the due status of an invoice.
 *
 * @param {Object} invoice - Invoice object with status and dueDate
 * @returns {'overdue' | 'due_soon' | 'ok' | 'paid' | 'void' | 'draft'}
 */
export function getDueStatus(invoice) {
  if (!invoice) return 'ok'
  if (invoice.status === 'paid') return 'paid'
  if (invoice.status === 'void') return 'void'
  if (invoice.status === 'draft') return 'draft'

  if (!invoice.dueDate) return 'ok'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(invoice.dueDate + 'T00:00:00')

  if (isNaN(due.getTime())) return 'ok'

  const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'overdue'
  if (diffDays <= 7) return 'due_soon'
  return 'ok'
}

/**
 * Get a human-readable label for payment terms.
 *
 * @param {string} terms - Payment terms key
 * @returns {string} Human-readable label
 */
export function getTermsLabel(terms) {
  const labels = {
    due_on_receipt: 'Due on Receipt',
    net15: 'Net 15',
    net30: 'Net 30',
    net60: 'Net 60',
    custom: 'Custom'
  }
  return labels[terms] || terms || 'Net 30'
}

/**
 * Export invoice data as CSV.
 *
 * @param {Array} invoices - Array of invoice objects
 * @returns {string} CSV content
 */
export function generateInvoiceCSV(invoices) {
  if (!invoices || !invoices.length) return ''

  const columns = [
    { key: 'invoiceNumber', label: 'Invoice #' },
    { key: 'status', label: 'Status' },
    { key: 'clientName', label: 'Client' },
    { key: 'issueDate', label: 'Issue Date' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'terms', label: 'Terms' },
    { key: 'subtotal', label: 'Subtotal' },
    { key: 'taxAmount', label: 'Tax' },
    { key: 'total', label: 'Total' },
    { key: 'paidDate', label: 'Paid Date' },
    { key: 'paidAmount', label: 'Paid Amount' },
    { key: 'notes', label: 'Notes' }
  ]

  const header = columns.map(c => c.label).join(',')
  const rows = invoices.map(inv =>
    columns.map(c => {
      let val = inv[c.key]
      if (val === null || val === undefined) val = ''
      if (typeof val === 'number') val = val.toFixed(2)
      const str = String(val)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')
  )

  return [header, ...rows].join('\n')
}
