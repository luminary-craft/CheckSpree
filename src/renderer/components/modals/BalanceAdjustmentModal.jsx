import React from 'react'
import { formatCurrency } from '../../utils/helpers'

export function BalanceAdjustmentModal({
  hybridBalance, tempBalance,
  balanceAdjustmentReason, setBalanceAdjustmentReason,
  confirmBalanceAdjustment,
  setShowBalanceAdjustmentModal, setEditingBalance, setTempBalance
}) {
  const onCancel = () => {
    setShowBalanceAdjustmentModal(false)
    setEditingBalance(false)
    setTempBalance('')
  }

  const adjustment = (parseFloat(tempBalance) || 0) - hybridBalance

  return (
    <div className="modal-overlay no-print" onClick={() => setShowBalanceAdjustmentModal(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Balance Adjustment</h2>
          <button className="btn-icon" onClick={() => setShowBalanceAdjustmentModal(false)}>×</button>
        </div>
        <div className="modal-body">
          <div style={{
            padding: '16px',
            backgroundColor: '#1e293b',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#9ca3af' }}>Current Balance:</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(hybridBalance)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#9ca3af' }}>New Balance:</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(parseFloat(tempBalance) || 0)}</span>
            </div>
            <div style={{ borderTop: '1px solid #334155', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Adjustment:</span>
              <span style={{
                fontWeight: 600,
                color: adjustment >= 0 ? '#10b981' : '#ef4444'
              }}>
                {adjustment >= 0 ? '+' : ''}
                {formatCurrency(adjustment)}
              </span>
            </div>
          </div>
          <div className="field">
            <label>Reason for Adjustment <span style={{ color: '#ef4444' }}>*</span></label>
            <textarea
              value={balanceAdjustmentReason}
              onChange={(e) => setBalanceAdjustmentReason(e.target.value)}
              placeholder="Please explain why you are adjusting the ledger balance..."
              rows={3}
              autoFocus
              style={{
                width: '100%',
                resize: 'vertical',
                minHeight: '80px',
                background: '#1e293b',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '14px'
              }}
            />
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
            This adjustment will be recorded in the transaction history for audit purposes.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn primary"
            onClick={confirmBalanceAdjustment}
            disabled={!balanceAdjustmentReason.trim()}
          >
            Confirm Adjustment
          </button>
        </div>
      </div>
    </div>
  )
}
