import React, { useState, useMemo } from 'react'
import {
    generatePositivePayCSV,
    generatePositivePayFixedWidth,
    filterChecksByDateRange,
    getCheckSummary
} from '../../utils/positivePayExport'

/**
 * PositivePayModal — Export dialog for generating Positive Pay files.
 *
 * Allows the user to select a date range, export format, and optional
 * account number, then preview and export the data for bank submission.
 *
 * @param {Object} props
 * @param {Array} props.checkHistory - Full check history array
 * @param {Function} props.onClose - Close the modal
 * @param {Function} props.showToast - Display a toast notification
 */
export function PositivePayModal({ checkHistory, onClose, showToast }) {
    // Date range defaults to last 30 days
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0])
    const [format, setFormat] = useState('csv')
    const [accountNumber, setAccountNumber] = useState('')
    const [includeVoided, setIncludeVoided] = useState(false)

    // Filter and summarize checks based on selected date range
    const filteredChecks = useMemo(
        () => filterChecksByDateRange(checkHistory, startDate, endDate),
        [checkHistory, startDate, endDate]
    )

    const summary = useMemo(
        () => getCheckSummary(filteredChecks),
        [filteredChecks]
    )

    /**
     * Generate the export content and trigger download via IPC.
     */
    const handleExport = async () => {
        if (filteredChecks.length === 0) {
            showToast?.('No checks found in the selected date range')
            return
        }

        try {
            const options = { accountNumber, includeVoided }
            let content, filename

            if (format === 'csv') {
                content = generatePositivePayCSV(filteredChecks, options)
                filename = `positive_pay_${startDate}_to_${endDate}.csv`
            } else {
                content = generatePositivePayFixedWidth(filteredChecks, options)
                filename = `positive_pay_${startDate}_to_${endDate}.txt`
            }

            // Use existing export IPC to save the file
            const result = await window.cs2.exportHistory({
                content,
                filename,
                type: 'positive-pay'
            })

            if (result?.success) {
                showToast?.(`Exported ${filteredChecks.length} checks to ${filename}`)
                onClose()
            } else {
                // User may have cancelled the save dialog — not an error
                if (result?.cancelled) return
                showToast?.('Export failed: ' + (result?.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('[PositivePay] Export failed:', error)
            showToast?.('Export failed: ' + error.message)
        }
    }

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content" style={{ maxWidth: '520px', width: '95%' }}>
                {/* Header */}
                <div className="modal-header">
                    <h2>Positive Pay Export</h2>
                    <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Description */}
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 18px', lineHeight: '1.5' }}>
                        Generate a file of issued checks for your bank's Positive Pay fraud prevention system.
                    </p>

                    {/* Date Range */}
                    <div className="panel-grid-2">
                        <div>
                            <label className="panel-label">Start Date</label>
                            <input
                                type="date"
                                className="panel-input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="panel-label">End Date</label>
                            <input
                                type="date"
                                className="panel-input"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Format */}
                    <div className="panel-field">
                        <label className="panel-label">Export Format</label>
                        <select
                            className="panel-select"
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                        >
                            <option value="csv">Standard CSV</option>
                            <option value="fixed">Fixed-Width Text</option>
                        </select>
                    </div>

                    {/* Account Number */}
                    <div className="panel-field">
                        <label className="panel-label">Account Number (optional)</label>
                        <input
                            type="text"
                            className="panel-input"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            placeholder="Enter bank account number"
                        />
                    </div>

                    {/* Include voided toggle */}
                    <label className="panel-checkbox" style={{ marginBottom: '18px' }}>
                        <input
                            type="checkbox"
                            checked={includeVoided}
                            onChange={(e) => setIncludeVoided(e.target.checked)}
                        />
                        Include voided checks
                    </label>

                    {/* Summary card */}
                    <div className="stat-card">
                        <div className="panel-summary-row">
                            <span className="panel-summary-label">Checks found</span>
                            <span className="panel-summary-value">{summary.count}</span>
                        </div>
                        <div className="panel-summary-row">
                            <span className="panel-summary-label">Total amount</span>
                            <span className="panel-summary-value" style={{ color: 'var(--accent)' }}>
                                ${summary.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn ghost" onClick={onClose}>Cancel</button>
                    <button
                        className="btn primary"
                        onClick={handleExport}
                        disabled={summary.count === 0}
                    >
                        Export {summary.count > 0 ? `${summary.count} Checks` : ''}
                    </button>
                </div>
            </div>
        </div>
    )
}
