import React from 'react'
import AtmCurrencyInput from './AtmCurrencyInput.jsx'

// Utility: Format currency
function formatCurrency(amount) {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) return '$0.00'
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Utility: Get local date string (YYYY-MM-DD)
function getLocalDateString() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// Icon Components
function ChevronIcon({ open }) {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
            style={{ transition: 'transform 200ms ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function PlusIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    )
}

function PencilIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    )
}

function TrashIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
                d="M1.5 3.5H12.5M5.5 1.5H8.5M5.5 6V10.5M8.5 6V10.5M2.5 3.5L3 11.5C3 12.0523 3.44772 12.5 4 12.5H10C10.5523 12.5 11 12.0523 11 11.5L11.5 3.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function CheckIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

/**
 * LedgerPanel Component - Ledger selection, balance display, and management
 * 
 * @param {Object} props
 * @param {Array} props.ledgers - Array of ledger objects
 * @param {string} props.activeLedgerId - ID of currently active ledger
 * @param {Object} props.activeLedger - Active ledger object
 * @param {number} props.hybridBalance - Current balance
 * @param {number} props.projectedBalance - Projected balance after pending check
 * @param {number} props.pendingAmount - Amount of pending check
 * @param {boolean} props.isOverdrawn - Whether balance will be negative
 * @param {Object} props.preferences - User preferences object
 * @param {boolean} props.editingBalance - Whether balance is being edited
 * @param {string} props.tempBalance - Temporary balance value during editing
 * @param {boolean} props.showLedgerManager - Whether ledger manager dropdown is open
 * @param {string|null} props.editingLedgerName - ID of ledger being edited, or null
 * @param {Function} props.onActiveLedgerChange - Callback when active ledger changes
 * @param {Function} props.onShowLedgerManagerToggle - Callback to toggle ledger manager
 * @param {Function} props.onEditingLedgerNameChange - Callback when editing ledger name
 * @param {Function} props.onRenameLedger - Callback to rename ledger
 * @param {Function} props.onDeleteLedger - Callback to delete ledger
 * @param {Function} props.onCreateNewLedger - Callback to create new ledger
 * @param {Function} props.onLedgersChange - Callback when ledgers array changes
 * @param {Function} props.onPreferencesChange - Callback when preferences change
 * @param {Function} props.onEditingBalanceChange - Callback when editing balance state changes
 * @param {Function} props.onTempBalanceChange - Callback when temp balance changes
 * @param {Function} props.onUpdateBalance - Callback to save balance
 * @param {Function} props.onShowDeposit - Callback to show deposit modal
 * @param {Function} props.onShowHistory - Callback to show history modal
 */
