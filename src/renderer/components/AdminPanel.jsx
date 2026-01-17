import React, { useState, useEffect } from 'react'
import { formatCurrency } from '../utils/helpers'

const AdminPanel = ({ isOpen, onClose, profiles, ledger }) => {
    const [activeTab, setActiveTab] = useState('general')
    const [localPreferences, setLocalPreferences] = useState(profiles.preferences)

    // Backup State
    const [backups, setBackups] = useState([])
    const [isLoadingBackups, setIsLoadingBackups] = useState(false)
    const [backupFilename, setBackupFilename] = useState('')
    const [showManualBackupModal, setShowManualBackupModal] = useState(false)
    const [backupPassword, setBackupPassword] = useState('')
    const [showBackupPasswordModal, setShowBackupPasswordModal] = useState(false)

    // Sync local preferences with props
    useEffect(() => {
        setLocalPreferences(profiles.preferences)
    }, [profiles.preferences])

    // Load backups when tab is active
    useEffect(() => {
        if (activeTab === 'backups' && isOpen) {
            loadBackups()
        }
    }, [activeTab, isOpen])

    const loadBackups = async () => {
        setIsLoadingBackups(true)
        try {
            const result = await window.cs2.backupList()
            if (result.success) {
                setBackups(result.backups)
            }
        } catch (error) {
            console.error('Failed to load backups:', error)
        } finally {
            setIsLoadingBackups(false)
        }
    }

    const handleSavePreferences = () => {
        profiles.updatePreferences(localPreferences)
        alert('Preferences saved')
    }

    const handleManualBackup = async () => {
        const today = new Date().toISOString().slice(0, 10)
        setBackupFilename(`CheckSpree_Backup_${today}`)
        setShowManualBackupModal(true)
    }

    const confirmManualBackup = () => {
        setShowManualBackupModal(false)
        setShowBackupPasswordModal(true)
    }

    const executeBackup = async () => {
        setShowBackupPasswordModal(false)
        try {
            const result = await window.cs2.backupSave(backupPassword)
            if (result.success) {
                alert(`Backup saved successfully!${result.isEncrypted ? ' (Encrypted)' : ''}`)
                loadBackups() // Refresh list
            } else {
                alert('Backup failed')
            }
        } catch (error) {
            alert(`Error creating backup: ${error.message}`)
        }
        setBackupPassword('')
    }

    const handleRestoreBackup = async (backupPath) => {
        if (!confirm('Are you sure you want to restore this backup? Current data will be replaced.')) return

        const password = prompt('If this backup is encrypted, enter the password (leave empty if not):')

        try {
            const result = await window.cs2.backupRestoreFile(backupPath, password)
            if (result.success) {
                alert('Backup restored successfully. The application will now reload.')
                window.location.reload()
            } else {
                alert(`Restore failed: ${result.error}`)
            }
        } catch (error) {
            alert(`Restore error: ${error.message}`)
        }
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay">
            <div className="modal-content admin-panel" style={{ width: '800px', maxWidth: '90vw', height: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <h2>Settings & Admin</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>

                <div className="admin-layout" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Sidebar Navigation */}
                    <div className="admin-sidebar" style={{ width: '200px', borderRight: '1px solid var(--border)', padding: '10px' }}>
                        <button
                            className={`btn ghost full-width ${activeTab === 'general' ? 'active' : ''}`}
                            onClick={() => setActiveTab('general')}
                            style={{ justifyContent: 'flex-start', marginBottom: '5px' }}
                        >
                            General
                        </button>
                        <button
                            className={`btn ghost full-width ${activeTab === 'profiles' ? 'active' : ''}`}
                            onClick={() => setActiveTab('profiles')}
                            style={{ justifyContent: 'flex-start', marginBottom: '5px' }}
                        >
                            Profiles
                        </button>
                        <button
                            className={`btn ghost full-width ${activeTab === 'calibration' ? 'active' : ''}`}
                            onClick={() => setActiveTab('calibration')}
                            style={{ justifyContent: 'flex-start', marginBottom: '5px' }}
                        >
                            Calibration
                        </button>
                        <button
                            className={`btn ghost full-width ${activeTab === 'ledgers' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ledgers')}
                            style={{ justifyContent: 'flex-start', marginBottom: '5px' }}
                        >
                            Ledgers
                        </button>
                        <button
                            className={`btn ghost full-width ${activeTab === 'backups' ? 'active' : ''}`}
                            onClick={() => setActiveTab('backups')}
                            style={{ justifyContent: 'flex-start', marginBottom: '5px' }}
                        >
                            Backups
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="admin-content" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>

                        {/* GENERAL TAB */}
                        {activeTab === 'general' && (
                            <div className="tab-content">
                                <h3>General Preferences</h3>
                                <div className="form-group">
                                    <label>Theme</label>
                                    <select
                                        value={localPreferences.theme || 'light'}
                                        onChange={(e) => setLocalPreferences({ ...localPreferences, theme: e.target.value })}
                                        className="input"
                                    >
                                        <option value="light">Light</option>
                                        <option value="dark">Dark</option>
                                        <option value="system">System Default</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={localPreferences.autoBackup || false}
                                            onChange={(e) => setLocalPreferences({ ...localPreferences, autoBackup: e.target.checked })}
                                        />
                                        Enable Auto-Backup
                                    </label>
                                </div>
                                <button className="btn primary" onClick={handleSavePreferences}>Save Changes</button>
                            </div>
                        )}

                        {/* PROFILES TAB */}
                        {activeTab === 'profiles' && (
                            <div className="tab-content">
                                <h3>Profile Management</h3>
                                <div className="profile-list">
                                    {profiles.profiles.map(p => (
                                        <div key={p.id} className="card" style={{ padding: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <strong>{p.name}</strong>
                                                {p.id === profiles.activeProfileId && <span className="tag" style={{ marginLeft: '10px', fontSize: '10px' }}>Active</span>}
                                            </div>
                                            <button className="btn sm" onClick={() => profiles.setActiveProfileId(p.id)}>Select</button>
                                        </div>
                                    ))}
                                </div>
                                <button className="btn primary" onClick={() => profiles.createNewProfile()}>Create New Profile</button>
                            </div>
                        )}

                        {/* CALIBRATION TAB */}
                        {activeTab === 'calibration' && (
                            <div className="tab-content">
                                <h3>Printer Calibration</h3>
                                <p>Adjust the print offsets for your specific printer.</p>
                                {/* TODO: Add calibration controls here */}
                                <div className="alert info">Calibration controls coming soon.</div>
                            </div>
                        )}

                        {/* LEDGERS TAB */}
                        {activeTab === 'ledgers' && (
                            <div className="tab-content">
                                <h3>Ledger Management</h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border)' }}>Name</th>
                                            <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid var(--border)' }}>Balance</th>
                                            <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid var(--border)' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledger.ledgers.map(l => (
                                            <tr key={l.id}>
                                                <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>{l.name}</td>
                                                <td style={{ padding: '8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace' }}>
                                                    {formatCurrency(l.balance)}
                                                </td>
                                                <td style={{ padding: '8px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                                                    <button className="btn sm ghost" onClick={() => ledger.deleteLedger(l.id)} style={{ color: 'var(--error)' }}>Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button className="btn primary" style={{ marginTop: '15px' }} onClick={() => ledger.createNewLedger()}>Create New Ledger</button>
                            </div>
                        )}

                        {/* BACKUPS TAB */}
                        {activeTab === 'backups' && (
                            <div className="tab-content">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3>Backups</h3>
                                    <button className="btn primary" onClick={handleManualBackup}>Create Backup</button>
                                </div>

                                {isLoadingBackups ? (
                                    <div className="spinner"></div>
                                ) : (
                                    <div className="backup-list">
                                        {backups.length === 0 ? (
                                            <p>No backups found.</p>
                                        ) : (
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border)' }}>Date</th>
                                                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border)' }}>Name</th>
                                                        <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid var(--border)' }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {backups.map((b, idx) => (
                                                        <tr key={idx}>
                                                            <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                                                                {new Date(b.created).toLocaleString()}
                                                            </td>
                                                            <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                                                                {b.filename}
                                                            </td>
                                                            <td style={{ padding: '8px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                                                                <button className="btn sm" onClick={() => handleRestoreBackup(b.path)}>Restore</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Manual Backup Modal */}
            {showManualBackupModal && (
                <div className="modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="modal-content" style={{ width: '400px' }}>
                        <h3>Create Backup</h3>
                        <p>Create a manual backup of all your data.</p>
                        <div className="modal-footer">
                            <button className="btn ghost" onClick={() => setShowManualBackupModal(false)}>Cancel</button>
                            <button className="btn primary" onClick={confirmManualBackup}>Continue</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Modal */}
            {showBackupPasswordModal && (
                <div className="modal-overlay" style={{ zIndex: 1200 }}>
                    <div className="modal-content" style={{ width: '400px' }}>
                        <h3>Encrypt Backup (Optional)</h3>
                        <p>Enter a password to encrypt this backup. Leave blank for no encryption.</p>
                        <input
                            type="password"
                            className="input full-width"
                            placeholder="Password"
                            value={backupPassword}
                            onChange={(e) => setBackupPassword(e.target.value)}
                            style={{ marginBottom: '15px' }}
                        />
                        <div className="modal-footer">
                            <button className="btn ghost" onClick={() => setShowBackupPasswordModal(false)}>Cancel</button>
                            <button className="btn primary" onClick={executeBackup}>Save Backup</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminPanel
