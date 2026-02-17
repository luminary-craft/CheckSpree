import React, { useState } from 'react'

export function GlDescriptionModal({ code, onClose, onSave }) {
  const [description, setDescription] = useState('')

  return (
    <div className="modal-overlay no-print" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>New GL Code: {code}</h2>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '16px', color: 'var(--text-label)' }}>
            This GL Code is not recognized. Would you like to add a description for future reference?
          </p>
          <div className="field">
            <label>Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Office Supplies"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSave(code, description)
              }}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose}>Skip</button>
          <button
            className="btn primary"
            onClick={() => onSave(code, description)}
          >
            Save GL Code
          </button>
        </div>
      </div>
    </div>
  )
}
