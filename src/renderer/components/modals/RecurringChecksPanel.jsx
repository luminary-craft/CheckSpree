import React, { useState } from 'react'

/**
 * RecurringChecksPanel — Scheduled/Recurring Payments Modal.
 *
 * Displays all recurring schedules, highlights overdue ones,
 * and allows creating, editing, pausing, and deleting schedules.
 *
 * @param {Object} props
 * @param {Object} props.recurringHook - useRecurringChecks hook return
 * @param {Function} props.onClose - Close the panel
 * @param {Function} props.onGenerateCheck - Called with schedule data to auto-fill a check
 * @param {Function} props.showToast - Display a toast notification
 */
export function RecurringChecksPanel({ recurringHook, onClose, onGenerateCheck, showToast }) {
    const {
        schedules,
        dueSchedules,
        stats,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        toggleSchedule,
        markGenerated
    } = recurringHook

    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [confirmDelete, setConfirmDelete] = useState(null)

    // Form state
    const [form, setForm] = useState({
        payee: '', amount: '', memo: '', frequency: 'monthly', nextDue: new Date().toISOString().split('T')[0]
    })

    const frequencyLabels = {
        weekly: 'Weekly',
        biweekly: 'Bi-Weekly',
        monthly: 'Monthly',
        quarterly: 'Quarterly',
        annually: 'Annually'
    }

    /** Open the add form with empty fields */
    const openAddForm = () => {
        setForm({ payee: '', amount: '', memo: '', frequency: 'monthly', nextDue: new Date().toISOString().split('T')[0] })
        setEditingId(null)
        setShowForm(true)
    }

    /** Open the edit form with existing schedule data */
    const openEditForm = (schedule) => {
        setForm({
            payee: schedule.payee,
            amount: schedule.amount,
            memo: schedule.memo || '',
            frequency: schedule.frequency,
            nextDue: schedule.nextDue
        })
        setEditingId(schedule.id)
        setShowForm(true)
    }

    /** Save (create or update) a schedule */
    const handleSave = () => {
        if (!form.payee.trim()) {
            showToast?.('Payee name is required')
            return
        }

        if (editingId) {
            updateSchedule(editingId, form)
            showToast?.(`Updated schedule: ${form.payee}`)
        } else {
            addSchedule(form)
            showToast?.(`Created schedule: ${form.payee}`)
        }
        setShowForm(false)
        setEditingId(null)
    }

    /** Generate a check from a schedule and advance the next due date */
    const handleGenerate = (schedule) => {
        onGenerateCheck?.({
            payee: schedule.payee,
            amount: schedule.amount,
            memo: schedule.memo
        })
        markGenerated(schedule.id)
        showToast?.(`Check generated for ${schedule.payee}`)
    }

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content" style={{ maxWidth: '650px', width: '95%', maxHeight: '80vh' }}>

                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 style={{ margin: 0 }}>🔄 Recurring Checks</h2>
                        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                            {stats.active} active · {stats.paused} paused
                            {stats.due > 0 && <span className="panel-badge warning" style={{ marginLeft: '6px' }}>{stats.due} due</span>}
                        </span>
                    </div>
                    <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Due alert */}
                    {dueSchedules.length > 0 && !showForm && (
                        <div className="panel-alert warning">
                            ⚠ {dueSchedules.length} payment{dueSchedules.length !== 1 ? 's' : ''} due today or overdue
                        </div>
                    )}

                    {showForm ? (
                        /* ── Add / Edit Form ── */
                        <>
                            <h3 style={{ margin: '0 0 14px', color: 'var(--text-bright)', fontSize: '15px' }}>
                                {editingId ? '✏️ Edit Schedule' : '➕ New Schedule'}
                            </h3>
                            <div className="panel-field">
                                <label className="panel-label">Payee *</label>
                                <input type="text" className="panel-input" value={form.payee} onChange={e => setForm(p => ({ ...p, payee: e.target.value }))} placeholder="Payee name" autoFocus />
                            </div>
                            <div className="panel-grid-2">
                                <div>
                                    <label className="panel-label">Amount</label>
                                    <input type="text" className="panel-input" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="panel-label">Frequency</label>
                                    <select className="panel-select" value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}>
                                        {Object.entries(frequencyLabels).map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="panel-grid-2">
                                <div>
                                    <label className="panel-label">Next Due Date</label>
                                    <input type="date" className="panel-input" value={form.nextDue} onChange={e => setForm(p => ({ ...p, nextDue: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="panel-label">Memo</label>
                                    <input type="text" className="panel-input" value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))} placeholder="Optional" />
                                </div>
                            </div>
                            <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: 'none' }}>
                                <button className="btn ghost" onClick={() => setShowForm(false)}>Cancel</button>
                                <button className="btn primary" onClick={handleSave}>
                                    {editingId ? 'Update' : 'Create Schedule'}
                                </button>
                            </div>
                        </>
                    ) : (
                        /* ── Schedule List ── */
                        <>
                            <div style={{ marginBottom: '14px' }}>
                                <button className="btn primary" onClick={openAddForm}>+ New Schedule</button>
                            </div>
                            <div className="panel-list-scroll" style={{ maxHeight: '400px' }}>
                                {schedules.length === 0 ? (
                                    <div className="panel-empty">No recurring checks scheduled yet.</div>
                                ) : (
                                    schedules.map(schedule => {
                                        const isDue = dueSchedules.some(d => d.id === schedule.id)
                                        const borderClass = isDue ? 'border-warning' : schedule.active ? 'border-accent' : 'border-muted'
                                        return (
                                            <div
                                                key={schedule.id}
                                                className={`panel-list-item ${borderClass} ${schedule.active ? '' : 'dimmed'}`}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <div className="panel-list-primary">
                                                        {schedule.payee}
                                                        {isDue && <span className="panel-badge warning">DUE</span>}
                                                        {!schedule.active && <span className="panel-badge muted">PAUSED</span>}
                                                    </div>
                                                    <div className="panel-list-secondary">
                                                        {frequencyLabels[schedule.frequency]} · Next: {new Date(schedule.nextDue).toLocaleDateString()}
                                                        {schedule.amount && ` · $${schedule.amount}`}
                                                        {schedule.memo && ` · ${schedule.memo}`}
                                                    </div>
                                                </div>
                                                <div className="panel-row" style={{ gap: '4px', flexShrink: 0 }}>
                                                    {isDue && (
                                                        <button className="btn primary btn-sm" onClick={() => handleGenerate(schedule)} title="Generate check">▶</button>
                                                    )}
                                                    <button className="btn btn-sm" onClick={() => toggleSchedule(schedule.id)} title={schedule.active ? 'Pause' : 'Resume'}>
                                                        {schedule.active ? '⏸' : '▶'}
                                                    </button>
                                                    <button className="btn btn-sm" onClick={() => openEditForm(schedule)} title="Edit">✏️</button>
                                                    {confirmDelete === schedule.id ? (
                                                        <>
                                                            <button className="btn danger btn-sm" onClick={() => { deleteSchedule(schedule.id); setConfirmDelete(null); showToast?.('Schedule deleted') }}>Yes</button>
                                                            <button className="btn btn-sm" onClick={() => setConfirmDelete(null)}>No</button>
                                                        </>
                                                    ) : (
                                                        <button className="btn btn-sm" onClick={() => setConfirmDelete(schedule.id)} title="Delete">🗑️</button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
