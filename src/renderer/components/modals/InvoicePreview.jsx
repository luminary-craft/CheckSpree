import React from 'react'
import { formatAmount } from '../../utils/helpers'
import { getTermsLabel, getDueStatus } from '../../utils/invoiceHelpers'

/**
 * InvoicePreview — Print-ready invoice layout rendered inside InvoicePanel.
 *
 * Displays a professional invoice with company/client info, line items table,
 * totals, and notes. Includes Print and Close buttons.
 *
 * @param {Object} props.invoice - The invoice to preview
 * @param {Object} props.companyInfo - Company info from preferences
 * @param {Function} props.onClose - Close preview callback
 */
export function InvoicePreview({ invoice, companyInfo = {}, onClose }) {
  if (!invoice) return null

  const dueStatus = getDueStatus(invoice)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="invoice-preview-wrapper">
      {/* Action bar (hidden in print) */}
      <div className="invoice-preview-actions no-print">
        <button className="btn btn-sm" onClick={onClose}>
          &larr; Back to List
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-sm primary" onClick={handlePrint}>
            Print / PDF
          </button>
        </div>
      </div>

      {/* Invoice document */}
      <div className="invoice-preview" id="invoice-print-area">
        {/* Header */}
        <div className="invoice-header">
          <div className="invoice-company">
            {companyInfo.name && (
              <div className="invoice-company-name">{companyInfo.name}</div>
            )}
            {companyInfo.address && (
              <div className="invoice-company-detail">
                {companyInfo.address.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
            {companyInfo.phone && (
              <div className="invoice-company-detail">{companyInfo.phone}</div>
            )}
            {companyInfo.email && (
              <div className="invoice-company-detail">{companyInfo.email}</div>
            )}
            {!companyInfo.name && (
              <div className="invoice-company-name" style={{ opacity: 0.4 }}>
                Your Company Name
              </div>
            )}
          </div>
          <div className="invoice-title-block">
            <div className="invoice-title">INVOICE</div>
            <div className="invoice-number">{invoice.invoiceNumber}</div>
            {dueStatus === 'paid' && <div className="invoice-stamp paid">PAID</div>}
            {dueStatus === 'void' && <div className="invoice-stamp void">VOID</div>}
            {dueStatus === 'overdue' && <div className="invoice-stamp overdue">OVERDUE</div>}
          </div>
        </div>

        {/* Client + Dates row */}
        <div className="invoice-meta-row">
          <div className="invoice-client">
            <div className="invoice-meta-label">Bill To</div>
            {invoice.clientName && <div className="invoice-client-name">{invoice.clientName}</div>}
            {invoice.clientAddress && (
              <div className="invoice-client-detail">
                {invoice.clientAddress.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
            {invoice.clientEmail && (
              <div className="invoice-client-detail">{invoice.clientEmail}</div>
            )}
          </div>
          <div className="invoice-dates">
            <div className="invoice-date-row">
              <span className="invoice-meta-label">Issue Date</span>
              <span>{invoice.issueDate || '—'}</span>
            </div>
            <div className="invoice-date-row">
              <span className="invoice-meta-label">Due Date</span>
              <span>{invoice.dueDate || '—'}</span>
            </div>
            <div className="invoice-date-row">
              <span className="invoice-meta-label">Terms</span>
              <span>{getTermsLabel(invoice.terms)}</span>
            </div>
            {invoice.paidDate && (
              <div className="invoice-date-row">
                <span className="invoice-meta-label">Paid</span>
                <span>{invoice.paidDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <table className="invoice-table">
          <thead>
            <tr>
              <th className="invoice-th-desc">Description</th>
              <th className="invoice-th-num">Qty</th>
              <th className="invoice-th-num">Rate</th>
              <th className="invoice-th-num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lineItems || []).map((item, i) => (
              <tr key={i}>
                <td>{item.description || '—'}</td>
                <td className="invoice-td-num">{item.quantity}</td>
                <td className="invoice-td-num">{formatAmount(item.rate)}</td>
                <td className="invoice-td-num">{formatAmount(item.amount || (item.quantity * item.rate))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="invoice-totals">
          <div className="invoice-total-row">
            <span>Subtotal</span>
            <span>{formatAmount(invoice.subtotal)}</span>
          </div>
          {invoice.taxRate > 0 && (
            <div className="invoice-total-row">
              <span>Tax ({invoice.taxRate}%)</span>
              <span>{formatAmount(invoice.taxAmount)}</span>
            </div>
          )}
          <div className="invoice-total-row invoice-grand-total">
            <span>Total</span>
            <span>{formatAmount(invoice.total)}</span>
          </div>
          {invoice.paidAmount != null && (
            <div className="invoice-total-row">
              <span>Amount Paid</span>
              <span>{formatAmount(invoice.paidAmount)}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="invoice-notes">
            <div className="invoice-meta-label">Notes</div>
            <div className="invoice-notes-text">{invoice.notes}</div>
          </div>
        )}

        {/* Footer */}
        <div className="invoice-footer">
          Thank you for your business!
        </div>
      </div>
    </div>
  )
}
