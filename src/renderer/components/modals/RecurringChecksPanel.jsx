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

    /**
     * Open the add form with empty fields.
     */
    const openAddForm = () => {
        setForm({ payee: '', amount: '', memo: '', frequency: 'monthly', nextDue: new Date().toISOString().split('T')[0] })
        setEditingId(null)
        setShowForm(true)
    }

    /**
     * Open the edit form with existing schedule data.
     */
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

    /**
     * Save (create or update) a schedule.
     */
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

    /**
     * Generate a check from a schedule and advance the next due date.
     */
    const handleGenerate = (schedule) => {
        onGenerateCheck?.({
            payee: schedule.payee,
            amount: schedule.amount,
            memo: schedule.memo
        })
        markGenerated(schedule.id)
        showToast?.(`Check generated for ${schedule.payee}`)
    }

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

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content" style={{ maxWidth: '650px', width: '95%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div className="modal-header" style={{ flexShrink: 0 }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '18px' }}>
                            🔄 Recurring Checks
                        </h3>
                        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                            {stats.active} active · {stats.paused} paused
                            {stats.due > 0 && <span style={{ color: 'var(--warning)', fontWeight: 600 }}> · {stats.due} due!</span>}
                        </span>
                    </div>
                    <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
                </div>

                {/* Due alert */}
                {dueSchedules.length > 0 && !showForm && (
                    <div style={{
                        padding: '8px 12px',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid var(--warning)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '12px',
                        fontSize: '13px',
                        color: 'var(--warning)',
                        fontWeight: 500,
                        flexShrink: 0
                    }}>
                        ⚠ {dueSchedules.length} payment{dueSchedules.length !== 1 ? 's' : ''} due today or overdue
                    </div>
                )}

                {showForm ? (
                    /* ── Add / Edit Form ── */
                    <div style={{ overflow: 'auto', flex: 1 }}>
                        <h4 style={{ margin: '0 0 12px', color: 'var(--text-bright)', fontSize: '15px' }}>
                            {editingId ? '✏️ Edit Schedule' : '➕ New Schedule'}
                        </h4>
                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-label)', display: 'block', marginBottom: '4px' }}>Payee *</label>
                            <input type="text" value={form.payee} onChange={e => setForm(p => ({ ...p, payee: e.target.value }))} style={inputStyle} placeholder="Payee name" autoFocus />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-label)', display: 'block', marginBottom: '4px' }}>Amount</label>
                                <input type="text" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} style={inputStyle} placeholder="0.00" />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-label)', display: 'block', marginBottom: '4px' }}>Frequency</label>
                                <select value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))} style={{ width: '100%' }}>
                                    {Object.entries(frequencyLabels).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-label)', display: 'block', marginBottom: '4px' }}>Next Due Date</label>
                                <input type="date" value={form.nextDue} onChange={e => setForm(p => ({ ...p, nextDue: e.target.value }))} style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-label)', display: 'block', marginBottom: '4px' }}>Memo</label>
                                <input type="text" value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))} style={inputStyle} placeholder="Optional" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                            <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                            <button className="btn primary" onClick={handleSave}>
                                {editingId ? 'Update' : 'Create Schedule'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── Schedule List ── */
                    <>
                        <div style={{ marginBottom: '12px', flexShrink: 0 }}>
                            <button className="btn primary btn-sm" onClick={openAddForm}>+ New Schedule</button>
                        </div>
                        <div style={{ overflow: 'auto', flex: 1 }}>
                            {schedules.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)', fontSize: '13px' }}>
                                    No recurring checks scheduled yet.
                                </div>
                            ) : (
                                schedules.map(schedule => {
                                    const isDue = dueSchedules.some(d => d.id === schedule.id)
                                    return (
                                        <div
                                            key={schedule.id}
                                            style={{
                                                padding: '10px 12px',
                                                borderBottom: '1px solid var(--border-subtle)',
                                                borderLeft: `3px solid ${isDue ? 'var(--warning)' : schedule.active ? 'var(--accent)' : 'var(--border)'}`,
                                                opacity: schedule.active ? 1 : 0.6,
                                                transition: 'opacity 0.15s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-bright)' }}>
                                                        {schedule.payee}
                                                        {isDue && <span style={{ fontSize: '11px', color: 'var(--warning)', marginLeft: '8px', fontWeight: 700 }}>DUE</span>}
                                                        {!schedule.active && <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '8px' }}>PAUSED</span>}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                                                        {frequencyLabels[schedule.frequency]} · Next: {new Date(schedule.nextDue).toLocaleDateString()}
                                                        {schedule.amount && ` · $${schedule.amount}`}
                                                        {schedule.memo && ` · ${schedule.memo}`}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                    {isDue && (
                                                        <button className="btn btn-sm primary" onClick={() => handleGenerate(schedule)} title="Generate check">
                                                            ▶
                                                        </button>
                                                    )}
                                                    <button className="btn btn-sm" onClick={() => toggleSchedule(schedule.id)} title={schedule.active ? 'Pause' : 'Resume'}>
                                                        {schedule.active ? '⏸' : '▶'}
                                                    </button>
                                                    <button className="btn btn-sm" onClick={() => openEditForm(schedule)} title="Edit">✏️</button>
                                                    {confirmDelete === schedule.id ? (
                                                        <>
                                                            <button className="btn btn-sm danger" onClick={() => { deleteSchedule(schedule.id); setConfirmDelete(null); showToast?.('Schedule deleted') }}>Yes</button>
                                                            <button className="btn btn-sm" onClick={() => setConfirmDelete(null)}>No</button>
                                                        </>
                                                    ) : (
                                                        <button className="btn btn-sm" onClick={() => setConfirmDelete(schedule.id)} title="Delete">🗑️</button>
                                                    )}
                                                </div>
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
    )
}