export default function LedgerPanel({
    ledgers,
    activeLedgerId,
    activeLedger,
    hybridBalance,
    projectedBalance,
    pendingAmount,
    isOverdrawn,
    preferences,
    editingBalance,
    tempBalance,
    showLedgerManager,
    editingLedgerName,
    onActiveLedgerChange,
    onShowLedgerManagerToggle,
    onEditingLedgerNameChange,
    onRenameLedger,
    onDeleteLedger,
    onCreateNewLedger,
    onLedgersChange,
    onPreferencesChange,
    onEditingBalanceChange,
    onTempBalanceChange,
    onUpdateBalance,
    onShowDeposit,
    onShowHistory
}) {
    return (
        <>
            {/* Active Ledger Selector */}
            <div style={{ marginBottom: '16px' }}>
                <div
                    className="ledger-selector-trigger"
                    onClick={() => onShowLedgerManagerToggle(!showLedgerManager)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        userSelect: 'none'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Ledger:</span>
                        <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{activeLedger?.name || 'Select Ledger'}</span>
                    </div>
                    <ChevronIcon open={showLedgerManager} />
                </div>

                {/* Ledger Manager */}
                {showLedgerManager && (
                    <div className="ledger-dropdown-list" style={{
                        marginTop: '8px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}>
                        {ledgers.map(l => {
                            const isEditing = editingLedgerName === l.id
                            const canEdit = !preferences.adminLocked || preferences.allowUserLedgerManagement

                            return (
                                <div key={l.id} style={{ borderBottom: '1px solid #334155' }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 12px',
                                            backgroundColor: l.id === activeLedgerId ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                            borderLeft: l.id === activeLedgerId ? '3px solid #3b82f6' : '3px solid transparent'
                                        }}
                                    >
                                        <div
                                            onClick={() => {
                                                onActiveLedgerChange(l.id)
                                                onShowLedgerManagerToggle(false)
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
                                                        onEditingLedgerNameChange(isEditing ? null : l.id)
                                                    }}
                                                    title="Edit ledger settings"
                                                    style={{ color: isEditing ? '#3b82f6' : '#94a3b8' }}
                                                >
                                                    <PencilIcon />
                                                </button>
                                                {ledgers.length > 1 && (!preferences.adminLocked || preferences.allowUserLedgerManagement) && (
                                                    <button
                                                        className="btn-icon danger"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onDeleteLedger(l.id)
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
                                            borderTop: '1px solid #334155'
                                        }}>
                                            {/* Name Edit */}
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Ledger Name</label>
                                                <input
                                                    className="profile-name-input"
                                                    defaultValue={l.name}
                                                    autoFocus
                                                    onBlur={(e) => {
                                                        if (e.target.value.trim()) onRenameLedger(l.id, e.target.value.trim(), false)
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                                            onRenameLedger(l.id, e.target.value.trim())
                                                            onEditingLedgerNameChange(null)
                                                        } else if (e.key === 'Escape') {
                                                            onEditingLedgerNameChange(null)
                                                        }
                                                    }}
                                                    style={{ width: '100%' }}
                                                />
                                            </div>

                                            {/* Initial Balance - ATM-style input */}
                                            <div style={{ marginBottom: '12px' }} onClick={(e) => e.stopPropagation()}>
                                                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Initial Balance</label>
                                                <div className="input-prefix">
                                                    <span>$</span>
                                                    <input
                                                        key={`balance-input-${l.id}`}
                                                        type="text"
                                                        inputMode="numeric"
                                                        defaultValue={l.startingBalance ? (l.startingBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                                        placeholder="0.00"
                                                        onFocus={(e) => e.target.select()}
                                                        onKeyDown={(e) => {
                                                            const isAllSelected = e.target.selectionStart === 0 && e.target.selectionEnd === e.target.value.length
                                                            const currentVal = parseFloat(e.target.value.replace(/,/g, '')) || 0
                                                            let cents = Math.round(currentVal * 100)

                                                            if (e.key === 'Enter') {
                                                                e.target.blur()
                                                                return
                                                            } else if (e.key === 'Escape') {
                                                                onEditingLedgerNameChange(null)
                                                                return
                                                            } else if (e.key === 'Backspace') {
                                                                e.preventDefault()
                                                                if (isAllSelected) {
                                                                    cents = 0
                                                                } else {
                                                                    cents = Math.floor(cents / 10)
                                                                }
                                                            } else if (e.key >= '0' && e.key <= '9') {
                                                                e.preventDefault()
                                                                if (isAllSelected) {
                                                                    cents = parseInt(e.key, 10)
                                                                } else if (cents < 99999999999) {
                                                                    cents = (cents * 10) + parseInt(e.key, 10)
                                                                }
                                                            } else if (!['Tab', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(e.key)) {
                                                                e.preventDefault()
                                                                return
                                                            } else {
                                                                return
                                                            }

                                                            const newVal = cents / 100
                                                            e.target.value = newVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                            onLedgersChange(ledgers.map(ledger =>
                                                                ledger.id === l.id ? { ...ledger, startingBalance: newVal } : ledger
                                                            ))
                                                        }}
                                                        onBlur={(e) => {
                                                            const val = parseFloat(e.target.value.replace(/,/g, '')) || 0
                                                            e.target.value = val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            textAlign: 'right'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {(!preferences.adminLocked || preferences.allowUserLedgerManagement) && (
                            <button
                                className="btn ghost full-width"
                                onClick={onCreateNewLedger}
                                style={{ borderRadius: 0, borderTop: '1px solid #334155', justifyContent: 'center', padding: '10px' }}
                            >
                                <PlusIcon /> New Ledger
                            </button>
                        )}

                        {!preferences.adminLocked && (
                            <div style={{
                                padding: '12px',
                                borderTop: '1px solid #334155',
                                backgroundColor: 'rgba(0, 0, 0, 0.2)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: 500 }}>User Management</div>
                                        <div style={{ fontSize: '10px', color: '#64748b' }}>Allow standard users to manage ledgers</div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={preferences.allowUserLedgerManagement}
                                            onChange={(e) => {
                                                onPreferencesChange({ ...preferences, allowUserLedgerManagement: !preferences.allowUserLedgerManagement })
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
            <div style={{ borderTop: '1px solid #334155', paddingTop: '16px', marginBottom: '16px' }}>
                {editingBalance ? (
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center'
                    }}>
                        <div style={{ flexGrow: 1 }}>
                            <AtmCurrencyInput
                                value={tempBalance}
                                onChange={onTempBalanceChange}
                                autoFocus
                            />
                        </div>
                        <button
                            className="btn-icon"
                            onClick={onUpdateBalance}
                            title="Save balance"
                            style={{
                                flexShrink: 0,
                                width: '40px',
                                height: '40px',
                                padding: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#10b981',
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
                                onClick={() => onShowHistory()}
                                style={{
                                    cursor: 'pointer',
                                    fontSize: '32px',
                                    fontWeight: '700',
                                    color: hybridBalance < 0 ? '#ef4444' : '#10b981'
                                }}
                            >
                                {formatCurrency(hybridBalance)}
                            </div>
                            <button
                                onClick={() => onShowDeposit()}
                                className="btn-icon"
                                title="Add Deposit/Adjustment"
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: '#10b981',
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
                            {(!preferences.adminLocked || preferences.allowUserLedgerManagement) ? 'Click to edit starting balance' : 'Click to view • Use + to adjust'}
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
                        border: isOverdrawn ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#e2e8f0'
                    }}>
                        <span>After this check:</span>
                        <span style={{ color: isOverdrawn ? '#f87171' : '#34d399', fontWeight: '600' }}>
                            {formatCurrency(projectedBalance)}
                        </span>
                    </div>
                )}
            </div>
        </>
    )
}
