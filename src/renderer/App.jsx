import React, { useCallback } from 'react'
import { useLedger } from './hooks/useLedger'
import { usePrinting } from './hooks/usePrinting'
import { useProfiles } from './hooks/useProfiles'
import { useCheckForm } from './hooks/useCheckForm'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { generateCSV, downloadFile } from './utils/exportHelpers'
import Sidebar_Glass from './components/Sidebar_Glass'
import CheckForm_Glass from './components/CheckForm_Glass'
import CheckPreview_Glass from './components/CheckPreview_Glass'
import ImportModal from './components/ImportModal'
import ExportModal from './components/ExportModal'
import AdminPanel from './components/AdminPanel'
import UpdateNotification from './components/UpdateNotification'
import logoImg from './assets/logo.png'
import './styles.css'

// App version from package.json (injected by Vite)
const APP_VERSION = __APP_VERSION__ || '0.0.0'

/**
 * Main Application Component - CheckSpree 2.0
 * 
 * Fully refactored with extracted components and hooks
 */
function App() {
    // Hooks
    const ledger = useLedger({
        activeProfileId: 'default',
        showConfirm: (title, message, onConfirm) => {
            const confirmed = window.confirm(`${title}\n\n${message}`);
            if (confirmed) {
                onConfirm();
            }
        }
    })
    const printing = usePrinting()
    const profiles = useProfiles()

    // Form & Logic State (Centralized)
    const checkForm = useCheckForm({
        profiles: profiles.profiles,
        activeProfileId: profiles.activeProfileId,
        ledgers: ledger.ledgers,
        activeLedgerId: ledger.activeLedgerId,
        checkHistory: ledger.checkHistory,
        preferences: profiles.preferences,
        importQueue: [] // TODO: Add import queue state if needed
    })

    // UI State
    const [showHistory, setShowHistory] = React.useState(false)
    const [showImport, setShowImport] = React.useState(false)
    const [showExport, setShowExport] = React.useState(false)
    const [showAdmin, setShowAdmin] = React.useState(false)

    // Keyboard shortcuts
    useKeyboardShortcuts(
        { layoutMode: checkForm.isThreeUp ? 'three_up' : 'standard' },
        checkForm.setActiveSlot
    )

    const nextCheckNumber = '1001' // TODO: Calculate from ledger history

    // Handlers
    const handleRecordCheck = useCallback((checkData) => {
        if (ledger.recordCheck(checkData)) {
            checkForm.clearCurrentSlot()
        } else {
            alert('Failed to record check')
        }
    }, [ledger, checkForm])

    const handleImportData = useCallback(async (transactions) => {
        let successCount = 0
        for (const tx of transactions) {
            if (ledger.recordCheck(tx)) successCount++
        }
        setShowImport(false)
        alert(`Imported ${successCount} of ${transactions.length} checks`);
    }, [ledger])

    const handleExportData = useCallback((options) => {
        const { data, format } = options
        const timestamp = new Date().toISOString().slice(0, 10)

        if (format === 'csv') {
            const csvContent = generateCSV(data)
            downloadFile(csvContent, `CheckSpree_Export_${timestamp}.csv`, 'text/csv')
            alert(`Exported ${data.length} transactions to CSV`);
        } else if (format === 'excel') {
            // TODO: Implement Excel export using XLSX if available
            alert('Excel export coming soon. Please use CSV for now.');
        } else {
            alert(`Unsupported format: ${format} `);
        }
        setShowExport(false)
    }, [])

    const handleFillFromHistory = useCallback((entry) => {
        const fillData = ledger.fillFromHistoryEntry(entry)
        if (fillData) checkForm.updateCurrentData(fillData)
    }, [ledger, checkForm])

    const handleDeleteEntry = useCallback((entryId) => {
        if (window.confirm('Delete this transaction?')) {
            ledger.deleteHistoryEntry(entryId)
        }
    }, [ledger])

    const handleLayoutChange = useCallback((fieldKey, updates) => {
        checkForm.setModel(prev => ({
            ...prev,
            fields: {
                ...prev.fields,
                [fieldKey]: { ...prev.fields[fieldKey], ...updates }
            }
        }))
    }, [checkForm])

    const handlePrintCheck = useCallback(async () => {
        const currentData = checkForm.getCurrentData()
        if (!currentData?.payee || !currentData?.amount) {
            alert('Please fill in payee and amount')
            return
        }

        const result = await printing.printCheck(
            currentData,
            checkForm.model, // Pass full model which includes fields/layout
            checkForm.model.layout,
            {
                mode: 'print',
                fontFamily: '"Courier New", monospace',
                layoutOrder: ['check'],
                sheetMode: checkForm.isThreeUp // Pass sheet mode to printer
            }
        )

        if (!result.success) alert(`Print failed: ${result.error} `)
    }, [checkForm, printing])

    return (
        <div className="app">
            <header className="topbar">
                <div className="brand">
                    <div className="logo">
                        <img src={logoImg} alt="CheckSpree" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <span>CheckSpree 2.0 <span style={{ fontSize: '10px', opacity: 0.5, fontWeight: 'normal' }}>v{APP_VERSION}</span></span>
                </div>
                <div className="topbar-actions">
                    <button className="btn ghost" onClick={() => setShowImport(true)}>Import</button>
                    <button className="btn ghost" onClick={() => setShowExport(true)}>Export</button>
                    <button className="btn ghost" onClick={() => setShowAdmin(true)}>Settings</button>
                    <button className="btn" onClick={() => checkForm.setEditMode(!checkForm.editMode)}>
                        {checkForm.editMode ? 'Exit Edit Mode' : 'Edit Layout'}
                    </button>
                </div>
            </header>

            <div className="layout">
                <aside className="side">
                    <Sidebar_Glass
                        checkHistory={ledger.checkHistory}
                        activeLedgerId={ledger.activeLedgerId}
                        activeLedgerName={ledger.activeLedger?.name}
                        onFillFromHistory={handleFillFromHistory}
                        onDeleteEntry={handleDeleteEntry}
                        onViewFullHistory={() => setShowHistory(true)}
                        maxRecentItems={3}
                    />
                </aside>

                <main className="center" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <h2 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--text)' }}>New Check</h2>

                        {/* Slot Selection for 3-Up Mode */}
                        {checkForm.isThreeUp && (
                            <div className="slot-selector" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                {['top', 'middle', 'bottom'].map(slot => (
                                    <button
                                        key={slot}
                                        className={`btn ${checkForm.activeSlot === slot ? 'primary' : 'ghost'} `}
                                        onClick={() => checkForm.setActiveSlot(slot)}
                                        style={{ flex: 1, textTransform: 'capitalize' }}
                                    >
                                        {slot} Slot
                                    </button>
                                ))}
                            </div>
                        )}

                        <CheckForm_Glass
                            data={checkForm.getCurrentData()}
                            onChange={checkForm.updateCurrentData}
                            onRecord={handleRecordCheck}
                            onClear={checkForm.clearCurrentSlot}
                            checkNumber={nextCheckNumber}
                            payeeHistory={ledger.checkHistory}
                            currentBalance={ledger.currentBalance}
                            showCheckNumber={true}
                            showGLCode={false}
                        />

                        <div className="print-actions" style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                            <button className="btn primary full-width" onClick={handlePrintCheck} disabled={printing.isPrinting}>
                                {printing.isPrinting ? printing.printStatus : 'Print Check'}
                            </button>
                            <button className="btn ghost full-width" onClick={() => printing.previewCheck(checkForm.getCurrentData(), checkForm.model, checkForm.model.layout)}>
                                Preview PDF
                            </button>
                        </div>
                    </div>
                </main>

                <section className="preview-pane" style={{ width: '400px', padding: '20px', borderLeft: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <div className="preview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Check Preview</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Note: 3-Up toggle is now controlled by Profile settings, not a local checkbox */}
                            {checkForm.editMode && <span className="edit-badge" style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--accent)', color: 'black', borderRadius: '4px' }}>Edit Mode</span>}
                        </div>
                    </div>

                    <div className="preview-wrapper" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 100px)' }}>
                        <CheckPreview_Glass
                            formData={checkForm.getCurrentData()}
                            layoutProfile={checkForm.model} // Pass full model as layoutProfile
                            layout={checkForm.model.layout}
                            isEditing={checkForm.editMode}
                            onLayoutChange={handleLayoutChange}
                            layoutOrder={['check']}
                            zoom={0.65}
                            fontFamily='"Courier New", monospace'
                            dateFormat={{ dateSlot1: 'MM', dateSlot2: 'DD', dateSlot3: 'YYYY', dateSeparator: '/', useLongDate: false }}
                            sheetMode={checkForm.isThreeUp}
                        />
                    </div>
                </section>
            </div>

            {showHistory && (
                <div className="modal-overlay" onClick={() => setShowHistory(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Transaction History</h2>
                            <button className="btn-close" onClick={() => setShowHistory(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Full history view - Coming soon!</p>
                        </div>
                    </div>
                </div>
            )}

            {showImport && (
                <ImportModal
                    isOpen={true}
                    onClose={() => setShowImport(false)}
                    onImport={handleImportData}
                />
            )}

            {showExport && (
                <ExportModal
                    isOpen={true}
                    onClose={() => setShowExport(false)}
                    onExport={handleExportData}
                    checkHistory={ledger.checkHistory}
                    ledgers={ledger.ledgers}
                />
            )}

            {showAdmin && (
                <AdminPanel
                    isOpen={true}
                    onClose={() => setShowAdmin(false)}
                    profiles={profiles}
                    ledger={ledger}
                />
            )}

            {printing.isPrinting && (
                <div className="print-status-overlay">
                    <div className="print-status-card">
                        <div className="spinner"></div>
                        <p>{printing.printStatus}</p>
                    </div>
                </div>
            )}

            <UpdateNotification isAdmin={!profiles.preferences.adminLocked} />
        </div>
    )
}

export default App
