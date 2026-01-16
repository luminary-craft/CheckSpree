import React, { useState } from 'react'
import { formatCurrency } from '../utils/helpers'

/**
 * AdminPanel Component - Settings and administration interface
 * 
 * Features:
 * - Profile management
 * - Calibration settings
 * - Ledger management
 * - General preferences
 * - Password protection
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal visibility
 * @param {Function} props.onClose - Close callback
 * @param {Object} props.profiles - Profiles hook object
 * @param {Object} props.ledger - Ledger hook object
 */
export default function AdminPanel({ isOpen, onClose, profiles, ledger }) {
    const [activeTab, setActiveTab] = useState('general')
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [passwordInput, setPasswordInput] = useState('')
    const [editingProfile, setEditingProfile] = useState(null)
    const [newProfileName, setNewProfileName] = useState('')

    // Check if password protection is enabled
    const isPasswordProtected = profiles.preferences.adminLocked && profiles.preferences.adminPassword

    /**
     * Handle password verification
     */
    const handlePasswordSubmit = (e) => {
        e.preventDefault()
        if (profiles.verifyAdminPassword(passwordInput)) {
            setIsAuthenticated(true)
            setPasswordInput('')
        } else {
            alert('Incorrect password')
            setPasswordInput('')
        }
    }

    /**
     * Handle profile creation
     */
    const handleCreateProfile = () => {
        if (!newProfileName.trim()) {
            alert('Please enter a profile name')
            return
        }
        profiles.createProfile(newProfileName)
        setNewProfileName('')
    }

    /**
     * Handle ledger rename
     */
    const handleRenameLedger = (ledgerId) => {
        const ledgerToRename = ledger.ledgers.find(l => l.id === ledgerId)
        if (!ledgerToRename) return

        const newName = prompt('Enter new ledger name:', ledgerToRename.name)
        if (newName && newName.trim()) {
            ledger.renameLedger(ledgerId, newName.trim())
        }
    }

    if (!isOpen) return null

    // Show password prompt if protected and not authenticated
    if (isPasswordProtected && !isAuthenticated) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                    <div className="modal-header">
                        <h2>Admin Access</h2>
                        <button className="btn-close" onClick={onClose}>×</button>
                    </div>

                    <div className="modal-body">
                        <form onSubmit={handlePasswordSubmit}>
                            <div className="field">
                                <label>Enter Admin Password</label>
                                <input
                                    type="password"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    placeholder="Password"
                                    autoFocus
                                />
                            </div>

                            <button type="submit" className="btn primary full-width" style={{ marginTop: '16px' }}>
                                Unlock
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <h2>Settings & Administration</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    padding: '0 24px',
                    borderBottom: '1px solid #334155'
                }}>
                    {['general', 'profiles', 'calibration', 'ledgers'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '12px 20px',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                                color: activeTab === tab ? '#3b82f6' : '#94a3b8',
                                fontWeight: activeTab === tab ? '600' : '500',
                                fontSize: '14px',
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="modal-body" style={{ minHeight: '400px' }}>
                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <div>
                            <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>General Settings</h3>

                            <div className="field">
                                <label>Theme</label>
                                <select
                                    value={profiles.preferences.theme}
                                    onChange={(e) => profiles.updatePreferences({ theme: e.target.value })}
                                >
                                    <option value="dark">Dark</option>
                                    <option value="light">Light</option>
                                </select>
                            </div>

                            <div className="field">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={profiles.preferences.autoBackup}
                                        onChange={(e) => profiles.updatePreferences({ autoBackup: e.target.checked })}
                                        style={{ marginRight: '8px' }}
                                    />
                                    Enable Auto-Backup
                                </label>
                            </div>

                            <div className="field">
                                <label>Default Font</label>
                                <select
                                    value={profiles.preferences.fontFamily || '"Courier New", monospace'}
                                    onChange={(e) => profiles.updatePreferences({ fontFamily: e.target.value })}
                                >
                                    <option value='"Courier New", monospace'>Courier New (Standard)</option>
                                    <option value='"Times New Roman", serif'>Times New Roman</option>
                                    <option value='"Arial", sans-serif'>Arial</option>
                                    <option value='"Roboto", sans-serif'>Roboto</option>
                                </select>
                            </div>

                            <div className="field">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={profiles.preferences.batchPrintMode}
                                        onChange={(e) => profiles.updatePreferences({ batchPrintMode: e.target.checked })}
                                        style={{ marginRight: '8px' }}
                                    />
                                    Batch Print Mode (Queue Checks)
                                </label>
                                <small style={{ display: 'block', marginTop: '4px', color: 'var(--text-muted)' }}>
                                    If enabled, checks will be added to a print queue instead of printing immediately.
                                </small>
                            </div>

                            <div className="field">
                                <label>Admin Password (leave blank to disable)</label>
                                <input
                                    type="password"
                                    placeholder="New password..."
                                    onBlur={(e) => {
                                        if (e.target.value) {
                                            profiles.setAdminPassword(e.target.value)
                                            e.target.value = ''
                                        }
                                    }}
                                />
                                <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                    {profiles.preferences.adminLocked ? '🔒 Password protection enabled' : '🔓 No password set'}
                                </small>
                            </div>
                        </div>
                    )}

                    {/* Profiles Tab */}
                    {activeTab === 'profiles' && (
                        <div>
                            <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Check Profiles</h3>

                            {/* Profile List */}
                            <div style={{ marginBottom: '20px' }}>
                                {profiles.profiles.map(profile => (
                                    <div
                                        key={profile.id}
                                        style={{
                                            padding: '12px',
                                            marginBottom: '8px',
                                            background: profile.id === profiles.activeProfileId ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                            border: `1px solid ${profile.id === profiles.activeProfileId ? '#3b82f6' : '#334155'}`,
                                            borderRadius: '6px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{profile.name}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                {profile.layout.widthIn}″ × {profile.layout.checkHeightIn}″
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {profile.id !== profiles.activeProfileId && (
                                                <button
                                                    className="btn btn-sm ghost"
                                                    onClick={() => profiles.switchProfile(profile.id)}
                                                >
                                                    Activate
                                                </button>
                                            )}
                                            {profiles.profiles.length > 1 && (
                                                <button
                                                    className="btn btn-sm ghost"
                                                    onClick={() => {
                                                        if (confirm(`Delete profile "${profile.name}"?`)) {
                                                            profiles.deleteProfile(profile.id)
                                                        }
                                                    }}
                                                    style={{ color: '#ef4444' }}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Create New Profile */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    value={newProfileName}
                                    onChange={(e) => setNewProfileName(e.target.value)}
                                    placeholder="New profile name..."
                                    onKeyPress={(e) => e.key === 'Enter' && handleCreateProfile()}
                                    style={{ flex: 1 }}
                                />
                                <button className="btn primary" onClick={handleCreateProfile}>
                                    Create Profile
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Calibration Tab */}
                    {activeTab === 'calibration' && (
                        <div>
                            <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Printer Calibration</h3>

                            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
                                Adjust printer offsets to align check printing perfectly on your physical checks.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                <div className="field">
                                    <label>X Offset (inches)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={profiles.calibration.offsetX}
                                        onChange={(e) => profiles.updateCalibration({ offsetX: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>

                                <div className="field">
                                    <label>Y Offset (inches)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={profiles.calibration.offsetY}
                                        onChange={(e) => profiles.updateCalibration({ offsetY: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div className="field">
                                <label>Printer Name (optional)</label>
                                <input
                                    type="text"
                                    value={profiles.calibration.printerName}
                                    onChange={(e) => profiles.updateCalibration({ printerName: e.target.value })}
                                    placeholder="Default printer"
                                />
                            </div>

                            <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px' }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                    Tests Printed: <strong>{profiles.calibration.testsPrinted || 0}</strong>
                                </div>
                            </div>

                            <button
                                className="btn primary"
                                style={{ marginTop: '16px' }}
                                onClick={() => {
                                    profiles.incrementTestPrints()
                                    // TODO: Trigger test print
                                    alert('Test print functionality coming soon!')
                                }}
                            >
                                Print Test Page
                            </button>
                        </div>
                    )}

                    {/* Ledgers Tab */}
                    {activeTab === 'ledgers' && (
                        <div>
                            <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Manage Ledgers</h3>

                            <table style={{ width: '100%', marginBottom: '20px' }}>
                                <thead>
                                    <tr>
                                        <th>Ledger Name</th>
                                        <th style={{ textAlign: 'right' }}>Balance</th>
                                        <th style={{ textAlign: 'right' }}>Transactions</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ledger.ledgers.map(l => {
                                        const transactions = ledger.checkHistory.filter(t => t.ledgerId === l.id)
                                        return (
                                            <tr key={l.id}>
                                                <td>{l.name}</td>
                                                <td style={{ textAlign: 'right', fontWeight: '600' }}>
                                                    {formatCurrency(ledger.getLedgerBalance(l.id))}
                                                </td>
                                                <td style={{ textAlign: 'right', color: '#64748b' }}>
                                                    {transactions.length}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button
                                                        className="btn btn-sm ghost"
                                                        onClick={() => handleRenameLedger(l.id)}
                                                        style={{ marginRight: '8px' }}
                                                    >
                                                        Rename
                                                    </button>
                                                    {ledger.ledgers.length > 1 && (
                                                        <button
                                                            className="btn btn-sm ghost"
                                                            onClick={() => {
                                                                if (confirm(`Delete ledger "${l.name}" and all its transactions?`)) {
                                                                    ledger.deleteLedger(l.id)
                                                                }
                                                            }}
                                                            style={{ color: '#ef4444' }}
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>

                            <button
                                className="btn primary"
                                onClick={() => ledger.createNewLedger()}
                            >
                                Create New Ledger
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn ghost" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
