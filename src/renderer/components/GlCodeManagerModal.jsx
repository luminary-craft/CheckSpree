import React, { useState, useEffect } from 'react'
import { generateId } from '../utils/helpers'

export default function GlCodeManagerModal({ isOpen, onClose, glCodes, onSave, prefillCode = '' }) {
    const [localCodes, setLocalCodes] = useState([])
    const [newCode, setNewCode] = useState('')
    const [newDesc, setNewDesc] = useState('')
    const [editingId, setEditingId] = useState(null)

    useEffect(() => {
        if (isOpen) {
            setLocalCodes([...glCodes])
            if (prefillCode) {
                setNewCode(prefillCode)
            }
        }
    }, [isOpen, glCodes, prefillCode])

    const handleAdd = () => {
        if (!newCode.trim()) return

        // Check for duplicate
        if (localCodes.some(c => c.code === newCode.trim() && c.id !== editingId)) {
            alert('Code already exists')
            return
        }

        if (editingId) {
            setLocalCodes(localCodes.map(c =>
                c.id === editingId ? { ...c, code: newCode.trim(), description: newDesc.trim() } : c
            ))
            setEditingId(null)
        } else {
            setLocalCodes([...localCodes, {
                id: generateId(),
                code: newCode.trim(),
                description: newDesc.trim()
            }])
        }
        setNewCode('')
        setNewDesc('')
    }

    const handleEdit = (code) => {
        setNewCode(code.code)
        setNewDesc(code.description)
        setEditingId(code.id)
    }

    const handleDelete = (id) => {
        if (confirm('Delete this GL Code?')) {
            setLocalCodes(localCodes.filter(c => c.id !== id))
        }
    }

    const handleSave = () => {
        onSave(localCodes)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: '500px' }}>
                <h3>Manage GL Codes</h3>

                <div className="field-row" style={{ alignItems: 'flex-end', marginBottom: '16px' }}>
                    <div className="field" style={{ flex: 1 }}>
                        <label>Code</label>
                        <input
                            value={newCode}
                            onChange={(e) => setNewCode(e.target.value)}
                            placeholder="e.g. 5000"
                            autoFocus
                        />
                    </div>
                    <div className="field" style={{ flex: 2 }}>
                        <label>Description</label>
                        <input
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            placeholder="e.g. Office Supplies"
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                    </div>
                    <button className="btn" onClick={handleAdd}>
                        {editingId ? 'Update' : 'Add'}
                    </button>
                </div>

                <div className="gl-list" style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    marginBottom: '16px'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '8px' }}>Code</th>
                                <th style={{ padding: '8px' }}>Description</th>
                                <th style={{ padding: '8px', width: '80px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {localCodes.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                                    <td style={{ padding: '8px' }}>{c.code}</td>
                                    <td style={{ padding: '8px' }}>{c.description}</td>
                                    <td style={{ padding: '8px' }}>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button className="btn-icon-sm" onClick={() => handleEdit(c)}>✎</button>
                                            <button className="btn-icon-sm danger" onClick={() => handleDelete(c.id)}>×</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="modal-actions">
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btn primary" onClick={handleSave}>Save Changes</button>
                </div>
            </div>
        </div>
    )
}
