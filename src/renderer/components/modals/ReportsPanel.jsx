import React, { useState, useMemo } from 'react'
import {
    generateCheckRegister,
    generateSpendingSummary,
    generateVoidReport,
    getDashboardStats,
    exportReportCSV
} from '../../utils/reportHelpers'

/**
 * ReportsPanel — Reporting & Search Modal.
 *
 * Tabbed interface with four views:
 * - Dashboard: Key stats at a glance
 * - Check Register: Searchable/filterable check list
 * - Spending Summary: Group totals by payee/month/GL code
 * - Void Report: Track voided checks
 *
 * @param {Object} props
 * @param {Array} props.checkHistory - Full check history
 * @param {Function} props.onClose - Close modal
 * @param {Function} props.showToast - Display a toast notification
 */
export function ReportsPanel({ checkHistory, onClose, showToast }) {
    const [activeView, setActiveView] = useState('dashboard')
    const [searchQuery, setSearchQuery] = useState('')
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' })
    const [groupBy, setGroupBy] = useState('payee')
    const currentYear = new Date().getFullYear()

    // Dashboard stats
    const stats = useMemo(() => getDashboardStats(checkHistory), [checkHistory])

    // Check register with filters
    const register = useMemo(() => generateCheckRegister(checkHistory, {
        search: searchQuery,
        startDate: dateFilter.start || undefined,
        endDate: dateFilter.end || undefined
    }), [checkHistory, searchQuery, dateFilter])

    // Spending summary
    const spendingSummary = useMemo(
        () => generateSpendingSummary(checkHistory, groupBy, currentYear),
        [checkHistory, groupBy, currentYear]
    )

    // Void report
    const voidReport = useMemo(() => generateVoidReport(checkHistory), [checkHistory])

    // Format currency display
    const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const views = [
        { id: 'dashboard', label: '📊 Dashboard' },
        { id: 'register', label: '📋 Register' },
        { id: 'spending', label: '💰 Spending' },
        { id: 'voids', label: '🚫 Voids' }
    ]

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content" style={{ maxWidth: '800px', width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div className="modal-header" style={{ flexShrink: 0 }}>
                    <h3 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '18px' }}>
                        Reports & Search
                    </h3>
                    <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
                </div>

                {/* View tabs */}
                <div style={{ display: 'flex', gap: '2px', marginBottom: '16px', flexShrink: 0 }}>
                    {views.map(v => (
                        <button
                            key={v.id}
                            className={`btn btn-sm ${activeView === v.id ? 'primary' : ''}`}
                            onClick={() => setActiveView(v.id)}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>

                <div style={{ overflow: 'auto', flex: 1 }}>

                    {/* ── Dashboard ── */}
                    {activeView === 'dashboard' && (
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                                <StatCard label="Total Checks" value={stats.totalChecks} />
                                <StatCard label="Total Amount" value={fmt(stats.totalAmount)} accent />
                                <StatCard label="Average Check" value={fmt(stats.averageAmount)} />
                                <StatCard label="This Month" value={stats.thisMonthCount} />
                                <StatCard label="Month Total" value={fmt(stats.thisMonthTotal)} accent />
                                <StatCard label="Voided" value={stats.voidCount} warning={stats.voidCount > 0} />
                            </div>
                        </div>
                    )}

                    {/* ── Check Register ── */}
                    {activeView === 'register' && (
                        <div>
                            {/* Search + date filters */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search checks..."
                                    style={{
                                        flex: 1,
                                        minWidth: '150px',
                                        padding: '8px 12px',
                                        backgroundColor: 'var(--surface-elevated)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--text)',
                                        fontSize: '13px',
                                        outline: 'none'
                                    }}
                                />
                                <input
                                    type="date"
                                    value={dateFilter.start}
                                    onChange={(e) => setDateFilter(p => ({ ...p, start: e.target.value }))}
                                    style={{ padding: '6px 8px', backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '12px' }}
                                />
                                <input
                                    type="date"
                                    value={dateFilter.end}
                                    onChange={(e) => setDateFilter(p => ({ ...p, end: e.target.value }))}
                                    style={{ padding: '6px 8px', backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '12px' }}
                                />
                            </div>

                            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                                {register.length} check{register.length !== 1 ? 's' : ''} found
                            </div>

                            {/* Register table */}
                            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'auto', maxHeight: '400px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, backgroundColor: 'var(--surface)' }}>
                                            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-label)' }}>#</th>
                                            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-label)' }}>Date</th>
                                            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-label)' }}>Payee</th>
                                            <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-label)' }}>Amount</th>
                                            <th style={{ textAlign: 'center', padding: '8px', color: 'var(--text-label)' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {register.slice(0, 200).map((c, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                                <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{c.checkNumber || '—'}</td>
                                                <td style={{ padding: '6px 8px', color: 'var(--text)' }}>{new Date(c.date || c.printedAt).toLocaleDateString()}</td>
                                                <td style={{ padding: '6px 8px', color: 'var(--text-bright)' }}>{c.payee || '—'}</td>
                                                <td style={{ padding: '6px 8px', color: 'var(--accent)', textAlign: 'right', fontWeight: 600 }}>{fmt(parseFloat(String(c.amount || '0').replace(/[^0-9.-]/g, '')))}</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        backgroundColor: c.status === 'void' ? 'var(--danger-soft)' : 'var(--success-soft, rgba(34,197,94,0.15))',
                                                        color: c.status === 'void' ? 'var(--danger)' : 'var(--success, #22c55e)'
                                                    }}>
                                                        {c.status === 'void' ? 'VOID' : 'PRINTED'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Spending Summary ── */}
                    {activeView === 'spending' && (
                        <div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Group by:</span>
                                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={{ minWidth: '120px' }}>
                                    <option value="payee">Payee</option>
                                    <option value="month">Month</option>
                                    <option value="glCode">GL Code</option>
                                </select>
                                <span style={{ fontSize: '12px', color: 'var(--text-dim)', marginLeft: 'auto' }}>
                                    {currentYear} · {spendingSummary.length} group{spendingSummary.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'auto', maxHeight: '400px' }}>
                                {spendingSummary.map((group, i) => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '8px 12px',
                                        borderBottom: '1px solid var(--border-subtle)'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-bright)', fontWeight: 500 }}>{group.label}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{group.count} check{group.count !== 1 ? 's' : ''}</div>
                                        </div>
                                        <div style={{ fontSize: '14px', color: 'var(--accent)', fontWeight: 600 }}>{fmt(group.total)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Void Report ── */}
                    {activeView === 'voids' && (
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                                {voidReport.length} voided check{voidReport.length !== 1 ? 's' : ''}
                            </div>

                            {voidReport.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                                    No voided checks found ✓
                                </div>
                            ) : (
                                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'auto', maxHeight: '400px' }}>
                                    {voidReport.map((c, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                                            <div>
                                                <span style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: '13px' }}>
                                                    #{c.checkNumber || '—'}
                                                </span>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px', marginLeft: '8px' }}>
                                                    {c.payee || 'No payee'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: 600 }}>
                                                    {fmt(parseFloat(String(c.amount || '0').replace(/[^0-9.-]/g, '')))}
                                                </span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                                    {new Date(c.voidedAt || c.date || c.printedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

/**
 * StatCard — Small stat display card for the dashboard view.
 */
function StatCard({ label, value, accent, warning }) {
    return (
        <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)'
        }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>{label}</div>
            <div style={{
                fontSize: '20px',
                fontWeight: 700,
                color: warning ? 'var(--danger)' : accent ? 'var(--accent)' : 'var(--text-bright)'
            }}>
                {value}
            </div>
        </div>
    )
}
