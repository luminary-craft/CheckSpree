import React from 'react'
import { formatCurrency, formatDate } from '../utils/helpers'

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
 * Sidebar_Glass Component - Restored "Glass" aesthetic
 */
export default function Sidebar_Glass({
    checkHistory = [],
    activeLedgerId,
    activeLedgerName = '',
    onFillFromHistory,
    onDeleteEntry,
    onViewFullHistory,
    maxRecentItems = 3
}) {
    const ledgerTransactions = checkHistory.filter(entry => entry.ledgerId === activeLedgerId)
    const recentTransactions = ledgerTransactions.slice(0, maxRecentItems)

    return (
        <div className="section-main">
            <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Recent Activity
                {activeLedgerName && (
                    <span style={{ fontWeight: '400', opacity: 0.5, fontSize: '10px' }}>
                        {activeLedgerName}
                    </span>
                )}
            </h2>

            {ledgerTransactions.length === 0 ? (
                <div className="history-empty">
                    No transactions yet
                </div>
            ) : (
                <div className="history-list">
                    {recentTransactions.map(entry => {
                        const isDeposit = entry.type === 'deposit'
                        const isClickable = !isDeposit

                        return (
                            <div
                                key={entry.id}
                                className="history-item"
                                onClick={() => isClickable && onFillFromHistory(entry)}
                                style={{ cursor: isClickable ? 'pointer' : 'default' }}
                            >
                                <div className="history-main">
                                    <span className="history-payee">
                                        {entry.payee || 'Untitled'}
                                    </span>
                                    <span className={`history-amount ${isDeposit ? 'deposit' : ''}`} style={{ color: isDeposit ? 'var(--success)' : 'var(--danger)' }}>
                                        {isDeposit ? '+' : '-'}{formatCurrency(entry.amount)}
                                    </span>
                                </div>

                                <div className="history-meta">
                                    <span>{formatDate(entry.date)}</span>
                                    {entry.checkNumber && !isDeposit && (
                                        <span>#{entry.checkNumber}</span>
                                    )}
                                </div>

                                <button
                                    className="history-delete"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDeleteEntry(entry.id)
                                    }}
                                    title="Delete transaction"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            {ledgerTransactions.length > 0 && (
                <button
                    className="btn ghost full-width"
                    onClick={onViewFullHistory}
                    style={{ marginTop: '12px', fontSize: '11px' }}
                >
                    View Full History ({ledgerTransactions.length})
                </button>
            )}

            <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', gap: '8px' }}>
                <button
                    className="btn ghost full-width"
                    style={{ fontSize: '11px', opacity: 0.7 }}
                    onClick={() => window.open('https://github.com/luminary-craft/CheckSpree/issues/new?labels=bug&template=bug_report.md', '_blank')}
                >
                    Report Bug
                </button>
                <button
                    className="btn ghost full-width"
                    style={{ fontSize: '11px', opacity: 0.7 }}
                    onClick={() => window.open('https://github.com/luminary-craft/CheckSpree/issues/new?labels=enhancement&template=feature_request.md', '_blank')}
                >
                    Request Feature
                </button>
            </div>
        </div>
    )
}
