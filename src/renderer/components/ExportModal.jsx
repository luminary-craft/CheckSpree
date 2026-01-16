import React, { useState } from 'react'
import { getDateRangeForFilter, formatCurrency, formatDate } from '../utils/helpers'

/**
 * ExportModal Component - Export check history with filtering
 * 
 * Features:
 * - Date range filtering (preset and custom)
 * - Ledger selection
 * - Export format selection (CSV, Excel)
 * - Transaction count preview
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal visibility
 * @param {Function} props.onClose - Close modal callback
 * @param {Function} props.onExport - Export callback: (options) => void
 * @param {Array} props.checkHistory - Check history data
 * @param {Array} props.ledgers - Available ledgers
 */
export default function ExportModal({ isOpen, onClose, onExport, checkHistory = [], ledgers = [] }) {
    const [dateRange, setDateRange] = useState('all') // 'all' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'ytd' | 'last60' | 'custom'
    const [customStartDate, setCustomStartDate] = useState('')
    const [customEndDate, setCustomEndDate] = useState('')
    const [selectedLedgers, setSelectedLedgers] = useState([]) // Empty = all ledgers
    const [exportFormat, setExportFormat] = useState('csv') // 'csv' | 'excel'
    const [includeDeposits, setIncludeDeposits] = useState(true)
    const [includeChecks, setIncludeChecks] = useState(true)

    // Date range options
    const dateRangeOptions = [
        { value: 'all', label: 'All Time' },
        { value: 'thisWeek', label: 'This Week' },
        { value: 'lastWeek', label: 'Last Week' },
        { value: 'thisMonth', label: 'This Month' },
        { value: 'lastMonth', label: 'Last Month' },
        { value: 'thisQuarter', label: 'This Quarter' },
        { value: 'ytd', label: 'Year to Date' },
        { value: 'last60', label: 'Last 60 Days' },
        { value: 'custom', label: 'Custom Range' }
    ]

    /**
     * Toggle ledger selection
     */
    const handleToggleLedger = (ledgerId) => {
        setSelectedLedgers(prev => {
            if (prev.includes(ledgerId)) {
                return prev.filter(id => id !== ledgerId)
            } else {
                return [...prev, ledgerId]
            }
        })
    }

    /**
     * Select all ledgers
     */
    const handleSelectAllLedgers = () => {
        setSelectedLedgers(ledgers.map(l => l.id))
    }

    /**
     * Clear ledger selection (defaults to all)
     */
    const handleClearLedgers = () => {
        setSelectedLedgers([])
    }

    /**
     * Get filtered transactions based on current selections
     */
    const getFilteredTransactions = () => {
        let filtered = [...checkHistory]

        // Filter by transaction type
        filtered = filtered.filter(entry => {
            const isCheck = entry.type === 'check' || !entry.type
            const isDeposit = entry.type === 'deposit'
            return (isCheck && includeChecks) || (isDeposit && includeDeposits)
        })

        // Filter by ledger
        if (selectedLedgers.length > 0) {
            filtered = filtered.filter(entry => selectedLedgers.includes(entry.ledgerId))
        }

        // Filter by date range
        if (dateRange !== 'all') {
            const { start, end } = getDateRangeForFilter(dateRange, customStartDate, customEndDate)

            filtered = filtered.filter(entry => {
                if (!entry.date) return false
                const entryDate = new Date(entry.date)

                if (start && entryDate < start) return false
                if (end && entryDate > end) return false

                return true
            })
        }

        return filtered
    }

    /**
     * Handle export confirmation
     */
    const handleConfirmExport = () => {
        const filteredData = getFilteredTransactions()

        onExport({
            data: filteredData,
            format: exportFormat,
            dateRange,
            customStartDate,
            customEndDate,
            ledgers: selectedLedgers.length > 0 ? selectedLedgers : ledgers.map(l => l.id),
            includeDeposits,
            includeChecks
        })

        onClose()
    }

    if (!isOpen) return null

    const filteredCount = getFilteredTransactions().length
    const totalAmount = getFilteredTransactions().reduce((sum, entry) => {
        const amount = parseFloat(entry.amount) || 0
        if (entry.type === 'deposit') {
            return sum + amount
        } else {
            return sum - amount
        }
    }, 0)

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <h2>Export Transaction History</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Date Range Selection */}
                    <div className="field">
                        <label>Date Range</label>
                        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                            {dateRangeOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Date Range */}
                    {dateRange === 'custom' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div className="field">
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                />
                            </div>
                            <div className="field">
                                <label>End Date</label>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Transaction Type Filter */}
                    <div className="field">
                        <label>Include Transaction Types</label>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={includeChecks}
                                    onChange={(e) => setIncludeChecks(e.target.checked)}
                                />
                                <span>Checks</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={includeDeposits}
                                    onChange={(e) => setIncludeDeposits(e.target.checked)}
                                />
                                <span>Deposits</span>
                            </label>
                        </div>
                    </div>

                    {/* Ledger Selection */}
                    {ledgers.length > 1 && (
                        <div className="field">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ margin: 0 }}>Select Ledgers</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        className="btn-link"
                                        onClick={handleSelectAllLedgers}
                                        style={{ fontSize: '11px' }}
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-link"
                                        onClick={handleClearLedgers}
                                        style={{ fontSize: '11px' }}
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                padding: '12px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '6px',
                                maxHeight: '150px',
                                overflowY: 'auto'
                            }}>
                                {ledgers.map(ledger => {
                                    const isSelected = selectedLedgers.length === 0 || selectedLedgers.includes(ledger.id)
                                    return (
                                        <label
                                            key={ledger.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                cursor: 'pointer',
                                                fontSize: '13px'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleLedger(ledger.id)}
                                            />
                                            <span>{ledger.name}</span>
                                        </label>
                                    )
                                })}
                            </div>

                            {selectedLedgers.length === 0 && (
                                <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                    All ledgers selected
                                </small>
                            )}
                        </div>
                    )}

                    {/* Export Format */}
                    <div className="field">
                        <label>Export Format</label>
                        <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                            <option value="csv">CSV (Comma-Separated Values)</option>
                            <option value="excel">Excel (.xlsx)</option>
                        </select>
                    </div>

                    {/* Preview Summary */}
                    <div style={{
                        marginTop: '20px',
                        padding: '16px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '6px'
                    }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#3b82f6' }}>
                            Export Summary
                        </div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div>
                                <strong>{filteredCount}</strong> transactions will be exported
                            </div>
                            <div>
                                Net amount: <strong style={{ color: totalAmount >= 0 ? '#10b981' : '#ef4444' }}>
                                    {formatCurrency(Math.abs(totalAmount))} {totalAmount >= 0 ? '(credit)' : '(debit)'}
                                </strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn primary"
                        onClick={handleConfirmExport}
                        disabled={filteredCount === 0 || (!includeChecks && !includeDeposits)}
                    >
                        Export {filteredCount} Transactions
                    </button>
                </div>
            </div>
        </div>
    )
}
