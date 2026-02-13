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

    /**
     * Handle approve action with optional note.
     */
    const handleApprove = (id) => {
        approveCheck(id, 'Admin', decisionNote)
        setDecisionNote('')
        setExpandedId(null)
        showToast?.('Check approved ✓')
    }

    /**
     * Handle reject action with optional reason.
     */
    const handleReject = (id) => {
        rejectCheck(id, 'Admin', decisionNote)
        setDecisionNote('')
        setExpandedId(null)
        showToast?.('Check rejected ✗')
    }

    // Tab configuration
    const tabs = [
        { id: 'pending', label: 'Pending', count: counts.pending, color: 'var(--warning)' },
        { id: 'approved', label: 'Approved', count: counts.approved, color: 'var(--success)' },
        { id: 'rejected', label: 'Rejected', count: counts.rejected, color: 'var(--danger)' }
    ]

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content" style={{ maxWidth: '650px', width: '95%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div className="modal-header" style={{ flexShrink: 0 }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '18px' }}>
                            Check Approval Queue
                        </h3>
                        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                            {counts.pending} pending · {counts.approved} approved · {counts.rejected} rejected
                        </span>
                    </div>
                    <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
                </div>

                {/* Settings row */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 0',
                    marginBottom: '12px',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    flexShrink: 0
                }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <input
                            type="checkbox"
                            checked={settings.enabled}
                            onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                        />
                        Enable Approvals
                    </label>
                    {settings.enabled && !settings.requireForAll && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                            Threshold: $
                            <input
                                type="number"
                                value={settings.threshold}
                                onChange={(e) => setSettings(prev => ({ ...prev, threshold: Number(e.target.value) || 0 }))}
                                style={{
                                    width: '80px',
                                    padding: '4px 6px',
                                    backgroundColor: 'var(--surface-elevated)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--text)',
                                    fontSize: '13px'
                                }}
                            />
                        </label>
                    )}
                    {settings.enabled && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
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
                <div style={{ display: 'flex', gap: '2px', marginBottom: '12px', flexShrink: 0 }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`btn btn-sm ${activeTab === tab.id ? 'primary' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                            style={{ position: 'relative' }}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span style={{
                                    marginLeft: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '1px 5px',
                                    borderRadius: '8px',
                                    backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : tab.color,
                                    color: activeTab === tab.id ? 'inherit' : 'var(--bg)'
                                }}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Approval list */}
                <div style={{ overflow: 'auto', flex: 1 }}>
                    {filteredApprovals.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: 'var(--text-dim)',
                            fontSize: '13px'
                        }}>
                            No {activeTab} checks
                            {!settings.enabled && activeTab === 'pending' && (
                                <div style={{ marginTop: '8px' }}>
                                    Enable approvals above to start requiring check approval before printing.
                                </div>
                            )}
                        </div>
                    ) : (
                        filteredApprovals.map(approval => (
                            <div key={approval.id} className="approval-item">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-bright)' }}>
                                            #{approval.checkNumber} — {approval.payee || 'No payee'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                                            ${approval.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            {approval.memo && ` · ${approval.memo}`}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
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

                                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                        {approval.status === 'pending' && (
                                            <>
                                                <button
                                                    className="btn btn-sm"
                                                    onClick={() => setExpandedId(expandedId === approval.id ? null : approval.id)}
                                                    title="Add note"
                                                >
                                                    💬
                                                </button>
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ color: 'var(--success)' }}
                                                    onClick={() => handleApprove(approval.id)}
                                                    title="Approve"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ color: 'var(--danger)' }}
                                                    onClick={() => handleReject(approval.id)}
                                                    title="Reject"
                                                >
                                                    ✗
                                                </button>
                                            </>
                                        )}
                                        {approval.status !== 'pending' && (
                                            <button
                                                className="btn btn-sm"
                                                onClick={() => removeApproval(approval.id)}
                                                title="Remove from history"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded note input for pending items */}
                                {expandedId === approval.id && approval.status === 'pending' && (
                                    <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                                        <input
                                            type="text"
                                            value={decisionNote}
                                            onChange={(e) => setDecisionNote(e.target.value)}
                                            placeholder="Add a note (optional)..."
                                            style={{
                                                flex: 1,
                                                padding: '6px 8px',
                                                backgroundColor: 'var(--surface-elevated)',
                                                border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-sm)',
                                                color: 'var(--text)',
                                                fontSize: '12px',
                                                outline: 'none'
                                            }}
                                        />
                                        <button
                                            className="btn btn-sm"
                                            style={{ color: 'var(--success)' }}
                                            onClick={() => handleApprove(approval.id)}
                                        >
                                            Approve
                                        </button>
                                        <button
                                            className="btn btn-sm"
                                            style={{ color: 'var(--danger)' }}
                                            onClick={() => handleReject(approval.id)}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
