import React from 'react'

export function ChangePinModal({
  currentPinInput, setCurrentPinInput,
  newPinInput, setNewPinInput,
  confirmPinInput, setConfirmPinInput,
  changePinError, handleChangePinSubmit,
  setShowChangePinModal
}) {
  const onClose = () => setShowChangePinModal(false)

  return (
    <div className="modal-overlay no-print" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2>Change Admin PIN</h2>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Current PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength="4"
              value={currentPinInput}
              onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="0000"
              autoFocus
              style={{
                fontSize: '18px',
                letterSpacing: '4px',
                textAlign: 'center',
                fontFamily: 'monospace'
              }}
            />
          </div>
          <div className="field">
            <label>New PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength="4"
              value={newPinInput}
              onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="0000"
              style={{
                fontSize: '18px',
                letterSpacing: '4px',
                textAlign: 'center',
                fontFamily: 'monospace'
              }}
            />
          </div>
          <div className="field">
            <label>Confirm New PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength="4"
              value={confirmPinInput}
              onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && currentPinInput.length === 4 && newPinInput.length === 4 && confirmPinInput.length === 4) {
                  handleChangePinSubmit()
                }
              }}
              placeholder="0000"
              style={{
                fontSize: '18px',
                letterSpacing: '4px',
                textAlign: 'center',
                fontFamily: 'monospace'
              }}
            />
          </div>
          {changePinError && (
            <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>
              {changePinError}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            onClick={handleChangePinSubmit}
            disabled={currentPinInput.length !== 4 || newPinInput.length !== 4 || confirmPinInput.length !== 4}
          >
            Update PIN
          </button>
        </div>
      </div>
    </div>
  )
}
