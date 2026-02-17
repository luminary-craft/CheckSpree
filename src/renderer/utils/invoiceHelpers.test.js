import { describe, test, expect } from 'vitest'
import {
  calculateInvoiceTotals,
  formatInvoiceNumber,
  getPaymentTermsDueDate,
  getDueStatus,
  getTermsLabel,
  generateInvoiceCSV,
  getNextRecurrenceDate
} from './invoiceHelpers'

describe('calculateInvoiceTotals', () => {
  test('calculates from amount field', () => {
    const items = [
      { description: 'Item A', quantity: 1, rate: 100, amount: 100 },
      { description: 'Item B', quantity: 2, rate: 50, amount: 100 }
    ]
    const result = calculateInvoiceTotals(items, 0)
    expect(result.subtotal).toBe(200)
    expect(result.taxAmount).toBe(0)
    expect(result.total).toBe(200)
  })

  test('falls back to quantity × rate when amount is missing', () => {
    const items = [
      { description: 'Service', quantity: 5, rate: 75 }
    ]
    const result = calculateInvoiceTotals(items, 0)
    expect(result.subtotal).toBe(375)
  })

  test('applies tax rate correctly', () => {
    const items = [{ amount: 1000 }]
    const result = calculateInvoiceTotals(items, 8.5)
    expect(result.subtotal).toBe(1000)
    expect(result.taxAmount).toBe(85)
    expect(result.total).toBe(1085)
  })

  test('rounds to 2 decimal places', () => {
    const items = [{ amount: 33.33 }, { amount: 33.33 }, { amount: 33.33 }]
    const result = calculateInvoiceTotals(items, 7)
    expect(result.subtotal).toBe(99.99)
    expect(result.taxAmount).toBe(7)
    expect(result.total).toBe(106.99)
  })

  test('handles null/empty inputs', () => {
    expect(calculateInvoiceTotals(null)).toEqual({ subtotal: 0, taxAmount: 0, total: 0 })
    expect(calculateInvoiceTotals([])).toEqual({ subtotal: 0, taxAmount: 0, total: 0 })
  })

  test('handles zero tax rate', () => {
    const items = [{ amount: 500 }]
    const result = calculateInvoiceTotals(items, 0)
    expect(result.taxAmount).toBe(0)
    expect(result.total).toBe(500)
  })
})

describe('formatInvoiceNumber', () => {
  test('pads to 4 digits with INV prefix', () => {
    expect(formatInvoiceNumber(1)).toBe('INV-0001')
    expect(formatInvoiceNumber(42)).toBe('INV-0042')
    expect(formatInvoiceNumber(999)).toBe('INV-0999')
    expect(formatInvoiceNumber(10000)).toBe('INV-10000')
  })

  test('uses custom prefix', () => {
    expect(formatInvoiceNumber(7, 'BILL')).toBe('BILL-0007')
  })

  test('handles non-numeric input', () => {
    expect(formatInvoiceNumber('abc')).toBe('INV-0000')
    expect(formatInvoiceNumber(null)).toBe('INV-0000')
  })
})

describe('getPaymentTermsDueDate', () => {
  test('due on receipt returns same date', () => {
    expect(getPaymentTermsDueDate('2026-02-15', 'due_on_receipt')).toBe('2026-02-15')
  })

  test('net15 adds 15 days', () => {
    expect(getPaymentTermsDueDate('2026-02-15', 'net15')).toBe('2026-03-02')
  })

  test('net30 adds 30 days', () => {
    expect(getPaymentTermsDueDate('2026-01-15', 'net30')).toBe('2026-02-14')
  })

  test('net60 adds 60 days', () => {
    expect(getPaymentTermsDueDate('2026-01-01', 'net60')).toBe('2026-03-02')
  })

  test('handles month boundaries', () => {
    expect(getPaymentTermsDueDate('2026-01-31', 'net30')).toBe('2026-03-02')
  })

  test('returns empty for custom terms', () => {
    expect(getPaymentTermsDueDate('2026-02-15', 'custom')).toBe('')
  })

  test('returns empty for invalid date', () => {
    expect(getPaymentTermsDueDate('', 'net30')).toBe('')
    expect(getPaymentTermsDueDate(null, 'net30')).toBe('')
  })
})

