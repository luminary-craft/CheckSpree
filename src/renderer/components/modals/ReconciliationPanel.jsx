import React, { useState, useMemo } from 'react'

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

    // Format currency
    const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    // Parse amount from check data
    const parseAmount = (amount) => {
        const num = typeof amount === 'string'
            ? parseFloat(amount.replace(/[^0-9.-]/g, ''))
            : (amount || 0)
        return isNaN(num) ? 0 : num
    }

    // Active (non-voided) checks
    const activeChecks = useMemo(() =>
        (checkHistory || [])
            .filter(c => c.status !== 'void')
            .sort((a, b) => new Date(b.date || b.printedAt) - new Date(a.date || a.printedAt)),
        [checkHistory]
    )

    // Filter by search
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

    /**
     * Toggle a check's cleared status.
     */
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

    /**
     * Mark all visible checks as cleared.
     */
    const clearAll = () => {
        const allKeys = filteredChecks.map(c => c.checkNumber || c.id)
        setClearedIds(prev => new Set([...prev, ...allKeys]))
    }

    /**
     * Unmark all checks.
     */
    const uncheckAll = () => {
        setClearedIds(new Set())
    }

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content" style={{ maxWidth: '700px', width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div className="modal-header" style={{ flexShrink: 0 }}>
                    <h3 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '18px' }}>
                        🏦 Bank Reconciliation
                    </h3>
                    <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
                </div>

                {/* Statement balance input */}
                <div style={{ marginBottom: '16px', flexShrink: 0 }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-label)', display: 'block', marginBottom: '4px' }}>
                        Bank Statement Ending Balance
                    </label>
                    <input
                        type="number"
                        value={statementBalance}
                        onChange={(e) => setStatementBalance(e.target.value)}
                        placeholder="Enter balance from bank statement"
                        style={{
                            width: '200px',
                            padding: '8px 10px',
                            backgroundColor: 'var(--surface-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text)',
                            fontSize: '14px',
                            fontWeight: 600
                        }}
                    />
                </div>

                {/* Reconciliation summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px', flexShrink: 0 }}>
                    <div style={{ padding: '10px 14px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Cleared ({reconciliation.clearedCount})</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--success, #22c55e)' }}>{fmt(reconciliation.clearedTotal)}</div>
                    </div>
                    <div style={{ padding: '10px 14px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Outstanding ({reconciliation.outstandingCount})</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--warning)' }}>{fmt(reconciliation.outstandingTotal)}</div>
                    </div>
                    <div style={{ padding: '10px 14px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Difference</div>
                        <div style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: Math.abs(reconciliation.difference) < 0.01 ? 'var(--success, #22c55e)' : 'var(--danger)'
                        }}>
                            {fmt(reconciliation.difference)}
                        </div>
                    </div>
                </div>

                {/* Search + actions */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexShrink: 0 }}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by check # or payee..."
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            backgroundColor: 'var(--surface-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text)',
                            fontSize: '13px',
                            outline: 'none'
                        }}
                    />
                    <button className="btn btn-sm" onClick={clearAll}>Clear All</button>
                    <button className="btn btn-sm" onClick={uncheckAll}>Uncheck All</button>
                </div>

                {/* Check list */}
                <div style={{ overflow: 'auto', flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    {filteredChecks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                            No checks to reconcile
                        </div>
                    ) : (
                        filteredChecks.map((check, i) => {
                            const key = check.checkNumber || check.id || `check-${i}`
                            const isCleared = clearedIds.has(key)
                            return (
                                <label
                                    key={key}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '8px 12px',
                                        borderBottom: '1px solid var(--border-subtle)',
                                        cursor: 'pointer',
                                        backgroundColor: isCleared ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
                                        transition: 'background 0.15s'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isCleared}
                                        onChange={() => toggleCleared(key)}
                                        style={{ flexShrink: 0 }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '13px', color: isCleared ? 'var(--text-dim)' : 'var(--text-bright)', textDecoration: isCleared ? 'line-through' : 'none' }}>
                                            <span style={{ fontWeight: 600 }}>#{check.checkNumber || '—'}</span>
                                            <span style={{ marginLeft: '8px' }}>{check.payee || 'No payee'}</span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                            {new Date(check.date || check.printedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: isCleared ? 'var(--text-dim)' : 'var(--accent)',
                                        textDecoration: isCleared ? 'line-through' : 'none'
                                    }}>
                                        {fmt(parseAmount(check.amount))}
                                    </div>
                                </label>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
