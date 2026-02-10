import React from 'react'
import { formatCurrency } from '../../utils/helpers'

export function DeleteConfirmModal({
  deleteTarget, cancelDeleteHistoryEntry, confirmDeleteHistoryEntry
}) {
  return (
    <div className="modal-overlay confirm-modal no-print" onClick={cancelDeleteHistoryEntry}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Delete {deleteTarget.type === 'deposit' ? 'Deposit' : 'Check'}?</h2>
          <button className="btn-icon" onClick={cancelDeleteHistoryEntry}>×</button>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to delete this {deleteTarget.type === 'deposit' ? 'deposit' : 'check'}?</p>
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#1e293b',
            borderRadius: '6px',
            border: '1px solid #334155'
          }}>
            <div><strong>{deleteTarget.type === 'deposit' ? 'Description' : 'Payee'}:</strong> {deleteTarget.payee}</div>
            <div><strong>Amount:</strong> {formatCurrency(deleteTarget.amount)}</div>
            <div><strong>Date:</strong> {deleteTarget.date}</div>
          </div>
          <p style={{ marginTop: '16px', color: '#94a3b8', fontSize: '14px' }}>
            {deleteTarget.type === 'deposit'
              ? `This will remove ${formatCurrency(deleteTarget.amount)} from the ledger balance.`
              : `This will restore ${formatCurrency(deleteTarget.amount)} to the ledger balance.`
            }
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={cancelDeleteHistoryEntry}>Cancel</button>
          <button className="btn danger" onClick={confirmDeleteHistoryEntry}>
            Delete {deleteTarget.type === 'deposit' ? 'Deposit' : 'Check'}
          </button>
        </div>
      </div>
    </div>
  )
}
