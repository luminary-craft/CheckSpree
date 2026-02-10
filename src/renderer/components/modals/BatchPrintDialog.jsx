import React from 'react'

export function BatchPrintDialog({
  importQueue, activeProfile,
  batchAutoNumber, setBatchAutoNumber,
  batchStartNumber, setBatchStartNumber,
  preferences, setPreferences,
  availablePrinters, loadAvailablePrinters,
  cancelBatchPrintConfirm, confirmBatchPrint
}) {
  return (
    <div className="modal-overlay no-print" onClick={cancelBatchPrintConfirm}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Print & Record All Checks?</h2>
          <button className="btn-icon" onClick={cancelBatchPrintConfirm}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '24px' }}>
          <p style={{ marginBottom: '20px' }}>
            Print and record {importQueue.length} checks? This will {activeProfile?.layoutMode === 'three_up' ? 'print checks in sheets of 3' : 'print each check'} and deduct amounts from your ledger balance.
          </p>

          {/* Auto-number checkbox */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={batchAutoNumber}
                onChange={(e) => setBatchAutoNumber(e.target.checked)}
                style={{ marginRight: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>Auto-number checks sequentially</span>
            </label>
          </div>

          {/* Starting number input */}
          {batchAutoNumber && (
            <div style={{ marginLeft: '26px', marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#6b7280' }}>
                Starting check number:
              </label>
              <input
                type="text"
                value={batchStartNumber}
                onChange={(e) => setBatchStartNumber(e.target.value)}
                placeholder="1001"
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  width: '150px'
                }}
              />
            </div>
          )}

          {/* Printer Mode Selection */}
          <div style={{ marginBottom: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>
              Batch Print Mode:
            </label>

            {/* Interactive Mode Radio */}
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px' }}>
              <input
                type="radio"
                checked={preferences.batchPrintMode === 'interactive'}
                onChange={() => setPreferences(p => ({ ...p, batchPrintMode: 'interactive' }))}
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              <span>Interactive (show dialog for each check)</span>
            </label>

            {/* Silent Mode Radio */}
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px' }}>
              <input
                type="radio"
                checked={preferences.batchPrintMode === 'silent'}
                onChange={() => {
                  setPreferences(p => ({ ...p, batchPrintMode: 'silent' }))
                  if (availablePrinters.length === 0) loadAvailablePrinters()
                }}
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              <span>Use saved printer (silent printing)</span>
            </label>

            {/* Printer Dropdown */}
            {preferences.batchPrintMode === 'silent' && (
              <div style={{ marginLeft: '26px', marginBottom: '8px' }}>
                <select
                  value={preferences.batchPrinterDeviceName || ''}
                  onChange={(e) => {
                    const selectedPrinter = availablePrinters.find(p => p.name === e.target.value)
                    setPreferences(p => ({
                      ...p,
                      batchPrinterDeviceName: e.target.value,
                      batchPrinterFriendlyName: selectedPrinter?.displayName || e.target.value
                    }))
                  }}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    fontSize: '14px',
                    width: '100%'
                  }}
                >
                  <option value="">-- Select Printer --</option>
                  {availablePrinters.map(printer => (
                    <option key={printer.name} value={printer.name}>
                      {printer.displayName || printer.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* PDF Export Mode Radio */}
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px' }}>
              <input
                type="radio"
                checked={preferences.batchPrintMode === 'pdf'}
                onChange={() => setPreferences(p => ({ ...p, batchPrintMode: 'pdf' }))}
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              <span>Export all as PDFs to folder</span>
            </label>

            {/* Folder selection */}
            {preferences.batchPrintMode === 'pdf' && (
              <div style={{ marginLeft: '26px' }}>
                <button
                  className="btn ghost"
                  onClick={async () => {
                    const res = await window.cs2.selectPdfFolder()
                    if (res?.success && res.path) {
                      setPreferences(p => ({ ...p, batchPdfExportPath: res.path }))
                    }
                  }}
                  style={{ fontSize: '14px' }}
                >
                  {preferences.batchPdfExportPath || 'Select Folder...'}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={cancelBatchPrintConfirm}>Cancel</button>
          <button className="btn primary" onClick={confirmBatchPrint}>
            Print & Record
          </button>
        </div>
      </div>
    </div>
  )
}
