import React, { useState, useMemo } from 'react'
import { calculate1099Totals, generate1099CSV } from '../../utils/vendorHelpers'
import { formatAmount } from '../../utils/helpers'

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
                            <div className="stat-card-value accent">{formatAmount(grandTotal)}</div>
                        </div>
                    </div>

                    {/* Vendor list */}
                    <div className="panel-list-scroll" style={{ maxHeight: '300px', marginBottom: '4px' }}>
                        {eligibleVendors.length === 0 ? (
                            <div className="panel-empty">
                                No vendors above ${threshold} threshold for {selectedYear}
                            </div>
                        ) : (
                            <table className="panel-table">
                                <thead>
                                    <tr>
                                        <th>Vendor</th>
                                        <th>Tax ID</th>
                                        <th className="text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {eligibleVendors.map(v => (
                                        <tr key={v.id}>
                                            <td>{v.name}</td>
                                            <td className="text-secondary">{v.taxId || '—'}</td>
                                            <td className="text-right text-accent">{formatAmount(v.yearTotal)}</td>
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
