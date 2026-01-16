import React from 'react'
import { formatCurrency, formatDate } from '../utils/helpers'

// Trash Icon Component
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

/**
 * Sidebar Component - Displays recent check/deposit activity for the active ledger
 * 
 * Designed to work with the useLedger hook. Parent component should pass down
 * the necessary data and callbacks.
 * 
 * @param {Object} props
 * @param {Array} props.checkHistory - Array of transaction entries (checks & deposits)
 * @param {string} props.activeLedgerId - ID of the currently active ledger
 * @param {string} props.activeLedgerName - Name of the currently active ledger (for display)
 * @param {Function} props.onFillFromHistory - Callback when user clicks a check: (entry) => void
 * @param {Function} props.onDeleteEntry - Callback to delete an entry: (entryId) => void
 * @param {Function} props.onViewFullHistory - Callback to open full history modal
 * @param {number} props.maxRecentItems - Maximum number of recent items to show (default: 2)
 */
export default function Sidebar({
    checkHistory = [],
    activeLedgerId,
    activeLedgerName = '',
    onFillFromHistory,
    onDeleteEntry,
    onViewFullHistory,
    maxRecentItems = 2
}) {
    // Filter transactions for active ledger
    const ledgerTransactions = checkHistory.filter(entry => entry.ledgerId === activeLedgerId)
    const recentTransactions = ledgerTransactions.slice(0, maxRecentItems)

    return (
        <div style={{ borderTop: '1px solid #334155', paddingTop: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>
                Recent Activity
                {activeLedgerName && (
                    <span style={{ fontWeight: '400', opacity: 0.7, marginLeft: '6px' }}>
                        · {activeLedgerName}
                    </span>
                )}
            </h4>

            {ledgerTransactions.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '20px 12px' }}>
                    No transactions yet
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {recentTransactions.map(entry => {
                        const isDeposit = entry.type === 'deposit'
                        const isClickable = !isDeposit

                        return (
                            <div
                                key={entry.id}
                                onClick={() => isClickable && onFillFromHistory(entry)}
                                title={isClickable ? 'Click to copy this check to the form' : 'Deposits cannot be copied'}
                                style={{
                                    position: 'relative',
                                    padding: '10px 40px 10px 12px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    cursor: isClickable ? 'pointer' : 'default',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (isClickable) {
                                        e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'
                                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)'
                                        e.currentTarget.style.transform = 'translateX(2px)'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                                    e.currentTarget.style.transform = 'translateX(0)'
                                }}
                            >
                                {/* Transaction Type Badge */}
                                {isDeposit && (
                                    <div style={{
                                        fontSize: '9px',
                                        fontWeight: '600',
                                        color: '#10b981',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        marginBottom: '4px'
                                    }}>
                                        Deposit
                                    </div>
                                )}

                                {/* Payee/Description */}
                                <div style={{ marginBottom: '4px' }}>
                                    <div style={{
                                        fontWeight: '500',
                                        color: '#e2e8f0',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {entry.payee || 'Untitled'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                        {formatDate(entry.date)}
                                        {entry.checkNumber && !isDeposit && (
                                            <span style={{ marginLeft: '6px', opacity: 0.7 }}>
                                                #{entry.checkNumber}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Amount */}
                                <div style={{
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    color: isDeposit ? '#10b981' : '#f87171',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {isDeposit ? '+' : '-'}{formatCurrency(entry.amount)}
                                </div>

                                {/* Delete Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDeleteEntry(entry.id)
                                    }}
                                    title={`Delete ${isDeposit ? 'deposit' : 'check'} and restore balance`}
                                    style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        color: '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'color 0.2s ease',
                                        borderRadius: '4px'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = '#ef4444'
                                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = '#64748b'
                                        e.currentTarget.style.backgroundColor = 'transparent'
                                    }}
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* View Full History Button */}
            {ledgerTransactions.length > 0 && (
                <button
                    className="btn btn-sm full-width"
                    onClick={onViewFullHistory}
                    style={{
                        fontSize: '12px',
                        padding: '8px 12px'
                    }}
                >
                    View Full History ({ledgerTransactions.length})
                </button>
            )}
        </div>
    )
}

