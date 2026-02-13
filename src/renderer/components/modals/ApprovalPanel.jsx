import React, { useState } from 'react'

/**
 * ApprovalPanel — Check Approval Queue Modal.
 *
 * Displays pending, approved, and rejected checks in a tabbed
 * interface. Admins can approve/reject pending checks with notes.
 *
 * @param {Object} props
 * @param {Object} props.approvalHook - The useApprovals hook return value
 * @param {Function} props.onClose - Close the panel
 * @param {Function} props.showToast - Display a toast notification
 */
export function ApprovalPanel({ approvalHook, onClose, showToast }) {
    const {
        approvals,
        counts,
        settings,
        setSettings,
        approveCheck,
        rejectCheck,
        removeApproval
    } = approvalHook

    const [activeTab, setActiveTab] = useState('pending')
    const [decisionNote, setDecisionNote] = useState('')
    const [expandedId, setExpandedId] = useState(null) // which row has decision UI open

    // Filter approvals by active tab
    const filteredApprovals = approvals.filter(a => a.status === activeTab)

    /** Handle approve action with optional note */
    const handleApprove = (id) => {
        approveCheck(id, 'Admin', decisionNote)
        setDecisionNote('')
        setExpandedId(null)
        showToast?.('Check approved ✓')
    }

    /** Handle reject action with optional reason */
    const handleReject = (id) => {
        rejectCheck(id, 'Admin', decisionNote)
        setDecisionNote('')
        setExpandedId(null)
        showToast?.('Check rejected ✗')
    }

    // Tab configuration
    const tabs = [
        { id: 'pending', label: 'Pending', count: counts.pending },
        { id: 'approved', label: 'Approved', count: counts.approved },
        { id: 'rejected', label: 'Rejected', count: counts.rejected }
    ]

    // Map approval status to left-border class
    const borderMap = { pending: 'border-warning', approved: 'border-success', rejected: 'border-danger' }

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content" style={{ maxWidth: '650px', width: '95%', maxHeight: '80vh' }}>

                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 style={{ margin: 0 }}>Check Approval Queue</h2>
                        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                            {counts.pending} pending · {counts.approved} approved · {counts.rejected} rejected
                        </span>
                    </div>
                    <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Settings row */}
                    <div className="panel-row" style={{ gap: '12px', paddingBottom: '10px', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                        <label className="panel-checkbox">
                            <input
                                type="checkbox"
                                checked={settings.enabled}
                                onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                            />
                            Enable Approvals
                        </label>
                        {settings.enabled && !settings.requireForAll && (
                            <label className="panel-checkbox">
                                Threshold: $
                                <input
                                    type="number"
                                    className="panel-input"
                                    value={settings.threshold}
                                    onChange={(e) => setSettings(prev => ({ ...prev, threshold: Number(e.target.value) || 0 }))}
                                    style={{ width: '80px', padding: '4px 6px' }}
                                />
                            </label>
                        )}
                        {settings.enabled && (
                            <label className="panel-checkbox">
                                <input
                                    type="checkbox"
                                    checked={settings.requireForAll}
                                    onChange={(e) => setSettings(prev => ({ ...prev, requireForAll: e.target.checked }))}
                                />
                                All checks
                            </label>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="panel-tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`panel-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                                {tab.count > 0 && <span className="panel-badge" style={{ marginLeft: '6px' }}>{tab.count}</span>}
                            </button>
                        ))}
                    </div>

                    {/* Approval list */}
                    <div className="panel-list-scroll" style={{ maxHeight: '350px' }}>
                        {filteredApprovals.length === 0 ? (
                            <div className="panel-empty">
                                No {activeTab} checks
                                {!settings.enabled && activeTab === 'pending' && (
                                    <div style={{ marginTop: '8px' }}>
                                        Enable approvals above to start requiring check approval before printing.
                                    </div>
                                )}
                            </div>
                        ) : (
                            filteredApprovals.map(approval => (
                                <div key={approval.id} className={`panel-list-item ${borderMap[approval.status] || ''}`} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div className="panel-list-primary">
                                                #{approval.checkNumber} — {approval.payee || 'No payee'}
                                            </div>
                                            <div className="panel-list-secondary">
                                                ${approval.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                {approval.memo && ` · ${approval.memo}`}
                                            </div>
                                            <div className="panel-list-secondary" style={{ fontSize: '11px', marginTop: '4px' }}>
                                                Requested by {approval.requestedBy} · {new Date(approval.requestedAt).toLocaleDateString()}
                                                {approval.decidedAt && (
                                                    <span> · {approval.status === 'approved' ? 'Approved' : 'Rejected'} by {approval.decidedBy}</span>
                                                )}
                                            </div>
                                            {approval.decisionNote && (
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                                                    "{approval.decisionNote}"
                                                </div>
                                            )}
                                        </div>

                                        <div className="panel-row" style={{ gap: '4px', flexShrink: 0 }}>
                                            {approval.status === 'pending' && (
                                                <>
                                                    <button className="btn btn-sm" onClick={() => setExpandedId(expandedId === approval.id ? null : approval.id)} title="Add note">💬</button>
                                                    <button className="btn btn-sm" style={{ color: 'var(--success)' }} onClick={() => handleApprove(approval.id)} title="Approve">✓</button>
                                                    <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleReject(approval.id)} title="Reject">✗</button>
                                                </>
                                            )}
                                            {approval.status !== 'pending' && (
                                                <button className="btn btn-sm" onClick={() => removeApproval(approval.id)} title="Remove from history">🗑️</button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded note input for pending items */}
                                    {expandedId === approval.id && approval.status === 'pending' && (
                                        <div className="panel-row" style={{ marginTop: '8px', gap: '6px' }}>
                                            <input
                                                type="text"
                                                className="panel-input"
                                                value={decisionNote}
                                                onChange={(e) => setDecisionNote(e.target.value)}
                                                placeholder="Add a note (optional)..."
                                                style={{ flex: 1, fontSize: '12px', padding: '6px 8px' }}
                                            />
                                            <button className="btn btn-sm" style={{ color: 'var(--success)' }} onClick={() => handleApprove(approval.id)}>Approve</button>
                                            <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleReject(approval.id)}>Reject</button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
