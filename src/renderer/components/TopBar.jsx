import React, { useState, useRef, useEffect } from 'react'
import { formatCurrency } from '../utils/helpers'
import { getLocalDateString } from '../utils/date'
import { DownloadIcon, UploadIcon, CheckIcon } from '../constants/icons'
import logoImg from '../assets/logo.png'
import { APP_VERSION } from '../constants/defaults'
import { AtmCurrencyInput } from './AtmCurrencyInput'

function TopBarMenu({ label, icon, badge, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onClickOutside)
    return () => document.removeEventListener('pointerdown', onClickOutside)
  }, [open])

  return (
    <div className="topbar-menu" ref={ref}>
      <button
        className={`topbar-menu-trigger ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span className="topbar-menu-icon">{icon}</span>
        <span>{label}</span>
        <svg className="topbar-menu-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {badge > 0 && <span className="topbar-badge">{badge}</span>}
      </button>
      {open && (
        <div className="topbar-menu-dropdown" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  )
}

function MenuDivider() {
  return <div className="topbar-menu-divider" />
}

function MenuItem({ icon, label, onClick, badge, danger }) {
  return (
    <button className={`topbar-menu-item ${danger ? 'danger' : ''}`} onClick={onClick}>
      <span className="topbar-menu-item-icon">{icon}</span>
      <span className="topbar-menu-item-label">{label}</span>
      {badge > 0 && <span className="topbar-menu-item-badge">{badge}</span>}
    </button>
  )
}

export function TopBar({
  ledgers, checkHistory, calculateHybridBalance,
  showLedger, setShowLedger,
  showHistory, setShowHistory,
  setHistoryViewMode,
  setHistorySearchTerm, setHistoryGlCodeFilter, setHistoryVendorFilter,
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
  recurringDueCount,
  onOpenInvoices,
  invoiceOverdueCount
}) {
  const totalBadge = (approvalCount || 0) + (recurringDueCount || 0) + (invoiceOverdueCount || 0)

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
            onClick={() => { setHistoryViewMode('all'); setHistorySearchTerm(''); setHistoryGlCodeFilter('all'); setHistoryVendorFilter('all'); setShowHistory(true); setShowLedger(false); }}
          >
            <span className="tab-label">All History</span>
            <span className="tab-value">{checkHistory.length}</span>
          </button>
        </div>

        <div className="topbar-actions">
          {/* Data Menu */}
          <TopBarMenu label="Data" icon="📁">
            <MenuItem icon={<DownloadIcon />} label="Download Template" onClick={downloadTemplate} />
            <MenuItem icon={<UploadIcon />} label="Import CSV" onClick={handleImport} />
            <MenuItem icon={<DownloadIcon />} label="Export History" onClick={handleExport} />
            <MenuDivider />
            <MenuItem icon="🏦" label="Positive Pay" onClick={onOpenPositivePay} />
          </TopBarMenu>

          {/* Tools Menu */}
          <TopBarMenu label="Tools" icon="🛠️" badge={totalBadge}>
            <MenuItem icon="📌" label="Vendors" onClick={onOpenVendors} />
            <MenuItem icon="✅" label="Approvals" onClick={onOpenApprovals} badge={approvalCount} />
            <MenuItem icon="📊" label="Reports" onClick={onOpenReports} />
            <MenuDivider />
            <MenuItem icon="🏦" label="Reconcile" onClick={onOpenReconciliation} />
            <MenuItem icon="🔄" label="Recurring" onClick={onOpenRecurring} badge={recurringDueCount} />
            <MenuDivider />
            <MenuItem icon="📄" label="Invoices" onClick={onOpenInvoices} badge={invoiceOverdueCount} />
          </TopBarMenu>

          {/* Admin — simple toggle when locked, dropdown when unlocked */}
          {preferences.adminLocked ? (
            <button className="topbar-menu-trigger" onClick={handleUnlockRequest}>
              <span className="topbar-menu-icon">🔒</span>
              <span>Admin</span>
            </button>
          ) : (
            <TopBarMenu label="Admin" icon="🔓">
              <MenuItem icon="🔒" label="Lock Admin" onClick={handleLock} />
              <MenuDivider />
              <MenuItem icon="💾" label="Backup Data" onClick={handleBackupData} />
              <MenuItem icon="📥" label="Restore Backup" onClick={handleRestoreBackup} />
              <MenuDivider />
              <MenuItem
                icon={<span className={`status-dot ${editMode ? 'active' : ''}`} />}
                label="Edit Layout"
                onClick={setEditMode}
              />
              {editMode && (
                <>
                  <MenuItem
                    icon={preferences.enableSnapping ? '✓' : ' '}
                    label="Snap to Grid"
                    onClick={() => setPreferences(p => ({ ...p, enableSnapping: !p.enableSnapping }))}
                  />
                  <MenuItem
                    icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1.5 2.5V5.5H4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2.1 8.5A5 5 0 104.05 3.05L1.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>}
                    label="Reset Layout"
                    onClick={resetModel}
                    danger
                  />
                </>
              )}
            </TopBarMenu>
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
              style={{ flex: '3 1 200px', minWidth: '150px' }}
            />
          </div>
        </div>
      )}
    </>
  )
}
