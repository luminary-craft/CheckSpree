import React from 'react'

export function PasswordModal({ title, message, value, onChange, onSubmit, onCancel, error, confirmButtonText = 'Submit', allowEmpty = false }) {
  return (
    <div className="modal-overlay no-print" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn-icon" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          {message && <p style={{ marginBottom: '16px', color: 'var(--text-label)' }}>{message}</p>}
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (allowEmpty || value)) onSubmit()
              }}
              autoFocus
              placeholder="Enter password..."
            />
            {error && (
              <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px' }}>
                {error}
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={onSubmit} disabled={!allowEmpty && !value}>
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  )
}
