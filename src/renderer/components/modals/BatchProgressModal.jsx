import React from 'react'

export function BatchProgressModal({ batchPrintProgress, cancelBatchPrint }) {
  return (
    <div className="modal-overlay no-print">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Batch Print & Record</h2>
        </div>
        <div className="modal-body" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>
              Printing check {batchPrintProgress.current} of {batchPrintProgress.total}...
            </p>
            <div style={{
              width: '100%',
              height: '24px',
              backgroundColor: '#e5e7eb',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '16px'
            }}>
              <div style={{
                width: `${(batchPrintProgress.current / batchPrintProgress.total) * 100}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              Please wait while each check is printed and recorded. Do not close this window.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              className="btn danger"
              onClick={cancelBatchPrint}
              style={{ minWidth: '120px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
