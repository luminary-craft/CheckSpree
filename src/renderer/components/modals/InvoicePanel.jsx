import React, { useState, useMemo } from 'react'
import { formatAmount } from '../../utils/helpers'
import { calculateInvoiceTotals, getPaymentTermsDueDate, getDueStatus, getTermsLabel, generateInvoiceCSV, getNextRecurrenceDate } from '../../utils/invoiceHelpers'
import { InvoicePreview } from './InvoicePreview'

const STATUS_OPTIONS = ['all', 'draft', 'sent', 'paid', 'overdue', 'void']

function StatusBadge({ status }) {
  const colors = {
    draft: 'var(--text-dim)',
    sent: 'var(--accent)',
    paid: 'var(--success)',
    overdue: 'var(--danger)',
    void: 'var(--text-dim)',
    due_soon: 'var(--warning)'
  }
  return (
    <span className="panel-badge" style={{
      backgroundColor: `color-mix(in srgb, ${colors[status] || 'var(--text-dim)'} 20%, transparent)`,
      color: colors[status] || 'var(--text-dim)',
      border: `1px solid ${colors[status] || 'var(--border)'}`,
      fontSize: '11px',
      padding: '2px 8px',
      borderRadius: '10px',
      fontWeight: 600,
      textTransform: 'capitalize'
    }}>
      {status === 'due_soon' ? 'Due Soon' : status}
    </span>
  )
}

