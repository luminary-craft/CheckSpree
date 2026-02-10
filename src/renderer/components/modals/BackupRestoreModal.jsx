import React from 'react'

export function BackupRestoreModal({
  availableBackups, selectedBackup, setSelectedBackup,
  groupBackups, confirmRestoreBackup,
  handleRestoreFromFile, setShowBackupModal
}) {
  const onClose = () => setShowBackupModal(false)

  return (
    <div className="modal-overlay no-print" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Restore from Backup</h2>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#1e3a5f',
            borderRadius: '6px',
            border: '1px solid #3b82f6'
          }}>
            <div style={{ fontSize: '13px', color: '#93c5fd', lineHeight: '1.6' }}>
              🔒 <strong>Secure Auto-Backups:</strong> These backups are encrypted and stored securely in your app data folder. Select the most recent backup or choose an older version.
            </div>
          </div>

          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #334155',
            borderRadius: '6px',
            backgroundColor: '#1e293b'
          }}>
            {(() => {
              const grouped = groupBackups(availableBackups)
              const groupOrder = ['Recent (Last 3 Days)', 'This Year']

              const years = Object.keys(grouped).filter(k => /^\d{4}$/.test(k)).sort().reverse()
              groupOrder.push(...years)

              const quarters = Object.keys(grouped).filter(k => /Q\d/.test(k)).sort().reverse()
              groupOrder.push(...quarters)

              return groupOrder.map(groupName => {
                if (!grouped[groupName]) return null

                return (
                  <div key={groupName}>
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      fontWeight: '600',
                      fontSize: '12px',
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: '1px solid #334155'
                    }}>
                      {groupName}
                    </div>
                    {grouped[groupName].map((backup, index) => (
                      <div
                        key={backup.path}
                        onClick={() => setSelectedBackup(backup)}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #1e293b',
                          backgroundColor: selectedBackup?.path === backup.path ? '#334155' : 'transparent',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedBackup?.path !== backup.path) {
                            e.currentTarget.style.backgroundColor = '#2d3748'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedBackup?.path !== backup.path) {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: '500', color: '#f1f5f9', fontSize: '14px' }}>
                              {backup.friendlyName}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              {backup.fullDate} • {(backup.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                          {selectedBackup?.path === backup.path && (
                            <div style={{ color: '#3b82f6', fontSize: '20px', fontWeight: 'bold' }}>✓</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })
            })()}
          </div>

          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#7f1d1d',
            borderRadius: '6px',
            border: '1px solid #ef4444'
          }}>
            <div style={{ fontWeight: '600', color: '#fecaca', marginBottom: '8px', fontSize: '14px' }}>
              ⚠️ WARNING: This action cannot be undone
            </div>
            <div style={{ fontSize: '13px', color: '#fca5a5', lineHeight: '1.6' }}>
              Restoring this backup will replace ALL current data:
              <ul style={{ marginTop: '8px', marginBottom: '0', paddingLeft: '20px' }}>
                <li>All profiles and settings</li>
                <li>All field positions and layouts</li>
                <li>All check history</li>
                <li>All ledger data</li>
                <li>Current session data</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="btn ghost"
            onClick={() => {
              onClose()
              handleRestoreFromFile()
            }}
          >
            Select File Instead
          </button>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            onClick={() => confirmRestoreBackup(selectedBackup?.path)}
            disabled={!selectedBackup}
          >
            Restore Selected
          </button>
        </div>
      </div>
    </div>
  )
}
