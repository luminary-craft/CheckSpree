import React from 'react'

export function ManualBackupModal({ confirmManualBackup, setShowManualBackupModal }) {
  const onClose = () => setShowManualBackupModal(false)

  return (
    <div className="modal-overlay no-print" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <h2>Create Manual Backup</h2>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: '#7f1d1d',
            borderRadius: '6px',
            border: '1px solid #ef4444'
          }}>
            <div style={{ fontWeight: '600', color: '#fecaca', marginBottom: '8px', fontSize: '14px' }}>
              🔒 SECURITY WARNING
            </div>
            <div style={{ fontSize: '13px', color: '#fca5a5', lineHeight: '1.6' }}>
              This backup file will contain ALL your data in <strong>PLAIN TEXT</strong> (unencrypted) including:
              <ul style={{ marginTop: '8px', marginBottom: '8px', paddingLeft: '20px' }}>
                <li>All check history and transactions</li>
                <li>Payee names and amounts</li>
                <li>Ledger balances</li>
                <li>All memo fields</li>
              </ul>
              <strong>⚠️ Save this file in a SECURE location.</strong> Anyone with access can read all your financial data.
            </div>
          </div>

          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#1e3a5f',
            borderRadius: '6px',
            border: '1px solid var(--accent)'
          }}>
            <div style={{ fontSize: '13px', color: '#93c5fd', lineHeight: '1.6' }}>
              ✓ An <strong>encrypted</strong> copy will also be saved automatically to your secure app data folder.
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#e2e8f0', fontSize: '14px' }}>
              You will be prompted to choose where to save this file
            </label>
            <p style={{ fontSize: '12px', color: 'var(--text-label)', marginTop: '4px' }}>
              Recommended locations: Password manager, encrypted drive, or secure cloud storage
            </p>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={confirmManualBackup}>
            Choose Location & Save
          </button>
        </div>
      </div>
    </div>
  )
}
