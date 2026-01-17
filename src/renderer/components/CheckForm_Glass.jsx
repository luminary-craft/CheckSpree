import React, { useState, useEffect } from 'react'
import { getLocalDateString } from '../utils/date'
import { formatCurrency, sanitizeCurrencyInput } from '../utils/helpers'
import AtmCurrencyInput_Glass from './AtmCurrencyInput_Glass'
import PayeeAutocomplete from './PayeeAutocomplete'

/**
 * CheckForm_Glass Component - Controlled Component
 * 
 * Receives data and handlers from parent (App -> useCheckForm)
 * Does NOT manage its own state or persistence.
 */
export default function CheckForm_Glass({
    data,
    onChange,
    onRecord,
    onClear,
    payeeHistory = [],
    currentBalance = 0,
    showCheckNumber = true,
    showGLCode = false
}) {
    // UI state only (visual toggles)
    const [showAddress, setShowAddress] = useState(false)
    const [showMemoOptions, setShowMemoOptions] = useState(false)

    // Sync UI toggles with incoming data
    useEffect(() => {
        if (data.address && !showAddress) setShowAddress(true)
        if ((data.external_memo || data.internal_memo) && !showMemoOptions) setShowMemoOptions(true)
    }, [data.address, data.external_memo, data.internal_memo])

    // Calculate if amount exceeds balance
    const amount = sanitizeCurrencyInput(data.amount)
    const isOverBalance = amount > currentBalance && currentBalance >= 0

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault()

        if (!data.payee?.trim()) {
            alert('Please enter a payee name')
            return
        }

        const parsedAmount = sanitizeCurrencyInput(data.amount)
        if (parsedAmount <= 0) {
            alert('Please enter a valid amount')
            return
        }

        // Prepare record data (cleaning up strings)
        const checkData = {
            ...data,
            payee: data.payee.trim(),
            memo: data.memo?.trim() || '',
            external_memo: data.external_memo?.trim() || '',
            internal_memo: data.internal_memo?.trim() || '',
            glCode: data.glCode?.trim() || '',
            address: showAddress ? data.address?.trim() || '' : '',
            checkNumber: data.checkNumber?.trim() || ''
        }

        onRecord(checkData)
    }

    const handleClear = () => {
        setShowAddress(false)
        setShowMemoOptions(false)
        if (onClear) onClear()
    }

    return (
        <div className="card card-main">
            <form onSubmit={handleSubmit}>
                {/* Date Field */}
                <div className="field">
                    <label>Date</label>
                    <input
                        type="date"
                        value={data.date || getLocalDateString()}
                        onChange={(e) => onChange({ date: e.target.value })}
                        required
                    />
                </div>

                {/* Check Number Field */}
                {showCheckNumber && (
                    <div className="field">
                        <label>Check Number</label>
                        <input
                            type="text"
                            value={data.checkNumber || ''}
                            onChange={(e) => onChange({ checkNumber: e.target.value })}
                            placeholder="Optional"
                        />
                    </div>
                )}

                {/* Payee Field */}
                <div className="field">
                    <label>Pay to the Order of</label>
                    <PayeeAutocomplete
                        value={data.payee || ''}
                        onChange={(value) => onChange({ payee: value })}
                        checkHistory={payeeHistory}
                        placeholder="Recipient name..."
                    />
                </div>

                {/* Amount Field - Glass Style */}
                <div className="field">
                    <label>
                        Amount
                        {isOverBalance && (
                            <span style={{ color: 'var(--danger)', fontSize: '11px', marginLeft: '8px' }}>
                                ⚠ Exceeds balance
                            </span>
                        )}
                    </label>
                    <div className={`input-prefix ${isOverBalance ? 'warning' : ''}`}>
                        <span>$</span>
                        <AtmCurrencyInput_Glass
                            value={data.amount || ''}
                            onChange={(value) => onChange({ amount: value })}
                            isWarning={isOverBalance}
                        />
                    </div>
                    {currentBalance >= 0 && (
                        <div className="hint" style={{ marginTop: '4px', textAlign: 'right' }}>
                            Balance: {formatCurrency(currentBalance)}
                        </div>
                    )}
                </div>

                {/* Memo Field */}
                <div className="field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ margin: 0 }}>Memo</label>
                        <button
                            type="button"
                            onClick={() => setShowMemoOptions(!showMemoOptions)}
                            className="btn ghost btn-sm"
                            style={{ fontSize: '10px', padding: '2px 6px', height: 'auto' }}
                        >
                            {showMemoOptions ? 'Simple' : 'Advanced'}
                        </button>
                    </div>

                    {showMemoOptions ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <input
                                type="text"
                                value={data.external_memo || ''}
                                onChange={(e) => onChange({ external_memo: e.target.value })}
                                placeholder="External memo (printed)..."
                            />
                            <input
                                type="text"
                                value={data.internal_memo || ''}
                                onChange={(e) => onChange({ internal_memo: e.target.value })}
                                placeholder="Internal notes (private)..."
                            />
                        </div>
                    ) : (
                        <input
                            type="text"
                            value={data.memo || ''}
                            onChange={(e) => onChange({ memo: e.target.value })}
                            placeholder="Check memo..."
                        />
                    )}
                </div>

                {/* GL Code */}
                {showGLCode && (
                    <div className="field">
                        <label>GL Code</label>
                        <input
                            type="text"
                            value={data.glCode || ''}
                            onChange={(e) => onChange({ glCode: e.target.value })}
                            placeholder="General Ledger code..."
                        />
                    </div>
                )}

                {/* Address Toggle */}
                <div style={{ margin: '12px 0' }}>
                    <button
                        type="button"
                        onClick={() => setShowAddress(!showAddress)}
                        className="btn ghost full-width"
                        style={{ justifyContent: 'flex-start', color: 'var(--text-secondary)' }}
                    >
                        <span style={{ marginRight: '8px' }}>{showAddress ? '−' : '+'}</span>
                        {showAddress ? 'Hide Address' : 'Add Address'}
                    </button>

                    {showAddress && (
                        <div className="field" style={{ marginTop: '12px' }}>
                            <label>Recipient Address</label>
                            <textarea
                                value={data.address || ''}
                                onChange={(e) => onChange({ address: e.target.value })}
                                placeholder="Street address&#10;City, State ZIP"
                                rows={3}
                                style={{
                                    resize: 'vertical',
                                    background: 'rgba(0, 0, 0, 0.25)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--text)',
                                    padding: '10px',
                                    width: '100%',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="btn ghost"
                        style={{ flex: 1 }}
                    >
                        Clear
                    </button>
                </div>
            </form>
        </div>
    )
}
