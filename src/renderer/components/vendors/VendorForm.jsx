import React, { useState } from 'react'
import { validateVendor } from '../../utils/vendorHelpers'

/**
 * VendorForm — Form for creating/editing a vendor record.
 *
 * Handles all vendor fields: name, contact info, address, tax ID,
 * 1099 eligibility, default GL code, and notes.
 *
 * @param {Object} props
 * @param {Object} [props.vendor] - Existing vendor data (for edit mode)
 * @param {Function} props.onSave - Called with vendor data on save
 * @param {Function} props.onCancel - Called to dismiss the form
 * @param {Array} [props.compiledGlCodes] - Available GL codes for dropdown
 */
export function VendorForm({ vendor, onSave, onCancel, compiledGlCodes = [] }) {
    // Initialize form state from existing vendor or empty defaults
    const [form, setForm] = useState({
        name: vendor?.name || '',
        address: vendor?.address || '',
        city: vendor?.city || '',
        state: vendor?.state || '',
        zip: vendor?.zip || '',
        phone: vendor?.phone || '',
        email: vendor?.email || '',
        taxId: vendor?.taxId || '',
        is1099Eligible: vendor?.is1099Eligible || false,
        defaultGlCode: vendor?.defaultGlCode || '',
        notes: vendor?.notes || ''
    })

    const [errors, setErrors] = useState([])

    /**
     * Update a single form field value.
     */
    const updateField = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }))
        // Clear errors when user starts typing
        if (errors.length) setErrors([])
    }

    /**
     * Validate and submit the form.
     */
    const handleSubmit = (e) => {
        e.preventDefault()

        const validationErrors = validateVendor(form)
        if (validationErrors.length > 0) {
            setErrors(validationErrors)
            return
        }

        onSave(form)
    }

    // Shared input style for consistent field appearance
    const inputStyle = {
        width: '100%',
        padding: '8px 10px',
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text)',
        fontSize: '13px',
        outline: 'none'
    }

    const labelStyle = {
        fontSize: '12px',
        color: 'var(--text-label)',
        display: 'block',
        marginBottom: '4px',
        fontWeight: 500
    }

    return (
        <form onSubmit={handleSubmit} className="vendor-form">
            {/* Error display */}
            {errors.length > 0 && (
                <div style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--danger-soft)',
                    border: '1px solid var(--danger)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '16px',
                    fontSize: '13px',
                    color: 'var(--danger)'
                }}>
                    {errors.map((err, i) => <div key={i}>⚠ {err}</div>)}
                </div>
            )}

            {/* Vendor Name - Required */}
            <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Vendor Name *</label>
                <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    style={inputStyle}
                    placeholder="Enter vendor/payee name"
                    autoFocus
                />
            </div>

            {/* Address */}
            <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Street Address</label>
                <input
                    type="text"
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    style={inputStyle}
                    placeholder="123 Main Street"
                />
            </div>

            {/* City / State / ZIP */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div>
                    <label style={labelStyle}>City</label>
                    <input
                        type="text"
                        value={form.city}
                        onChange={(e) => updateField('city', e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label style={labelStyle}>State</label>
                    <input
                        type="text"
                        value={form.state}
                        onChange={(e) => updateField('state', e.target.value)}
                        style={inputStyle}
                        maxLength={2}
                        placeholder="TX"
                    />
                </div>
                <div>
                    <label style={labelStyle}>ZIP</label>
                    <input
                        type="text"
                        value={form.zip}
                        onChange={(e) => updateField('zip', e.target.value)}
                        style={inputStyle}
                        placeholder="75001"
                    />
                </div>
            </div>

            {/* Phone / Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div>
                    <label style={labelStyle}>Phone</label>
                    <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        style={inputStyle}
                        placeholder="(555) 123-4567"
                    />
                </div>
                <div>
                    <label style={labelStyle}>Email</label>
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        style={inputStyle}
                        placeholder="vendor@example.com"
                    />
                </div>
            </div>

            {/* Tax ID / 1099 Eligible */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end', marginBottom: '12px' }}>
                <div>
                    <label style={labelStyle}>Tax ID (EIN/SSN)</label>
                    <input
                        type="text"
                        value={form.taxId}
                        onChange={(e) => updateField('taxId', e.target.value)}
                        style={inputStyle}
                        placeholder="XX-XXXXXXX"
                    />
                </div>
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '8px 0'
                }}>
                    <input
                        type="checkbox"
                        checked={form.is1099Eligible}
                        onChange={(e) => updateField('is1099Eligible', e.target.checked)}
                    />
                    1099 Eligible
                </label>
            </div>

            {/* Default GL Code */}
            {compiledGlCodes.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <label style={labelStyle}>Default GL Code</label>
                    <select
                        value={form.defaultGlCode}
                        onChange={(e) => updateField('defaultGlCode', e.target.value)}
                        style={{ width: '100%' }}
                    >
                        <option value="">None</option>
                        {compiledGlCodes.map(code => (
                            <option key={code} value={code}>{code}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Notes */}
            <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Notes</label>
                <textarea
                    value={form.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    style={{
                        ...inputStyle,
                        minHeight: '60px',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                    }}
                    placeholder="Internal notes about this vendor..."
                />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={onCancel}>Cancel</button>
                <button type="submit" className="btn primary">
                    {vendor ? 'Update Vendor' : 'Add Vendor'}
                </button>
            </div>
        </form>
    )
}
