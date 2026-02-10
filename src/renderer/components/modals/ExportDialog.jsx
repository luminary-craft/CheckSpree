import React from 'react'
import { formatCurrency } from '../../utils/helpers'
import { DownloadIcon } from '../../constants/icons'

export function ExportDialog({
  ledgers, checkHistory, glCodes,
  selectedLedgersForExport, setSelectedLedgersForExport,
  exportGlCodeFilter, setExportGlCodeFilter,
  exportDateRange, setExportDateRange,
  exportStartDate, setExportStartDate,
  exportEndDate, setExportEndDate,
  exportSortOrder, setExportSortOrder,
  exportFormat, setExportFormat,
  executeExport, setShowExportDialog
}) {
  const onClose = () => setShowExportDialog(false)

  return (
    <div className="modal-overlay no-print" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Check History</h2>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="hint">Select which ledgers to include in the export. The CSV will include per-ledger totals, per-profile breakdowns, and a grand total across all selected ledgers.</p>

          <div className="ledger-checkbox-list">
            {ledgers.map(ledger => {
              const checksInLedger = checkHistory.filter(c => c.ledgerId === ledger.id).length
              return (
                <label key={ledger.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedLedgersForExport.includes(ledger.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLedgersForExport([...selectedLedgersForExport, ledger.id])
                      } else {
                        setSelectedLedgersForExport(selectedLedgersForExport.filter(id => id !== ledger.id))
                      }
                    }}
                  />
                  <span>
                    <strong>{ledger.name}</strong>
                    <span className="ledger-meta">
                      {formatCurrency(ledger.balance)} • {checksInLedger} check{checksInLedger !== 1 ? 's' : ''}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>

          {/* GL Code Filter */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>GL Code</h3>
            <div className="field">
              <select
                value={exportGlCodeFilter}
                onChange={(e) => setExportGlCodeFilter(e.target.value)}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <option value="">All GL Codes</option>
                {(() => {
                  const filteredHistory = checkHistory.filter(c =>
                    c.glCode &&
                    c.type !== 'note' &&
                    selectedLedgersForExport.includes(c.ledgerId)
                  )
                  const glCodeData = {}
                  filteredHistory.forEach(c => {
                    if (!glCodeData[c.glCode]) {
                      glCodeData[c.glCode] = { count: 0, description: '' }
                    }
                    glCodeData[c.glCode].count++
                    if (!glCodeData[c.glCode].description && c.glDescription) {
                      glCodeData[c.glCode].description = c.glDescription
                    }
                  })
                  return Object.keys(glCodeData).sort().map(code => {
                    const glEntry = glCodes.find(g => g.code === code)
                    const description = glEntry?.description || glCodeData[code].description || ''
                    const count = glCodeData[code].count
                    return (
                      <option key={code} value={code}>
                        {code}{description ? ` - ${description}` : ''} ({count} {count === 1 ? 'entry' : 'entries'})
                      </option>
                    )
                  })
                })()}
              </select>
            </div>
          </div>

          {/* Date Range Filter */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>Date Range</h3>
            <div className="field">
              <select
                value={exportDateRange}
                onChange={(e) => setExportDateRange(e.target.value)}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
                <option value="thisWeek">This Week</option>
                <option value="lastWeek">Last Week</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="thisQuarter">This Quarter</option>
                <option value="ytd">Year-to-Date</option>
                <option value="last60">Last 60 Days</option>
              </select>
            </div>

            {exportDateRange === 'custom' && (
              <div className="field-row" style={{ marginTop: '12px', gap: '12px' }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>End Date</label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sort Order */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>Sort Order</h3>
            <div className="field">
              <select
                value={exportSortOrder}
                onChange={(e) => setExportSortOrder(e.target.value)}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <option value="date-desc">Date (Newest First)</option>
                <option value="date-asc">Date (Oldest First)</option>
                <option value="amount-desc">Amount (High to Low)</option>
                <option value="amount-asc">Amount (Low to High)</option>
                <option value="payee-asc">Payee (A-Z)</option>
                <option value="payee-desc">Payee (Z-A)</option>
              </select>
            </div>
          </div>

          {/* Export Format */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Export Format</h3>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="exportFormatRadio"
                  value="csv"
                  checked={exportFormat === 'csv'}
                  onChange={(e) => setExportFormat(e.target.value)}
                  style={{ cursor: 'pointer' }}
                />
                <span>CSV (Spreadsheet)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="exportFormatRadio"
                  value="pdf"
                  checked={exportFormat === 'pdf'}
                  onChange={(e) => setExportFormat(e.target.value)}
                  style={{ cursor: 'pointer' }}
                />
                <span>PDF (Document)</span>
              </label>
            </div>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
              {exportFormat === 'csv'
                ? 'Best for importing into Excel or Google Sheets'
                : 'Best for printing or sharing as a formatted document'}
            </p>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={executeExport}>
            <DownloadIcon /> Export as {exportFormat.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  )
}
