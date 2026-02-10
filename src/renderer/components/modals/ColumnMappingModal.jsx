import React from 'react'
import { getPreviewRow } from '../../utils/parsing'

export function ColumnMappingModal({
  columnMapping, setColumnMapping,
  fileHeaders, rawFileData, fileExtension,
  previewRow, setPreviewRow,
  processImportWithMapping, setShowColumnMapping
}) {
  const onClose = () => setShowColumnMapping(false)

  const fields = [
    { key: 'date', label: 'Date:', placeholder: '(Skip this field)' },
    { key: 'payee', label: 'Payee: *', placeholder: '(Skip this field)' },
    { key: 'address', label: 'Address:', placeholder: '(Skip this field)' },
    { key: 'amount', label: 'Amount: *', placeholder: '(Skip this field)' },
    { key: 'memo', label: 'Memo:', placeholder: '(Skip this field)' },
    { key: 'external_memo', label: 'External Memo:', placeholder: '(Skip this field)' },
    { key: 'internal_memo', label: 'Internal Memo:', placeholder: '(Skip this field)' },
    { key: 'ledger', label: 'Ledger:', placeholder: '(Use active ledger)' },
    { key: 'glCode', label: 'GL Code:', placeholder: '(Skip this field)' },
    { key: 'glDescription', label: 'GL Description:', placeholder: '(Skip this field)' }
  ]

  const handleFieldChange = (key, value) => {
    const newMapping = { ...columnMapping, [key]: value }
    setColumnMapping(newMapping)
    setPreviewRow(getPreviewRow(rawFileData, fileExtension, newMapping))
  }

  return (
    <div className="modal-overlay no-print">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2>Map Import Columns</h2>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '24px' }}>
          <p style={{ marginBottom: '20px', color: '#6b7280' }}>
            Match your file's columns to the check fields. We've auto-detected likely matches, but you can adjust them below.
          </p>

          <div style={{ display: 'grid', gap: '16px' }}>
            {fields.map(field => (
              <div key={field.key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', alignItems: 'center' }}>
                <label style={{ fontWeight: '600' }}>{field.label}</label>
                <select
                  value={columnMapping[field.key]}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                >
                  <option value="">{field.placeholder}</option>
                  {fileHeaders.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '12px' }}>
            * At least one of Payee or Amount must be mapped
          </p>

          {/* Preview Section */}
          {previewRow && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#e2e8f0' }}>Preview (First Row)</h3>
              <div style={{ display: 'grid', gap: '8px', fontSize: '13px', color: '#cbd5e1' }}>
                {previewRow.date && <div><strong>Date:</strong> {previewRow.date}</div>}
                {previewRow.payee && <div><strong>Payee:</strong> {previewRow.payee}</div>}
                {previewRow.address && <div><strong>Address:</strong> {previewRow.address}</div>}
                {previewRow.amount && <div><strong>Amount:</strong> ${previewRow.amount}</div>}
                {previewRow.memo && <div><strong>Memo:</strong> {previewRow.memo}</div>}
                {previewRow.external_memo && <div><strong>External Memo:</strong> {previewRow.external_memo}</div>}
                {previewRow.internal_memo && <div><strong>Internal Memo:</strong> {previewRow.internal_memo}</div>}
                {previewRow.ledger && <div><strong>Ledger:</strong> {previewRow.ledger}</div>}
                {previewRow.glCode && <div><strong>GL Code:</strong> {previewRow.glCode}</div>}
                {previewRow.glDescription && <div><strong>GL Description:</strong> {previewRow.glDescription}</div>}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={processImportWithMapping}>Import</button>
          </div>
        </div>
      </div>
    </div>
  )
}
