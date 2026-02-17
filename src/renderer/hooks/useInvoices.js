import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { calculateInvoiceTotals, formatInvoiceNumber, getDueStatus } from '../utils/invoiceHelpers'

/**
 * Hook for managing invoice state and operations.
 *
 * Invoices are persisted via preferences.invoices and auto-saved
 * by the usePersistenceSaver pipeline in App.jsx.
 *
 * @param {Array} initialInvoices - Initial invoice data from preferences
 * @param {Object} options - Hook options
 * @param {number} options.nextNumber - Next invoice number counter
 * @returns {Object} Invoice state, CRUD methods, and computed stats
 */
export function useInvoices(initialInvoices, options = {}) {
  const [invoices, setInvoices] = useState(initialInvoices || [])
  const loadedFromDisk = useRef(false)

  useEffect(() => {
    if (!loadedFromDisk.current && initialInvoices) {
      setInvoices(initialInvoices)
      loadedFromDisk.current = true
    }
  }, [initialInvoices])
  const [nextNumber, setNextNumber] = useState(options.nextNumber || 1)

  const generateId = useCallback(() => {
    return `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  }, [])

  /**
   * Get the next invoice number and advance the counter.
   */
  const getNextInvoiceNumber = useCallback(() => {
    const num = nextNumber
    setNextNumber(prev => prev + 1)
    return formatInvoiceNumber(num)
  }, [nextNumber])

  /**
   * Add a new invoice.
   */
  const addInvoice = useCallback((invoiceData) => {
    const totals = calculateInvoiceTotals(invoiceData.lineItems, invoiceData.taxRate)
    const now = new Date().toISOString()

    const newInvoice = {
      id: generateId(),
      invoiceNumber: invoiceData.invoiceNumber || getNextInvoiceNumber(),
      status: invoiceData.status || 'draft',
      clientName: invoiceData.clientName || '',
      clientAddress: invoiceData.clientAddress || '',
      clientEmail: invoiceData.clientEmail || '',
      issueDate: invoiceData.issueDate || '',
      dueDate: invoiceData.dueDate || '',
      terms: invoiceData.terms || 'net30',
      lineItems: invoiceData.lineItems || [],
      ...totals,
      taxRate: invoiceData.taxRate || 0,
      notes: invoiceData.notes || '',
      memo: invoiceData.memo || '',
      paidDate: null,
      paidAmount: null,
      ledgerId: null,
      createdAt: now,
      updatedAt: now
    }

    setInvoices(prev => [newInvoice, ...prev])
    return newInvoice
  }, [generateId, getNextInvoiceNumber])

  /**
   * Update an existing invoice.
   */
  const updateInvoice = useCallback((invoiceId, updates) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== invoiceId) return inv

      const updated = { ...inv, ...updates, updatedAt: new Date().toISOString() }

      // Recalculate totals if line items or tax rate changed
      if (updates.lineItems || updates.taxRate !== undefined) {
        const totals = calculateInvoiceTotals(
          updates.lineItems || inv.lineItems,
          updates.taxRate !== undefined ? updates.taxRate : inv.taxRate
        )
        Object.assign(updated, totals)
      }

      return updated
    }))
  }, [])

  /**
   * Delete an invoice.
   */
  const deleteInvoice = useCallback((invoiceId) => {
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId))
  }, [])

  /**
   * Mark an invoice as sent.
   */
  const markAsSent = useCallback((invoiceId) => {
    updateInvoice(invoiceId, { status: 'sent' })
  }, [updateInvoice])

  /**
   * Mark an invoice as paid.
   */
  const markAsPaid = useCallback((invoiceId, paymentInfo = {}) => {
    updateInvoice(invoiceId, {
      status: 'paid',
      paidDate: paymentInfo.paidDate || new Date().toISOString().split('T')[0],
      paidAmount: paymentInfo.paidAmount || null,
      ledgerId: paymentInfo.ledgerId || null
    })
  }, [updateInvoice])

  /**
   * Void an invoice.
   */
  const voidInvoice = useCallback((invoiceId) => {
    updateInvoice(invoiceId, { status: 'void' })
  }, [updateInvoice])

  /**
   * Duplicate an invoice as a new draft.
   */
  const duplicateInvoice = useCallback((invoiceId) => {
    const source = invoices.find(inv => inv.id === invoiceId)
    if (!source) return null

    return addInvoice({
      ...source,
      id: undefined,
      invoiceNumber: undefined,
      status: 'draft',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      paidDate: null,
      paidAmount: null,
      ledgerId: null
    })
  }, [invoices, addInvoice])

  /**
   * Computed stats.
   */
  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let draft = 0, sent = 0, paid = 0, overdue = 0, outstanding = 0

    for (const inv of invoices) {
      if (inv.status === 'void') continue
      if (inv.status === 'draft') { draft++; continue }
      if (inv.status === 'paid') { paid++; continue }

      // sent status
      sent++
      outstanding += inv.total || 0

      const dueStatus = getDueStatus(inv)
      if (dueStatus === 'overdue') overdue++
    }

    return {
      total: invoices.length,
      draft,
      sent,
      paid,
      overdue,
      outstanding: Math.round(outstanding * 100) / 100
    }
  }, [invoices])

  return {
    invoices,
    setInvoices,
    nextNumber,
    setNextNumber,
    stats,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    markAsSent,
    markAsPaid,
    voidInvoice,
    duplicateInvoice,
    getNextInvoiceNumber
  }
}
