import React from 'react'
import { formatCurrency } from '../utils/helpers'
import { getLocalDateString } from '../utils/date'
import { DownloadIcon, UploadIcon, CheckIcon } from '../constants/icons'
import logoImg from '../assets/logo.png'
import { APP_VERSION } from '../constants/defaults'

export function TopBar({
  ledgers, checkHistory, calculateHybridBalance,
  showLedger, setShowLedger,
  showHistory, setShowHistory,
  setHistoryViewMode,
  downloadTemplate, handleImport, handleExport,
  preferences, setPreferences,
  handleUnlockRequest, handleLock,
  handleBackupData, handleRestoreBackup,
  editMode, setEditMode,
  handlePreviewPdf, handlePrintAndRecord, handleRecordOnly,
  activeProfile, data, setData
}) {
  return (
    <>
      <div className="topbar">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={logoImg} alt="CheckSpree" className="logo-img" style={{ height: '44px', width: 'auto' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#f1f5f9', lineHeight: 1.2 }}>CheckSpree</span>
            <span style={{ fontSize: '10px', color: '#64748b', opacity: 0.8 }}>Version {APP_VERSION}</span>
          </div>
        </div>

        {/* Ledger & History Tabs */}
        <div className="ledger-history-tabs">
          <button
            className={`tab-button ${showLedger && !showHistory ? 'active' : ''}`}
            onClick={() => { setShowLedger(true); setShowHistory(false); }}
          >
            <span className="tab-label">Total Balance</span>
            <span className={`tab-value ${(() => {
              const totalBalance = ledgers.reduce((sum, l) => sum + calculateHybridBalance(l.id), 0)
              return totalBalance < 0 ? 'negative' : ''
            })()}`}>
              {formatCurrency(ledgers.reduce((sum, l) => sum + calculateHybridBalance(l.id), 0))}
            </span>
          </button>
          <button
            className={`tab-button ${showHistory ? 'active' : ''}`}
            onClick={() => { setHistoryViewMode('all'); setShowHistory(true); setShowLedger(false); }}
          >
            <span className="tab-label">All History</span>
            <span className="tab-value">{checkHistory.length}</span>
          </button>
        </div>

        <div className="topbar-actions">
          <button className="btn ghost" onClick={downloadTemplate} title="Download CSV import template">
            <DownloadIcon /> Template
          </button>
          <button className="btn ghost" onClick={handleImport} title="Import checks from CSV">
            <UploadIcon /> Import
          </button>
          <button className="btn ghost" onClick={handleExport} title="Export check history">
            <DownloadIcon /> Export
          </button>
          <button
            className={`btn ghost ${preferences.adminLocked ? '' : 'active'}`}
            onClick={preferences.adminLocked ? handleUnlockRequest : handleLock}
            title={preferences.adminLocked ? 'Unlock admin settings' : 'Lock admin settings'}
          >
            {preferences.adminLocked ? '🔒' : '🔓'} Admin
          </button>
          {!preferences.adminLocked && (
            <>
              <button className="btn ghost" onClick={handleBackupData} title="Backup all data to file">
                💾 Backup
              </button>
              <button className="btn ghost" onClick={handleRestoreBackup} title="Restore data from backup file">
                📥 Restore
              </button>
              <button className="btn ghost" onClick={() => setEditMode((v) => !v)}>
                <span className={`status-dot ${editMode ? 'active' : ''}`} />
                Edit Layout
              </button>
              {editMode && (
                <label className="toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '0 12px' }}>
                  <input
                    type="checkbox"
                    checked={preferences.enableSnapping}
                    onChange={(e) => setPreferences(p => ({ ...p, enableSnapping: e.target.checked }))}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: 'var(--text)', whiteSpace: 'nowrap' }}>Snap to Grid</span>
                </label>
              )}
            </>
          )}

          <button className="btn secondary" onClick={handlePreviewPdf}>Preview</button>
          {/* Print & Record dropdown button */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              <button
                className="btn primary"
                onClick={handlePrintAndRecord}
                style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: '1px solid rgba(255,255,255,0.2)' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 6V1H12V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="2" y="6" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4 12V15H12V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Print & Record
              </button>
              <button
                className="btn primary"
                onClick={(e) => {
                  e.stopPropagation()
                  const dropdown = e.currentTarget.nextElementSibling
                  dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block'
                }}
                style={{
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  padding: '8px 6px',
                  minWidth: 'auto'
                }}
                title="More options"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  background: '#1e293b',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  zIndex: 1000,
                  minWidth: '160px',
                  overflow: 'hidden'
                }}
                onMouseLeave={(e) => e.currentTarget.style.display = 'none'}
              >
                <button
                  className="btn"
                  onClick={(e) => {
                    e.currentTarget.parentElement.style.display = 'none'
                    handleRecordOnly()
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#1e293b'}
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    borderRadius: 0,
                    border: 'none',
                    background: '#1e293b',
                    color: 'var(--text)',
                    padding: '10px 14px'
                  }}
                >
                  <CheckIcon /> Record Only
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Check Bar */}
      {activeProfile?.layoutMode !== 'three_up' && !editMode && (
        <div className="quick-check-bar no-print" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 24px',
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #334155',
          flexWrap: 'wrap'
        }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap'
          }}>
            Quick Check
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, flexWrap: 'wrap', minWidth: 0 }}>
            <input
              type="text"
              value={data.payee || ''}
              onChange={(e) => setData(p => ({ ...p, payee: e.target.value }))}
              placeholder="Payee"
              style={{
                flex: '2 1 150px',
                minWidth: '120px',
                maxWidth: '250px',
                padding: '8px 12px',
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#f1f5f9',
                fontSize: '14px'
              }}
            />
            <input
              type="date"
              value={data.date || getLocalDateString()}
              onChange={(e) => setData(p => ({ ...p, date: e.target.value }))}
              style={{
                flex: '1 1 130px',
                minWidth: '130px',
                maxWidth: '150px',
                padding: '8px 12px',
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#f1f5f9',
                fontSize: '14px'
              }}
            />
            <div style={{ position: 'relative', flex: '1 1 100px', minWidth: '100px', maxWidth: '140px' }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
                fontSize: '14px',
                pointerEvents: 'none'
              }}>$</span>
              <input
                type="text"
                value={data.amount || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '')
                  setData(p => ({ ...p, amount: val }))
                }}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 24px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#f1f5f9',
                  fontSize: '14px'
                }}
              />
            </div>
            <input
              type="text"
              value={data.memo || ''}
              onChange={(e) => setData(p => ({ ...p, memo: e.target.value }))}
              placeholder="Memo (optional)"
              style={{
                flex: '2 1 150px',
                minWidth: '100px',
                maxWidth: '200px',
                padding: '8px 12px',
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#f1f5f9',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
