import React from 'react'
import { formatCurrency } from '../utils/helpers'
import { getLocalDateString } from '../utils/date'
import { DownloadIcon, UploadIcon, CheckIcon } from '../constants/icons'
import logoImg from '../assets/logo.png'
import { APP_VERSION } from '../constants/defaults'
import { AtmCurrencyInput } from './AtmCurrencyInput'

export function TopBar({
  ledgers, checkHistory, calculateHybridBalance,
  showLedger, setShowLedger,
  showHistory, setShowHistory,
  setHistoryViewMode,
  downloadTemplate, handleImport, handleExport,
  preferences, setPreferences,
  handleUnlockRequest, handleLock,
  handleBackupData, handleRestoreBackup,
  editMode, setEditMode, resetModel,
  handlePreviewPdf, handlePrintAndRecord, handleRecordOnly,
  activeProfile, data, setData,
  onOpenPositivePay,
  onOpenVendors,
  onOpenApprovals,
  approvalCount,
  onOpenReports,
  onOpenReconciliation,
  onOpenRecurring,
  recurringDueCount
}) {
  return (
    <>
      <div className="topbar">
        <div className="brand">
          <img src={logoImg} alt="CheckSpree" className="brand-logo" />
          <div className="brand-text">
            <span className="brand-name">CheckSpree</span>
            <span className="brand-version">Version {APP_VERSION}</span>
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
          <button className="btn ghost" onClick={onOpenPositivePay} title="Generate Positive Pay file for bank">
            🏦 Pos. Pay
          </button>
          <button className="btn ghost" onClick={onOpenVendors} title="Manage vendors and payees">
            📌 Vendors
          </button>
          <button className="btn ghost" onClick={onOpenApprovals} title="Check approval queue" style={{ position: 'relative' }}>
            ✅ Approvals
            {approvalCount > 0 && (
              <span className="topbar-badge">{approvalCount}</span>
            )}
          </button>
          <button className="btn ghost" onClick={onOpenReports} title="Reports and search">
            📊 Reports
          </button>
          <button className="btn ghost" onClick={onOpenReconciliation} title="Bank reconciliation">
            🏦 Reconcile
          </button>
          <button className="btn ghost" onClick={onOpenRecurring} title="Recurring/scheduled checks" style={{ position: 'relative' }}>
            🔄 Recurring
            {recurringDueCount > 0 && (
              <span className="topbar-badge">{recurringDueCount}</span>
            )}
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
              <button className="btn ghost" onClick={setEditMode}>
                <span className={`status-dot ${editMode ? 'active' : ''}`} />
                Edit Layout
              </button>
              {editMode && (
                <>
                  <label className="toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '0 12px' }}>
                    <input
                      type="checkbox"
                      checked={preferences.enableSnapping}
                      onChange={(e) => setPreferences(p => ({ ...p, enableSnapping: e.target.checked }))}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--text)', whiteSpace: 'nowrap' }}>Snap to Grid</span>
                  </label>
                  <button className="btn ghost" onClick={resetModel} title="Reset layout and fields to defaults">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1.5 2.5V5.5H4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2.1 8.5A5 5 0 104.05 3.05L1.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Reset Layout
                  </button>
                </>
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
                className="dropdown-menu"
                style={{ display: 'none' }}
                onMouseLeave={(e) => e.currentTarget.style.display = 'none'}
              >
                <button
                  className="dropdown-item"
                  onClick={(e) => {
                    e.currentTarget.parentElement.style.display = 'none'
                    handleRecordOnly()
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
        <div className="quick-check-bar no-print">
          <span className="quick-check-label">Quick Check</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, flexWrap: 'wrap', minWidth: 0 }}>
            <input
              className="quick-check-input"
              type="text"
              value={data.payee || ''}
              onChange={(e) => setData(p => ({ ...p, payee: e.target.value }))}
              placeholder="Payee"
              style={{ flex: '2 1 150px', minWidth: '120px', maxWidth: '250px' }}
            />
            <input
              className="quick-check-input"
              type="date"
              value={data.date || getLocalDateString()}
              onChange={(e) => setData(p => ({ ...p, date: e.target.value }))}
              style={{ flex: '1 1 130px', minWidth: '130px', maxWidth: '150px' }}
            />
            <AtmCurrencyInput
              value={data.amount || ''}
              onChange={(val) => setData(p => ({ ...p, amount: val }))}
              style={{ flex: '1 1 100px', minWidth: '100px', maxWidth: '140px' }}
            />
            <input
              className="quick-check-input"
              type="text"
              value={data.memo || ''}
              onChange={(e) => setData(p => ({ ...p, memo: e.target.value }))}
              placeholder="Memo (optional)"
              style={{ flex: '2 1 150px', minWidth: '100px', maxWidth: '200px' }}
            />
          </div>
        </div>
      )}
    </>
  )
}
