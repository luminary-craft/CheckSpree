import React, { useState, useMemo } from 'react'
import { formatAmount, parseAmount } from '../../utils/helpers'

/**
 * ReconciliationPanel — Bank Reconciliation View.
 *
 * Helps users reconcile their check records against bank statements.
 * Users enter the bank statement ending balance, then mark individual
 * checks as cleared. The panel shows outstanding checks and the
 * reconciled balance difference.
 *
 * @param {Object} props
 * @param {Array} props.checkHistory - Full check history
 * @param {Function} props.onClose - Close the panel
 * @param {Function} props.showToast - Display a toast notification
 */
export function ReconciliationPanel({ checkHistory, onClose, showToast }) {
    const [statementBalance, setStatementBalance] = useState('')
    const [clearedIds, setClearedIds] = useState(new Set())
    const [searchQuery, setSearchQuery] = useState('')

    // Active (non-voided) checks sorted newest first
    const activeChecks = useMemo(() =>
        (checkHistory || [])
            .filter(c => c.status !== 'void')
            .sort((a, b) => new Date(b.date || b.printedAt) - new Date(a.date || a.printedAt)),
        [checkHistory]
    )

    // Filter by search query
    const filteredChecks = useMemo(() => {
        if (!searchQuery.trim()) return activeChecks
        const q = searchQuery.toLowerCase()
        return activeChecks.filter(c =>
            (c.checkNumber && String(c.checkNumber).includes(q)) ||
            (c.payee && c.payee.toLowerCase().includes(q))
        )
    }, [activeChecks, searchQuery])

    // Calculate reconciliation totals
    const reconciliation = useMemo(() => {
        const stmtBal = parseFloat(statementBalance) || 0
        let clearedTotal = 0
        let outstandingTotal = 0
        let outstandingCount = 0

        for (const check of activeChecks) {
            const amount = parseAmount(check.amount)
            if (clearedIds.has(check.checkNumber || check.id)) {
                clearedTotal += amount
            } else {
                outstandingTotal += amount
                outstandingCount++
            }
        }

        return {
            statementBalance: stmtBal,
            clearedTotal,
            outstandingTotal,
            outstandingCount,
            clearedCount: clearedIds.size,
            adjustedBalance: stmtBal - outstandingTotal,
            difference: stmtBal - clearedTotal
        }
    }, [activeChecks, clearedIds, statementBalance])

    /** Toggle a check's cleared status */
    const toggleCleared = (checkKey) => {
        setClearedIds(prev => {
            const next = new Set(prev)
            if (next.has(checkKey)) {
                next.delete(checkKey)
            } else {
                next.add(checkKey)
            }
            return next
        })
    }

    /** Mark all visible checks as cleared */
    const clearAll = () => {
        const allKeys = filteredChecks.map(c => c.checkNumber || c.id)
        setClearedIds(prev => new Set([...prev, ...allKeys]))
    }

    /** Unmark all checks */
    const uncheckAll = () => {
        setClearedIds(new Set())
    }

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content" style={{ maxWidth: '700px', width: '95%', maxHeight: '85vh' }}>
                {/* Header */}
                <div className="modal-header">
                    <h2>🏦 Bank Reconciliation</h2>
                    <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Statement balance input */}
                    <div className="panel-field">
                        <label className="panel-label">Bank Statement Ending Balance</label>
                        <input
                            type="number"
                            className="panel-input"
                            value={statementBalance}
                            onChange={(e) => setStatementBalance(e.target.value)}
                            placeholder="Enter balance from bank statement"
                            style={{ maxWidth: '240px', fontWeight: 600 }}
                        />
                    </div>

                    {/* Reconciliation summary cards */}
                    <div className="panel-grid-3">
                        <div className="stat-card">
                            <div className="stat-card-label">Cleared ({reconciliation.clearedCount})</div>
                            <div className="stat-card-value success">{formatAmount(reconciliation.clearedTotal)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-label">Outstanding ({reconciliation.outstandingCount})</div>
                            <div className="stat-card-value warning">{formatAmount(reconciliation.outstandingTotal)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-label">Difference</div>
                            <div className={`stat-card-value ${Math.abs(reconciliation.difference) < 0.01 ? 'success' : 'danger'}`}>
                                {formatAmount(reconciliation.difference)}
                            </div>
                        </div>
                    </div>

                    {/* Search + bulk actions */}
                    <div className="panel-row" style={{ marginBottom: '12px' }}>
                        <input
                            type="text"
                            className="panel-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by check # or payee..."
                            style={{ flex: 1 }}
                        />
                        <button className="btn btn-sm" onClick={clearAll}>Clear All</button>
                        <button className="btn btn-sm" onClick={uncheckAll}>Uncheck All</button>
                    </div>

                    {/* Check list */}
                    <div className="panel-list-scroll" style={{ maxHeight: '300px' }}>
                        {filteredChecks.length === 0 ? (
                            <div className="panel-empty">No checks to reconcile</div>
                        ) : (
                            filteredChecks.map((check, i) => {
                                const key = check.checkNumber || check.id || `check-${i}`
                                const isCleared = clearedIds.has(key)
                                return (
                                    <label
                                        key={key}
                                        className={`panel-list-item clickable ${isCleared ? 'cleared' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isCleared}
                                            onChange={() => toggleCleared(key)}
                                            style={{ flexShrink: 0 }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div className="panel-list-primary" style={{ textDecoration: isCleared ? 'line-through' : 'none', color: isCleared ? 'var(--text-dim)' : undefined }}>
                                                <span>#{check.checkNumber || '—'}</span>
                                                <span style={{ fontWeight: 400, marginLeft: '8px' }}>{check.payee || 'No payee'}</span>
                                            </div>
                                            <div className="panel-list-secondary">
                                                {new Date(check.date || check.printedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="panel-list-amount" style={{
                                            textDecoration: isCleared ? 'line-through' : 'none',
                                            color: isCleared ? 'var(--text-dim)' : undefined
                                        }}>
                                            {formatAmount(parseAmount(check.amount))}
                                        </div>
                                    </label>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    )
}
