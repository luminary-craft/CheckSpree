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

    /** Format currency display */
    const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const views = [
        { id: 'dashboard', label: '📊 Dashboard' },
        { id: 'register', label: '📋 Register' },
        { id: 'spending', label: '💰 Spending' },
        { id: 'voids', label: '🚫 Voids' }
    ]

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content" style={{ maxWidth: '800px', width: '95%', maxHeight: '85vh' }}>

                {/* Header */}
                <div className="modal-header">
                    <h2>Reports & Search</h2>
                    <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* View tabs */}
                    <div className="panel-tabs">
                        {views.map(v => (
                            <button
                                key={v.id}
                                className={`panel-tab ${activeView === v.id ? 'active' : ''}`}
                                onClick={() => setActiveView(v.id)}
                            >
                                {v.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Dashboard ── */}
                    {activeView === 'dashboard' && (
                        <div className="panel-grid-3">
                            <div className="stat-card">
                                <div className="stat-card-label">Total Checks</div>
                                <div className="stat-card-value">{stats.totalChecks}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-label">Total Amount</div>
                                <div className="stat-card-value accent">{fmt(stats.totalAmount)}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-label">Average Check</div>
                                <div className="stat-card-value">{fmt(stats.averageAmount)}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-label">This Month</div>
                                <div className="stat-card-value">{stats.thisMonthCount}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-label">Month Total</div>
                                <div className="stat-card-value accent">{fmt(stats.thisMonthTotal)}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-label">Voided</div>
                                <div className={`stat-card-value ${stats.voidCount > 0 ? 'danger' : ''}`}>{stats.voidCount}</div>
                            </div>
                        </div>
                    )}

                    {/* ── Check Register ── */}
                    {activeView === 'register' && (
                        <div>
                            {/* Search + date filters */}
                            <div className="panel-row" style={{ marginBottom: '12px', flexWrap: 'wrap' }}>
                                <input
                                    type="text"
                                    className="panel-input"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search checks..."
                                    style={{ flex: 1, minWidth: '150px' }}
                                />
                                <input
                                    type="date"
                                    className="panel-input"
                                    value={dateFilter.start}
                                    onChange={(e) => setDateFilter(p => ({ ...p, start: e.target.value }))}
                                    style={{ width: 'auto' }}
                                />
                                <input
                                    type="date"
                                    className="panel-input"
                                    value={dateFilter.end}
                                    onChange={(e) => setDateFilter(p => ({ ...p, end: e.target.value }))}
                                    style={{ width: 'auto' }}
                                />
                            </div>

                            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                                {register.length} check{register.length !== 1 ? 's' : ''} found
                            </div>

                            {/* Register table */}
                            <div className="panel-list-scroll" style={{ maxHeight: '400px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, backgroundColor: 'var(--surface)' }}>
                                            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-label)', fontWeight: 600 }}>#</th>
                                            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-label)', fontWeight: 600 }}>Date</th>
                                            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-label)', fontWeight: 600 }}>Payee</th>
                                            <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-label)', fontWeight: 600 }}>Amount</th>
                                            <th style={{ textAlign: 'center', padding: '8px', color: 'var(--text-label)', fontWeight: 600 }}>Status</th>
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
                                                    <span className={`panel-badge ${c.status === 'void' ? 'danger' : 'success'}`}>
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
                            <div className="panel-row" style={{ marginBottom: '12px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Group by:</span>
                                <select className="panel-select" value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={{ width: 'auto', minWidth: '120px' }}>
                                    <option value="payee">Payee</option>
                                    <option value="month">Month</option>
                                    <option value="glCode">GL Code</option>
                                </select>
                                <span style={{ fontSize: '12px', color: 'var(--text-dim)', marginLeft: 'auto' }}>
                                    {currentYear} · {spendingSummary.length} group{spendingSummary.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            <div className="panel-list-scroll" style={{ maxHeight: '400px' }}>
                                {spendingSummary.map((group, i) => (
                                    <div key={i} className="panel-list-item">
                                        <div style={{ flex: 1 }}>
                                            <div className="panel-list-primary">{group.label}</div>
                                            <div className="panel-list-secondary">{group.count} check{group.count !== 1 ? 's' : ''}</div>
                                        </div>
                                        <div className="panel-list-amount" style={{ fontSize: '14px' }}>{fmt(group.total)}</div>
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
                                <div className="panel-empty">No voided checks found ✓</div>
                            ) : (
                                <div className="panel-list-scroll" style={{ maxHeight: '400px' }}>
                                    {voidReport.map((c, i) => (
                                        <div key={i} className="panel-list-item border-danger">
                                            <div style={{ flex: 1 }}>
                                                <div className="panel-list-primary">
                                                    #{c.checkNumber || '—'}
                                                    <span style={{ fontWeight: 400, marginLeft: '8px' }}>{c.payee || 'No payee'}</span>
                                                </div>
                                            </div>
                                            <div className="panel-row" style={{ gap: '12px' }}>
                                                <span className="panel-list-amount" style={{ color: 'var(--danger)' }}>
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
