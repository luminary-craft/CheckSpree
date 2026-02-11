import React from 'react'

export function AdminPinModal({
  pinInput, setPinInput,
  pinError, setPinError,
  handlePinSubmit, handleChangePinRequest,
  setShowPinModal
}) {
  const onClose = () => {
    setShowPinModal(false)
    setPinInput('')
    setPinError('')
  }

  return (
    <div className="modal-overlay no-print" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2>Enter Admin PIN</h2>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>4-Digit PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength="4"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pinInput.length === 4) {
                  handlePinSubmit()
                }
              }}
              placeholder="0000"
              autoFocus
              style={{
                fontSize: '24px',
                letterSpacing: '8px',
                textAlign: 'center',
                fontFamily: 'monospace'
              }}
            />
            {pinError && (
              <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>
                {pinError}
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="btn ghost"
            onClick={() => {
              onClose()
              setTimeout(handleChangePinRequest, 100)
            }}
            style={{ marginRight: 'auto' }}
          >
            Change PIN
          </button>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            onClick={handlePinSubmit}
            disabled={pinInput.length !== 4}
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  )
}
