import React, { useState, useMemo } from 'react'
import { calculate1099Totals, generate1099CSV } from '../../utils/vendorHelpers'

/**
 * Form1099Modal — 1099 Tax Reporting Modal.
 *
 * Shows vendors who meet the $600 threshold for the selected year,
 * with totals and CSV export capability.
 *
 * @param {Object} props
 * @param {Array} props.vendors - All vendors from useVendors
 * @param {Array} props.checkHistory - Full check history
 * @param {Function} props.onClose - Close modal
 * @param {Function} props.showToast - Display a toast notification
 */
export function Form1099Modal({ vendors, checkHistory, onClose, showToast }) {
    const currentYear = new Date().getFullYear()
    const [selectedYear, setSelectedYear] = useState(currentYear)
    const [threshold, setThreshold] = useState(600)

    // Available years (last 5 years)
    const yearOptions = useMemo(() => {
        const years = []
        for (let y = currentYear; y >= currentYear - 4; y--) years.push(y)
        return years
    }, [currentYear])

    // Calculate vendor totals for the selected year
    const eligibleVendors = useMemo(
        () => calculate1099Totals(vendors, checkHistory, selectedYear, threshold),
        [vendors, checkHistory, selectedYear, threshold]
    )

    // Grand total across all eligible vendors
    const grandTotal = useMemo(
        () => eligibleVendors.reduce((sum, v) => sum + v.yearTotal, 0),
        [eligibleVendors]
    )

    /** Format currency for display */
    const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    /**
     * Export 1099 data as CSV.
     */
    const handleExport = async () => {
        if (eligibleVendors.length === 0) {
            showToast?.('No vendors meet the threshold for this year')
            return
        }

        try {
            const content = generate1099CSV(eligibleVendors, selectedYear)
            const filename = `1099_report_${selectedYear}.csv`

            // Reuse existing export IPC if available, fallback to manual download
            if (window.cs2?.exportHistory) {
                const result = await window.cs2.exportHistory({
                    content,
                    filename,
                    type: '1099-report'
                })
                if (result?.success) {
                    showToast?.(`Exported ${eligibleVendors.length} vendor records for ${selectedYear}`)
                } else if (!result?.cancelled) {
                    showToast?.('Export failed: ' + (result?.error || 'Unknown error'))
                }
            } else {
                // Fallback: download via blob
                const blob = new Blob([content], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = filename
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                showToast?.(`Downloaded ${filename}`)
            }
        } catch (error) {
            console.error('[1099] Export failed:', error)
            showToast?.('Export failed: ' + error.message)
        }
    }

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content" style={{ maxWidth: '600px', width: '95%' }}>
                {/* Header */}
                <div className="modal-header">
                    <h2>📋 1099 Tax Report</h2>
                    <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Controls */}
                    <div className="panel-row" style={{ gap: '12px', marginBottom: '16px', alignItems: 'flex-end' }}>
                        <div>
                            <label className="panel-label">Tax Year</label>
                            <select
                                className="panel-select"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                style={{ width: 'auto', minWidth: '100px' }}
                            >
                                {yearOptions.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="panel-label">Threshold ($)</label>
                            <input
                                type="number"
                                className="panel-input"
                                value={threshold}
                                onChange={(e) => setThreshold(Number(e.target.value) || 0)}
                                style={{ width: '100px' }}
                            />
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="panel-grid-2">
                        <div className="stat-card">
                            <div className="stat-card-label">Eligible Vendors</div>
                            <div className="stat-card-value">{eligibleVendors.length}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-label">Total Payments</div>
                            <div className="stat-card-value accent">{fmt(grandTotal)}</div>
                        </div>
                    </div>

                    {/* Vendor list */}
                    <div className="panel-list-scroll" style={{ maxHeight: '300px', marginBottom: '4px' }}>
                        {eligibleVendors.length === 0 ? (
                            <div className="panel-empty">
                                No vendors above ${threshold} threshold for {selectedYear}
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, backgroundColor: 'var(--surface)' }}>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', color: 'var(--text-label)', fontWeight: 600 }}>Vendor</th>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', color: 'var(--text-label)', fontWeight: 600 }}>Tax ID</th>
                                        <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '12px', color: 'var(--text-label)', fontWeight: 600 }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {eligibleVendors.map(v => (
                                        <tr key={v.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                            <td style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--text)' }}>{v.name}</td>
                                            <td style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                {v.taxId || '—'}
                                            </td>
                                            <td style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--accent)', textAlign: 'right', fontWeight: 600 }}>
                                                {fmt(v.yearTotal)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn ghost" onClick={onClose}>Close</button>
                    <button
                        className="btn primary"
                        onClick={handleExport}
                        disabled={eligibleVendors.length === 0}
                    >
                        📥 Export 1099 CSV
                    </button>
                </div>
            </div>
        </div>
    )
}
