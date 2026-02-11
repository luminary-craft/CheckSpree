import React from 'react'

export function DepositModal({
  depositData, setDepositData,
  recordDeposit, showToast,
  setShowDepositModal
}) {
  const onClose = () => setShowDepositModal(false)

  const handleSubmit = () => {
    const success = recordDeposit(depositData)
    if (success) {
      onClose()
      showToast('Funds added successfully!', 'success')
    } else {
      showToast('Please enter a valid amount and description.', 'error')
    }
  }

  return (
    <div className="modal-overlay no-print" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Add Funds / Adjustment</h2>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Date</label>
            <input
              type="date"
              value={depositData.date}
              onChange={(e) => setDepositData({ ...depositData, date: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Description</label>
            <input
              type="text"
              value={depositData.description}
              onChange={(e) => setDepositData({ ...depositData, description: e.target.value })}
              placeholder="e.g., Deposit, Cash Adjustment, Transfer In"
              autoFocus
            />
          </div>
          <div className="field">
            <label>Amount</label>
            <input
              type="text"
              value={depositData.amount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '')
                setDepositData({ ...depositData, amount: val })
              }}
              placeholder="0.00"
            />
          </div>
          <div className="field">
            <label>Additional Details <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              value={depositData.reason}
              onChange={(e) => setDepositData({ ...depositData, reason: e.target.value })}
              placeholder="Add any extra details about this transaction, e.g., reference number, source, etc."
              rows={3}
              style={{
                width: '100%',
                resize: 'vertical',
                minHeight: '60px',
                background: 'var(--surface-elevated)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '14px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && depositData.amount && depositData.description) {
                  e.preventDefault()
                  const success = recordDeposit(depositData)
                  if (success) {
                    onClose()
                    showToast('Funds added successfully!', 'success')
                  }
                }
              }}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            onClick={handleSubmit}
            disabled={!depositData.amount || !depositData.description}
          >
            Add Funds
          </button>
        </div>
      </div>
    </div>
  )
}