describe('getDueStatus', () => {
  test('returns paid for paid invoices', () => {
    expect(getDueStatus({ status: 'paid', dueDate: '2020-01-01' })).toBe('paid')
  })

  test('returns void for voided invoices', () => {
    expect(getDueStatus({ status: 'void' })).toBe('void')
  })

  test('returns draft for draft invoices', () => {
    expect(getDueStatus({ status: 'draft' })).toBe('draft')
  })

  test('returns overdue for past-due sent invoices', () => {
    expect(getDueStatus({ status: 'sent', dueDate: '2020-01-01' })).toBe('overdue')
  })

  test('returns ok for future due dates', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const dateStr = futureDate.toISOString().split('T')[0]
    expect(getDueStatus({ status: 'sent', dueDate: dateStr })).toBe('ok')
  })

  test('returns due_soon within 7 days', () => {
    const soonDate = new Date()
    soonDate.setDate(soonDate.getDate() + 3)
    const dateStr = soonDate.toISOString().split('T')[0]
    expect(getDueStatus({ status: 'sent', dueDate: dateStr })).toBe('due_soon')
  })

  test('handles null input', () => {
    expect(getDueStatus(null)).toBe('ok')
  })
})

describe('getTermsLabel', () => {
  test('returns label for known terms', () => {
    expect(getTermsLabel('net30')).toBe('Net 30')
    expect(getTermsLabel('due_on_receipt')).toBe('Due on Receipt')
    expect(getTermsLabel('net15')).toBe('Net 15')
    expect(getTermsLabel('net60')).toBe('Net 60')
  })

  test('returns input for unknown terms', () => {
    expect(getTermsLabel('custom')).toBe('Custom')
    expect(getTermsLabel('other')).toBe('other')
  })

  test('handles empty/null', () => {
    expect(getTermsLabel('')).toBe('Net 30')
    expect(getTermsLabel(null)).toBe('Net 30')
  })
})

describe('generateInvoiceCSV', () => {
  test('generates CSV with headers and data', () => {
    const invoices = [{
      invoiceNumber: 'INV-0001',
      status: 'sent',
      clientName: 'Test Co',
      issueDate: '2026-02-15',
      dueDate: '2026-03-17',
      terms: 'net30',
      subtotal: 1000,
      taxAmount: 80,
      total: 1080,
      paidDate: null,
      paidAmount: null,
      notes: 'Thanks'
    }]
    const csv = generateInvoiceCSV(invoices)
    const lines = csv.split('\n')
    expect(lines[0]).toContain('Invoice #')
    expect(lines[0]).toContain('Total')
    expect(lines.length).toBe(2)
    expect(lines[1]).toContain('INV-0001')
    expect(lines[1]).toContain('1080.00')
  })

  test('escapes commas in client names', () => {
    const invoices = [{
      invoiceNumber: 'INV-0001', status: 'draft',
      clientName: 'Smith, Jones & Co', issueDate: '', dueDate: '',
      terms: '', subtotal: 0, taxAmount: 0, total: 0,
      paidDate: null, paidAmount: null, notes: ''
    }]
    const csv = generateInvoiceCSV(invoices)
    expect(csv).toContain('"Smith, Jones & Co"')
  })

  test('handles null/empty input', () => {
    expect(generateInvoiceCSV(null)).toBe('')
    expect(generateInvoiceCSV([])).toBe('')
  })
})

describe('getNextRecurrenceDate', () => {
  test('advances by 1 month for monthly frequency', () => {
    expect(getNextRecurrenceDate('2026-01-15', 'monthly')).toBe('2026-02-15')
    expect(getNextRecurrenceDate('2026-12-01', 'monthly')).toBe('2027-01-01')
  })

  test('advances by 3 months for quarterly frequency', () => {
    expect(getNextRecurrenceDate('2026-01-15', 'quarterly')).toBe('2026-04-15')
    expect(getNextRecurrenceDate('2026-10-01', 'quarterly')).toBe('2027-01-01')
  })

  test('handles month-end edge cases', () => {
    // Jan 31 + 1 month = Feb 28 (or Mar 3 depending on JS Date behavior)
    const result = getNextRecurrenceDate('2026-01-31', 'monthly')
    expect(result).toBeTruthy()
    expect(result.startsWith('2026-')).toBe(true)
  })

  test('returns empty for missing inputs', () => {
    expect(getNextRecurrenceDate('', 'monthly')).toBe('')
    expect(getNextRecurrenceDate(null, 'monthly')).toBe('')
    expect(getNextRecurrenceDate('2026-01-15', '')).toBe('')
    expect(getNextRecurrenceDate('2026-01-15', null)).toBe('')
  })

  test('returns empty for invalid date', () => {
    expect(getNextRecurrenceDate('not-a-date', 'monthly')).toBe('')
  })
})
