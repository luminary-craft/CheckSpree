import React, { useRef } from 'react'
import { formatCurrency, sanitizeCurrencyInput, generateId } from '../utils/helpers'
import { formatDate, clamp } from '../constants/defaults'
import { getLocalDateString } from '../utils/date'
import { AVAILABLE_FONTS } from '../constants/defaults'
import { ChevronIcon, PencilIcon, TrashIcon, PlusIcon, CheckIcon } from '../constants/icons'
import { AtmCurrencyInput } from './AtmCurrencyInput'
import { PayeeAutocomplete } from './PayeeAutocomplete'
import { AddressInput } from '../AddressInput'
import { GlCodeInput } from './GlCodeInput'

export function Sidebar({
  // Ledger
  ledgers, setLedgers, activeLedgerId, setActiveLedgerId, activeLedger,
  showLedgerManager, setShowLedgerManager, editingLedgerName, setEditingLedgerName,
  hybridBalance, pendingAmount, isOverdrawn, projectedBalance,
  editingBalance, tempBalance, setTempBalance, preferences, setPreferences,
  deleteLedger, renameLedger, createNewLedger, updateBalance,
  setDepositData, setShowDepositModal, setShowBalanceAdjustmentModal,
  // History
  checkHistory, setCheckHistory, setHistoryViewMode, setShowHistory, setShowLedger,
  fillFromHistoryEntry, deleteHistoryEntry,
  // Import Queue
  importQueue, setImportQueue, selectedQueueItems, setSelectedQueueItems,
  showImportQueue, setShowImportQueue, handleBatchPrintAndRecord, processAllQueue, clearQueue, loadFromQueue,
  // Profiles
  profiles, setProfiles, activeProfileId, activeProfile,
  hasUnsavedChanges, profileSaved, showProfileManager, setShowProfileManager,
  editingProfileName, setEditingProfileName,
  loadProfile, createNewProfile, saveCurrentProfile, renameProfile, deleteProfile,
  // Model
  model, setModel, resetModel,
  // Check Data
  data, setData, sheetData, activeSlot, setActiveSlot,
  checkMode, setCheckMode, lineItems, setLineItems, nextLineItemId, setNextLineItemId,
  autoIncrementCheckNumbers, setAutoIncrementCheckNumbers,
  getCurrentCheckData, updateCurrentCheckData, clearCurrentSlot, clearAllSlots, isSlotEmpty,
  // GL Codes
  compiledGlCodes,
  // Template
  templateDataUrl, templateLoadError, templateDecodeError, handleSelectTemplate,
  templateName, isFullPageTemplate,
  // Layout
  editMode, selected, setSelected,
  showStub1Labels, setShowStub1Labels, showStub2Labels, setShowStub2Labels,
  setField, ensureStub, reorderSections, getSectionHeight,
  showAdvanced, setShowAdvanced,
  // Admin
  handleUnlockRequest,
  // Toast
  showToast
}) {
  // Track original balance for history entry on blur
  const originalBalanceRef = useRef(0)
  const latestBalanceRef = useRef(0)

  return (
    <div className="side">
      {/* Scrollable Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px' }}>
        {/* Unified Ledger Widget - Always Visible */}
        <section className="section">
          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            {/* Active Ledger Selector */}
            <div style={{ marginBottom: '16px' }}>
              <div
                className="ledger-selector-trigger"
                onClick={() => setShowLedgerManager(!showLedgerManager)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--text-label)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Ledger:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{activeLedger?.name || 'Select Ledger'}</span>
                </div>
                <ChevronIcon open={showLedgerManager} />
              </div>

              {/* Ledger Manager */}
              {showLedgerManager && (
                <div className="ledger-dropdown-list" style={{
                  marginTop: '8px',
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}>
                  {ledgers.map(l => {
                    const isEditing = editingLedgerName === l.id
                    const canEdit = !preferences.adminLocked || preferences.allowUserLedgerManagement

                    return (
                      <div key={l.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            backgroundColor: l.id === activeLedgerId ? 'var(--accent-soft)' : 'transparent',
                            borderLeft: l.id === activeLedgerId ? '3px solid var(--accent)' : '3px solid transparent'
                          }}
                        >
                          <div
                            onClick={() => {
                              setActiveLedgerId(l.id)
                              setShowLedgerManager(false)
                            }}
                            style={{ flex: 1, cursor: 'pointer', fontWeight: l.id === activeLedgerId ? 600 : 400 }}
                          >
                            {l.name}
                          </div>

                          {canEdit && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                className="btn-icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingLedgerName(isEditing ? null : l.id)
                                }}
                                title="Edit ledger settings"
                                style={{ color: isEditing ? 'var(--accent)' : 'var(--text-label)' }}
                              >
                                <PencilIcon />
                              </button>
                              {ledgers.length > 1 && (!preferences.adminLocked || preferences.allowUserLedgerManagement) && (
                                <button
                                  className="btn-icon danger"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteLedger(l.id)
                                  }}
                                  title="Delete ledger"
                                >
                                  <TrashIcon />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Inline Edit Form */}
                        {isEditing && (
                          <div style={{
                            padding: '12px',
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            borderTop: '1px solid var(--border-subtle)'
                          }}>
                            {/* Name Edit */}
                            <div style={{ marginBottom: '12px' }}>
                              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-label)', marginBottom: '4px' }}>Ledger Name</label>
                              <input
                                className="profile-name-input"
                                defaultValue={l.name}
                                autoFocus
                                onBlur={(e) => {
                                  if (e.target.value.trim()) renameLedger(l.id, e.target.value.trim(), false)
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.target.value.trim()) {
                                    renameLedger(l.id, e.target.value.trim())
                                    setEditingLedgerName(null)
                                  } else if (e.key === 'Escape') {
                                    setEditingLedgerName(null)
                                  }
                                }}
                                style={{ width: '100%' }}
                              />
                            </div>

                            {/* Initial Balance - ATM-style input */}
                            <div style={{ marginBottom: '12px' }} onClick={(e) => e.stopPropagation()}>
                              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-label)', marginBottom: '4px' }}>Initial Balance</label>
                              <AtmCurrencyInput
                                value={l.startingBalance ? l.startingBalance.toFixed(2) : ''}
                                onFocus={() => {
                                  originalBalanceRef.current = l.startingBalance || 0
                                  latestBalanceRef.current = l.startingBalance || 0
                                }}
                                onChange={(val) => {
                                  const newVal = parseFloat(val) || 0
                                  latestBalanceRef.current = newVal
                                  setLedgers(prev => prev.map(ledger =>
                                    ledger.id === l.id ? { ...ledger, startingBalance: newVal } : ledger
                                  ))
                                }}
                                onInputKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    e.target.blur()
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault()
                                    setEditingLedgerName(null)
                                  }
                                }}
                                onBlur={() => {
                                  const newVal = latestBalanceRef.current
                                  const originalVal = originalBalanceRef.current
                                  if (Math.abs(newVal - originalVal) > 0.001) {
                                    const ledgerId = l.id
                                    const noteEntry = {
                                      id: generateId(),
                                      type: 'note',
                                      date: getLocalDateString(),
                                      payee: 'Initial Balance Changed',
                                      amount: 0,
                                      memo: `Initial balance changed from ${formatCurrency(originalVal)} to ${formatCurrency(newVal)}`,
                                      reason: '',
                                      external_memo: '',
                                      internal_memo: '',
                                      line_items: [],
                                      line_items_text: '',
                                      ledgerId: ledgerId,
                                      profileId: activeProfileId,
                                      ledger_snapshot: {
                                        previous_balance: originalVal,
                                        transaction_amount: newVal - originalVal,
                                        new_balance: newVal
                                      },
                                      timestamp: Date.now(),
                                      isInitialBalanceChange: true
                                    }
                                    setCheckHistory(prev => [noteEntry, ...prev])
                                    window.cs2.backupTriggerAuto().catch(err => {
                                      console.error('Auto-backup trigger failed:', err)
                                    })
                                  }
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {(!preferences.adminLocked || preferences.allowUserLedgerManagement) && (
                    <button
                      className="btn ghost full-width"
                      onClick={createNewLedger}
                      style={{ borderRadius: 0, borderTop: '1px solid var(--border-subtle)', justifyContent: 'center', padding: '10px' }}
                    >
                      <PlusIcon /> New Ledger
                    </button>
                  )}

                  {!preferences.adminLocked && (
                    <div style={{
                      padding: '12px',
                      borderTop: '1px solid var(--border-subtle)',
                      backgroundColor: 'rgba(0, 0, 0, 0.2)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 500 }}>User Management</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Allow standard users to manage ledgers</div>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={preferences.allowUserLedgerManagement}
                            onChange={(e) => {
                              setPreferences(prev => ({ ...prev, allowUserLedgerManagement: !prev.allowUserLedgerManagement }))
                            }}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Balance Display */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginBottom: '16px' }}>
              {editingBalance ? (
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center'
                }}>
                  <div style={{ flexGrow: 1 }}>
                    <AtmCurrencyInput
                      value={tempBalance}
                      onChange={setTempBalance}
                      autoFocus
                    />
                  </div>
                  <button
                    className="btn-icon"
                    onClick={updateBalance}
                    title="Save balance"
                    style={{
                      flexShrink: 0,
                      width: '40px',
                      height: '40px',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'var(--success)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <CheckIcon />
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Current Balance</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div
                      onClick={() => {
                        setHistoryViewMode('current')
                        setShowHistory(true)
                        setShowLedger(false)
                      }}
                      style={{
                        cursor: 'pointer',
                        fontSize: '32px',
                        fontWeight: '700',
                        color: hybridBalance < 0 ? 'var(--danger)' : 'var(--success)'
                      }}
                    >
                      {formatCurrency(hybridBalance)}
                    </div>
                    <button
                      onClick={() => {
                        setDepositData({
                          date: getLocalDateString(),
                          description: '',
                          amount: '',
                          reason: ''
                        })
                        setShowDepositModal(true)
                      }}
                      className="btn-icon"
                      title="Add Deposit/Adjustment"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--success)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '20px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0
                      }}
                    >
                      +
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    {(!preferences.adminLocked || preferences.allowUserLedgerManagement) ? 'Click to view ledger history' : 'Click to view • Use + to adjust'}
                  </div>
                </div>
              )}

              {pendingAmount > 0 && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  backgroundColor: isOverdrawn ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  fontWeight: '500',
                  border: isOverdrawn ? '1px solid var(--danger-soft)' : '1px solid var(--success-soft)',
                  color: 'var(--text-bright)'
                }}>
                  <span>After this check:</span>
                  <span style={{ color: isOverdrawn ? 'var(--danger)' : 'var(--success)', fontWeight: '600' }}>
                    {formatCurrency(projectedBalance)}
                  </span>
                </div>
              )}
            </div>

            {/* Recent History */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text-label)' }}>
                Recent Activity
              </h4>
              {checkHistory.filter(c => c.ledgerId === activeLedgerId).length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>
                  No recent activity
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {checkHistory.filter(c => c.ledgerId === activeLedgerId).slice(0, 2).map(entry => (
                    <div
                      key={entry.id}
                      onClick={() => entry.type !== 'deposit' && fillFromHistoryEntry(entry)}
                      title={entry.type !== 'deposit' ? 'Click to fill form with this check' : 'Deposits cannot be copied'}
                      style={{
                        position: 'relative',
                        padding: '8px 40px 8px 10px',
                        backgroundColor: 'var(--surface-hover)',
                        borderRadius: '6px',
                        fontSize: '13px',
                        border: '1px solid var(--border)',
                        cursor: entry.type !== 'deposit' ? 'pointer' : 'default',
                        transition: 'background-color 0.15s, border-color 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        if (entry.type !== 'deposit') {
                          e.currentTarget.style.backgroundColor = 'var(--accent-soft)'
                          e.currentTarget.style.borderColor = 'var(--accent)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--surface-hover)'
                        e.currentTarget.style.borderColor = 'var(--border)'
                      }}
                    >
                      <div style={{ marginBottom: '4px' }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.payee}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-label)' }}>
                          {formatDate(entry.date)}
                        </div>
                      </div>
                      {entry.type === 'note' ? (
                        <div style={{ fontWeight: '500', color: 'var(--accent-hover)', whiteSpace: 'nowrap', fontSize: '11px' }}>
                          Note
                        </div>
                      ) : (
                        <div style={{ fontWeight: '600', color: entry.type === 'deposit' ? 'var(--success)' : 'var(--danger)', whiteSpace: 'nowrap' }}>
                          {entry.type === 'deposit' ? '+' : '-'}{formatCurrency(entry.amount)}
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteHistoryEntry(entry.id) }}
                        title="Delete and restore amount"
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: 'var(--text-dim)',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* View History Button */}
              {checkHistory.filter(c => c.ledgerId === activeLedgerId).length > 0 && (
                <button
                  className="btn btn-sm full-width"
                  onClick={() => { setHistoryViewMode('current'); setShowHistory(true); setShowLedger(false); }}
                >
                  View Ledger History ({checkHistory.filter(c => c.ledgerId === activeLedgerId).length})
                </button>
              )}
            </div>
          </div >
        </section >

        {/* Import Queue Panel */}
        {
          showImportQueue && importQueue.length > 0 && (
            <section className="section-import">
              <div className="card card-import">
                <div className="import-header">
                  <h2>Import Queue ({importQueue.length})</h2>
                  <button className="btn-icon" onClick={() => setShowImportQueue(false)}>×</button>
                </div>

                <div className="import-actions">
                  {/* Primary Action - Full Width */}
                  <button className="btn btn-sm primary full-width" onClick={handleBatchPrintAndRecord}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 6V1H12V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="2" y="6" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M4 12V15H12V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Print & Record All
                  </button>

                  {/* Secondary Actions - Split Row */}
                  <div className="import-actions-row">
                    <button className="btn btn-sm" onClick={processAllQueue}>
                      <CheckIcon /> Record Only
                    </button>
                    <button className="btn btn-sm danger" onClick={clearQueue}>
                      <TrashIcon /> Clear Queue
                    </button>
                  </div>
                </div>

                <div className="import-list">
                  {importQueue.map(item => {
                    const isSelected = selectedQueueItems.some(selected => selected.id === item.id)
                    return (
                      <div
                        key={item.id}
                        className={`import-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => loadFromQueue(item)}
                      >
                        <div className="import-main">
                          <span className="import-payee">{item.payee || '(no payee)'}</span>
                          <span className="import-amount">{item.amount ? formatCurrency(sanitizeCurrencyInput(item.amount)) : '-'}</span>
                        </div>
                        <div className="import-meta">
                          {item.date && <span>{item.date}</span>}
                          {item.memo && <span>{item.memo}</span>}
                        </div>
                        <button
                          className="btn btn-sm danger"
                          onClick={(e) => {
                            e.stopPropagation()
                            setImportQueue(prev => prev.filter(i => i.id !== item.id))
                            setSelectedQueueItems(prev => prev.filter(i => i.id !== item.id))
                          }}
                          title="Remove from queue"
                          style={{ marginLeft: 'auto', minWidth: 'fit-content', padding: '4px 8px', cursor: 'pointer' }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <p className="hint">
                  {activeProfile?.layoutMode === 'three_up'
                    ? 'Click items to select (up to 3 for sheet)'
                    : 'Click an item to load it into the form'}
                </p>
              </div>
            </section>
          )
        }

        {/* Profile Selector - Always Visible */}
        <section className="section">
          <h3>Check Profile</h3>
          <div className="card">
            <div className="profile-bar">
              <select
                className="profile-select"
                value={activeProfileId}
                onChange={(e) => loadProfile(e.target.value)}
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.id === activeProfileId && hasUnsavedChanges ? '●' : ''}
                  </option>
                ))}
              </select>
              {!preferences.adminLocked && (
                <button className="btn-icon" onClick={() => setShowProfileManager(!showProfileManager)} title="Rename or delete profiles">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="3" r="1.5" fill="currentColor" />
                    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                    <circle cx="8" cy="13" r="1.5" fill="currentColor" />
                  </svg>
                </button>
              )}
            </div>

            {/* Layout Mode Selector - Admin Only */}
            {!preferences.adminLocked && activeProfile && (
              <div className="field" style={{ marginTop: '12px' }}>
                <label>Layout Mode</label>
                <select
                  value={activeProfile.layoutMode || 'standard'}
                  style={{ width: '100%' }}
                  onChange={(e) => {
                    const newMode = e.target.value
                    setProfiles(profiles.map(p =>
                      p.id === activeProfileId
                        ? { ...p, layoutMode: newMode }
                        : p
                    ))
                  }}
                >
                  <option value="standard">Standard (Check + 2 Stubs)</option>
                  <option value="three_up">3-Up (3 Checks per Page)</option>
                </select>
              </div>
            )}

            {/* Section Order - Standard Mode Only */}
            {!preferences.adminLocked && activeProfile?.layoutMode !== 'three_up' && (
              <div className="field" style={{ marginTop: '12px' }}>
                <label>Section Order</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(model.layout.sectionOrder || ['check', 'stub1', 'stub2']).map((section, index, arr) => (
                    <div key={section} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 10px',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}>
                      <span style={{ flex: 1, color: 'var(--text-secondary)' }}>
                        {section === 'check' ? 'Check' : (section === 'stub1' ? 'Stub (Payee)' : 'Stub (Bookkeeper)')}
                      </span>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {/* Visibility Toggle */}
                        {section !== 'check' && (() => {
                          const isStub1 = section === 'stub1'
                          const enabled = isStub1 ? model.layout.stub1Enabled : model.layout.stub2Enabled
                          return (
                            <button
                              className="btn-icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                ensureStub(section, !enabled)
                              }}
                              title={enabled ? "Hide Section" : "Show Section"}
                              style={{
                                color: enabled ? 'var(--text)' : 'var(--text-secondary)',
                                opacity: enabled ? 1 : 0.5
                              }}
                            >
                              {/* Eye / Eye-Off Icon */}
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {enabled ? (
                                  <>
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </>
                                ) : (
                                  <>
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                  </>
                                )}
                              </svg>
                            </button>
                          )
                        })()}
                        {/* Divider */}
                        <div style={{ width: '1px', height: '12px', background: 'var(--border)', margin: '0 2px' }} />
                        {/* UP Button */}
                        <button
                          className="btn-icon"
                          disabled={index === 0}
                          style={{ opacity: index === 0 ? 0.3 : 1, cursor: index === 0 ? 'default' : 'pointer', padding: '2px' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (index === 0) return
                            const newOrder = [...arr]
                            // Swap
                            const temp = newOrder[index]
                            newOrder[index] = newOrder[index - 1]
                            newOrder[index - 1] = temp
                            reorderSections(newOrder)
                          }}
                          title="Move Up"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 19V5M5 12l7-7 7 7" />
                          </svg>
                        </button>
                        {/* DOWN Button */}
                        <button
                          className="btn-icon"
                          disabled={index === arr.length - 1}
                          style={{ opacity: index === arr.length - 1 ? 0.3 : 1, cursor: index === arr.length - 1 ? 'default' : 'pointer', padding: '2px' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (index === arr.length - 1) return
                            const newOrder = [...arr]
                            // Swap
                            const temp = newOrder[index]
                            newOrder[index] = newOrder[index + 1]
                            newOrder[index + 1] = temp
                            reorderSections(newOrder)
                          }}
                          title="Move Down"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12l7 7 7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin-only action buttons */}
            {!preferences.adminLocked && (
              <>
                <div className="profile-actions-bar">
                  <button className="btn btn-sm" onClick={createNewProfile}>
                    <PlusIcon /> New
                  </button>
                  <button
                    className={`btn btn-sm ${profileSaved ? 'success' : hasUnsavedChanges ? 'primary pulse' : 'primary'}`}
                    onClick={saveCurrentProfile}
                  >
                    {hasUnsavedChanges && <span className="unsaved-dot">●</span>}
                    <CheckIcon /> {profileSaved ? 'Saved!' : 'Save'}
                  </button>
                </div>

                {/* Collapsible profile manager for rename/delete */}
                {showProfileManager && (
                  <div className="profile-manager" style={{ marginTop: '12px' }}>
                    <div className="profile-list">
                      {profiles.map(p => (
                        <div key={p.id} className={`profile-item ${p.id === activeProfileId ? 'active' : ''}`}>
                          {editingProfileName === p.id ? (
                            <input
                              className="profile-name-input"
                              defaultValue={p.name}
                              autoFocus
                              onBlur={(e) => {
                                if (e.target.value.trim()) {
                                  renameProfile(p.id, e.target.value.trim())
                                } else {
                                  setEditingProfileName(null)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.target.value.trim()) {
                                  renameProfile(p.id, e.target.value.trim())
                                } else if (e.key === 'Escape') {
                                  setEditingProfileName(null)
                                }
                              }}
                            />
                          ) : (
                            <span className="profile-name">
                              {p.name}
                            </span>
                          )}
                          <div className="profile-actions">
                            <button
                              className="btn-icon-sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingProfileName(p.id)
                              }}
                              title="Rename"
                            >
                              ✎
                            </button>
                            {profiles.length > 1 && (
                              <button
                                className="btn-icon-sm danger"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteProfile(p.id)
                                }}
                                title="Delete"
                              >
                                <TrashIcon />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Check Data - Main focus */}
        <section className="section-main">
          {/* Sheet Editor Tabs - only in three_up mode */}
          {activeProfile?.layoutMode === 'three_up' && (
            <div style={{
              display: 'flex',
              gap: '4px',
              borderBottom: '1px solid var(--border)',
              marginBottom: '16px'
            }}>
              {['top', 'middle', 'bottom'].map(slot => {
                const slotData = sheetData[slot]
                const isEmpty = isSlotEmpty(slotData)
                const isActive = activeSlot === slot

                return (
                  <button
                    key={slot}
                    onClick={() => setActiveSlot(slot)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: isActive ? 'var(--accent-soft)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--text)',
                      border: 'none',
                      borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: isActive ? '600' : '400',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.target.style.background = 'var(--surface-hover)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.target.style.background = 'transparent'
                      }
                    }}
                  >
                    {slot.charAt(0).toUpperCase() + slot.slice(1)}
                    {!isEmpty && (
                      <span style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--success)'
                      }} />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Clear Slot Buttons (three-up mode only) */}
          {activeProfile?.layoutMode === 'three_up' && (
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <button
                className="btn btn-sm"
                onClick={clearCurrentSlot}
                style={{
                  flex: 1,
                  background: 'var(--surface-hover)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)'
                }}
                title="Clear the current slot"
              >
                Clear {activeSlot.charAt(0).toUpperCase() + activeSlot.slice(1)}
              </button>
              <button
                className="btn btn-sm danger"
                onClick={clearAllSlots}
                style={{ flex: 1 }}
                title="Clear all three slots"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Clear Check Fields Button (standard mode only) */}
          {activeProfile?.layoutMode !== 'three_up' && (
            <div style={{ marginBottom: '16px' }}>
              <button
                className="btn btn-sm"
                onClick={clearCurrentSlot}
                style={{
                  width: '100%',
                  background: 'var(--surface-hover)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)'
                }}
                title="Clear all check fields"
              >
                Clear Check Fields
              </button>
            </div>
          )}

          <h2>Check Details</h2>
          <div className="card card-main" style={{ overflow: 'visible' }}>
            <div className="field">
              <label>Date</label>
              <input
                type="date"
                value={getCurrentCheckData().date || ''}
                onChange={(e) => updateCurrentCheckData({ date: e.target.value })}
              />
            </div>
            <div className="field">
              <PayeeAutocomplete
                value={getCurrentCheckData().payee || ''}
                onChange={(newPayee) => {
                  const currentAddress = getCurrentCheckData().address || ''
                  // Auto-populate address if empty or if it only contains the old payee name
                  // But effectively, simplified: just default to payee name if address empty
                  // or if user wants it sync'd. For now, we'll append/replace first line logic
                  // simpler: If address is empty, set it to payee.
                  // If it's not empty, we leave it alone (user might have edited it).
                  // User requested "automatically added to the top of the field"
                  // So we should ensure the first line matches the payee.

                  const lines = currentAddress.split('\n')
                  if (lines.length === 0 || !currentAddress.trim()) {
                    updateCurrentCheckData({ payee: newPayee, address: newPayee })
                  } else {
                    // Update first line to match new payee
                    lines[0] = newPayee
                    updateCurrentCheckData({ payee: newPayee, address: lines.join('\n') })
                  }
                }}
                checkHistory={checkHistory}
                placeholder="Recipient name"
              />
            </div>
            {/* Address Field (for Window Envelopes) */}
            <div className="field">
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Address</span>
                <span style={{ fontSize: '11px', color: 'var(--text-label)', fontWeight: 'normal' }}>Window Envelope</span>
              </label>
              <AddressInput
                value={getCurrentCheckData().address || ''}
                onChange={(val) => updateCurrentCheckData({ address: val })}
                history={checkHistory}
                placeholder="Recipient Address"
              />
            </div>
            <div className="field">
              <label>GL Code</label>
              <GlCodeInput
                value={getCurrentCheckData().glCode || ''}
                onChange={(val) => {
                  if (val && typeof val === 'object') {
                    updateCurrentCheckData({
                      glCode: val.code || '',
                      glDescription: val.description || val.desc || val.glDescription || ''
                    })
                  } else {
                    const newCode = val || ''
                    const updates = { glCode: newCode }
                    if (!newCode) updates.glDescription = ''
                    updateCurrentCheckData(updates)
                  }
                }}
                glCodes={compiledGlCodes}
                placeholder="Search or type GL code..."
              />
            </div>
            <div className="field">
              <label>Description</label>
              <input
                type="text"
                value={getCurrentCheckData().glDescription || ''}
                onChange={(e) => updateCurrentCheckData({ glDescription: e.target.value })}
                placeholder="Auto-filled from GL Code or type manually"
              />
            </div>

            {/* Check Builder Mode Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
              padding: '8px 12px',
              backgroundColor: 'var(--surface)',
              borderRadius: '6px',
              border: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-label)', fontWeight: '500' }}>Mode:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setCheckMode('simple')
                    // When switching to simple, keep the current calculated amount if in itemized mode
                    if (checkMode === 'itemized' && lineItems.length > 0) {
                      const total = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
                      updateCurrentCheckData({ amount: total.toFixed(2) })
                    }
                  }}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '4px',
                    border: checkMode === 'simple' ? '1px solid var(--accent)' : '1px solid var(--border-medium)',
                    backgroundColor: checkMode === 'simple' ? 'var(--accent-soft)' : 'transparent',
                    color: checkMode === 'simple' ? 'var(--accent)' : 'var(--text-label)',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Simple
                </button>
                <button
                  onClick={() => setCheckMode('itemized')}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '4px',
                    border: checkMode === 'itemized' ? '1px solid var(--accent)' : '1px solid var(--border-medium)',
                    backgroundColor: checkMode === 'itemized' ? 'var(--accent-soft)' : 'transparent',
                    color: checkMode === 'itemized' ? 'var(--accent)' : 'var(--text-label)',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Itemized
                </button>
              </div>
            </div>

            {checkMode === 'simple' ? (
              // Simple Mode: ATM-style Amount Entry
              <div className="field-row">
                <div className="field">
                  <label>Amount</label>
                  <AtmCurrencyInput
                    value={getCurrentCheckData().amount || ''}
                    onChange={(newAmount) => updateCurrentCheckData({ amount: newAmount })}
                    isWarning={isOverdrawn}
                  />
                </div>
              </div>
            ) : (
              // Itemized Mode: Line Items Table
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label>Amount (Calculated from Line Items)</label>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: 'var(--success)',
                    padding: '4px 12px',
                    backgroundColor: 'var(--success-soft)',
                    borderRadius: '4px',
                    border: '1px solid var(--success)'
                  }}>
                    {formatCurrency(lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0))}
                  </span>
                </div>

                {/* Line Items Table */}
                <div style={{
                  border: '1px solid var(--border-medium)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  marginBottom: '8px'
                }}>
                  {lineItems.length === 0 ? (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: 'var(--text-dim)',
                      fontSize: '13px'
                    }}>
                      No line items yet. Click "Add Item" below.
                    </div>
                  ) : (
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {lineItems.map((item, index) => (
                        <div key={item.id} style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr minmax(120px, 140px) auto',
                          gap: '8px',
                          padding: '8px',
                          borderBottom: index < lineItems.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                          alignItems: 'center',
                          backgroundColor: index % 2 === 0 ? 'var(--surface)' : 'transparent'
                        }}>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => {
                              const updated = lineItems.map(li =>
                                li.id === item.id ? { ...li, description: e.target.value } : li
                              )
                              setLineItems(updated)
                            }}
                            placeholder="Description / Invoice #"
                            style={{
                              padding: '6px 10px',
                              backgroundColor: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                              color: 'var(--text)',
                              fontSize: '13px',
                              width: '100%',
                              outline: 'none',
                              transition: 'all 0.2s'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = 'var(--border-focus)'
                              e.target.style.boxShadow = '0 0 0 2px var(--accent-soft)'
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = 'var(--border)'
                              e.target.style.boxShadow = 'none'
                            }}
                          />
                          <AtmCurrencyInput
                            value={item.amount}
                            onChange={(val) => {
                              const updated = lineItems.map(li =>
                                li.id === item.id ? { ...li, amount: val } : li
                              )
                              setLineItems(updated)
                            }}
                          />
                          <button
                            onClick={() => {
                              setLineItems(lineItems.filter(li => li.id !== item.id))
                            }}
                            title="Remove item"
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--danger)',
                              color: 'white',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '16px',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setLineItems([...lineItems, { id: nextLineItemId, description: '', amount: '' }])
                    setNextLineItemId(nextLineItemId + 1)
                  }}
                  className="btn btn-sm"
                  style={{ width: '100%' }}
                >
                  + Add Item
                </button>
              </div>
            )}
            {isOverdrawn && (
              <div className="overdraft-warning">
                ⚠️ This will overdraw your account
              </div>
            )}
            <div className="field">
              <label>Amount in Words</label>
              <input value={getCurrentCheckData().amountWords || ''} readOnly className="readonly" />
            </div>
            <div className="field">
              <label>Memo</label>
              <input
                value={getCurrentCheckData().memo || ''}
                onChange={(e) => updateCurrentCheckData({ memo: e.target.value })}
                placeholder="Optional note"
              />
            </div>

            {/* Check Number Input Field */}
            {preferences.showCheckNumber && (
              <div className="field">
                <label>Check Number</label>
                <input
                  value={getCurrentCheckData().checkNumber || activeProfile.nextCheckNumber || ''}
                  onChange={(e) => updateCurrentCheckData({ checkNumber: e.target.value })}
                  placeholder="Check #"
                />
              </div>
            )}

            {/* External/Internal Memo - Only in standard mode (not in three-up) */}
            {activeProfile?.layoutMode !== 'three_up' && (
              <>
                <div className="field">
                  <label>External Memo (Payee Copy)</label>
                  <input
                    value={getCurrentCheckData().external_memo || ''}
                    onChange={(e) => updateCurrentCheckData({ external_memo: e.target.value })}
                    placeholder="Public memo for payee stub"
                  />
                </div>
                <div className="field">
                  <label>Internal Memo (Bookkeeper Copy)</label>
                  <input
                    value={getCurrentCheckData().internal_memo || ''}
                    onChange={(e) => updateCurrentCheckData({ internal_memo: e.target.value })}
                    placeholder="Private memo for bookkeeper stub"
                  />
                </div>
              </>
            )}
            <div className="field">
              <label>Line Items / Detail</label>
              <textarea
                value={getCurrentCheckData().line_items_text || ''}
                onChange={(e) => updateCurrentCheckData({ line_items_text: e.target.value })}
                placeholder="Enter line items, one per line (e.g., Item 1 - $100.00)"
                rows="4"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  resize: 'vertical',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text)',
                  width: '100%',
                  outline: 'none',
                  padding: '8px',
                  transition: 'all 0.2s'
                }}
              />
              <small style={{ color: '#888', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                This will appear in the Line Items section on the check and Remittance Advice on stubs
              </small>
            </div>
          </div>
        </section>

        {/* Check Display Preferences */}
        {
          !preferences.adminLocked && (
            <section className="section">
              <h3>Check Display</h3>
              <div className="card">
                <div className="field">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={!!preferences.showCheckNumber}
                      onChange={(e) => {
                        const isChecked = e.target.checked
                        setPreferences(p => ({ ...p, showCheckNumber: isChecked }))
                        // In three-up mode, sync autoIncrementCheckNumbers with showCheckNumber
                        if (activeProfile?.layoutMode === 'three_up') {
                          setAutoIncrementCheckNumbers(isChecked)
                        }
                      }}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">
                      {activeProfile?.layoutMode === 'three_up' ? 'Show Check Number & Auto-increment' : 'Show Check Number'}
                    </span>
                  </label>
                </div>
                <div className="field">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={!!preferences.showDate}
                      onChange={(e) => setPreferences(p => ({ ...p, showDate: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">Show Date</span>
                  </label>
                </div>
                <div className="field">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={!!preferences.showGlOnCheck}
                      onChange={(e) => setPreferences(p => ({ ...p, showGlOnCheck: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">Show GL Code on Check</span>
                  </label>
                </div>
                <div className="field">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={!!preferences.showAddressOnCheck}
                      onChange={(e) => setPreferences(p => ({ ...p, showAddressOnCheck: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">Show Address (Window Envelope)</span>
                  </label>
                </div>
                <small style={{ color: '#888', fontSize: '11px', marginTop: '8px', display: 'block' }}>
                  {activeProfile?.layoutMode === 'three_up'
                    ? 'Toggle visibility of fields on all checks. Hide check numbers if using pre-numbered check stock.'
                    : 'Toggle visibility of fields on the check. Hide check numbers if using pre-numbered check stock.'}
                </small>
              </div>
            </section>
          )
        }

        {/* Text & Font Settings */}
        {
          !preferences.adminLocked && (
            <section className="section">
              <h3>Text Settings</h3>
              <div className="card">
                <div className="field">
                  <label>Font Family</label>
                  <select
                    value={preferences.fontFamily}
                    onChange={(e) => setPreferences(p => ({ ...p, fontFamily: e.target.value }))}
                  >
                    {AVAILABLE_FONTS.map(font => (
                      <option key={font.id} value={font.id}>{font.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Check Font Size (pt)</label>
                  <div className="field-row" style={{ gap: '8px', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="6"
                      max="20"
                      step="0.5"
                      value={preferences.checkFontSizePt}
                      onChange={(e) => setPreferences(p => ({ ...p, checkFontSizePt: parseFloat(e.target.value) }))}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      min="6"
                      max="20"
                      step="0.5"
                      value={preferences.checkFontSizePt}
                      onChange={(e) => setPreferences(p => ({ ...p, checkFontSizePt: parseFloat(e.target.value) || 12 }))}
                      style={{ width: '70px' }}
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Stub Font Size (pt)</label>
                  <div className="field-row" style={{ gap: '8px', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="6"
                      max="16"
                      step="0.5"
                      value={preferences.stubFontSizePt}
                      onChange={(e) => setPreferences(p => ({ ...p, stubFontSizePt: parseFloat(e.target.value) }))}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      min="6"
                      max="16"
                      step="0.5"
                      value={preferences.stubFontSizePt}
                      onChange={(e) => setPreferences(p => ({ ...p, stubFontSizePt: parseFloat(e.target.value) || 10 }))}
                      style={{ width: '70px' }}
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Label Size: {preferences.labelSize}px</label>
                  <input
                    type="range"
                    min="7"
                    max="14"
                    step="1"
                    value={preferences.labelSize}
                    onChange={(e) => setPreferences(p => ({ ...p, labelSize: parseInt(e.target.value) }))}
                  />
                </div>
                {/* Date Builder */}
                <div className="field">
                  <label>Date Format Builder</label>
                  <div className="field-row" style={{ gap: '8px', alignItems: 'center' }}>
                    <select
                      value={preferences.dateSlot1}
                      onChange={(e) => setPreferences(p => ({ ...p, dateSlot1: e.target.value }))}
                      title="Slot 1"
                      style={{ flex: 1 }}
                    >
                      <option value="MM">MM</option>
                      <option value="DD">DD</option>
                      <option value="YY">YY</option>
                      <option value="YYYY">YYYY</option>
                      <option value="Empty">Empty</option>
                    </select>
                    <select
                      value={preferences.dateSeparator}
                      onChange={(e) => setPreferences(p => ({ ...p, dateSeparator: e.target.value }))}
                      title="Separator"
                      style={{ width: '60px' }}
                    >
                      <option value="/">/</option>
                      <option value="-">-</option>
                      <option value=".">.</option>
                      <option value="Empty">None</option>
                    </select>
                    <select
                      value={preferences.dateSlot2}
                      onChange={(e) => setPreferences(p => ({ ...p, dateSlot2: e.target.value }))}
                      title="Slot 2"
                      style={{ flex: 1 }}
                    >
                      <option value="MM">MM</option>
                      <option value="DD">DD</option>
                      <option value="YY">YY</option>
                      <option value="YYYY">YYYY</option>
                      <option value="Empty">Empty</option>
                    </select>
                    <select
                      value={preferences.dateSeparator}
                      onChange={(e) => setPreferences(p => ({ ...p, dateSeparator: e.target.value }))}
                      title="Separator"
                      style={{ width: '60px' }}
                    >
                      <option value="/">/</option>
                      <option value="-">-</option>
                      <option value=".">.</option>
                      <option value="Empty">None</option>
                    </select>
                    <select
                      value={preferences.dateSlot3}
                      onChange={(e) => setPreferences(p => ({ ...p, dateSlot3: e.target.value }))}
                      title="Slot 3"
                      style={{ flex: 1 }}
                    >
                      <option value="MM">MM</option>
                      <option value="DD">DD</option>
                      <option value="YY">YY</option>
                      <option value="YYYY">YYYY</option>
                      <option value="Empty">Empty</option>
                    </select>
                  </div>
                  <small style={{ color: '#888', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Build your date format: Slot 1 + Sep + Slot 2 + Sep + Slot 3
                  </small>
                </div>
                <div className="field">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.useLongDate}
                      onChange={(e) => setPreferences(p => ({ ...p, useLongDate: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">Use Long Written Date</span>
                  </label>
                  <small style={{ color: '#888', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Enable for full format (e.g., "January 7, 2026"). Overrides date builder.
                  </small>
                </div>
              </div>
            </section>
          )
        }

        {/* Stub Management - Payee Copy */}
        {
          model.layout.stub1Enabled && activeProfile?.layoutMode !== 'three_up' && (
            <section className="section">
              <div className="stub-section">
                <div className="stub-header">
                  <div className="stub-title">
                    <span>Payee Copy Stub</span>
                    <span className="stub-badge">Stub 1</span>
                  </div>
                  <div className="stub-controls">
                    <button
                      className={`stub-toggle ${showStub1Labels ? 'active' : ''}`}
                      onClick={() => setShowStub1Labels(!showStub1Labels)}
                      title="Show/hide friendly field labels on check"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                        {!showStub1Labels && <line x1="1" y1="1" x2="23" y2="23" />}
                      </svg>
                      Labels
                    </button>
                    <button
                      className="btn-icon-sm danger"
                      onClick={() => ensureStub('stub1', false)}
                      title="Remove this stub"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
                <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
                  Fields auto-sync from Check Details. Edit to customize (changes above will overwrite).
                </p>
                <div className="stub-group">
                  <div className="field-row">
                    <div className="field">
                      <label>Date (Synced)</label>
                      <input
                        value={activeProfile?.layoutMode === 'three_up' ? sheetData[activeSlot]?.date : data.date}
                        readOnly
                        className="readonly"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-label)', cursor: 'pointer' }}
                        title="Date is synced from the main check"
                        onClick={() => document.querySelector('input[type="date"]')?.focus()}
                      />
                    </div>
                    <div className="field">
                      <label>Amount (Synced)</label>
                      <input
                        value={data.stub1_amount || data.amount || ''}
                        readOnly
                        className="readonly"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-label)' }}
                        title="Amount is synced from the main check"
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label>Payee</label>
                    <input
                      value={data.stub1_payee || data.payee || ''}
                      onChange={(e) => setData((p) => ({ ...p, stub1_payee: e.target.value }))}
                      placeholder="Synced from check payee"
                    />
                  </div>
                  <div className="field">
                    <label>Memo (External)</label>
                    <input
                      value={data.stub1_memo || data.external_memo || data.memo || ''}
                      onChange={(e) => setData((p) => ({ ...p, stub1_memo: e.target.value }))}
                      placeholder="Synced from external memo"
                    />
                  </div>
                </div>

                {/* Stub Preferences */}
                {!preferences.adminLocked && (
                  <div className="stub-group" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>Stub Preferences</h4>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={preferences.stub1ShowLedger}
                          onChange={(e) => setPreferences(p => ({ ...p, stub1ShowLedger: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show Ledger Snapshot</span>
                      </label>
                    </div>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={!!preferences.showAddressOnStub1}
                          onChange={(e) => setPreferences(p => ({ ...p, showAddressOnStub1: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show Address Block</span>
                      </label>
                    </div>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={preferences.stub1ShowApproved}
                          onChange={(e) => setPreferences(p => ({ ...p, stub1ShowApproved: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show Approved By</span>
                      </label>
                    </div>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={preferences.stub1ShowGLCode}
                          onChange={(e) => setPreferences(p => ({ ...p, stub1ShowGLCode: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show GL Code</span>
                      </label>
                    </div>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={preferences.stub1ShowLineItems}
                          onChange={(e) => setPreferences(p => ({ ...p, stub1ShowLineItems: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show Line Items</span>
                      </label>
                    </div>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={preferences.stub1ShowCheckNumber}
                          onChange={(e) => setPreferences(p => ({ ...p, stub1ShowCheckNumber: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show Check Number</span>
                      </label>
                    </div>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={preferences.stub1ShowDate}
                          onChange={(e) => setPreferences(p => ({ ...p, stub1ShowDate: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show Date</span>
                      </label>
                    </div>
                    <small style={{ color: '#888', fontSize: '11px', marginTop: '8px', display: 'block' }}>
                      Toggle which fields appear on the Payee Copy stub
                    </small>
                  </div>
                )}
              </div>
            </section>
          )
        }

        {/* Stub Management - Bookkeeper Copy */}
        {
          model.layout.stub2Enabled && activeProfile?.layoutMode !== 'three_up' && (
            <section className="section">
              <div className="stub-section">
                <div className="stub-header">
                  <div className="stub-title">
                    <span>Bookkeeper Copy Stub</span>
                    <span className="stub-badge">Stub 2</span>
                  </div>
                  <div className="stub-controls">
                    <button
                      className={`stub-toggle ${showStub2Labels ? 'active' : ''}`}
                      onClick={() => setShowStub2Labels(!showStub2Labels)}
                      title="Show/hide friendly field labels on check"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                        {!showStub2Labels && <line x1="1" y1="1" x2="23" y2="23" />}
                      </svg>
                      Labels
                    </button>
                    <button
                      className="btn-icon-sm danger"
                      onClick={() => ensureStub('stub2', false)}
                      title="Remove this stub"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
                <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
                  Fields auto-sync from Check Details. Ledger snapshot and admin fields are auto-generated.
                </p>
                <div className="stub-group">
                  <div className="field-row">
                    <div className="field">
                      <label>Date (Synced)</label>
                      <input
                        value={activeProfile?.layoutMode === 'three_up' ? sheetData[activeSlot]?.date : data.date}
                        readOnly
                        className="readonly"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-label)', cursor: 'pointer' }}
                        title="Date is synced from the main check"
                        onClick={() => document.querySelector('input[type="date"]')?.focus()}
                      />
                    </div>
                    <div className="field">
                      <label>Amount (Synced)</label>
                      <input
                        value={data.stub2_amount || data.amount || ''}
                        readOnly
                        className="readonly"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-label)' }}
                        title="Amount is synced from the main check"
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label>Payee</label>
                    <input
                      value={data.stub2_payee || data.payee || ''}
                      onChange={(e) => setData((p) => ({ ...p, stub2_payee: e.target.value }))}
                      placeholder="Synced from check payee"
                    />
                  </div>
                  <div className="field">
                    <label>Memo (Internal)</label>
                    <input
                      value={data.stub2_memo || data.internal_memo || data.memo || ''}
                      onChange={(e) => setData((p) => ({ ...p, stub2_memo: e.target.value }))}
                      placeholder="Synced from internal memo"
                    />
                  </div>
                </div>

                {/* Stub Preferences */}
                {!preferences.adminLocked && (
                  <div className="stub-group" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>Stub Preferences</h4>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={preferences.stub2ShowLedger}
                          onChange={(e) => setPreferences(p => ({ ...p, stub2ShowLedger: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show Ledger Snapshot</span>
                      </label>
                    </div>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={!!preferences.showAddressOnStub2}
                          onChange={(e) => setPreferences(p => ({ ...p, showAddressOnStub2: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show Address Block</span>
                      </label>
                    </div>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={preferences.stub2ShowApproved}
                          onChange={(e) => setPreferences(p => ({ ...p, stub2ShowApproved: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show Approved By</span>
                      </label>
                    </div>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={preferences.stub2ShowGLCode}
                          onChange={(e) => setPreferences(p => ({ ...p, stub2ShowGLCode: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show GL Code</span>
                      </label>
                    </div>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={preferences.stub2ShowLineItems}
                          onChange={(e) => setPreferences(p => ({ ...p, stub2ShowLineItems: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show Line Items</span>
                      </label>
                    </div>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={preferences.stub2ShowCheckNumber}
                          onChange={(e) => setPreferences(p => ({ ...p, stub2ShowCheckNumber: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show Check Number</span>
                      </label>
                    </div>
                    <div className="field">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={preferences.stub2ShowDate}
                          onChange={(e) => setPreferences(p => ({ ...p, stub2ShowDate: e.target.checked }))}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show Date</span>
                      </label>
                    </div>
                    <small style={{ color: '#888', fontSize: '11px', marginTop: '8px', display: 'block' }}>
                      Toggle which fields appear on the Bookkeeper Copy stub
                    </small>
                  </div>
                )}
              </div>
            </section>
          )
        }

        {/* Template - compact */}
        {
          !preferences.adminLocked && (
            <section className="section">
              <h3>Check Template</h3>
              <div className="card">
                <button className="btn-template" onClick={handleSelectTemplate}>
                  {templateName ? (
                    <>
                      <span className="template-icon">🖼</span>
                      <span className="template-name">{templateName}</span>
                      <span className="template-change">Change</span>
                    </>
                  ) : (
                    <>
                      <span className="template-icon">+</span>
                      <span>Load check template image</span>
                    </>
                  )}
                </button>
                {templateLoadError && (
                  <div className="error-msg">{templateLoadError}</div>
                )}
                {templateDecodeError && (
                  <div className="error-msg">{templateDecodeError}</div>
                )}
                {/* Opacity slider - only show when template is loaded */}
                {templateName && (
                  <div className="field" style={{ marginTop: '12px' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Opacity</span>
                      <span style={{ fontSize: '12px', color: '#888' }}>{Math.round((model.template.opacity ?? 0) * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={model.template.opacity ?? 0}
                      onChange={(e) => setModel((m) => ({ ...m, template: { ...m.template, opacity: clamp(parseFloat(e.target.value) || 0, 0, 1) } }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}
              </div>
            </section>
          )
        }

        {/* Advanced Settings - Collapsible */}
        {
          !preferences.adminLocked && (
            <section className="section">
              <button className="accordion-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
                <span>Advanced Settings</span>
                <ChevronIcon open={showAdvanced} />
              </button>

              {showAdvanced && (
                <div className="accordion-content">
                  {/* Calibration */}
                  <div className="card">
                    <h4>Printer Calibration</h4>
                    <p className="hint">
                      Compensates for physical printer margins. Use negative numbers to shift Left/Up, positive to shift Right/Down.
                      Most laser printers need X = -0.25in.
                    </p>
                    <div className="field-row">
                      <div className="field">
                        <label>Global X Offset (in)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="-1.0"
                          max="1.0"
                          value={model.placement.offsetXIn}
                          onChange={(e) => setModel((m) => ({ ...m, placement: { ...m.placement, offsetXIn: parseFloat(e.target.value) || 0 } }))}
                        />
                      </div>
                      <div className="field">
                        <label>Global Y Offset (in)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="-1.0"
                          max="1.0"
                          value={model.placement.offsetYIn}
                          onChange={(e) => setModel((m) => ({ ...m, placement: { ...m.placement, offsetYIn: parseFloat(e.target.value) || 0 } }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Layout */}
                  <div className="card">
                    <h4>Check Dimensions</h4>
                    <div className="field-row">
                      <div className="field">
                        <label>Width (in)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={model.layout.widthIn}
                          onChange={(e) => setModel((m) => ({ ...m, layout: { ...m.layout, widthIn: clamp(parseFloat(e.target.value) || 0, 4, 8.5) } }))}
                        />
                      </div>
                      <div className="field">
                        <label>Height (in)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={model.layout.checkHeightIn}
                          onChange={(e) => setModel((m) => ({ ...m, layout: { ...m.layout, checkHeightIn: clamp(parseFloat(e.target.value) || 0, 1, 6) } }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stub Height Adjustments - only show if stubs are enabled */}
                  {(model.layout.stub1Enabled || model.layout.stub2Enabled) && (
                    <div className="card">
                      <h4>Stub Height Adjustments</h4>
                      {model.layout.stub1Enabled && (
                        <div className="field">
                          <label>Payee Copy Stub Height (in)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.5"
                            value={model.layout.stub1HeightIn}
                            onChange={(e) => setModel((m) => ({ ...m, layout: { ...m.layout, stub1HeightIn: clamp(parseFloat(e.target.value) || 0, 0.5, 8) } }))}
                          />
                        </div>
                      )}
                      {model.layout.stub2Enabled && (
                        <div className="field" style={{ marginTop: model.layout.stub1Enabled ? 12 : 0 }}>
                          <label>Bookkeeper Copy Stub Height (in)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.5"
                            value={model.layout.stub2HeightIn}
                            onChange={(e) => setModel((m) => ({ ...m, layout: { ...m.layout, stub2HeightIn: clamp(parseFloat(e.target.value) || 0, 0.5, 8) } }))}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Zoom */}
                  <div className="card">
                    <h4>Preview Zoom</h4>
                    <div className="field">
                      <input
                        type="range"
                        min="0.4"
                        max="1.5"
                        step="0.05"
                        value={model.view.zoom}
                        onChange={(e) => setModel((m) => ({ ...m, view: { ...m.view, zoom: parseFloat(e.target.value) } }))}
                      />
                      <div className="range-value">{Math.round(model.view.zoom * 100)}%</div>
                    </div>
                  </div>

                  {/* Reset */}
                  <button className="btn danger full-width" onClick={resetModel}>
                    Reset All Settings
                  </button>
                </div>
              )}
            </section>
          )
        }

        {/* Selected Field - only in edit mode - MOVED OUTSIDE Advanced Settings */}
        {editMode && (
          <section className="section">
            <div className="card">
              <h4>Selected Field</h4>
              {selected.length === 0 ? (
                <div style={{ color: 'var(--text-label)', fontStyle: 'italic', padding: '8px 0' }}>No field selected</div>
              ) : selected.length > 1 ? (
                <div>
                  <div style={{ marginBottom: '12px' }}>{selected.length} fields selected</div>

                  <div className="field" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    {/* Bold/Italic are now in floating toolbar */}
                  </div>

                  <button className="btn ghost small full-width" onClick={() => setSelected([])}>Clear Selection</button>
                </div>
              ) : (
                (() => {
                  const key = selected[0]
                  const f = activeProfile?.layoutMode === 'three_up'
                    ? model.slotFields?.[activeSlot]?.[key]
                    : model.fields[key]

                  if (!f) return <div>Field not found</div>

                  return (
                    <>
                      <div className="field">
                        <label>Field</label>
                        <select value={key} onChange={(e) => setSelected([e.target.value])}>
                          {Object.keys(activeProfile?.layoutMode === 'three_up' ? model.slotFields?.[activeSlot] || {} : model.fields).map((k) => {
                            const field = activeProfile?.layoutMode === 'three_up' ? model.slotFields?.[activeSlot]?.[k] : model.fields[k]
                            return <option value={k} key={k}>{field?.label || k}</option>
                          })}
                        </select>
                      </div>
                      <div className="field-row">
                        <div className="field">
                          <label>X (in)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={f.x}
                            onChange={(e) => setField(key, { x: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="field">
                          <label>Y (in)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={f.y}
                            onChange={(e) => setField(key, { y: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="field-row">
                        <div className="field">
                          <label>Width (in)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={f.w}
                            onChange={(e) => setField(key, { w: parseFloat(e.target.value) || 0.2 })}
                          />
                        </div>
                        <div className="field">
                          <label>Height (in)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={f.h}
                            onChange={(e) => setField(key, { h: parseFloat(e.target.value) || 0.18 })}
                          />
                        </div>
                      </div>
                      <div className="field">
                        <label>Font Size (in)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={f.fontIn}
                          onChange={(e) => setField(key, { fontIn: clamp(parseFloat(e.target.value) || 0.2, 0.12, 0.6) })}
                        />
                      </div>
                      <div className="field" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Bold/Italic are now in floating toolbar */}
                      </div>
                    </>
                  )
                })()
              )}
            </div>
          </section>
        )}

        {/* End of Scrollable Content Area */}
      </div>

      {/* Feedback - Sticky Footer */}
      <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            onClick={() => window.cs2?.openExternal?.('https://github.com/luminary-craft/CheckSpree/issues/new?labels=bug')}
            title="Report Bug"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-medium)',
              borderRadius: '6px',
              padding: '8px 16px',
              color: 'var(--text-label)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--text-dim)'; e.currentTarget.style.color = 'var(--text-bright)' }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.color = 'var(--text-label)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8l0 4" />
              <path d="M12 16l.01 0" />
            </svg>
            Bug
          </button>
          <button
            onClick={() => window.cs2?.openExternal?.('https://github.com/luminary-craft/CheckSpree/issues/new?labels=enhancement')}
            title="Request Feature"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-medium)',
              borderRadius: '6px',
              padding: '8px 16px',
              color: 'var(--text-label)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--text-dim)'; e.currentTarget.style.color = 'var(--text-bright)' }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.color = 'var(--text-label)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M12 2a7 7 0 0 0-4.607 12.268c.644.598 1.107 1.398 1.107 2.232V18a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-1.5c0-.834.463-1.634 1.107-2.232A7 7 0 0 0 12 2z" />
            </svg>
            Idea
          </button>
        </div>
      </div>
    </div >
  )
}
