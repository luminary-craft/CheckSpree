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

    /** Update a single form field value */
    const updateField = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }))
        // Clear errors when user starts typing
        if (errors.length) setErrors([])
    }

    /** Validate and submit the form */
    const handleSubmit = (e) => {
        e.preventDefault()

        const validationErrors = validateVendor(form)
        if (validationErrors.length > 0) {
            setErrors(validationErrors)
            return
        }

        onSave(form)
    }

    return (
        <form onSubmit={handleSubmit} className="vendor-form">
            {/* Error display */}
            {errors.length > 0 && (
                <div className="panel-alert danger" style={{ marginBottom: '16px' }}>
                    <div>{errors.map((err, i) => <div key={i}>⚠ {err}</div>)}</div>
                </div>
            )}

            {/* Vendor Name - Required */}
            <div className="panel-field">
                <label className="panel-label">Vendor Name *</label>
                <input
                    type="text"
                    className="panel-input"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Enter vendor/payee name"
                    autoFocus
                />
            </div>

            {/* Address */}
            <div className="panel-field">
                <label className="panel-label">Street Address</label>
                <input
                    type="text"
                    className="panel-input"
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="123 Main Street"
                />
            </div>

            {/* City / State / ZIP — 3-column grid with custom proportions */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div>
                    <label className="panel-label">City</label>
                    <input
                        type="text"
                        className="panel-input"
                        value={form.city}
                        onChange={(e) => updateField('city', e.target.value)}
                    />
                </div>
                <div>
                    <label className="panel-label">State</label>
                    <input
                        type="text"
                        className="panel-input"
                        value={form.state}
                        onChange={(e) => updateField('state', e.target.value)}
                        maxLength={2}
                        placeholder="TX"
                    />
                </div>
                <div>
                    <label className="panel-label">ZIP</label>
                    <input
                        type="text"
                        className="panel-input"
                        value={form.zip}
                        onChange={(e) => updateField('zip', e.target.value)}
                        placeholder="75001"
                    />
                </div>
            </div>

            {/* Phone / Email */}
            <div className="panel-grid-2">
                <div>
                    <label className="panel-label">Phone</label>
                    <input
                        type="tel"
                        className="panel-input"
                        value={form.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        placeholder="(555) 123-4567"
                    />
                </div>
                <div>
                    <label className="panel-label">Email</label>
                    <input
                        type="email"
                        className="panel-input"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="vendor@example.com"
                    />
                </div>
            </div>

            {/* Tax ID / 1099 Eligible */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end', marginBottom: '14px' }}>
                <div>
                    <label className="panel-label">Tax ID (EIN/SSN)</label>
                    <input
                        type="text"
                        className="panel-input"
                        value={form.taxId}
                        onChange={(e) => updateField('taxId', e.target.value)}
                        placeholder="XX-XXXXXXX"
                    />
                </div>
                <label className="panel-checkbox" style={{ paddingBottom: '8px' }}>
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
                <div className="panel-field">
                    <label className="panel-label">Default GL Code</label>
                    <select
                        className="panel-select"
                        value={form.defaultGlCode}
                        onChange={(e) => updateField('defaultGlCode', e.target.value)}
                    >
                        <option value="">None</option>
                        {compiledGlCodes.map(code => (
                            <option key={code} value={code}>{code}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Notes */}
            <div className="panel-field">
                <label className="panel-label">Notes</label>
                <textarea
                    className="panel-textarea"
                    value={form.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Internal notes about this vendor..."
                />
            </div>

            {/* Actions */}
            <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: 'none' }}>
                <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
                <button type="submit" className="btn primary">
                    {vendor ? 'Update Vendor' : 'Add Vendor'}
                </button>
            </div>
        </form>
    )
}
