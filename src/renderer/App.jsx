import React, { useState, useCallback } from 'react'
import { useLedger } from './hooks/useLedger'
import { usePrinting } from './hooks/usePrinting'
import { useProfiles } from './hooks/useProfiles'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import Sidebar_Glass from './components/Sidebar_Glass'
import CheckForm_Glass from './components/CheckForm_Glass'
import CheckPreview_Glass from './components/CheckPreview_Glass'
import ImportModal from './components/ImportModal'
import ExportModal from './components/ExportModal'
import AdminPanel from './components/AdminPanel'
import UpdateNotification from './components/UpdateNotification'
import logoImg from '../assets/logo.png'
import './styles.css'

// App version from package.json (injected by Vite)
const APP_VERSION = __APP_VERSION__ || '0.0.0'

// Default layout profile for check rendering
const DEFAULT_LAYOUT_PROFILE = {
    fields: {
        date: { x: 6.65, y: 0.50, w: 1.6, h: 0.40, fontIn: 0.28, label: 'Date' },
        payee: { x: 0.75, y: 1.05, w: 6.2, h: 0.45, fontIn: 0.32, label: 'Pay to the Order of' },
        amount: { x: 6.95, y: 1.05, w: 1.25, h: 0.45, fontIn: 0.32, label: 'Amount ($)' },
        amountWords: { x: 0.75, y: 1.55, w: 7.5, h: 0.45, fontIn: 0.30, label: 'Amount in Words' },
        memo: { x: 0.75, y: 2.35, w: 3.8, h: 0.45, fontIn: 0.28, label: 'Memo' },
        checkNumber: { x: 7.8, y: 0.15, w: 0.6, h: 0.30, fontIn: 0.24, label: 'Check #' }
    }
}

const DEFAULT_LAYOUT = {
    widthIn: 8.5,
    checkHeightIn: 3.0,
    stub1Enabled: false,
    stub1HeightIn: 3.0,
    stub2Enabled: false,
    stub2HeightIn: 3.0
}

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
            if (window.confirm(`${title}\n\n${message}`)) onConfirm()
        }
    })
    const printing = usePrinting()
    const profiles = useProfiles()

    // UI State
    const [previewData, setPreviewData] = useState(null)
    const [isEditMode, setIsEditMode] = useState(false)
    const [layoutProfile, setLayoutProfile] = useState(DEFAULT_LAYOUT_PROFILE)
    const [layout, setLayout] = useState(DEFAULT_LAYOUT)
    const [showHistory, setShowHistory] = useState(false)
    const [showImport, setShowImport] = useState(false)
    const [showExport, setShowExport] = useState(false)
    const [showAdmin, setShowAdmin] = useState(false)

    // New State for 3-Up Sheet Mode
    const [sheetMode, setSheetMode] = useState(false)
    const [activeSlot, setActiveSlot] = useState('top') // 'top', 'middle', 'bottom'

    // Keyboard shortcuts
    useKeyboardShortcuts({ layoutMode: sheetMode ? 'three_up' : 'standard' }, setActiveSlot)

    const nextCheckNumber = '1001'

    // Handlers
    const handleRecordCheck = useCallback((checkData) => {
        if (ledger.recordCheck(checkData)) {
            setPreviewData(null)
        } else {
            alert('Failed to record check')
        }
    }, [ledger])

    const handleImportData = useCallback(async (transactions) => {
        let successCount = 0
        for (const tx of transactions) {
            if (ledger.recordCheck(tx)) successCount++
        }
        setShowImport(false)
        alert(`Imported ${successCount} of ${transactions.length} checks`)
    }, [ledger])

    const handleExportData = useCallback((options) => {
        console.log(`Export: ${options.data.length} transactions as ${options.format}`)
        alert(`Export ready: ${options.data.length} transactions`)
        setShowExport(false)
    }, [])

    const handleFillFromHistory = useCallback((entry) => {
        const fillData = ledger.fillFromHistoryEntry(entry)
        if (fillData) setPreviewData(fillData)
    }, [ledger])

    const handleDeleteEntry = useCallback((entryId) => {
        if (window.confirm('Delete this transaction?')) {
            ledger.deleteHistoryEntry(entryId)
        }
    }, [ledger])

    const handleLayoutChange = useCallback((fieldKey, updates) => {
        setLayoutProfile(prev => ({
            ...prev,
            fields: {
                ...prev.fields,
                [fieldKey]: { ...prev.fields, [fieldKey]: { ...prev.fields[fieldKey], ...updates } }
            }
        }))
    }, [])

    const handlePrintCheck = useCallback(async () => {
        if (!previewData?.payee || !previewData?.amount) {
            alert('Please fill in payee and amount')
            return
        }

        const result = await printing.printCheck(previewData, layoutProfile, layout, {
            mode: 'print',
            fontFamily: '"Courier New", monospace',
            layoutOrder: ['check'],
            sheetMode: sheetMode // Pass sheet mode to printer
        })

        if (!result.success) alert(`Print failed: ${result.error}`)
    }, [previewData, layoutProfile, layout, printing, sheetMode])

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
                    <button className="btn" onClick={() => setIsEditMode(!isEditMode)}>
                        {isEditMode ? 'Exit Edit Mode' : 'Edit Layout'}
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
                        <CheckForm_Glass
                            onRecord={handleRecordCheck}
                            onClear={() => setPreviewData(null)}
                            checkNumber={nextCheckNumber}
                            payeeHistory={ledger.checkHistory}
                            currentBalance={ledger.currentBalance}
                            showCheckNumber={true}
                            showGLCode={false}
                            initialData={previewData}
                        />

                        {previewData && (
                            <div className="print-actions" style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                                <button className="btn primary full-width" onClick={handlePrintCheck} disabled={printing.isPrinting}>
                                    {printing.isPrinting ? printing.printStatus : 'Print Check'}
                                </button>
                                <button className="btn ghost full-width" onClick={() => printing.previewCheck(previewData, layoutProfile, layout)}>
                                    Preview PDF
                                </button>
                            </div>
                        )}
                    </div>
                </main>

                <section className="preview-pane" style={{ width: '400px', padding: '20px', borderLeft: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <div className="preview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Check Preview</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label className="checkbox-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                <input
                                    type="checkbox"
                                    checked={sheetMode}
                                    onChange={(e) => setSheetMode(e.target.checked)}
                                />
                                3-Up Sheet
                            </label>
                            {isEditMode && <span className="edit-badge" style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--accent)', color: 'black', borderRadius: '4px' }}>Edit Mode</span>}
                        </div>
                    </div>

                    <div className="preview-wrapper" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 100px)' }}>
                        <CheckPreview_Glass
                            formData={previewData || {}}
                            layoutProfile={layoutProfile}
                            layout={layout}
                            isEditing={isEditMode}
                            onLayoutChange={handleLayoutChange}
                            layoutOrder={['check']}
                            zoom={0.65}
                            fontFamily='"Courier New", monospace'
                            dateFormat={{ dateSlot1: 'MM', dateSlot2: 'DD', dateSlot3: 'YYYY', dateSeparator: '/', useLongDate: false }}
                            sheetMode={sheetMode}
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