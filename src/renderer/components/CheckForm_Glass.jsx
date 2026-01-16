import React, { useState, useEffect } from 'react'
import { getLocalDateString } from '../utils/date'
import { formatCurrency, sanitizeCurrencyInput } from '../utils/helpers'
import AtmCurrencyInput_Glass from './AtmCurrencyInput_Glass'
import PayeeAutocomplete from './PayeeAutocomplete'

/**
 * CheckForm_Glass Component - Restored "Glass" aesthetic with draft persistence
 */
export default function CheckForm_Glass({
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

    // DRAFT PERSISTENCE: Load on mount
    useEffect(() => {
        const savedDraft = localStorage.getItem('checkspree_draft')
        if (savedDraft) {
            try {
                const parsed = JSON.parse(savedDraft)
                // Only restore if we don't have initialData passed in (which implies editing an existing check)
                if (!initialData) {
                    setFormData(prev => ({
                        ...prev,
                        ...parsed,
                        checkNumber: checkNumber || prev.checkNumber // Prefer prop check number if available
                    }))
                    if (parsed.address) setShowAddress(true)
                    if (parsed.external_memo || parsed.internal_memo) setShowMemoOptions(true)
                }
            } catch (e) {
                console.error('Failed to load draft:', e)
            }
        }
    }, [])

    // DRAFT PERSISTENCE: Save on change
    useEffect(() => {
        // Don't save if we are editing an existing check (initialData present) 
        // or maybe we SHOULD save it as a draft? 
        // For now, let's save everything to be safe, but maybe key it differently?
        // The requirement was "Restore Draft Persistence".
        if (!initialData) {
            localStorage.setItem('checkspree_draft', JSON.stringify(formData))
        }
    }, [formData, initialData])

    // Initialize form with initial data if provided
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData,
                checkNumber: checkNumber // Always use prop check number
            }))
            if (initialData.address) setShowAddress(true)
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

        if (!formData.payee?.trim()) {
            alert('Please enter a payee name')
            return
        }

        const parsedAmount = sanitizeCurrencyInput(formData.amount)
        if (parsedAmount <= 0) {
            alert('Please enter a valid amount')
            return
        }

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

        onRecord(checkData)
        handleClear()

        // Clear draft after successful record
        localStorage.removeItem('checkspree_draft')
    }

    // Clear form
    const handleClear = () => {
        const resetData = {
            date: getLocalDateString(),
            payee: '',
            amount: '',
            memo: '',
            external_memo: '',
            internal_memo: '',
            glCode: '',
            address: '',
            checkNumber: checkNumber
        }
        setFormData(resetData)
        setShowAddress(false)
        setShowMemoOptions(false)
        localStorage.removeItem('checkspree_draft')

        if (onClear) onClear()
    }

    return (
        <div className="card card-main">
            <form onSubmit={handleSubmit}>
                {/* Header / Title if needed, or just fields */}

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

                {/* Check Number Field */}
                {showCheckNumber && (
                    <div className="field">
                        <label>Check Number</label>
                        <input
                            type="text"
                            value={formData.checkNumber}
                            onChange={(e) => updateField('checkNumber', e.target.value)}
                            placeholder="Optional"
                        />
                    </div>
                )}

                {/* Payee Field */}
                <div className="field">
                    <label>Pay to the Order of</label>
                    <PayeeAutocomplete
                        value={formData.payee}
                        onChange={(value) => updateField('payee', value)}
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
                            value={formData.amount}
                            onChange={(value) => updateField('amount', value)}
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
                                value={formData.external_memo}
                                onChange={(e) => updateField('external_memo', e.target.value)}
                                placeholder="External memo (printed)..."
                            />
                            <input
                                type="text"
                                value={formData.internal_memo}
                                onChange={(e) => updateField('internal_memo', e.target.value)}
                                placeholder="Internal notes (private)..."
                            />
                        </div>
                    ) : (
                        <input
                            type="text"
                            value={formData.memo}
                            onChange={(e) => updateField('memo', e.target.value)}
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
                            value={formData.glCode}
                            onChange={(e) => updateField('glCode', e.target.value)}
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
                                value={formData.address}
                                onChange={(e) => updateField('address', e.target.value)}
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
                    {/* Note: Submit button is handled by parent or external trigger usually, 
                        but here we have it inline. The original App.jsx had external buttons.
                        We'll keep these here as they were in CheckForm.jsx, but App.jsx might hide them?
                        Actually CheckForm.jsx had them.
                    */}
                </div>
            </form>
        </div>
    )
}
