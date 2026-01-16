import React from 'react'

// Utility: Format currency (assumes amount is a number or numeric string)
function formatCurrency(amount) {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) return '$0.00'
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Utility: Format date
function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

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
 * Sidebar Component - Displays recent check activity for the active ledger
 * 
 * @param {Object} props
 * @param {Array} props.checkHistory - Array of check history entries
 * @param {string} props.activeLedgerId - ID of the currently active ledger
 * @param {Function} props.onFillFromHistory - Callback when user clicks a check item: (entry) => void
 * @param {Function} props.onDeleteEntry - Callback to delete an entry: (entryId) => void
 * @param {Function} props.onViewFullHistory - Callback to view full history modal
 */
export default function Sidebar({
    checkHistory = [],
    activeLedgerId,
    onFillFromHistory,
    onDeleteEntry,
    onViewFullHistory
}) {
    // Filter checks for active ledger
    const ledgerChecks = checkHistory.filter(c => c.ledgerId === activeLedgerId)
    const recentChecks = ledgerChecks.slice(0, 2) // Show only the 2 most recent

    return (
        <div style={{ borderTop: '1px solid #334155', paddingTop: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>
                Recent Activity
            </h4>

            {ledgerChecks.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '12px 0' }}>
                    No recent activity
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {recentChecks.map(entry => (
                        <div
                            key={entry.id}
                            onClick={() => entry.type !== 'deposit' && onFillFromHistory(entry)}
                            title={entry.type !== 'deposit' ? 'Click to fill form with this check' : 'Deposits cannot be copied'}
                            style={{
                                position: 'relative',
                                padding: '8px 40px 8px 10px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '6px',
                                fontSize: '13px',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                cursor: entry.type !== 'deposit' ? 'pointer' : 'default',
                                transition: 'background-color 0.15s, border-color 0.15s'
                            }}
                            onMouseEnter={(e) => {
                                if (entry.type !== 'deposit') {
                                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'
                                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)'
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                            }}
                        >
                            <div style={{ marginBottom: '4px' }}>
                                <div style={{ fontWeight: '500', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {entry.payee}
                                </div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                    {formatDate(entry.date)}
                                </div>
                            </div>
                            <div style={{ fontWeight: '600', color: entry.type === 'deposit' ? '#10b981' : '#f87171', whiteSpace: 'nowrap' }}>
                                {entry.type === 'deposit' ? '+' : '-'}{formatCurrency(entry.amount)}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id) }}
                                title="Delete and restore amount"
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    color: '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                            >
                                <TrashIcon />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* View History Button */}
            {ledgerChecks.length > 0 && (
                <button
                    className="btn btn-sm full-width"
                    onClick={onViewFullHistory}
                >
                    View Ledger History ({ledgerChecks.length})
                </button>
            )}
        </div>
    )
}
