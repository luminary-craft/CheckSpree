import React, { useState, useEffect } from 'react'
import { getLocalDateString } from '../utils/date'
import { formatCurrency, sanitizeCurrencyInput } from '../utils/helpers'
import AtmCurrencyInput from './AtmCurrencyInput'
import PayeeAutocomplete from './PayeeAutocomplete'

/**
 * CheckForm Component - Draft check creation form with ATM-style amount input
 * 
 * Features:
 * - ATM-style currency input (typing 123 becomes $1.23)
 * - Payee autocomplete from history
 * - Optional GL Code field
 * - Optional Address field with toggle
 * - Local state management for draft data
 * 
 * @param {Object} props
 * @param {Function} props.onRecord - Callback to save check: (checkData) => void
 * @param {Function} props.onClear - Callback to clear form (optional)
 * @param {string} props.checkNumber - Next auto-incremented check number
 * @param {Array} props.payeeHistory - Check history for autocomplete suggestions
 * @param {number} props.currentBalance - Current ledger balance (for warning)
 * @param {boolean} props.showCheckNumber - Whether to show check number field
 * @param {boolean} props.showGLCode - Whether to show GL code field
 * @param {Object} props.initialData - Initial form data for pre-filling (optional)
 */
export default function CheckForm({
    onRecord,
    onClear,
    checkNumber = '',
    payeeHistory = [],
    currentBalance = 0,
    showCheckNumber = true,
    showGLCode = false,
    initialData = null
}) {
    // Form state
    const [formData, setFormData] = useState({
        date: getLocalDateString(),
        payee: '',
        amount: '',
        memo: '',
        external_memo: '',
        internal_memo: '',
        glCode: '',
        address: '',
        checkNumber: checkNumber
    })

    // UI state
    const [showAddress, setShowAddress] = useState(false)
    const [showMemoOptions, setShowMemoOptions] = useState(false)

    // Initialize form with initial data if provided
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData,
                checkNumber: checkNumber // Always use prop check number
            }))
            // Show address field if initial data has address
            if (initialData.address) {
                setShowAddress(true)
            }
        }
    }, [initialData, checkNumber])

    // Update check number when prop changes
    useEffect(() => {
        setFormData(prev => ({ ...prev, checkNumber }))
    }, [checkNumber])

    // Calculate if amount exceeds balance
    const amount = sanitizeCurrencyInput(formData.amount)
    const isOverBalance = amount > currentBalance && currentBalance >= 0

    // Update form field
    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault()

        // Validate required fields
        if (!formData.payee?.trim()) {
            alert('Please enter a payee name')
            return
        }

        const parsedAmount = sanitizeCurrencyInput(formData.amount)
        if (parsedAmount <= 0) {
            alert('Please enter a valid amount')
            return
        }

        // Prepare check data
        const checkData = {
            date: formData.date || getLocalDateString(),
            payee: formData.payee.trim(),
            amount: formData.amount,
            memo: formData.memo.trim(),
            external_memo: formData.external_memo.trim(),
            internal_memo: formData.internal_memo.trim(),
            glCode: formData.glCode.trim(),
            address: showAddress ? formData.address.trim() : '',
            checkNumber: formData.checkNumber.trim(),
            line_items: [],
            line_items_text: ''
        }

        // Call parent callback
        onRecord(checkData)

        // Clear form
        handleClear()
    }

    // Clear form and reset to defaults
    const handleClear = () => {
        setFormData({
            date: getLocalDateString(),
            payee: '',
            amount: '',
            memo: '',
            external_memo: '',
            internal_memo: '',
            glCode: '',
            address: '',
            checkNumber: checkNumber
        })
        setShowAddress(false)
        setShowMemoOptions(false)

        if (onClear) {
            onClear()
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Date Field */}
            <div className="field">
                <label>Date</label>
                <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    required
                />
            </div>

            {/* Check Number Field (Optional) */}
            {showCheckNumber && (
                <div className="field">
                    <label>Check Number</label>
                    <input
                        type="text"
                        value={formData.checkNumber}
                        onChange={(e) => updateField('checkNumber', e.target.value)}
                        placeholder="Optional"
                    />
                    <small style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                        Leave blank for no check number
                    </small>
                </div>
            )}

            {/* Payee Field with Autocomplete */}
            <div className="field">
                <label>Pay to the Order of</label>
                <PayeeAutocomplete
                    value={formData.payee}
                    onChange={(value) => updateField('payee', value)}
                    checkHistory={payeeHistory}
                    placeholder="Recipient name..."
                />
            </div>

            {/* Amount Field - ATM Style */}
            <div className="field">
                <label>
                    Amount
                    {isOverBalance && (
                        <span style={{ color: '#f87171', fontSize: '11px', marginLeft: '8px' }}>
                            ⚠ Exceeds balance
                        </span>
                    )}
                </label>
                <AtmCurrencyInput
                    value={formData.amount}
                    onChange={(value) => updateField('amount', value)}
                    isWarning={isOverBalance}
                />
                {currentBalance >= 0 && (
                    <small style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                        Current balance: {formatCurrency(currentBalance)}
                    </small>
                )}
            </div>

            {/* Memo Field */}
            <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ margin: 0 }}>Memo</label>
                    <button
                        type="button"
                        onClick={() => setShowMemoOptions(!showMemoOptions)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#3b82f6',
                            fontSize: '11px',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            textDecoration: 'underline'
                        }}
                    >
                        {showMemoOptions ? 'Simple' : 'Advanced'}
                    </button>
                </div>

                {showMemoOptions ? (
                    <>
                        <div style={{ marginBottom: '8px' }}>
                            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>
                                External Memo (shown on check)
                            </label>
                            <input
                                type="text"
                                value={formData.external_memo}
                                onChange={(e) => updateField('external_memo', e.target.value)}
                                placeholder="Memo visible to recipient..."
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>
                                Internal Memo (private notes)
                            </label>
                            <input
                                type="text"
                                value={formData.internal_memo}
                                onChange={(e) => updateField('internal_memo', e.target.value)}
                                placeholder="Internal notes (not printed)..."
                            />
                        </div>
                    </>
                ) : (
                    <input
                        type="text"
                        value={formData.memo}
                        onChange={(e) => updateField('memo', e.target.value)}
                        placeholder="Check memo..."
                    />
                )}
            </div>

            {/* GL Code Field (Optional) */}
            {showGLCode && (
                <div className="field">
                    <label>GL Code / Account</label>
                    <input
                        type="text"
                        value={formData.glCode}
                        onChange={(e) => updateField('glCode', e.target.value)}
                        placeholder="General Ledger code..."
                    />
                </div>
            )}

            {/* Address Field Toggle */}
            <div>
                <button
                    type="button"
                    onClick={() => setShowAddress(!showAddress)}
                    style={{
                        background: 'none',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        color: '#94a3b8',
                        fontSize: '12px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6'
                        e.currentTarget.style.color = '#3b82f6'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#475569'
                        e.currentTarget.style.color = '#94a3b8'
                    }}
                >
                    <span style={{ fontSize: '14px' }}>{showAddress ? '−' : '+'}</span>
                    {showAddress ? 'Hide Address' : 'Add Address'}
                </button>

                {showAddress && (
                    <div className="field" style={{ marginTop: '12px' }}>
                        <label>Recipient Address</label>
                        <textarea
                            value={formData.address}
                            onChange={(e) => updateField('address', e.target.value)}
                            placeholder="Street address&#10;City, State ZIP"
                            rows={3}
                            style={{
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                fontSize: '13px'
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                    type="button"
                    onClick={handleClear}
                    className="btn ghost"
                    style={{ flex: 1 }}
                >
                    Clear
                </button>
                <button
                    type="submit"
                    className="btn primary"
                    style={{ flex: 2 }}
                    disabled={!formData.payee?.trim() || sanitizeCurrencyInput(formData.amount) <= 0}
                >
                    Record Check
                </button>
            </div>

            {/* Form State Indicator */}
            {(formData.payee || formData.amount) && (
                <div style={{
                    fontSize: '11px',
                    color: '#64748b',
                    textAlign: 'center',
                    fontStyle: 'italic',
                    marginTop: '-8px'
                }}>
                    Draft in progress...
                </div>
            )}
        </form>
    )
}