function InvoiceForm({ invoice, onSave, onCreateAndPrint, onCreateAndSavePdf, onCancel, invoiceHook }) {
  const isNew = !invoice
  const [form, setForm] = useState(() => {
    if (invoice) return { ...invoice }
    return {
      invoiceNumber: invoiceHook.getNextInvoiceNumber(),
      status: 'draft',
      clientName: '',
      clientAddress: '',
      clientEmail: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      terms: 'net30',
      lineItems: [{ description: '', quantity: 1, rate: '', amount: '' }],
      taxRate: 0,
      notes: '',
      memo: '',
      recurring: 'none'
    }
  })

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleTermsChange = (terms) => {
    const dueDate = getPaymentTermsDueDate(form.issueDate, terms)
    setForm(prev => ({ ...prev, terms, dueDate: dueDate || prev.dueDate }))
  }

  const handleIssueDateChange = (date) => {
    const dueDate = getPaymentTermsDueDate(date, form.terms)
    setForm(prev => ({ ...prev, issueDate: date, dueDate: dueDate || prev.dueDate }))
  }

  const updateLineItem = (index, field, value) => {
    setForm(prev => {
      const items = [...prev.lineItems]
      items[index] = { ...items[index], [field]: value }
      // Auto-calc amount
      if (field === 'quantity' || field === 'rate') {
        const qty = parseFloat(field === 'quantity' ? value : items[index].quantity) || 0
        const rate = parseFloat(field === 'rate' ? value : items[index].rate) || 0
        items[index].amount = (qty * rate).toFixed(2)
      }
      return { ...prev, lineItems: items }
    })
  }

  const addLineItem = () => {
    setForm(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', quantity: 1, rate: '', amount: '' }]
    }))
  }

  const removeLineItem = (index) => {
    setForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }))
  }

  const totals = useMemo(() => calculateInvoiceTotals(form.lineItems, form.taxRate), [form.lineItems, form.taxRate])

  const handleSubmit = () => {
    if (!form.clientName.trim()) return
    onSave({ ...form, ...totals })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Client Info */}
      <div>
        <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</h4>
        <div className="panel-grid-2">
          <div className="panel-field">
            <label className="panel-label">Client Name *</label>
            <input className="panel-input" value={form.clientName} onChange={(e) => updateField('clientName', e.target.value)} placeholder="Company or person name" />
          </div>
          <div className="panel-field">
            <label className="panel-label">Email</label>
            <input className="panel-input" type="email" value={form.clientEmail} onChange={(e) => updateField('clientEmail', e.target.value)} placeholder="billing@example.com" />
          </div>
        </div>
        <div className="panel-field" style={{ marginTop: '8px' }}>
          <label className="panel-label">Address</label>
          <textarea className="panel-textarea" rows="2" value={form.clientAddress} onChange={(e) => updateField('clientAddress', e.target.value)} placeholder="Street address, city, state, zip" />
        </div>
      </div>

      {/* Invoice Details */}
      <div>
        <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</h4>
        <div className="panel-grid-3">
          <div className="panel-field">
            <label className="panel-label">Invoice #</label>
            <input className="panel-input" value={form.invoiceNumber} onChange={(e) => updateField('invoiceNumber', e.target.value)} />
          </div>
          <div className="panel-field">
            <label className="panel-label">Issue Date</label>
            <input className="panel-input" type="date" value={form.issueDate} onChange={(e) => handleIssueDateChange(e.target.value)} />
          </div>
          <div className="panel-field">
            <label className="panel-label">Terms</label>
            <select className="panel-input" value={form.terms} onChange={(e) => handleTermsChange(e.target.value)}>
              <option value="due_on_receipt">Due on Receipt</option>
              <option value="net15">Net 15</option>
              <option value="net30">Net 30</option>
              <option value="net60">Net 60</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
        <div className="panel-grid-3" style={{ marginTop: '8px' }}>
          <div className="panel-field">
            <label className="panel-label">Due Date</label>
            <input className="panel-input" type="date" value={form.dueDate} onChange={(e) => updateField('dueDate', e.target.value)} />
          </div>
          <div className="panel-field">
            <label className="panel-label">Tax Rate (%)</label>
            <input className="panel-input" type="number" min="0" max="100" step="0.1" value={form.taxRate} onChange={(e) => updateField('taxRate', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="panel-field">
            <label className="panel-label">Recurring</label>
            <select className="panel-input" value={form.recurring || 'none'} onChange={(e) => updateField('recurring', e.target.value)}>
              <option value="none">None</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div>
        <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Line Items</h4>
        <table className="panel-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '45%' }}>Description</th>
              <th className="text-right" style={{ width: '12%' }}>Qty</th>
              <th className="text-right" style={{ width: '18%' }}>Rate</th>
              <th className="text-right" style={{ width: '18%' }}>Amount</th>
              <th style={{ width: '7%' }}></th>
            </tr>
          </thead>
          <tbody>
            {form.lineItems.map((item, i) => (
              <tr key={i}>
                <td>
                  <input className="panel-input" value={item.description} onChange={(e) => updateLineItem(i, 'description', e.target.value)} placeholder="Service or item" />
                </td>
                <td>
                  <input className="panel-input text-right" type="number" min="0" step="1" value={item.quantity} onChange={(e) => updateLineItem(i, 'quantity', e.target.value)} />
                </td>
                <td>
                  <input className="panel-input text-right" type="number" min="0" step="0.01" value={item.rate} onChange={(e) => updateLineItem(i, 'rate', e.target.value)} placeholder="0.00" />
                </td>
                <td className="text-right text-bright" style={{ fontWeight: 600 }}>
                  {formatAmount(parseFloat(item.amount) || 0)}
                </td>
                <td>
                  {form.lineItems.length > 1 && (
                    <button className="btn-icon-sm danger" onClick={() => removeLineItem(i)} title="Remove">×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn btn-sm" style={{ marginTop: '8px' }} onClick={addLineItem}>+ Add Line</button>

        {/* Totals */}
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-label)' }}>Subtotal:</span>
            <span style={{ fontWeight: 500 }}>{formatAmount(totals.subtotal)}</span>
          </div>
          {form.taxRate > 0 && (
            <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-label)' }}>Tax ({form.taxRate}%):</span>
              <span style={{ fontWeight: 500 }}>{formatAmount(totals.taxAmount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: '24px', fontSize: '16px', fontWeight: 700, paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
            <span>Total:</span>
            <span style={{ color: 'var(--success)' }}>{formatAmount(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="panel-grid-2">
        <div className="panel-field">
          <label className="panel-label">Notes (printed on invoice)</label>
          <textarea className="panel-textarea" rows="2" value={form.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Payment instructions, thank you note..." />
        </div>
        <div className="panel-field">
          <label className="panel-label">Memo (internal only)</label>
          <textarea className="panel-textarea" rows="2" value={form.memo} onChange={(e) => updateField('memo', e.target.value)} placeholder="Internal notes..." />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
        {isNew && (
          <>
            <button className="btn btn-sm" onClick={() => onCreateAndSavePdf?.({ ...form, ...totals })} disabled={!form.clientName.trim()}>
              Create & Save PDF
            </button>
            <button className="btn btn-sm" onClick={() => onCreateAndPrint?.({ ...form, ...totals })} disabled={!form.clientName.trim()}>
              Create & Print
            </button>
          </>
        )}
        <button className="btn primary" onClick={handleSubmit} disabled={!form.clientName.trim()}>
          {isNew ? 'Create Invoice' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

export function InvoicePanel({ invoiceHook, onClose, showToast, preferences, setPreferences }) {
  const { invoices, stats, addInvoice, updateInvoice, deleteInvoice, markAsSent, markAsPaid, voidInvoice, duplicateInvoice } = invoiceHook
  const [activeTab, setActiveTab] = useState('list')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingInvoice, setEditingInvoice] = useState(null) // null | 'new' | invoice object
  const [previewInvoice, setPreviewInvoice] = useState(null)

  const filteredInvoices = useMemo(() => {
    let list = [...invoices]

    // Status filter (including overdue detection)
    if (statusFilter === 'overdue') {
      list = list.filter(inv => getDueStatus(inv) === 'overdue')
    } else if (statusFilter !== 'all') {
      list = list.filter(inv => inv.status === statusFilter)
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(inv =>
        (inv.clientName && inv.clientName.toLowerCase().includes(q)) ||
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.notes && inv.notes.toLowerCase().includes(q))
      )
    }

    // Sort by issue date descending
    list.sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || ''))
    return list
  }, [invoices, statusFilter, searchQuery])

  const handleSave = (formData) => {
    if (editingInvoice && editingInvoice !== 'new') {
      updateInvoice(editingInvoice.id, formData)
      showToast?.('Invoice updated')
    } else {
      addInvoice(formData)
      showToast?.('Invoice created')
    }
    setEditingInvoice(null)
  }

  const handleCreateAndSavePdf = (formData) => {
    const newInv = addInvoice(formData)
    showToast?.('Invoice created')
    setEditingInvoice(null)
    setPreviewInvoice(newInv)
  }

  const handleCreateAndPrint = (formData) => {
    const newInv = addInvoice(formData)
    showToast?.('Invoice created')
    setEditingInvoice(null)
    setPreviewInvoice(newInv)
    setTimeout(() => window.print(), 300)
  }

  const handlePrintFromList = (invoice) => {
    setPreviewInvoice(invoice)
    setTimeout(() => window.print(), 300)
  }

  /** Generate next recurring invoice from a recurring source. */
  const generateNextRecurring = (sourceInvoice) => {
    const nextIssue = getNextRecurrenceDate(sourceInvoice.issueDate, sourceInvoice.recurring)
    const nextDue = sourceInvoice.dueDate
      ? getNextRecurrenceDate(sourceInvoice.dueDate, sourceInvoice.recurring)
      : getPaymentTermsDueDate(nextIssue, sourceInvoice.terms)

    addInvoice({
      ...sourceInvoice,
      id: undefined,
      invoiceNumber: undefined,
      status: 'draft',
      issueDate: nextIssue,
      dueDate: nextDue || '',
      paidDate: null,
      paidAmount: null,
      ledgerId: null
    })
    showToast?.('Next recurring invoice created')
  }

  const handleExportCSV = () => {
    const csv = generateInvoiceCSV(filteredInvoices)
    if (!csv) return
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast?.('CSV exported')
  }

  const companyInfo = preferences?.companyInfo || {}

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh' }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2>Invoices</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              {stats.total} total &middot; {formatAmount(stats.outstanding)} outstanding
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="panel-tabs">
          {[
            { id: 'list', label: 'All Invoices' },
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'settings', label: 'Company Info' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`panel-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setEditingInvoice(null); setPreviewInvoice(null) }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '16px', overflowY: 'auto', maxHeight: 'calc(90vh - 160px)' }}>

          {/* Preview overlay */}
          {previewInvoice && (
            <InvoicePreview
              invoice={previewInvoice}
              companyInfo={companyInfo}
              onClose={() => setPreviewInvoice(null)}
            />
          )}

          {/* === LIST TAB === */}
          {activeTab === 'list' && !editingInvoice && !previewInvoice && (
            <>
              {/* Toolbar */}
              <div className="panel-row" style={{ marginBottom: '12px', gap: '8px' }}>
                <input
                  className="panel-input"
                  style={{ flex: 1 }}
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select className="panel-input" style={{ width: '140px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <button className="btn btn-sm" onClick={handleExportCSV} title="Export filtered invoices as CSV">
                  CSV
                </button>
                <button className="btn btn-sm primary" onClick={() => setEditingInvoice('new')}>
                  + New Invoice
                </button>
              </div>

              {/* Invoice List */}
              {filteredInvoices.length === 0 ? (
                <div className="panel-empty">
                  {invoices.length === 0
                    ? 'No invoices yet. Click "+ New Invoice" to create one.'
                    : 'No invoices match your filters.'}
                </div>
              ) : (
                <div className="panel-list-scroll" style={{ maxHeight: '450px' }}>
                  {filteredInvoices.map(inv => {
                    const dueStatus = getDueStatus(inv)
                    const borderClass = dueStatus === 'overdue' ? 'border-danger'
                      : dueStatus === 'due_soon' ? 'border-warning'
                      : inv.status === 'paid' ? 'border-success' : ''

                    return (
                      <div key={inv.id} className={`panel-list-item ${borderClass}`}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="panel-list-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{inv.invoiceNumber}</span>
                            <StatusBadge status={dueStatus === 'overdue' || dueStatus === 'due_soon' ? dueStatus : inv.status} />
                          </div>
                          <div className="panel-list-secondary">
                            {inv.clientName} &middot; {inv.issueDate}
                            {inv.dueDate && ` &middot; Due ${inv.dueDate}`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                            <span className="panel-list-amount">{formatAmount(inv.total)}</span>
                            {inv.recurring && inv.recurring !== 'none' && (
                              <span className="panel-badge" style={{
                                backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)',
                                color: 'var(--accent)',
                                border: '1px solid var(--accent)',
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '10px',
                                fontWeight: 600
                              }}>
                                {inv.recurring === 'quarterly' ? 'QTR' : 'MTH'}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'flex-end' }}>
                            <button className="btn-icon-sm" onClick={() => setPreviewInvoice(inv)} title="Preview">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                            </button>
                            <button className="btn-icon-sm" onClick={() => setPreviewInvoice(inv)} title="Save PDF">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            </button>
                            <button className="btn-icon-sm" onClick={() => handlePrintFromList(inv)} title="Print">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                            </button>
                            {inv.status === 'draft' && (
                              <>
                                <button className="btn-icon-sm" onClick={() => setEditingInvoice(inv)} title="Edit">✎</button>
                                <button className="btn-icon-sm" onClick={() => { markAsSent(inv.id); showToast?.('Marked as sent') }} title="Mark Sent">📤</button>
                              </>
                            )}
                            {inv.status === 'sent' && (
                              <button className="btn-icon-sm" onClick={() => { markAsPaid(inv.id); showToast?.('Marked as paid') }} title="Mark Paid">💰</button>
                            )}
                            {inv.recurring && inv.recurring !== 'none' && (
                              <button className="btn-icon-sm" onClick={() => generateNextRecurring(inv)} title="Generate next recurring invoice">🔄</button>
                            )}
                            <button className="btn-icon-sm" onClick={() => { duplicateInvoice(inv.id); showToast?.('Invoice duplicated') }} title="Duplicate">📋</button>
                            {(inv.status === 'draft' || inv.status === 'void') && (
                              <button className="btn-icon-sm danger" onClick={() => { deleteInvoice(inv.id); showToast?.('Invoice deleted') }} title="Delete">×</button>
                            )}
                            {inv.status !== 'void' && inv.status !== 'paid' && (
                              <button className="btn-icon-sm danger" onClick={() => { voidInvoice(inv.id); showToast?.('Invoice voided') }} title="Void">⊘</button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* === FORM (CREATE/EDIT) === */}
          {activeTab === 'list' && editingInvoice && !previewInvoice && (
            <InvoiceForm
              invoice={editingInvoice === 'new' ? null : editingInvoice}
              onSave={handleSave}
              onCreateAndPrint={handleCreateAndPrint}
              onCreateAndSavePdf={handleCreateAndSavePdf}
              onCancel={() => setEditingInvoice(null)}
              invoiceHook={invoiceHook}
            />
          )}

          {/* === DASHBOARD TAB === */}
          {activeTab === 'dashboard' && !previewInvoice && (
            <>
              <div className="panel-grid-3" style={{ marginBottom: '16px' }}>
                <div className="stat-card">
                  <div className="stat-card-label">Outstanding</div>
                  <div className="stat-card-value warning">{formatAmount(stats.outstanding)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Overdue</div>
                  <div className="stat-card-value danger">{stats.overdue}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Paid</div>
                  <div className="stat-card-value success">{stats.paid}</div>
                </div>
              </div>
              <div className="panel-grid-3">
                <div className="stat-card">
                  <div className="stat-card-label">Total Invoices</div>
                  <div className="stat-card-value">{stats.total}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Drafts</div>
                  <div className="stat-card-value">{stats.draft}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Sent</div>
                  <div className="stat-card-value">{stats.sent}</div>
                </div>
              </div>
            </>
          )}

          {/* === COMPANY INFO TAB === */}
          {activeTab === 'settings' && !previewInvoice && (
            <div style={{ maxWidth: '500px' }}>
              <p className="hint" style={{ marginBottom: '16px' }}>
                This information appears on your printed invoices.
              </p>
              <div className="panel-field">
                <label className="panel-label">Company / Business Name</label>
                <input className="panel-input" value={companyInfo.name || ''} onChange={(e) => setPreferences(prev => ({ ...prev, companyInfo: { ...prev.companyInfo, name: e.target.value } }))} placeholder="Your Company Name" />
              </div>
              <div className="panel-field" style={{ marginTop: '8px' }}>
                <label className="panel-label">Address</label>
                <textarea className="panel-textarea" rows="3" value={companyInfo.address || ''} onChange={(e) => setPreferences(prev => ({ ...prev, companyInfo: { ...prev.companyInfo, address: e.target.value } }))} placeholder="Street, City, State ZIP" />
              </div>
              <div className="panel-grid-2" style={{ marginTop: '8px' }}>
                <div className="panel-field">
                  <label className="panel-label">Phone</label>
                  <input className="panel-input" value={companyInfo.phone || ''} onChange={(e) => setPreferences(prev => ({ ...prev, companyInfo: { ...prev.companyInfo, phone: e.target.value } }))} placeholder="(555) 123-4567" />
                </div>
                <div className="panel-field">
                  <label className="panel-label">Email</label>
                  <input className="panel-input" value={companyInfo.email || ''} onChange={(e) => setPreferences(prev => ({ ...prev, companyInfo: { ...prev.companyInfo, email: e.target.value } }))} placeholder="billing@company.com" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
