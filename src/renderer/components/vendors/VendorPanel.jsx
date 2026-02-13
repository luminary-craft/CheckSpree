import React, { useState, useMemo } from 'react'
import { VendorForm } from './VendorForm'

/**
 * VendorPanel — Main vendor database management panel.
 *
 * Displays a searchable, sortable list of vendors with add/edit/delete.
 * Rendered as a modal overlay triggered from the sidebar or top bar.
 *
 * @param {Object} props
 * @param {Object} props.vendorHook - The useVendors hook return value
 * @param {Array} props.compiledGlCodes - Available GL codes
 * @param {Function} props.onClose - Close the panel
 * @param {Function} props.onOpen1099 - Open the 1099 report modal
 * @param {Function} props.showToast - Display a toast notification
 */
export function VendorPanel({ vendorHook, compiledGlCodes, onClose, onOpen1099, showToast }) {
    const {
        vendors,
        vendorStats,
        addVendor,
        updateVendor,
        deleteVendor,
        searchVendors,
        getVendorPayments
    } = vendorHook

    const [searchQuery, setSearchQuery] = useState('')
    const [editingVendor, setEditingVendor] = useState(null) // null = list view, 'new' = add, vendor obj = edit
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [sortBy, setSortBy] = useState('name') // 'name', 'recent', '1099'

    // Filtered and sorted vendor list
    const displayedVendors = useMemo(() => {
        let list = searchQuery
            ? searchVendors(searchQuery, 50)
            : [...vendors]

        // Sort
        if (sortBy === 'name') {
            list.sort((a, b) => a.name.localeCompare(b.name))
        } else if (sortBy === 'recent') {
            list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        } else if (sortBy === '1099') {
            list = list.filter(v => v.is1099Eligible)
            list.sort((a, b) => a.name.localeCompare(b.name))
        }

        return list
    }, [vendors, searchQuery, sortBy, searchVendors])

    /**
     * Save handler for create/edit form.
     */
    const handleSave = (formData) => {
        if (editingVendor === 'new') {
            addVendor(formData)
            showToast?.(`Added vendor: ${formData.name}`)
        } else {
            updateVendor(editingVendor.id, formData)
            showToast?.(`Updated vendor: ${formData.name}`)
        }
        setEditingVendor(null)
    }

    /**
     * Confirm and execute vendor deletion.
     */
    const handleDelete = (vendorId) => {
        const vendor = vendors.find(v => v.id === vendorId)
        deleteVendor(vendorId)
        setConfirmDelete(null)
        showToast?.(`Deleted vendor: ${vendor?.name}`)
    }

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content" style={{ maxWidth: '700px', width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div className="modal-header" style={{ flexShrink: 0 }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '18px' }}>
                            Vendor Database
                        </h3>
                        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                            {vendorStats.total} vendor{vendorStats.total !== 1 ? 's' : ''}
                            {vendorStats.eligible1099 > 0 && ` · ${vendorStats.eligible1099} eligible for 1099`}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {onOpen1099 && vendorStats.eligible1099 > 0 && (
                            <button className="btn btn-sm" onClick={onOpen1099} title="Generate 1099 report">
                                📋 1099 Report
                            </button>
                        )}
                        <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
                    </div>
                </div>

                {/* Show form or list */}
                {editingVendor !== null ? (
                    /* ── Add/Edit Form ── */
                    <div style={{ overflow: 'auto', flex: 1, padding: '0 4px' }}>
                        <h4 style={{ color: 'var(--text-bright)', margin: '0 0 16px', fontSize: '15px' }}>
                            {editingVendor === 'new' ? '➕ Add New Vendor' : `✏️ Edit: ${editingVendor.name}`}
                        </h4>
                        <VendorForm
                            vendor={editingVendor === 'new' ? null : editingVendor}
                            onSave={handleSave}
                            onCancel={() => setEditingVendor(null)}
                            compiledGlCodes={compiledGlCodes}
                        />
                    </div>
                ) : (
                    /* ── Vendor List ── */
                    <>
                        {/* Search + Actions Bar */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexShrink: 0 }}>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search vendors..."
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    backgroundColor: 'var(--surface-elevated)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--text)',
                                    fontSize: '13px',
                                    outline: 'none'
                                }}
                            />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                style={{ minWidth: '120px' }}
                            >
                                <option value="name">Name A-Z</option>
                                <option value="recent">Recently Updated</option>
                                <option value="1099">1099 Eligible</option>
                            </select>
                            <button
                                className="btn primary btn-sm"
                                onClick={() => setEditingVendor('new')}
                            >
                                + Add
                            </button>
                        </div>

                        {/* Vendor list */}
                        <div style={{ overflow: 'auto', flex: 1 }}>
                            {displayedVendors.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px 20px',
                                    color: 'var(--text-dim)'
                                }}>
                                    {searchQuery
                                        ? `No vendors matching "${searchQuery}"`
                                        : 'No vendors yet. Click "+ Add" to create your first vendor.'
                                    }
                                </div>
                            ) : (
                                <div className="vendor-list">
                                    {displayedVendors.map(vendor => (
                                        <div key={vendor.id} className="vendor-list-item">
                                            <div className="vendor-list-info">
                                                <div className="vendor-list-name">
                                                    {vendor.name}
                                                    {vendor.is1099Eligible && (
                                                        <span className="vendor-badge-1099" title="1099 Eligible">1099</span>
                                                    )}
                                                </div>
                                                <div className="vendor-list-details">
                                                    {[
                                                        vendor.city && vendor.state ? `${vendor.city}, ${vendor.state}` : (vendor.city || vendor.state || ''),
                                                        vendor.phone,
                                                        vendor.email
                                                    ].filter(Boolean).join(' · ') || 'No contact info'}
                                                </div>
                                            </div>
                                            <div className="vendor-list-actions">
                                                <button
                                                    className="btn btn-sm"
                                                    onClick={() => setEditingVendor(vendor)}
                                                    title="Edit vendor"
                                                >
                                                    ✏️
                                                </button>
                                                {confirmDelete === vendor.id ? (
                                                    <>
                                                        <button
                                                            className="btn btn-sm danger"
                                                            onClick={() => handleDelete(vendor.id)}
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            className="btn btn-sm"
                                                            onClick={() => setConfirmDelete(null)}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        className="btn btn-sm"
                                                        onClick={() => setConfirmDelete(vendor.id)}
                                                        title="Delete vendor"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
