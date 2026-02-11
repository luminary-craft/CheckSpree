import React from 'react'

export function BatchCompleteModal({ batchCompleteData, setShowBatchCompleteModal }) {
  const onClose = () => setShowBatchCompleteModal(false)

  return (
    <div className="modal-overlay no-print" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h2>{batchCompleteData.cancelled ? 'Batch Cancelled' : 'Batch Complete'}</h2>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center', padding: '32px' }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            {batchCompleteData.cancelled ? '⚠️' : '✅'}
          </div>
          <p style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--text-bright)' }}>
            {batchCompleteData.cancelled
              ? `Processed ${batchCompleteData.processed} of ${batchCompleteData.total} checks`
              : `Successfully printed and recorded ${batchCompleteData.processed} checks`
            }
          </p>
          {batchCompleteData.cancelled && (
            <p style={{ fontSize: '14px', color: 'var(--text-label)', marginTop: '12px' }}>
              Already processed checks have been recorded.
            </p>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="btn primary"
            onClick={onClose}
            style={{ width: '100%' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
