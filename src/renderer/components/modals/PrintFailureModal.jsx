import React from 'react'

export function PrintFailureModal({
  printFailureInfo, handlePrintFailureAbort, handlePrintFailureContinue
}) {
  return (
    <div className="modal-overlay" style={{ zIndex: 10001 }}>
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <h2 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ Print Failed
          </h2>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          <p style={{ marginBottom: '12px', fontWeight: 600 }}>
            Failed to print: {printFailureInfo.payee}
          </p>
          <p style={{ marginBottom: '16px', color: 'var(--text-label)', fontSize: '14px' }}>
            Error: {printFailureInfo.error}
          </p>
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '8px'
          }}>
            <p style={{ fontSize: '13px', color: '#fca5a5', margin: 0 }}>
              <strong>Note:</strong> The ledger has NOT been deducted for this check.
            </p>
          </div>
        </div>
        <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            className="btn danger"
            onClick={handlePrintFailureAbort}
          >
            Stop Batch
          </button>
          <button
            className="btn primary"
            onClick={handlePrintFailureContinue}
          >
            Skip & Continue
          </button>
        </div>
      </div>
    </div>
  )
}
