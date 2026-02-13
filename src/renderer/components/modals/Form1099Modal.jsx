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
                    <h3 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '18px' }}>
                        📋 1099 Tax Report
                    </h3>
                    <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'end' }}>
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-label)', display: 'block', marginBottom: '4px' }}>
                            Tax Year
                        </label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            style={{ minWidth: '100px' }}
                        >
                            {yearOptions.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-label)', display: 'block', marginBottom: '4px' }}>
                            Threshold ($)
                        </label>
                        <input
                            type="number"
                            value={threshold}
                            onChange={(e) => setThreshold(Number(e.target.value) || 0)}
                            style={{
                                width: '100px',
                                padding: '8px 10px',
                                backgroundColor: 'var(--surface-elevated)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text)',
                                fontSize: '13px'
                            }}
                        />
                    </div>
                </div>

                {/* Summary Stats */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '16px'
                }}>
                    <div style={{
                        padding: '10px 14px',
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)'
                    }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Eligible Vendors</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-bright)' }}>
                            {eligibleVendors.length}
                        </div>
                    </div>
                    <div style={{
                        padding: '10px 14px',
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)'
                    }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Total Payments</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent)' }}>
                            ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                {/* Vendor list */}
                <div style={{
                    maxHeight: '300px',
                    overflow: 'auto',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '16px'
                }}>
                    {eligibleVendors.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '24px',
                            color: 'var(--text-dim)',
                            fontSize: '13px'
                        }}>
                            No vendors above ${threshold} threshold for {selectedYear}
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', color: 'var(--text-label)' }}>Vendor</th>
                                    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', color: 'var(--text-label)' }}>Tax ID</th>
                                    <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '12px', color: 'var(--text-label)' }}>Total</th>
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
                                            ${v.yearTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button className="btn" onClick={onClose}>Close</button>
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
