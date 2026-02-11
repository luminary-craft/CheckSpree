import React, { useEffect, useMemo, useRef, useState } from 'react'
import { numberToWords } from '../shared/numberToWords'
import { getLocalDateString } from './utils/date'
import { generateId, sanitizeCurrencyInput } from './utils/helpers'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useAutoIncrement } from './hooks/useAutoIncrement'
import { usePersistenceSaver } from './hooks/usePersistenceSaver'
import UpdateNotification from './UpdateNotification'

// Constants & defaults
import {
  APP_VERSION, PX_PER_IN, AVAILABLE_FONTS,
  DEFAULT_LAYOUT, DEFAULT_FIELDS, DEFAULT_PROFILE, DEFAULT_PREFERENCES, DEFAULT_MODEL,
  formatLineItems, formatLedgerSnapshot, getDateRangeForFilter,
  normalizeModel
} from './constants/defaults'

// Parsing utilities
import {
  parseCSVWithMapping, parseExcelWithMapping,
  extractHeaders, autoDetectMapping, getPreviewRow
} from './utils/parsing'

// Extracted components
import { PasswordModal } from './components/PasswordModal'
import { GlDescriptionModal } from './components/GlDescriptionModal'
import { HistoryModal } from './components/modals/HistoryModal'
import { ExportDialog } from './components/modals/ExportDialog'
import { ColumnMappingModal } from './components/modals/ColumnMappingModal'
import { BatchPrintDialog } from './components/modals/BatchPrintDialog'
import { BackupRestoreModal } from './components/modals/BackupRestoreModal'
import { DepositModal } from './components/modals/DepositModal'
import { BalanceAdjustmentModal } from './components/modals/BalanceAdjustmentModal'
import { AdminPinModal } from './components/modals/AdminPinModal'
import { ChangePinModal } from './components/modals/ChangePinModal'
import { ManualBackupModal } from './components/modals/ManualBackupModal'
import { DeleteConfirmModal } from './components/modals/DeleteConfirmModal'
import { PrintFailureModal } from './components/modals/PrintFailureModal'
import { BatchProgressModal } from './components/modals/BatchProgressModal'
import { BatchCompleteModal } from './components/modals/BatchCompleteModal'
import { TopBar } from './components/TopBar'
import { Sidebar } from './components/Sidebar'
import { CheckCanvas } from './components/CheckCanvas'

// Domain hooks
import { useToast } from './hooks/useToast'
import { useAdmin } from './hooks/useAdmin'
import { useTemplate } from './hooks/useTemplate'
import { useLayoutEditor } from './hooks/useLayoutEditor'
import { useBatchPrint } from './hooks/useBatchPrint'


export default function App() {
  const [model, setModel] = useState(DEFAULT_MODEL)

  // Layout Editor State
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState([]) // Array of selected field keys
  const [selectionBox, setSelectionBox] = useState(null) // { startX, startY, currentX, currentY } for marquee
  const [showFriendlyLabel, setShowFriendlyLabel] = useState(true)

  const [isPrinting, setIsPrinting] = useState(false)
  const { templateDataUrl, templateLoadError, templateMeta, templateDecodeError, handleSelectTemplate, onTemplateImageError } = useTemplate(model, setModel)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Preferences
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)

  // Profile system
  const [profiles, setProfiles] = useState([DEFAULT_PROFILE])
  const [activeProfileId, setActiveProfileId] = useState('default')
  const [editingProfileName, setEditingProfileName] = useState(null)
  const [showProfileManager, setShowProfileManager] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Three-up layout mode
  const [threeUpSlot, setThreeUpSlot] = useState('top') // 'top', 'middle', 'bottom'

  // Multi-Ledger system
  const [ledgers, setLedgers] = useState([
    {
      id: 'default',
      name: 'Primary Ledger',
      balance: 0,
      startingBalance: 0,
      lockLedgerStart: true
    }
  ])
  const [activeLedgerId, setActiveLedgerId] = useState('default')
  const [checkHistory, setCheckHistory] = useState([])
  const [showLedger, setShowLedger] = useState(false)
  const [editingBalance, setEditingBalance] = useState(false)
  const [tempBalance, setTempBalance] = useState('')
  const [showBalanceAdjustmentModal, setShowBalanceAdjustmentModal] = useState(false)
  const [balanceAdjustmentReason, setBalanceAdjustmentReason] = useState('')
  const [showLedgerManager, setShowLedgerManager] = useState(false)
  const [editingLedgerName, setEditingLedgerName] = useState(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [selectedLedgersForExport, setSelectedLedgersForExport] = useState([])
  const [exportDateRange, setExportDateRange] = useState('all')
  const [exportStartDate, setExportStartDate] = useState('')
  const [exportEndDate, setExportEndDate] = useState('')
  const [exportFormat, setExportFormat] = useState('csv') // 'csv' or 'pdf'
  const [exportGlCodeFilter, setExportGlCodeFilter] = useState('') // '' means all GL codes
  const [exportSortOrder, setExportSortOrder] = useState('date-desc') // Sort order for export
  const [showHistory, setShowHistory] = useState(false)
  const [historyViewMode, setHistoryViewMode] = useState('all') // 'all' or 'current'
  const [historySearchTerm, setHistorySearchTerm] = useState('')
  const [historySortOrder, setHistorySortOrder] = useState('date-desc')
  const [historyGlCodeFilter, setHistoryGlCodeFilter] = useState('all') // 'all' or specific GL Code
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null)

  // GL Codes state
  const [glCodes, setGlCodes] = useState([]) // Array of { code, description }

  // Compiled GL Codes (Saved + History)
  const compiledGlCodes = useMemo(() => {
    const map = new Map()
    // 1. Add saved codes
    glCodes.forEach(item => map.set(item.code, item))
    // 2. Add from history
    checkHistory.forEach(c => {
      if (c.glCode && !map.has(c.glCode)) {
        map.set(c.glCode, {
          code: c.glCode,
          description: c.glDescription || c.description || c.desc || ''
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code))
  }, [glCodes, checkHistory])

  // Import queue
  const [importQueue, setImportQueue] = useState([])
  const [showImportQueue, setShowImportQueue] = useState(false)
  const [selectedQueueItems, setSelectedQueueItems] = useState([]) // Track selected items (up to 3 in three-up mode)

  // Batch print & record

  // Column mapping modal
  const [showColumnMapping, setShowColumnMapping] = useState(false)
  const [fileHeaders, setFileHeaders] = useState([])
  const [columnMapping, setColumnMapping] = useState({
    date: '',
    payee: '',
    amount: '',
    memo: '',
    external_memo: '',
    internal_memo: '',
    ledger: '',
    glCode: '',
    glDescription: '',
    address: ''
  })
  const [rawFileData, setRawFileData] = useState(null)
  const [fileExtension, setFileExtension] = useState('')
  const [previewRow, setPreviewRow] = useState(null)

  // Stub friendly labels
  const [showStub1Labels, setShowStub1Labels] = useState(false)
  const [showStub2Labels, setShowStub2Labels] = useState(false)

  // Password protection for backups
  const [backupPassword, setBackupPassword] = useState('')
  const [showBackupPasswordModal, setShowBackupPasswordModal] = useState(false)
  const [restorePassword, setRestorePassword] = useState('')
  const [showRestorePasswordModal, setShowRestorePasswordModal] = useState(false)
  const [pendingRestorePath, setPendingRestorePath] = useState(null)
  const [restoreError, setRestoreError] = useState(null)

  // Toast (extracted hook)
  const { toast, showToast } = useToast()

  // Admin PIN (extracted hook)
  const {
    showPinModal, setShowPinModal,
    pinInput, setPinInput,
    pinError, setPinError,
    showChangePinModal, setShowChangePinModal,
    currentPinInput, setCurrentPinInput,
    newPinInput, setNewPinInput,
    confirmPinInput, setConfirmPinInput,
    changePinError,
    handleUnlockRequest, handlePinSubmit, handleLock,
    handleChangePinRequest, handleChangePinSubmit
  } = useAdmin(preferences, setPreferences, showToast)

  // Delete confirmation (kept in App - used by multiple domains)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // GL Code modal state
  const [showGlModal, setShowGlModal] = useState(false)
  const [pendingGlCode, setPendingGlCode] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)

  // Generic confirm modal
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: null })

  // Print failure confirmation modal state (for pausing batch on error)
  const [showPrintFailureModal, setShowPrintFailureModal] = useState(false)
  const [printFailureInfo, setPrintFailureInfo] = useState({ payee: '', error: '' })
  const printFailureResolveRef = useRef(null)

  // Batch completion modal state


  // Batch print confirmation modal state

  // Backup restore modal state
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [availableBackups, setAvailableBackups] = useState([])
  const [selectedBackup, setSelectedBackup] = useState(null)

  // Manual backup modal state
  const [showManualBackupModal, setShowManualBackupModal] = useState(false)
  const [backupFilename, setBackupFilename] = useState('')
  const [backupLocation, setBackupLocation] = useState('downloads')

  const [data, setData] = useState({
    date: (() => {
      const d = new Date()
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })(),
    payee: '',
    amount: '',
    amountWords: '',
    memo: '',
    external_memo: '',
    internal_memo: '',
    line_items: [],
    line_items_text: '',
    ledger_snapshot: null,
    checkNumber: '', // For optional check numbering
    glCode: '',
    glDescription: '',
    address: '' // For window envelope - auto-populated with payee name
  })

  // Three-up sheet editor state
  const [sheetData, setSheetData] = useState({
    top: {
      date: (() => {
        const d = new Date()
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      })(),
      payee: '',
      amount: '',
      amountWords: '',
      memo: '',
      external_memo: '',
      internal_memo: '',
      line_items: [],
      line_items_text: '',
      ledger_snapshot: null,
      checkNumber: ''
    },
    middle: {
      date: (() => {
        const d = new Date()
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      })(),
      payee: '',
      amount: '',
      amountWords: '',
      memo: '',
      external_memo: '',
      internal_memo: '',
      line_items: [],
      line_items_text: '',
      ledger_snapshot: null,
      checkNumber: '',
      glCode: '',
      glDescription: ''
    },
    bottom: {
      date: (() => {
        const d = new Date()
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      })(),
      payee: '',
      amount: '',
      amountWords: '',
      memo: '',
      external_memo: '',
      internal_memo: '',
      line_items: [],
      line_items_text: '',
      ledger_snapshot: null,
      checkNumber: '',
      glCode: '',
      glDescription: ''
    }
  })

  // Helper for local date string


  const [activeSlot, setActiveSlot] = useState('top') // 'top' | 'middle' | 'bottom'
  const [autoIncrementCheckNumbers, setAutoIncrementCheckNumbers] = useState(false)

  // Deposit/Adjustment modal state
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositData, setDepositData] = useState({
    date: getLocalDateString(),
    description: '',
    amount: '',
    reason: '' // Reason/note for the adjustment
  })

  // Check Builder mode state
  const [checkMode, setCheckMode] = useState('simple') // 'simple' or 'itemized'
  const [lineItems, setLineItems] = useState([])
  const [nextLineItemId, setNextLineItemId] = useState(1)

  // ===== DRAFT PERSISTENCE =====
  // Form data (data/sheetData) is automatically persisted to disk:
  // - On startup: settingsGet() restores all data including form drafts (lines below)
  // - On change: Debounced settingsSet() saves data within 250ms (see useEffect below)
  // This ensures that if the app closes, drafts are preserved and restored on reopen.

  // Load settings from disk on launch
  useEffect(() => {
    let cancelled = false
      ; (async () => {
        const persisted = await window.cs2.settingsGet()
        if (cancelled) return

        if (persisted?.model) setModel(normalizeModel(persisted.model))
        if (persisted?.data) {
          // Restore data but RESET the date to today (Local Time)
          const { date, ...rest } = persisted.data
          const d = new Date()
          const year = d.getFullYear()
          const month = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          const today = `${year}-${month}-${day}`

          console.log('Restoring data (FORCE RESET). Date was:', date, 'Now:', today)
          setData((prev) => ({ ...prev, ...rest, date: today }))
        }
        if (persisted?.sheetData) {
          // Restore sheet data but RESET dates to today (Local Time)
          const newSheetData = { ...persisted.sheetData }

          const d = new Date()
          const year = d.getFullYear()
          const month = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          const today = `${year}-${month}-${day}`

          Object.keys(newSheetData).forEach(slot => {
            if (newSheetData[slot]) {
              newSheetData[slot] = { ...newSheetData[slot], date: today }
            }
          })
          setSheetData(newSheetData)
        }
        if (persisted?.activeSlot) setActiveSlot(persisted.activeSlot)
        if (persisted?.autoIncrementCheckNumbers != null) setAutoIncrementCheckNumbers(persisted.autoIncrementCheckNumbers)
        if (persisted?.editMode != null) setEditMode(!!persisted.editMode)
        if (persisted?.profiles?.length) {
          // Migration: Ensure all profiles have the new address fields
          const migratedProfiles = persisted.profiles.map(p => {
            // Merge defaults to get 'address' on check face
            const fields = { ...DEFAULT_FIELDS, ...p.fields }

            // Check Layout dimensions for proper placement
            const checkHeight = p.layout?.checkHeightIn || 3.0
            const stub1Height = p.layout?.stub1HeightIn || 3.5

            // Ensure Stub 1 Address exists if enabled
            if (p.layout?.stub1Enabled && !fields.stub1_address) {
              fields.stub1_address = { x: 2.0, y: checkHeight + 0.55, w: 3.5, h: 0.60, fontIn: 0.18, label: 'Address' }
            }

            // Ensure Stub 2 Address exists if enabled
            if (p.layout?.stub2Enabled && !fields.stub2_address) {
              const s1h = p.layout.stub1Enabled ? stub1Height : 0
              fields.stub2_address = { x: 2.0, y: checkHeight + s1h + 0.55, w: 3.5, h: 0.60, fontIn: 0.18, label: 'Address' }
            }

            return { ...p, fields }
          })
          setProfiles(migratedProfiles)
        }
        if (persisted?.activeProfileId) setActiveProfileId(persisted.activeProfileId)

        // Migrate old single-ledger system to multi-ledger
        if (persisted?.ledgers?.length) {
          // Ensure all ledgers have the new hybrid ledger fields
          const migratedLedgers = persisted.ledgers.map(ledger => ({
            ...ledger,
            startingBalance: ledger.startingBalance ?? 0,
            lockLedgerStart: ledger.lockLedgerStart ?? true
          }))
          setLedgers(migratedLedgers)
          if (persisted?.activeLedgerId) setActiveLedgerId(persisted.activeLedgerId)
        } else if (persisted?.ledgerBalance != null) {
          // Migration: old system had a single ledgerBalance, convert to new system
          setLedgers([{
            id: 'default',
            name: 'Primary Ledger',
            balance: persisted.ledgerBalance,
            startingBalance: 0,
            lockLedgerStart: true
          }])
          setActiveLedgerId('default')
        }

        if (persisted?.checkHistory) setCheckHistory(persisted.checkHistory)
        if (persisted?.glCodes) setGlCodes(persisted.glCodes)
        if (persisted?.preferences) {
          // Always force admin to be locked on startup for security
          setPreferences({ ...DEFAULT_PREFERENCES, ...persisted.preferences, adminLocked: true })
        }
        if (persisted?.importQueue && persisted.importQueue.length > 0) {
          setImportQueue(persisted.importQueue)
          // Automatically show the import queue modal if there are items
          setShowImportQueue(true)
        }
      })()
    return () => { cancelled = true }
  }, [])

  // ===== DRAFT PERSISTENCE SAVER =====
  usePersistenceSaver({
    model, data, sheetData, activeSlot, autoIncrementCheckNumbers,
    editMode, profiles, activeProfileId, ledgers, activeLedgerId,
    checkHistory, glCodes, preferences, importQueue
  })

  // Force exit Edit Layout mode when Admin is locked
  useEffect(() => {
    if (preferences.adminLocked && editMode) {
      setEditMode(false)
    }
  }, [preferences.adminLocked, editMode])

  // Handle Delete key to toggle field visibility in preferences
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle Delete/Backspace when in edit mode with selected fields
      if (!editMode || selected.length === 0) return
      if (e.key !== 'Delete' && e.key !== 'Backspace') return

      // Don't handle if we're in an input field
      const activeEl = document.activeElement
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return
      }

      e.preventDefault()

      // Helper to find preference key for a field
      // Only map fields that have actual visibility toggles in the UI
      const getPreferenceKey = (fieldKey) => {
        // Check face fields (these have visibility toggles)
        if (fieldKey === 'checkNumber') return 'showCheckNumber'
        if (fieldKey === 'date') return 'showDate'
        if (fieldKey === 'address') return 'showAddressOnCheck'
        if (fieldKey === 'glCode' || fieldKey === 'glDescription') return 'showGlOnCheck'

        // Stub 1 fields (only those with actual visibility preferences)
        if (fieldKey.startsWith('stub1_')) {
          if (fieldKey.includes('address')) return 'showAddressOnStub1'
          if (fieldKey.includes('glcode') || fieldKey.includes('glCode') || fieldKey.includes('glDescription')) return 'stub1ShowGLCode'
          if (fieldKey.includes('approved')) return 'stub1ShowApproved'
          if (fieldKey.includes('ledger')) return 'stub1ShowLedger'
          if (fieldKey.includes('line_items')) return 'stub1ShowLineItems'
          if (fieldKey.includes('checkNumber')) return 'stub1ShowCheckNumber'
          if (fieldKey.includes('date')) return 'stub1ShowDate'
          // Note: payee, amount, memo have no visibility toggle - they're always shown on stubs
        }

        // Stub 2 fields (only those with actual visibility preferences)
        if (fieldKey.startsWith('stub2_')) {
          if (fieldKey.includes('address')) return 'showAddressOnStub2'
          if (fieldKey.includes('glcode') || fieldKey.includes('glCode') || fieldKey.includes('glDescription')) return 'stub2ShowGLCode'
          if (fieldKey.includes('approved')) return 'stub2ShowApproved'
          if (fieldKey.includes('ledger')) return 'stub2ShowLedger'
          if (fieldKey.includes('line_items')) return 'stub2ShowLineItems'
          if (fieldKey.includes('checkNumber')) return 'stub2ShowCheckNumber'
          if (fieldKey.includes('date')) return 'stub2ShowDate'
          // Note: payee, amount, memo have no visibility toggle - they're always shown on stubs
        }

        return null
      }

      // Collect unique preferences to toggle off
      const prefsToToggle = new Set()
      const fieldNames = []
      const noToggleFields = []
      for (const fieldKey of selected) {
        const prefKey = getPreferenceKey(fieldKey)
        if (prefKey) {
          prefsToToggle.add(prefKey)
          fieldNames.push(fieldKey)
        } else {
          noToggleFields.push(fieldKey)
        }
      }

      // If any preferences found, toggle them off
      if (prefsToToggle.size > 0) {
        setPreferences(p => {
          const updates = {}
          for (const prefKey of prefsToToggle) {
            updates[prefKey] = false
          }
          return { ...p, ...updates }
        })
        // Clear selection since fields are now hidden
        setSelected([])
        // Show feedback
        const message = fieldNames.length === 1
          ? `Hidden: ${fieldNames[0]}`
          : `Hidden ${fieldNames.length} fields`
        showToast(message, 'success')
      } else if (noToggleFields.length > 0) {
        // No mapped preference - show info message
        const fieldName = noToggleFields[0]
        showToast(`"${fieldName}" has no visibility toggle (always visible)`, 'info')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editMode, selected])

  // Handle pending actions after GL Code save
  // Dependency on glCodes ensures we run after the update

  // ===== HELPER FUNCTIONS FOR THREE-UP MODE =====

  // Get default empty slot data
  const getEmptySlotData = () => ({
    date: getLocalDateString(),
    payee: '',
    amount: '',
    amountWords: '',
    memo: '',
    external_memo: '',
    internal_memo: '',
    line_items: [],
    line_items_text: '',
    ledger_snapshot: null,
    checkNumber: '',
    glCode: '',
    glDescription: ''
  })

  // Check if a slot is empty (no meaningful data)
  const isSlotEmpty = (slotData) => {
    if (!slotData) return true
    return !slotData.payee?.trim() &&
      !slotData.amount?.trim() &&
      !slotData.memo?.trim() &&
      !slotData.external_memo?.trim() &&
      !slotData.internal_memo?.trim() &&
      !slotData.line_items_text?.trim()
  }

  // Get the current data based on active mode
  const getCurrentCheckData = () => {
    if (activeProfile?.layoutMode === 'three_up') {
      return sheetData[activeSlot]
    }
    return data
  }

  // Update current check data based on active mode
  const updateCurrentCheckData = (updates) => {
    // Note: This function will be called after activeProfile is defined,
    // so it's safe to use activeProfile here
    const profile = profiles.find(p => p.id === activeProfileId) || profiles[0]
    if (profile?.layoutMode === 'three_up') {
      setSheetData(prev => {
        const newData = {
          ...prev,
          [activeSlot]: { ...prev[activeSlot], ...updates }
        }

        // If check number is being updated and auto-increment is on, update slots below
        if (updates.checkNumber && autoIncrementCheckNumbers) {
          const baseNumber = parseInt(updates.checkNumber)
          if (!isNaN(baseNumber)) {
            const slots = ['top', 'middle', 'bottom']
            const currentIndex = slots.indexOf(activeSlot)

            // Only update slots BELOW the current one
            for (let i = currentIndex + 1; i < slots.length; i++) {
              const slotName = slots[i]
              const incrementedNumber = baseNumber + (i - currentIndex)
              newData[slotName] = {
                ...newData[slotName],
                checkNumber: String(incrementedNumber)
              }
            }
          }
        }

        return newData
      })
    } else {
      setData(prev => ({ ...prev, ...updates }))
    }
  }

  const clearCurrentSlot = () => {
    if (activeProfile?.layoutMode === 'three_up') {
      setSheetData(prev => ({
        ...prev,
        [activeSlot]: getEmptySlotData()
      }))
    } else {
      setData(getEmptySlotData())
    }
  }

  const clearAllSlots = () => {
    if (activeProfile?.layoutMode === 'three_up') {
      showConfirm(
        'Clear All Slots?',
        'This will clear all three slots (Top, Middle, and Bottom). This cannot be undone.',
        () => {
          setSheetData({
            top: getEmptySlotData(),
            middle: getEmptySlotData(),
            bottom: getEmptySlotData()
          })
          setActiveSlot('top')
        }
      )
    } else {
      setData(getEmptySlotData())
    }
  }

  // Parent-to-child data flow: Check details (parent) ALWAYS update stub details (children)
  // This is one-way only - stub edits don't affect parent, but parent edits always overwrite stubs
  const parentFieldsRef = useRef({ date: '', payee: '', address: '', amount: '', memo: '', external_memo: '', internal_memo: '' })

  useEffect(() => {
    const currentParent = {
      date: data.date,
      payee: data.payee,
      address: data.address,
      amount: data.amount,
      memo: data.memo,
      external_memo: data.external_memo,
      internal_memo: data.internal_memo,
      glCode: data.glCode,
      glDescription: data.glDescription
    }

    // Check if any parent field changed
    const parentChanged = Object.keys(currentParent).some(
      key => parentFieldsRef.current[key] !== currentParent[key]
    )

    if (parentChanged) {
      parentFieldsRef.current = currentParent

      // Update stub fields based on parent values
      setData((d) => {
        const updates = {}

        if (model.layout.stub1Enabled) {
          updates.stub1_date = currentParent.date
          updates.stub1_payee = currentParent.payee
          updates.stub1_address = currentParent.address
          updates.stub1_amount = currentParent.amount
          updates.stub1_memo = currentParent.external_memo || currentParent.memo || ''
          updates.stub1_glcode = currentParent.glCode
          updates.stub1_glDescription = currentParent.glDescription
        }

        if (model.layout.stub2Enabled) {
          updates.stub2_date = currentParent.date
          updates.stub2_payee = currentParent.payee
          updates.stub2_address = currentParent.address // Sync address
          updates.stub2_amount = currentParent.amount
          updates.stub2_memo = currentParent.internal_memo || currentParent.memo || ''
          updates.stub2_glcode = currentParent.glCode // lowercase to match ensureStub field name
          updates.stub2_glDescription = currentParent.glDescription
        }

        return Object.keys(updates).length > 0 ? { ...d, ...updates } : d
      })
    }
  }, [data.date, data.payee, data.address, data.amount, data.memo, data.external_memo, data.internal_memo, data.glCode, data.glDescription, model.layout.stub1Enabled, model.layout.stub2Enabled])

  // Template loading is handled by useTemplate hook

  // Get active font family
  const activeFontFamily = AVAILABLE_FONTS.find(f => f.id === preferences.fontFamily)?.family || AVAILABLE_FONTS[0].family

  // Profile helpers
  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0]

  // Initialize slotFields if not present (backward compatibility)
  useEffect(() => {
    if (!model.slotFields) {
      setModel(m => ({
        ...m,
        slotFields: {
          top: { ...DEFAULT_FIELDS },
          middle: { ...DEFAULT_FIELDS },
          bottom: { ...DEFAULT_FIELDS }
        }
      }))
    }
  }, [model.slotFields])

  // Initialize cut lines if not present (backward compatibility for three-up mode)
  useEffect(() => {
    if (model.layout && (model.layout.cutLine1In === undefined || model.layout.cutLine2In === undefined)) {
      setModel(m => ({
        ...m,
        layout: {
          ...m.layout,
          cutLine1In: m.layout.cutLine1In ?? DEFAULT_LAYOUT.cutLine1In,
          cutLine2In: m.layout.cutLine2In ?? DEFAULT_LAYOUT.cutLine2In
        }
      }))
    }
  }, [model.layout])

  // Migrate profiles to include cut lines (backward compatibility)
  useEffect(() => {
    let needsMigration = false
    const migratedProfiles = profiles.map(profile => {
      if (profile.layout && (profile.layout.cutLine1In === undefined || profile.layout.cutLine2In === undefined)) {
        needsMigration = true
        return {
          ...profile,
          layout: {
            ...profile.layout,
            cutLine1In: profile.layout.cutLine1In ?? DEFAULT_LAYOUT.cutLine1In,
            cutLine2In: profile.layout.cutLine2In ?? DEFAULT_LAYOUT.cutLine2In
          }
        }
      }
      return profile
    })

    if (needsMigration) {
      setProfiles(migratedProfiles)
    }
  }, [profiles])

  // Migrate model to add missing stub fields (checkNumber and line_items for both stubs)
  useEffect(() => {
    if (!model.layout.stub1Enabled && !model.layout.stub2Enabled) return

    const nextFields = { ...model.fields }
    let hasChanges = false

    // Add missing stub1 fields if stub1 is enabled
    if (model.layout.stub1Enabled) {
      const checkY = model.layout.checkHeightIn
      const stub1Y = checkY
      const baseY = stub1Y

      if (!nextFields.stub1_checkNumber) {
        nextFields.stub1_checkNumber = { x: 6.35, y: baseY + 0.25, w: 0.85, h: 0.30, fontIn: 0.18, label: 'Check #' }
        hasChanges = true
      }
      if (!nextFields.stub1_line_items) {
        nextFields.stub1_line_items = { x: 0.55, y: baseY + 1.15, w: model.layout.widthIn - 1.10, h: 1.20, fontIn: 0.16, label: 'Line Items' }
        hasChanges = true
      }
      if (!nextFields.stub1_ledger) {
        nextFields.stub1_ledger = { x: 0.55, y: baseY + 2.45, w: 3.5, h: 0.85, fontIn: 0.16, label: 'Ledger Snapshot' }
        hasChanges = true
      }
      if (!nextFields.stub1_approved) {
        nextFields.stub1_approved = { x: 4.25, y: baseY + 2.45, w: 1.85, h: 0.35, fontIn: 0.16, label: 'Approved By' }
        hasChanges = true
      }
      if (!nextFields.stub1_glcode) {
        nextFields.stub1_glcode = { x: 4.25, y: baseY + 2.95, w: 1.85, h: 0.35, fontIn: 0.16, label: 'GL Code' }
        hasChanges = true
      }
      if (!nextFields.stub1_glDescription) {
        nextFields.stub1_glDescription = { x: 0.55, y: baseY + 2.95, w: 3.6, h: 0.35, fontIn: 0.16, label: 'GL Description' }
        hasChanges = true
      }
    }

    // Add missing stub2 fields if stub2 is enabled
    // Note: stub2 fields are primarily managed by ensureStub() which uses lowercase 'glcode'
    // Only add checkNumber here as other fields come from ensureStub
    if (model.layout.stub2Enabled) {
      const checkY = model.layout.checkHeightIn
      const stub2Y = checkY + (model.layout.stub1Enabled ? model.layout.stub1HeightIn : 0)
      const baseY = stub2Y

      if (!nextFields.stub2_checkNumber) {
        nextFields.stub2_checkNumber = { x: 6.35, y: baseY + 0.25, w: 0.85, h: 0.30, fontIn: 0.18, label: 'Check #' }
        hasChanges = true
      }
      // Remove duplicate camelCase glCode field if it exists (ensureStub uses lowercase glcode)
      if (nextFields.stub2_glCode) {
        delete nextFields.stub2_glCode
        hasChanges = true
      }
    }

    if (hasChanges) {
      setModel(m => ({ ...m, fields: nextFields }))
    }
  }, [model.layout.stub1Enabled, model.layout.stub2Enabled, model.layout.widthIn])

  // Migration effect: handle switching between standard and three_up modes
  useEffect(() => {
    if (activeProfile?.layoutMode === 'three_up') {
      // Entering three_up mode - check if sheetData is initialized
      const hasInitializedSheet = sheetData.top.payee || sheetData.top.amount ||
        sheetData.middle.payee || sheetData.middle.amount ||
        sheetData.bottom.payee || sheetData.bottom.amount

      if (!hasInitializedSheet) {
        // First time entering three_up mode - initialize from current data if it has data
        if (data.payee || data.amount) {
          setSheetData({
            top: { ...data },
            middle: getEmptySlotData(),
            bottom: getEmptySlotData()
          })
          setActiveSlot('top')
        }
      }
    } else if (activeProfile?.layoutMode === 'standard') {
      // Exiting three_up mode - preserve current slot data back to single data
      const currentSlot = sheetData[activeSlot]
      if (currentSlot && !isSlotEmpty(currentSlot)) {
        setData(currentSlot)
      }
    }
  }, [activeProfile?.layoutMode])

  // Auto-increment check numbers
  useAutoIncrement(autoIncrementCheckNumbers, activeProfile, activeSlot, sheetData, setSheetData)

  // Keyboard shortcuts (Alt+1/2/3)
  useKeyboardShortcuts(activeProfile, setActiveSlot)

  // Auto-generate amount words
  useEffect(() => {
    if (activeProfile?.layoutMode === 'three_up') {
      const currentSlot = sheetData[activeSlot]
      if (!currentSlot?.amount) {
        setSheetData(prev => ({
          ...prev,
          [activeSlot]: { ...prev[activeSlot], amountWords: '' }
        }))
        return
      }
      setSheetData(prev => ({
        ...prev,
        [activeSlot]: { ...prev[activeSlot], amountWords: numberToWords(currentSlot.amount) }
      }))
    } else {
      if (!data.amount) {
        setData((p) => ({ ...p, amountWords: '' }))
        return
      }
      setData((p) => ({ ...p, amountWords: numberToWords(p.amount) }))
    }
  }, [activeProfile?.layoutMode === 'three_up' ? sheetData[activeSlot]?.amount : data.amount, activeSlot, activeProfile?.layoutMode])

  // Auto-load queue items into slots based on layout mode
  // Load selected queue items into slots
  useEffect(() => {
    if (activeProfile?.layoutMode === 'three_up') {
      // Three-up mode: Load selected items into top/middle/bottom slots (overwrite existing data)
      const slots = ['top', 'middle', 'bottom']
      const newSheetData = {
        top: getEmptySlotData(),
        middle: getEmptySlotData(),
        bottom: getEmptySlotData()
      }

      // Fill slots with selected items (in order)
      for (let i = 0; i < selectedQueueItems.length; i++) {
        const item = selectedQueueItems[i]
        const slot = slots[i]

        // Normalize date to YYYY-MM-DD format
        let normalizedDate = item.date || getLocalDateString()
        if (item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
          // Date is not in YYYY-MM-DD format, convert it
          const parsedDate = new Date(item.date)
          if (!isNaN(parsedDate.getTime())) {
            normalizedDate = parsedDate.toISOString().slice(0, 10)
          }
        }

        newSheetData[slot] = {
          date: normalizedDate,
          payee: item.payee || '',
          address: item.address || '',
          amount: item.amount || '',
          amountWords: item.amount ? numberToWords(item.amount) : '',
          memo: item.memo || '',
          external_memo: item.external_memo || '',
          internal_memo: item.internal_memo || '',
          line_items: item.line_items || [],
          line_items_text: item.line_items_text || '',
          ledger_snapshot: null,
          checkNumber: item.checkNumber || '',
          glCode: item.glCode || '',
          glDescription: item.glDescription || ''
        }
      }
      setSheetData(newSheetData)
    } else if (selectedQueueItems.length === 0) {
      // Standard mode: clear data when no items selected
      setData(getEmptySlotData())
    }
    // Standard mode: data is already loaded in loadFromQueue function when item is selected
  }, [selectedQueueItems, activeProfile?.layoutMode])

  // Detect unsaved changes by comparing current model with saved profile
  useEffect(() => {
    if (!activeProfile) {
      setHasUnsavedChanges(false)
      return
    }

    // Deep comparison of layout, fields, template, and placement
    const hasChanges =
      JSON.stringify(model.layout) !== JSON.stringify(activeProfile.layout) ||
      JSON.stringify(model.fields) !== JSON.stringify(activeProfile.fields) ||
      JSON.stringify(model.template) !== JSON.stringify(activeProfile.template) ||
      JSON.stringify(model.placement) !== JSON.stringify(activeProfile.placement)

    setHasUnsavedChanges(hasChanges)
  }, [model.layout, model.fields, model.template, model.placement, activeProfile])

  // Sync line items with check data in itemized mode
  useEffect(() => {
    if (checkMode === 'itemized') {
      // Calculate total amount from line items
      const total = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)

      // Generate line items text (for the stub)
      const lineItemsText = lineItems
        .filter(item => item.description || item.amount)
        .map(item => `${item.description} - $${parseFloat(item.amount || 0).toFixed(2)}`)
        .join('\n')

      // Update current check data with calculated values
      updateCurrentCheckData({
        amount: total.toFixed(2),
        line_items_text: lineItemsText,
        line_items: lineItems.map(item => ({
          description: item.description,
          amount: parseFloat(item.amount || 0)
        }))
      })
    }
  }, [checkMode, lineItems])

  const createNewProfile = () => {
    // Use normalizeModel to ensure all stub fields are created with correct positions
    const normalizedModel = normalizeModel({
      layout: { ...DEFAULT_LAYOUT },
      fields: JSON.parse(JSON.stringify(DEFAULT_FIELDS)),
      template: { path: null, opacity: 0.9, fit: 'cover' },
      placement: { offsetXIn: 0, offsetYIn: 0 }
    })

    const newProfile = {
      id: generateId(),
      name: `Check Profile ${profiles.length + 1}`,
      layoutMode: 'standard', // New profiles default to standard mode
      layout: normalizedModel.layout,
      fields: normalizedModel.fields,
      slotFields: normalizedModel.slotFields, // Include slotFields for potential 3-up mode switch
      template: normalizedModel.template,
      placement: normalizedModel.placement,
      dateFormat: {
        dateSlot1: 'MM',
        dateSlot2: 'DD',
        dateSlot3: 'YYYY',
        dateSeparator: '/',
        useLongDate: false
      }
    }
    setProfiles([...profiles, newProfile])
    setActiveProfileId(newProfile.id)

    // Load the normalized model immediately
    setModel(normalizedModel)

    // Reset date format to defaults
    setPreferences(p => ({
      ...p,
      dateSlot1: 'MM',
      dateSlot2: 'DD',
      dateSlot3: 'YYYY',
      dateSeparator: '/',
      useLongDate: false
    }))

    // Reset dirty state for new profile
    setHasUnsavedChanges(false)
  }

  const saveCurrentProfile = () => {
    setProfiles(profiles.map(p =>
      p.id === activeProfileId
        ? {
          ...p,
          layout: { ...model.layout },
          fields: JSON.parse(JSON.stringify(model.fields)),
          slotFields: JSON.parse(JSON.stringify(model.slotFields)),
          template: { ...model.template },
          placement: { ...model.placement },
          dateFormat: {
            dateSlot1: preferences.dateSlot1,
            dateSlot2: preferences.dateSlot2,
            dateSlot3: preferences.dateSlot3,
            dateSeparator: preferences.dateSeparator,
            useLongDate: preferences.useLongDate
          }
        }
        : p
    ))

    // Reset dirty state and show save feedback
    setHasUnsavedChanges(false)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  const loadProfile = (profileId) => {
    const profile = profiles.find(p => p.id === profileId)
    if (!profile) return
    setActiveProfileId(profileId)
    setModel(m => ({
      ...m,
      layout: { ...profile.layout },
      fields: JSON.parse(JSON.stringify(profile.fields)),
      slotFields: profile.slotFields ? JSON.parse(JSON.stringify(profile.slotFields)) : m.slotFields,
      template: { ...profile.template },
      placement: { ...profile.placement }
    }))

    // Restore date format settings if they exist in the profile
    if (profile.dateFormat) {
      setPreferences(p => ({
        ...p,
        dateSlot1: profile.dateFormat.dateSlot1,
        dateSlot2: profile.dateFormat.dateSlot2,
        dateSlot3: profile.dateFormat.dateSlot3,
        dateSeparator: profile.dateFormat.dateSeparator,
        useLongDate: profile.dateFormat.useLongDate
      }))
    }
  }

  const deleteProfile = (profileId) => {
    if (profiles.length <= 1) return

    showConfirm('Delete Profile?', 'Are you sure you want to delete this profile?', () => {
      const newProfiles = profiles.filter(p => p.id !== profileId)

      // If deleting the active profile, switch to another one first
      if (activeProfileId === profileId) {
        if (newProfiles.length > 0) {
          // Select the first remaining profile
          loadProfile(newProfiles[0].id)
        } else {
          // Create and select a new default profile if none remain
          const defaultProfile = createNewProfile()
          setProfiles([defaultProfile])
          loadProfile(defaultProfile.id)
          return // Early return since we already set the profiles
        }
      }

      setProfiles(newProfiles)
    })
  }

  const renameProfile = (profileId, newName) => {
    setProfiles(profiles.map(p =>
      p.id === profileId ? { ...p, name: newName } : p
    ))
    setEditingProfileName(null)
  }

  // Ledger management helpers
  const activeLedger = ledgers.find(l => l.id === activeLedgerId) || ledgers[0]
  const ledgerBalance = activeLedger?.balance || 0

  // Hybrid Ledger: Calculate balance from startingBalance + deposits - checks
  const calculateHybridBalance = (ledgerId) => {
    const ledger = ledgers.find(l => l.id === ledgerId)
    if (!ledger) return 0

    const startingBalance = ledger.startingBalance || 0
    const transactions = checkHistory.filter(t => t.ledgerId === ledgerId)

    const deposits = transactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    const checks = transactions
      .filter(t => t.type === 'check' || !t.type) // Include legacy entries without type
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    return startingBalance + deposits - checks
  }

  const hybridBalance = calculateHybridBalance(activeLedgerId)

  const createNewLedger = () => {
    // Find the highest ledger number from existing ledgers
    const ledgerNumbers = ledgers
      .map(l => {
        const match = l.name.match(/Ledger (\d+)/)
        return match ? parseInt(match[1], 10) : 0
      })
      .filter(n => !isNaN(n))
    const maxNumber = ledgerNumbers.length > 0 ? Math.max(...ledgerNumbers) : 0

    const newLedger = {
      id: generateId(),
      name: `Ledger ${maxNumber + 1}`,
      balance: 0,
      startingBalance: 0,
      lockLedgerStart: true
    }
    setLedgers([...ledgers, newLedger])
    setActiveLedgerId(newLedger.id)
  }

  const deleteLedger = (ledgerId) => {
    if (ledgers.length <= 1) {
      showToast('You must have at least one ledger', 'warning')
      return
    }
    const ledger = ledgers.find(l => l.id === ledgerId)
    const checksInLedger = checkHistory.filter(c => c.ledgerId === ledgerId).length

    if (checksInLedger > 0) {
      showConfirm(
        'Delete Ledger with Checks?',
        `This ledger has ${checksInLedger} checks. Deleting it will also delete all associated checks. Continue?`,
        () => {
          // Remove checks associated with this ledger
          setCheckHistory(checkHistory.filter(c => c.ledgerId !== ledgerId))
          const newLedgers = ledgers.filter(l => l.id !== ledgerId)
          setLedgers(newLedgers)
          if (activeLedgerId === ledgerId) {
            setActiveLedgerId(newLedgers[0].id)
          }
        }
      )
    } else {
      const newLedgers = ledgers.filter(l => l.id !== ledgerId)
      setLedgers(newLedgers)
      if (activeLedgerId === ledgerId) {
        setActiveLedgerId(newLedgers[0].id)
      }
    }
  }

  const renameLedger = (ledgerId, newName, shouldClose = true) => {
    setLedgers(ledgers.map(l =>
      l.id === ledgerId ? { ...l, name: newName } : l
    ))
    if (shouldClose) setEditingLedgerName(null)
  }

  const updateLedgerBalance = (ledgerId, newBalance) => {
    setLedgers(prev => prev.map(l =>
      l.id === ledgerId ? { ...l, balance: newBalance } : l
    ))
  }

  // Quick Fill: populate form from a history entry (for "Copy Previous" feature)
  const fillFromHistoryEntry = (entry) => {
    if (!entry || entry.type === 'deposit') return // Don't fill from deposits

    const today = getLocalDateString()

    updateCurrentCheckData({
      date: today, // Use today's date, not historical
      payee: entry.payee || '',
      amount: entry.amount ? String(entry.amount) : '',
      memo: entry.memo || '',
      external_memo: entry.external_memo || '',
      internal_memo: entry.internal_memo || '',
      line_items: entry.line_items || [],
      line_items_text: entry.line_items_text || '',
      checkNumber: '' // Clear - user assigns new number
    })
  }

  // Ledger helpers
  const recordCheck = (checkData = data) => {
    const amount = sanitizeCurrencyInput(checkData.amount)
    if (amount <= 0) return false
    if (!checkData.payee?.trim()) return false

    // Use hybridBalance for accurate balance tracking
    const previousBalance = hybridBalance
    const newBalance = hybridBalance - amount

    const checkEntry = {
      id: generateId(),
      type: 'check', // Transaction type
      date: checkData.date || getLocalDateString(),
      payee: checkData.payee,
      address: checkData.address || '',
      amount: amount,
      memo: checkData.memo || '',
      external_memo: checkData.external_memo || '',
      internal_memo: checkData.internal_memo || '',
      line_items: checkData.line_items || [],
      line_items_text: checkData.line_items_text || '',
      ledgerId: activeLedgerId,
      profileId: activeProfileId,
      ledger_snapshot: {
        previous_balance: previousBalance,
        transaction_amount: amount,
        new_balance: newBalance
      },
      timestamp: Date.now(),
      balanceAfter: newBalance,
      checkNumber: checkData.checkNumber || '',
      glCode: checkData.glCode || '',
      glDescription: checkData.glDescription || ''
    }

    setCheckHistory(prev => [checkEntry, ...prev])
    // Note: We don't update ledger.balance anymore - hybrid balance is calculated from transactions

    // Learning Mode: Update GL Codes list
    if (checkEntry.glCode) {
      const code = checkEntry.glCode
      const desc = checkEntry.glDescription || ''
      const existing = glCodes.find(g => g.code === code)

      // Update if new code OR if description changed (and new description is not empty)
      if (!existing || (desc && desc !== existing.description)) {
        const newGlEntry = { code, description: desc }
        setGlCodes(prev => {
          const existingIdx = prev.findIndex(g => g.code === code)
          if (existingIdx >= 0) {
            const copy = [...prev]
            copy[existingIdx] = newGlEntry
            return copy
          }
          return [...prev, newGlEntry].sort((a, b) => a.code.localeCompare(b.code))
        })
      }
    }

    // Trigger auto-backup (debounced, silent)
    window.cs2.backupTriggerAuto().catch(err => {
      console.error('Auto-backup trigger failed:', err)
    })

    return true
  }

  const recordDeposit = (depositInfo = depositData) => {
    const amount = sanitizeCurrencyInput(depositInfo.amount)
    if (amount <= 0) return false
    if (!depositInfo.description?.trim()) return false

    // Use hybridBalance for accurate balance tracking
    const previousBalance = hybridBalance
    const newBalance = hybridBalance + amount

    const depositEntry = {
      id: generateId(),
      type: 'deposit', // Transaction type
      date: depositInfo.date || getLocalDateString(),
      payee: depositInfo.description, // Using payee field for deposit description
      amount: amount,
      memo: depositInfo.description || '',
      reason: depositInfo.reason || '', // Reason/note for the adjustment
      external_memo: '',
      internal_memo: '',
      line_items: [],
      line_items_text: '',
      ledgerId: activeLedgerId,
      profileId: activeProfileId,
      ledger_snapshot: {
        previous_balance: previousBalance,
        transaction_amount: amount,
        new_balance: newBalance
      },
      timestamp: Date.now(),
      balanceAfter: newBalance
    }

    setCheckHistory(prev => [depositEntry, ...prev])
    // Note: We don't update ledger.balance anymore - hybrid balance is calculated from transactions

    // Trigger auto-backup (debounced, silent)
    window.cs2.backupTriggerAuto().catch(err => {
      console.error('Auto-backup trigger failed:', err)
    })

    return true
  }

  const deleteHistoryEntry = (entryId) => {
    const entry = checkHistory.find(e => e.id === entryId)
    if (!entry) return

    // Show custom modal instead of native confirm to avoid focus issues
    setDeleteTarget(entry)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteHistoryEntry = () => {
    if (!deleteTarget) return

    // Use functional updates to ensure we're working with latest state
    setCheckHistory(prev => prev.filter(e => e.id !== deleteTarget.id))

    // Note: We don't update ledger.balance anymore - hybrid balance is calculated from transactions
    // Deleting a transaction will automatically update the hybrid balance calculation

    // Close modal and clear target
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
  }

  const cancelDeleteHistoryEntry = () => {
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
  }

  // Generic confirm helper to avoid focus-stealing native confirm()
  const showConfirm = (title, message, onConfirm) => {
    setConfirmConfig({ title, message, onConfirm })
    setShowConfirmModal(true)
  }

  const handleConfirmModalConfirm = () => {
    if (confirmConfig.onConfirm) {
      confirmConfig.onConfirm()
    }
    setShowConfirmModal(false)
    setConfirmConfig({ title: '', message: '', onConfirm: null })
  }

  const handleConfirmModalCancel = () => {
    setShowConfirmModal(false)
    setConfirmConfig({ title: '', message: '', onConfirm: null })
  }

  const updateBalance = () => {
    // Validate that we have a valid active ledger
    if (!activeLedgerId || !ledgers.find(l => l.id === activeLedgerId)) {
      setEditingBalance(false)
      return
    }

    const newBal = parseFloat(tempBalance) || 0
    const currentBalance = hybridBalance
    const adjustmentAmount = newBal - currentBalance

    // If there's no change, just close the editor
    if (adjustmentAmount === 0) {
      setEditingBalance(false)
      setTempBalance('')
      return
    }

    // Show the reason modal
    setBalanceAdjustmentReason('')
    setShowBalanceAdjustmentModal(true)
  }

  const confirmBalanceAdjustment = () => {
    const newBalance = parseFloat(tempBalance) || 0
    const adjustmentAmount = newBalance - hybridBalance

    // Record the adjustment as a history entry
    const adjustmentEntry = {
      id: generateId(),
      type: adjustmentAmount >= 0 ? 'deposit' : 'check', // deposit for increase, check for decrease
      date: getLocalDateString(),
      payee: adjustmentAmount >= 0 ? 'Balance Adjustment (Increase)' : 'Balance Adjustment (Decrease)',
      amount: Math.abs(adjustmentAmount),
      memo: 'Manual ledger balance adjustment',
      reason: balanceAdjustmentReason || 'No reason provided',
      external_memo: '',
      internal_memo: '',
      line_items: [],
      line_items_text: '',
      ledgerId: activeLedgerId,
      profileId: activeProfileId,
      ledger_snapshot: {
        previous_balance: hybridBalance,
        transaction_amount: adjustmentAmount,
        new_balance: newBalance
      },
      timestamp: Date.now(),
      balanceAfter: newBalance,
      isManualAdjustment: true
    }

    setCheckHistory(prev => [adjustmentEntry, ...prev])

    // The balance will be updated automatically through the history entry
    // No need to modify startingBalance since the adjustment is recorded as a deposit/check

    // Trigger auto-backup
    window.cs2.backupTriggerAuto().catch(err => {
      console.error('Auto-backup trigger failed:', err)
    })

    // Close modals and reset
    setShowBalanceAdjustmentModal(false)
    setEditingBalance(false)
    setTempBalance('')
    setBalanceAdjustmentReason('')

    showToast('Balance adjustment recorded', 'success')
  }

  // Admin PIN & toast handlers now provided by useAdmin and useToast hooks

  // Promise-based print failure confirmation (returns true to continue, false to abort)
  const confirmPrintFailure = (payee, error) => {
    return new Promise((resolve) => {
      setPrintFailureInfo({ payee, error: error || 'Unknown error' })
      printFailureResolveRef.current = resolve
      setShowPrintFailureModal(true)
    })
  }

  const handlePrintFailureContinue = () => {
    setShowPrintFailureModal(false)
    if (printFailureResolveRef.current) {
      printFailureResolveRef.current('continue')
      printFailureResolveRef.current = null
    }
  }

  const handlePrintFailureAbort = () => {
    setShowPrintFailureModal(false)
    if (printFailureResolveRef.current) {
      printFailureResolveRef.current('abort')
      printFailureResolveRef.current = null
    }
  }


  // Helper: Format backup with friendly name and grouping
  const formatBackup = (backup) => {
    const date = new Date(backup.created)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    let friendlyName = ''
    let group = ''

    if (diffMinutes < 1) {
      friendlyName = 'Just now'
      group = 'Recent (Last 3 Days)'
    } else if (diffMinutes < 60) {
      friendlyName = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
      group = 'Recent (Last 3 Days)'
    } else if (diffHours < 24) {
      friendlyName = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
      group = 'Recent (Last 3 Days)'
    } else if (diffDays === 1) {
      friendlyName = `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      group = 'Recent (Last 3 Days)'
    } else if (diffDays <= 3) {
      friendlyName = `${diffDays} days ago at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      group = 'Recent (Last 3 Days)'
    } else if (diffDays <= 365) {
      friendlyName = date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      group = 'This Year'
    } else if (diffDays / 365 <= 3) {
      friendlyName = date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
      group = `${date.getFullYear()}`
    } else {
      const quarter = Math.floor(date.getMonth() / 3) + 1
      friendlyName = date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
      group = `${date.getFullYear()} Q${quarter}`
    }

    return {
      ...backup,
      friendlyName,
      group,
      fullDate: date.toLocaleString()
    }
  }

  // Helper: Group backups by time period
  const groupBackups = (backups) => {
    const formatted = backups.map(formatBackup)
    const groups = {}

    formatted.forEach(backup => {
      if (!groups[backup.group]) {
        groups[backup.group] = []
      }
      groups[backup.group].push(backup)
    })

    return groups
  }

  const handleBackupData = async () => {
    // Set default filename using local date
    const today = getLocalDateString()
    setBackupFilename(`CheckSpree_Backup_${today}`)
    setShowManualBackupModal(true)
  }

  const confirmManualBackup = async () => {
    setShowManualBackupModal(false)
    setBackupPassword('')
    setShowBackupPasswordModal(true)
  }

  const handleBackupPasswordSubmit = async () => {
    setShowBackupPasswordModal(false)
    try {
      const result = await window.cs2.backupSave(backupPassword)
      if (result?.success) {
        showToast(`Backup saved successfully!${result.isEncrypted ? ' (Encrypted)' : ''}`, 'success')
      } else if (result?.error) {
        showToast(`Backup failed: ${result.error}`, 'error')
      } else {
        // User cancelled the save dialog - this is not an error
        showToast('Backup cancelled', 'info')
      }
    } catch (e) {
      showToast(`Error creating backup: ${e.message}`, 'error')
    }
    setBackupPassword('')
  }

  const handleRestoreResult = (result, path = null) => {
    if (result.success) {
      showToast('Backup restored successfully. Reloading application...', 'success')
      setShowBackupModal(false)
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } else if (result.error === 'PASSWORD_REQUIRED') {
      setPendingRestorePath(result.path || path)
      setRestoreError(null)
      setRestorePassword('')
      setShowRestorePasswordModal(true)
    } else if (result.error === 'INVALID_PASSWORD') {
      setRestoreError('Invalid password')
      setShowRestorePasswordModal(true) // Re-show modal
    } else if (result.error) {
      showToast(`Restore failed: ${result.error}`, 'error')
    } else {
      showToast('Restore cancelled', 'info')
    }
  }

  const handleRestorePasswordSubmit = async () => {
    setShowRestorePasswordModal(false)
    try {
      let result
      if (pendingRestorePath) {
        result = await window.cs2.backupRestoreFile(pendingRestorePath, restorePassword)
      } else {
        // Fallback, though pendingRestorePath should always be set for password flow
        result = await window.cs2.backupRestore(restorePassword)
      }
      handleRestoreResult(result, pendingRestorePath)
    } catch (e) {
      showToast(`Error restoring backup: ${e.message}`, 'error')
    }
  }

  const handleRestoreBackup = async () => {
    try {
      // Check if there are any auto-backups available
      const backupsResult = await window.cs2.backupList()

      if (backupsResult.success && backupsResult.backups.length > 0) {
        // Show backup selection modal
        setAvailableBackups(backupsResult.backups)
        setSelectedBackup(backupsResult.backups[0]) // Select most recent by default
        setShowBackupModal(true)
      } else {
        // No auto-backups available, ask user to select a file
        showToast('No auto-backups found. Please select a backup file.', 'info')
        handleRestoreFromFile()
      }
    } catch (e) {
      showToast(`Error checking backups: ${e.message}`, 'error')
    }
  }

  const handleRestoreFromFile = async () => {
    try {
      const result = await window.cs2.backupRestore(null)
      handleRestoreResult(result)
    } catch (e) {
      showToast(`Error restoring backup: ${e.message}`, 'error')
    }
  }

  const confirmRestoreBackup = async (backupPath = null) => {
    // No confirmation dialog - warnings are in the modal itself
    try {
      let result
      if (backupPath) {
        // Restore from specific backup file
        result = await window.cs2.backupRestoreFile(backupPath, null)
      } else {
        // Restore from latest auto-backup
        result = await window.cs2.backupRestoreLatest()
      }
      handleRestoreResult(result, backupPath)
    } catch (e) {
      showToast(`Error restoring backup: ${e.message}`, 'error')
    }
  }

  // Import/Export handlers
  const handleImport = async () => {
    const res = await window.cs2.importSelect()
    if (!res?.success) return

    const fileRes = await window.cs2.importRead(res.path)
    if (!fileRes?.success) {
      showToast(`Failed to read file: ${fileRes.error}`, 'error')
      return
    }

    // Extract headers from file
    const headers = extractHeaders(fileRes.content, fileRes.ext)

    if (headers.length === 0) {
      showToast('No headers found in file. Make sure your file has a header row.', 'info')
      return
    }

    // Auto-detect column mapping
    const detectedMapping = autoDetectMapping(headers)

    // Store raw file data and show mapping modal
    setRawFileData(fileRes.content)
    setFileExtension(fileRes.ext)
    setFileHeaders(headers)
    setColumnMapping(detectedMapping)
    setPreviewRow(getPreviewRow(fileRes.content, fileRes.ext, detectedMapping))
    setShowColumnMapping(true)
  }

  // Process file with user-confirmed column mapping
  const processImportWithMapping = () => {
    // Validate that at least payee or amount is mapped
    if (!columnMapping.payee && !columnMapping.amount) {
      showToast('Please map at least Payee or Amount field to continue.', 'warning')
      return
    }

    let parsed = []

    // Parse based on file type with custom mapping
    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      parsed = parseExcelWithMapping(rawFileData, columnMapping)
    } else {
      const delimiter = fileExtension === '.tsv' ? '\t' : ','
      parsed = parseCSVWithMapping(rawFileData, delimiter, columnMapping)
    }

    if (parsed.length === 0) {
      showToast('No valid check data found in file.', 'info')
      return
    }

    // Close mapping modal and show import queue
    setShowColumnMapping(false)
    const enrichedQueue = parsed.map((item, idx) => ({ ...item, id: generateId(), index: idx }))
    setImportQueue(enrichedQueue)
    setShowImportQueue(true)

    // Learn GL Codes from imported data immediately
    const newGlCodes = []
    enrichedQueue.forEach(item => {
      if (item.glCode) {
        const existing = glCodes.find(g => g.code === item.glCode) || newGlCodes.find(g => g.code === item.glCode)
        if (!existing || (item.glDescription && item.glDescription !== existing.description)) {
          newGlCodes.push({ code: item.glCode, description: item.glDescription || '' })
        }
      }
    })
    if (newGlCodes.length > 0) {
      setGlCodes(prev => {
        const updated = [...prev]
        newGlCodes.forEach(newCode => {
          const idx = updated.findIndex(g => g.code === newCode.code)
          if (idx >= 0) {
            updated[idx] = newCode
          } else {
            updated.push(newCode)
          }
        })
        return updated.sort((a, b) => a.code.localeCompare(b.code))
      })
    }

    // Auto-load first item in standard mode
    if (activeProfile?.layoutMode !== 'three_up' && enrichedQueue.length > 0) {
      const firstItem = enrichedQueue[0]
      const normalizedDate = firstItem.date && !/^\d{4}-\d{2}-\d{2}$/.test(firstItem.date)
        ? new Date(firstItem.date).toISOString().slice(0, 10)
        : firstItem.date || getLocalDateString()

      setData({
        date: normalizedDate,
        payee: firstItem.payee || '',
        address: firstItem.address || '',
        amount: firstItem.amount || '',
        amountWords: firstItem.amount ? numberToWords(firstItem.amount) : '',
        memo: firstItem.memo || '',
        external_memo: firstItem.external_memo || '',
        internal_memo: firstItem.internal_memo || '',
        line_items: firstItem.line_items || [],
        line_items_text: firstItem.line_items_text || '',
        ledger_snapshot: null,
        checkNumber: firstItem.checkNumber || '',
        glCode: firstItem.glCode || '',
        glDescription: firstItem.glDescription || ''
      })
      setSelectedQueueItems([firstItem])
    }
  }

  const handleExport = () => {
    if (checkHistory.length === 0) {
      showToast('No check history to export', 'info')
      return
    }
    // Initialize with all ledgers selected and default date range
    setSelectedLedgersForExport(ledgers.map(l => l.id))
    setExportDateRange('all')
    setExportStartDate('')
    setExportEndDate('')
    setExportFormat('csv') // Initialize format selection
    setExportGlCodeFilter('') // Reset GL filter ('' = all)
    setShowExportDialog(true)
  }

  const executeExport = async () => {
    if (selectedLedgersForExport.length === 0) {
      showToast('Please select at least one ledger to export', 'warning')
      return
    }

    // Get date range for filtering
    const dateRange = getDateRangeForFilter(exportDateRange, exportStartDate, exportEndDate)

    // Filter checks by selected ledgers and date range
    let selectedChecks = checkHistory.filter(c =>
      selectedLedgersForExport.includes(c.ledgerId)
    )

    // Apply date range filter if specified
    if (dateRange.start || dateRange.end) {
      selectedChecks = selectedChecks.filter(check => {
        const checkDate = new Date(check.date + 'T00:00:00')
        if (dateRange.start && checkDate < dateRange.start) return false
        if (dateRange.end && checkDate > dateRange.end) return false
        return true
      })
    }

    // Apply GL Code filter if specified
    if (exportGlCodeFilter) {
      selectedChecks = selectedChecks.filter(check => check.glCode === exportGlCodeFilter)
    }

    // Apply sort order
    selectedChecks = selectedChecks.sort((a, b) => {
      let result = 0
      switch (exportSortOrder) {
        case 'date-asc':
          result = new Date(a.date) - new Date(b.date)
          if (result === 0) result = (a.timestamp || 0) - (b.timestamp || 0)
          break
        case 'date-desc':
          result = new Date(b.date) - new Date(a.date)
          if (result === 0) result = (b.timestamp || 0) - (a.timestamp || 0)
          break
        case 'amount-asc':
          result = parseFloat(a.amount) - parseFloat(b.amount)
          break
        case 'amount-desc':
          result = parseFloat(b.amount) - parseFloat(a.amount)
          break
        case 'payee-asc':
          result = (a.payee || '').localeCompare(b.payee || '')
          break
        case 'payee-desc':
          result = (b.payee || '').localeCompare(a.payee || '')
          break
        default:
          result = (b.timestamp || 0) - (a.timestamp || 0)
      }
      return result
    })

    if (selectedChecks.length === 0) {
      showToast('No checks found matching the selected filters', 'info')
      return
    }

    // Calculate totals
    const ledgerTotals = {}
    const profileLedgerTotals = {}

    selectedLedgersForExport.forEach(ledgerId => {
      const ledger = ledgers.find(l => l.id === ledgerId)
      // Use hybrid balance calculation (startingBalance + deposits - checks)
      const ledgerBalance = calculateHybridBalance(ledgerId)
      ledgerTotals[ledgerId] = {
        name: ledger?.name || 'Unknown',
        balance: ledgerBalance,
        totalSpent: 0,
        checkCount: 0,
        profileBreakdown: {}
      }
    })

    selectedChecks.forEach(check => {
      const ledgerId = check.ledgerId || 'default'
      const profileId = check.profileId || 'default'

      // Skip 'note' type entries for totals calculation (they have amount 0 anyway)
      if (check.type === 'note') return

      if (ledgerTotals[ledgerId]) {
        ledgerTotals[ledgerId].totalSpent += parseFloat(check.amount) || 0
        ledgerTotals[ledgerId].checkCount++

        if (!ledgerTotals[ledgerId].profileBreakdown[profileId]) {
          const profile = profiles.find(p => p.id === profileId)
          ledgerTotals[ledgerId].profileBreakdown[profileId] = {
            name: profile?.name || 'Unknown Profile',
            totalSpent: 0,
            checkCount: 0
          }
        }
        ledgerTotals[ledgerId].profileBreakdown[profileId].totalSpent += parseFloat(check.amount) || 0
        ledgerTotals[ledgerId].profileBreakdown[profileId].checkCount++
      }
    })

    // Calculate grand total
    const grandTotal = {
      totalBalance: selectedLedgersForExport.reduce((sum, id) => {
        return sum + calculateHybridBalance(id)
      }, 0),
      totalSpent: Object.values(ledgerTotals).reduce((sum, l) => sum + l.totalSpent, 0),
      totalChecks: selectedChecks.filter(c => c.type !== 'note').length // Don't count notes as transactions
    }

    // Enrich checks with ledger and profile names (exclude note entries from export)
    const enrichedChecks = selectedChecks
      .filter(check => check.type !== 'note') // Exclude informational notes from export
      .map(check => {
        const ledger = ledgers.find(l => l.id === check.ledgerId)
        const profile = profiles.find(p => p.id === check.profileId)
        // Fallback description lookup if not stored in entry
        const glDescription = check.glDescription || (check.glCode ? (glCodes.find(g => g.code === check.glCode)?.description || '') : '')
        return {
          ...check,
          ledgerName: ledger?.name || 'Unknown',
          profileName: profile?.name || 'Unknown',
          glDescription: glDescription
        }
      })

    const res = await window.cs2.exportHistory({
      checks: enrichedChecks,
      ledgerTotals,
      grandTotal,
      exportDate: new Date().toISOString(),
      format: exportFormat
    })

    if (res?.success) {
      setShowExportDialog(false)
      // File saved and folder opened
    } else if (res?.error) {
      showToast(`Export failed: ${res.error}`, 'error')
    }
  }

  const loadFromQueue = (queueItem) => {
    if (activeProfile?.layoutMode === 'three_up') {
      // Three-up mode: Toggle selection (up to 3 items)
      setSelectedQueueItems(prev => {
        const isSelected = prev.some(item => item.id === queueItem.id)
        if (isSelected) {
          // Unselect: remove from selection
          return prev.filter(item => item.id !== queueItem.id)
        } else {
          // Select: add if less than 3 items selected
          if (prev.length < 3) {
            return [...prev, queueItem]
          }
          return prev // Already have 3 selected
        }
      })
    } else {
      // Standard mode: Toggle selection
      setSelectedQueueItems(prev => {
        const isSelected = prev.some(item => item.id === queueItem.id)
        if (isSelected) {
          // Unselect: clear the form and remove from selection
          setData({
            date: getLocalDateString(),
            payee: '',
            address: '',
            amount: '',
            amountWords: '',
            memo: '',
            external_memo: '',
            internal_memo: '',
            line_items: [],
            line_items_text: '',
            ledger_snapshot: null,
            checkNumber: '',
            glCode: '',
            glDescription: ''
          })
          return []
        } else {
          // Select: Load into single check form
          // Normalize date to YYYY-MM-DD format
          let normalizedDate = queueItem.date || getLocalDateString()
          if (queueItem.date && !/^\d{4}-\d{2}-\d{2}$/.test(queueItem.date)) {
            const parsedDate = new Date(queueItem.date)
            if (!isNaN(parsedDate.getTime())) {
              normalizedDate = parsedDate.toISOString().slice(0, 10)
            }
          }

          setData({
            date: normalizedDate,
            payee: queueItem.payee || '',
            address: queueItem.address || '',
            amount: queueItem.amount || '',
            amountWords: queueItem.amount ? numberToWords(queueItem.amount) : '',
            memo: queueItem.memo || '',
            external_memo: queueItem.external_memo || '',
            internal_memo: queueItem.internal_memo || '',
            line_items: queueItem.line_items || [],
            line_items_text: queueItem.line_items_text || '',
            ledger_snapshot: null,
            checkNumber: queueItem.checkNumber || '',
            glCode: queueItem.glCode || '',
            glDescription: queueItem.glDescription || ''
          })
          return [queueItem]
        }
      })
    }
  }

  // Helper to find address from history
  const getAddressFromHistory = (payee) => {
    if (!payee) return ''
    const match = checkHistory.find(c =>
      c.payee && c.payee.toLowerCase() === payee.toLowerCase() &&
      c.address && c.address.trim() !== '' &&
      c.address.trim().toLowerCase() !== c.payee.trim().toLowerCase()
    )
    return match ? match.address : ''
  }

  // Helper to find GL details from history
  const getGlDetailsFromHistory = (payee) => {
    if (!payee) return { code: '', description: '' }
    const match = checkHistory.find(c =>
      c.payee && c.payee.toLowerCase() === payee.toLowerCase() &&
      c.glCode && c.glCode.trim() !== ''
    )
    return match ? { code: match.glCode, description: match.glDescription || '' } : { code: '', description: '' }
  }

  const processAllQueue = async () => {
    if (importQueue.length === 0) return

    showConfirm(
      'Record All Checks?',
      `Record ${importQueue.length} checks from import queue? This will deduct from your current ledger balance.`,
      async () => {
        await executeProcessAllQueue()
      }
    )
  }

  const executeProcessAllQueue = async () => {

    let processed = 0
    const newHistory = [...checkHistory]

    // Create a local copy of ledgers to track new ones created during this batch
    let tempLedgers = [...ledgers]
    const newLedgersToAdd = []

    // Track balances per ledger (ledgerId -> balance) using hybrid balance calculation
    const ledgerBalances = {}
    tempLedgers.forEach(l => {
      ledgerBalances[l.id] = calculateHybridBalance(l.id)
    })

    // Helper to find or create ledger LOCALLY within this batch
    const getLedgerId = (name) => {
      if (!name || !name.trim()) return activeLedgerId
      const trimmed = name.trim().toLowerCase()
      const existing = tempLedgers.find(l => l.name.toLowerCase() === trimmed)
      if (existing) return existing.id

      const newId = generateId()
      const newLedger = { id: newId, name: name.trim(), balance: 0 }
      tempLedgers.push(newLedger)
      newLedgersToAdd.push(newLedger)
      // Initialize balance for new ledger
      ledgerBalances[newId] = 0
      return newId
    }

    for (const item of importQueue) {
      const amount = sanitizeCurrencyInput(item.amount)
      if (amount > 0 && item.payee?.trim()) {
        // Determine which ledger to use
        const targetLedgerId = getLedgerId(item.ledger)

        // Initialize balance if somehow missing (safety check)
        if (ledgerBalances[targetLedgerId] === undefined) {
          ledgerBalances[targetLedgerId] = 0
        }

        const previousBalance = ledgerBalances[targetLedgerId]
        const newBalance = previousBalance - amount

        newHistory.unshift({
          id: generateId(),
          date: item.date || getLocalDateString(),
          payee: item.payee,
          address: item.address || getAddressFromHistory(item.payee) || item.payee, // Smart address lookup
          amount: amount,
          memo: item.memo || '',
          external_memo: item.external_memo || '',
          internal_memo: item.internal_memo || '',
          line_items: item.line_items || [],
          line_items_text: item.line_items_text || '',
          ledgerId: targetLedgerId,
          profileId: activeProfileId,
          ledgerName: tempLedgers.find(l => l.id === targetLedgerId)?.name || '',
          profileName: profiles.find(p => p.id === activeProfileId)?.name || '',
          ledger_snapshot: {
            previous_balance: previousBalance,
            transaction_amount: amount,
            new_balance: newBalance
          },
          timestamp: Date.now(),
          balanceAfter: newBalance,
          checkNumber: item.checkNumber || '',
          glCode: item.glCode || getGlDetailsFromHistory(item.payee).code || '',
          glDescription: item.glDescription || getGlDetailsFromHistory(item.payee).description || ''
        })

        // Update local balance tracker
        ledgerBalances[targetLedgerId] = newBalance
        processed++
      }
    }

    // Atomic update for ledgers (add new ones + update balances)
    setLedgers(prev => {
      // 1. Start with existing ledgers + new ones
      let nextLedgers = [...prev, ...newLedgersToAdd]

      // 2. Update balances for all affected ledgers
      nextLedgers = nextLedgers.map(l => {
        if (ledgerBalances[l.id] !== undefined) {
          return { ...l, balance: ledgerBalances[l.id] }
        }
        return l
      })

      return nextLedgers
    })

    setCheckHistory(newHistory)
    setImportQueue([])
    setShowImportQueue(false)

    // Show completion modal instead of alert
    setBatchCompleteData({ processed, total: importQueue.length, cancelled: false })
    setShowBatchCompleteModal(true)
  }

  const clearQueue = () => {
    setImportQueue([])
  }

  // Generate PDF filename from check data
  const generatePrintFilename = (checkData, batchIndex = null) => {
    const payee = (checkData.payee || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_')
    let rawDate = checkData.date || getLocalDateString()
    const date = rawDate.replace(/\//g, '-')
    const amount = sanitizeCurrencyInput(checkData.amount).toFixed(2).replace('.', '')
    const prefix = batchIndex !== null ? `${String(batchIndex).padStart(3, '0')}_` : ''
    return `Check_${prefix}${payee}_${date}_${amount}`
  }

  const {
    isBatchPrinting, batchPrintProgress,
    showBatchPrintConfirm, setShowBatchPrintConfirm,
    availablePrinters, loadAvailablePrinters,
    showBatchCompleteModal, setShowBatchCompleteModal, batchCompleteData,
    batchAutoNumber, setBatchAutoNumber,
    batchStartNumber, setBatchStartNumber,
    handleBatchPrintAndRecord, confirmBatchPrint, cancelBatchPrintConfirm,
    executeBatchPrintAndRecord, cancelBatchPrint
  } = useBatchPrint({
    model, preferences, setPreferences, activeProfile, importQueue, setImportQueue,
    recordCheck, calculateHybridBalance, generatePrintFilename, showToast, confirmPrintFailure,
    ledgers, setLedgers, checkHistory, setCheckHistory, setData, setSheetData,
    profiles, setProfiles, activeProfileId, setShowImportQueue,
    showConfirm, getEmptySlotData, getAddressFromHistory, getGlDetailsFromHistory, updateLedgerBalance
  })

  const {
    paperRef, dragRef, paperStyle, stageVars, stageHeightIn,
    getSectionHeight, getSectionY, setField, ensureStub, reorderSections,
    onPointerDownField, onPointerDownHandle, onPointerDownCutLine,
    onPointerDownStage, onPointerMove, onPointerUp
  } = useLayoutEditor(model, setModel, setData, preferences, editMode, selected, setSelected, selectionBox, setSelectionBox, isPrinting, activeProfile, activeSlot)

  // handleSelectTemplate is now provided by useTemplate hook

  const handlePreviewPdf = async () => {
    setIsPrinting(true)
    setTimeout(async () => {
      const res = await window.cs2.previewPdf()
      if (res?.success === false) showToast(`Preview failed: ${res.error || 'Unknown error'}`, 'error')
      setIsPrinting(false)
    }, 250)
  }

  const handlePrint = async () => {
    // Temporarily disable edit mode for printing
    const wasInEditMode = editMode
    if (wasInEditMode) setEditMode(false)

    setIsPrinting(true)

    // Set document title for PDF filename
    const originalTitle = document.title
    document.title = generatePrintFilename(data)

    setTimeout(async () => {
      const filename = generatePrintFilename(data)
      const res = await window.cs2.printDialog(filename)

      // Restore original title and edit mode
      document.title = originalTitle
      if (wasInEditMode) setEditMode(true)

      if (res?.success === false) showToast(`Print failed: ${res.error || 'Unknown error'}`, 'error')
      setIsPrinting(false)
    }, 250)
  }

  // Save new GL Code from modal
  const handleSaveGlCode = (code, description) => {
    setGlCodes(prev => {
      // Avoid duplicates just in case
      if (prev.some(g => g.code.toLowerCase() === code.toLowerCase())) return prev
      return [...prev, { code, description }]
    })
    setShowGlModal(false)
    setPendingGlCode(null)
  }

  // Single check print and record (standard mode)
  const handlePrintAndRecordSingle = async () => {
    const amount = sanitizeCurrencyInput(data.amount)
    if (amount <= 0) {
      showToast('Please enter a valid amount', 'warning')
      return
    }
    if (!data.payee.trim()) {
      showToast('Please enter a payee', 'warning')
      return
    }

    // Check for novel GL Code
    if (data.glCode && data.glCode.trim()) {
      const code = data.glCode.trim()
      const exists = glCodes.some(g => g.code.toLowerCase() === code.toLowerCase())
      if (!exists) {
        setPendingGlCode(code)
        setPendingAction('print_single')
        setShowGlModal(true)
        return
      }
    }

    // Capture the current check data BEFORE any async operations
    const checkDataSnapshot = {
      date: data.date,
      payee: data.payee,
      amount: data.amount,
      amountWords: data.amountWords,
      memo: data.memo,
      external_memo: data.external_memo,
      internal_memo: data.internal_memo,
      line_items: data.line_items,
      line_items_text: data.line_items_text,
      ledger_snapshot: data.ledger_snapshot,
      checkNumber: data.checkNumber,
      glCode: data.glCode,
      glDescription: data.glDescription
    }

    // Temporarily disable edit mode for printing
    const wasInEditMode = editMode
    if (wasInEditMode) setEditMode(false)

    setIsPrinting(true)

    // Set document title for PDF filename
    const originalTitle = document.title
    document.title = generatePrintFilename(checkDataSnapshot)

    // Small delay to ensure DOM is ready for printing
    setTimeout(async () => {
      try {
        // Set up afterprint handler BEFORE opening print dialog
        let afterPrintFired = false
        const handleAfterPrint = () => {
          afterPrintFired = true
          window.removeEventListener('afterprint', handleAfterPrint)
        }
        window.addEventListener('afterprint', handleAfterPrint)

        // Open print dialog and wait for it to close
        const filename = generatePrintFilename(checkDataSnapshot)
        const res = await window.cs2.printDialog(filename)

        // Restore original title
        document.title = originalTitle

        // Remove the event listener if dialog failed
        if (res?.success === false) {
          window.removeEventListener('afterprint', handleAfterPrint)
          setIsPrinting(false)
          if (wasInEditMode) setEditMode(true)
          showToast(`Print failed: ${res.error || 'Unknown error'}`, 'error')
          return
        }

        // Give afterprint a chance to fire (Electron may fire it synchronously or async)
        // Wait up to 2 seconds for afterprint, or continue if it already fired
        if (!afterPrintFired) {
          await new Promise(resolve => {
            const checkInterval = setInterval(() => {
              if (afterPrintFired) {
                clearInterval(checkInterval)
                clearTimeout(fallbackTimeout)
                resolve()
              }
            }, 50)

            // Fallback after 2 seconds
            const fallbackTimeout = setTimeout(() => {
              clearInterval(checkInterval)
              resolve()
            }, 2000)
          })
        }

        // Clean up listener
        window.removeEventListener('afterprint', handleAfterPrint)
        setIsPrinting(false)
        if (wasInEditMode) setEditMode(true)

        // NOW it's safe to record and clear - print has fully completed
        recordCheck(checkDataSnapshot)

        // Increment the profile's next check number
        setProfiles(prev => prev.map(p =>
          p.id === activeProfileId
            ? { ...p, nextCheckNumber: (p.nextCheckNumber || 1001) + 1 }
            : p
        ))

        // Remove printed items from import queue
        if (selectedQueueItems.length > 0) {
          setImportQueue(prev => prev.filter(item =>
            !selectedQueueItems.some(selected => selected.id === item.id)
          ))
          setSelectedQueueItems([])
        }

        // Clear form for next check
        setData({
          date: getLocalDateString(),
          payee: '',
          amount: '',
          amountWords: '',
          memo: '',
          external_memo: '',
          internal_memo: '',
          line_items: [],
          line_items_text: '',
          ledger_snapshot: null,
          checkNumber: ''
        })

        // Clear itemized mode line items and reset to simple mode
        setLineItems([])
        setCheckMode('simple')
      } catch (error) {
        setIsPrinting(false)
        if (wasInEditMode) setEditMode(true)
        showToast(`Print error: ${error?.message || 'Unknown error'}`, 'error')
      }
    }, 250)
  }

  // Sheet print and record (three-up mode)
  const handlePrintAndRecordSheet = async () => {
    // Collect all filled slots
    const filledSlots = []
    const slotNames = ['top', 'middle', 'bottom']

    for (const slot of slotNames) {
      const slotData = sheetData[slot]
      if (!isSlotEmpty(slotData)) {
        const amount = sanitizeCurrencyInput(slotData.amount)
        if (amount <= 0) {
          showToast(`Please enter a valid amount for ${slot} slot`, 'warning')
          return
        }
        if (!slotData.payee?.trim()) {
          showToast(`Please enter a payee for ${slot} slot`, 'warning')
          return
        }
        filledSlots.push({
          slot,
          data: {
            date: slotData.date,
            payee: slotData.payee,
            amount: slotData.amount,
            amountWords: slotData.amountWords,
            memo: slotData.memo,
            external_memo: slotData.external_memo,
            internal_memo: slotData.internal_memo,
            line_items: slotData.line_items,
            line_items_text: slotData.line_items_text,
            ledger_snapshot: slotData.ledger_snapshot,
            checkNumber: slotData.checkNumber
          }
        })
      }
    }

    if (filledSlots.length === 0) {
      showToast('Please fill at least one slot before printing', 'warning')
      return
    }

    // Check for novel GL Codes
    for (const { data: checkData } of filledSlots) {
      if (checkData.glCode && checkData.glCode.trim()) {
        const code = checkData.glCode.trim()
        const exists = glCodes.some(g => g.code.toLowerCase() === code.toLowerCase())
        if (!exists) {
          setPendingGlCode(code)
          setPendingAction('print_sheet')
          setShowGlModal(true)
          return
        }
      }
    }

    // Temporarily disable edit mode for printing
    const wasInEditMode = editMode
    if (wasInEditMode) setEditMode(false)

    setIsPrinting(true)

    // Set document title for PDF filename (use first slot's data)
    const originalTitle = document.title
    document.title = generatePrintFilename(filledSlots[0].data)

    // Small delay to ensure DOM is ready for printing
    setTimeout(async () => {
      try {
        // Set up afterprint handler BEFORE opening print dialog
        let afterPrintFired = false
        const handleAfterPrint = () => {
          afterPrintFired = true
          window.removeEventListener('afterprint', handleAfterPrint)
        }
        window.addEventListener('afterprint', handleAfterPrint)

        // Open print dialog and wait for it to close
        const filename = generatePrintFilename(filledSlots[0].data)
        const res = await window.cs2.printDialog(filename)

        // Restore original title
        document.title = originalTitle

        // Remove the event listener if dialog failed
        if (res?.success === false) {
          window.removeEventListener('afterprint', handleAfterPrint)
          setIsPrinting(false)
          if (wasInEditMode) setEditMode(true)
          showToast(`Print failed: ${res.error || 'Unknown error'}`, 'error')
          return
        }

        // Give afterprint a chance to fire
        if (!afterPrintFired) {
          await new Promise(resolve => {
            const checkInterval = setInterval(() => {
              if (afterPrintFired) {
                clearInterval(checkInterval)
                clearTimeout(fallbackTimeout)
                resolve()
              }
            }, 50)

            const fallbackTimeout = setTimeout(() => {
              clearInterval(checkInterval)
              resolve()
            }, 2000)
          })
        }

        // Clean up listener
        window.removeEventListener('afterprint', handleAfterPrint)
        setIsPrinting(false)
        if (wasInEditMode) setEditMode(true)

        // Record all filled slots to history (each gets its own entry with sheetSlot field)
        const timestamp = Date.now()
        let currentBalance = hybridBalance

        for (const { slot, data: checkData } of filledSlots) {
          const amount = sanitizeCurrencyInput(checkData.amount)
          const previousBalance = currentBalance
          const newBalance = currentBalance - amount

          const checkEntry = {
            id: generateId(),
            type: 'check', // Transaction type
            date: checkData.date || getLocalDateString(),
            payee: checkData.payee,
            amount: amount,
            memo: checkData.memo || '',
            external_memo: checkData.external_memo || '',
            internal_memo: checkData.internal_memo || '',
            line_items: checkData.line_items || [],
            line_items_text: checkData.line_items_text || '',
            ledgerId: activeLedgerId,
            profileId: activeProfileId,
            ledger_snapshot: {
              previous_balance: previousBalance,
              transaction_amount: amount,
              new_balance: newBalance
            },
            timestamp: timestamp,
            balanceAfter: newBalance,
            sheetSlot: slot,
            checkNumber: checkData.checkNumber || '',
            glCode: checkData.glCode || '',
            glDescription: checkData.glDescription || ''
          }

          setCheckHistory(prev => [checkEntry, ...prev])
          currentBalance = newBalance
        }

        // Note: We don't update ledger.balance anymore - hybrid balance is calculated from transactions

        // Increment the profile's next check number by the number of checks printed
        setProfiles(prev => prev.map(p =>
          p.id === activeProfileId
            ? { ...p, nextCheckNumber: (p.nextCheckNumber || 1001) + filledSlots.length }
            : p
        ))

        // Remove printed items from import queue
        if (selectedQueueItems.length > 0) {
          setImportQueue(prev => prev.filter(item =>
            !selectedQueueItems.some(selected => selected.id === item.id)
          ))
          setSelectedQueueItems([])
        }

        // Clear all slots
        setSheetData({
          top: getEmptySlotData(),
          middle: getEmptySlotData(),
          bottom: getEmptySlotData()
        })
        setActiveSlot('top')

        // Clear itemized mode line items and reset to simple mode
        setLineItems([])
        setCheckMode('simple')
      } catch (error) {
        setIsPrinting(false)
        if (wasInEditMode) setEditMode(true)
        showToast(`Print error: ${error?.message || 'Unknown error'}`, 'error')
      }
    }, 250)
  }

  // Wrapper function that routes to single or sheet version
  const handlePrintAndRecord = async () => {
    if (activeProfile?.layoutMode === 'three_up') {
      return handlePrintAndRecordSheet()
    } else {
      return handlePrintAndRecordSingle()
    }
  }

  // Record Only - handles both standard and 3-up modes
  const handleRecordOnly = () => {
    if (activeProfile?.layoutMode === 'three_up') {
      // 3-up mode: record all filled slots
      const slots = ['top', 'middle', 'bottom']
      const filledSlots = slots.filter(slot => {
        const slotData = sheetData[slot]
        return slotData?.payee?.trim() && sanitizeCurrencyInput(slotData?.amount) > 0
      })

      if (filledSlots.length === 0) {
        showToast('No valid checks to record. Please fill in payee and amount.', 'error')
        return
      }

      // Record each filled slot
      let recordedCount = 0
      filledSlots.forEach((slot, index) => {
        const slotData = sheetData[slot]
        const checkDataForSlot = {
          ...slotData,
          checkNumber: slotData.checkNumber || String((activeProfile.nextCheckNumber || 1001) + index)
        }
        if (recordCheck(checkDataForSlot)) {
          recordedCount++
        }
      })

      if (recordedCount > 0) {
        // Increment check number
        setProfiles(prev => prev.map(p =>
          p.id === activeProfileId
            ? { ...p, nextCheckNumber: (p.nextCheckNumber || 1001) + recordedCount }
            : p
        ))

        // Remove recorded items from import queue
        if (selectedQueueItems.length > 0) {
          setImportQueue(prev => prev.filter(item =>
            !selectedQueueItems.some(selected => selected.id === item.id)
          ))
          setSelectedQueueItems([])
        }

        // Clear all slots
        setSheetData({
          top: getEmptySlotData(),
          middle: getEmptySlotData(),
          bottom: getEmptySlotData()
        })
        setActiveSlot('top')
        setLineItems([])
        setCheckMode('simple')

        showToast(`${recordedCount} check${recordedCount > 1 ? 's' : ''} recorded to ledger!`, 'success')
      }
    } else {
      // Standard mode: record single check
      if (!data.payee?.trim()) {
        showToast('Please enter a payee name', 'error')
        return
      }
      const amount = sanitizeCurrencyInput(data.amount)
      if (amount <= 0) {
        showToast('Please enter a valid amount', 'error')
        return
      }

      if (recordCheck(data)) {
        // Increment check number
        setProfiles(prev => prev.map(p =>
          p.id === activeProfileId
            ? { ...p, nextCheckNumber: (p.nextCheckNumber || 1001) + 1 }
            : p
        ))

        // Remove recorded item from import queue (standard mode uses first selected item)
        if (selectedQueueItems.length > 0) {
          setImportQueue(prev => prev.filter(item => item.id !== selectedQueueItems[0].id))
          setSelectedQueueItems([])
        }

        // Clear the form
        setData(getEmptySlotData())
        setLineItems([])
        setCheckMode('simple')

        showToast('Check recorded to ledger!', 'success')
      }
    }
  }

  const resetModel = () => {
    showConfirm(
      'Reset All Settings?',
      'Reset all settings to defaults? This cannot be undone.',
      () => {
        setModel(DEFAULT_MODEL)
      }
    )
  }

  const templateName = useMemo(() => {
    const p = model.template?.path
    if (!p) return null
    const parts = String(p).split(/[\\/]/)
    return parts[parts.length - 1] || p
  }, [model.template?.path])

  // Auto-detect template fit mode based on aspect ratio
  // Full-page images (tall) cover the entire paper, check-only images (wide) fit at the top
  const isFullPageTemplate = templateMeta?.width && templateMeta?.height && (templateMeta.height / templateMeta.width > 1.2)
  const templateObjectFit = isFullPageTemplate ? 'cover' : 'contain'
  const templateBgSize = isFullPageTemplate ? 'cover' : 'contain'
  const templateBgPosition = isFullPageTemplate ? 'center' : 'top left'

  // Calculate if balance will go negative
  const currentData = getCurrentCheckData()
  const pendingAmount = sanitizeCurrencyInput(currentData.amount)
  const projectedBalance = hybridBalance - pendingAmount
  const isOverdrawn = pendingAmount > 0 && projectedBalance < 0

  // Calculate Y-offset for three-up mode
  const threeUpYOffset = activeProfile?.layoutMode === 'three_up'
    ? (threeUpSlot === 'top' ? 0 : threeUpSlot === 'middle' ? 3.66 : 7.33)
    : 0

  const downloadTemplate = () => {
    const headers = ['Date', 'Payee', 'Amount', 'Memo', 'GL Code', 'GL Description', 'External Memo', 'Internal Memo', 'Ledger', 'Check Number', 'Address']
    const csvContent = headers.join(',') + '\n'
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', 'check_import_template.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div
      className={`app ${isPrinting ? 'printing' : ''}`}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <TopBar
        ledgers={ledgers} checkHistory={checkHistory} calculateHybridBalance={calculateHybridBalance}
        showLedger={showLedger} setShowLedger={setShowLedger}
        showHistory={showHistory} setShowHistory={setShowHistory}
        setHistoryViewMode={setHistoryViewMode}
        downloadTemplate={downloadTemplate} handleImport={handleImport} handleExport={handleExport}
        preferences={preferences} setPreferences={setPreferences}
        handleUnlockRequest={handleUnlockRequest} handleLock={handleLock}
        handleBackupData={handleBackupData} handleRestoreBackup={handleRestoreBackup}
        editMode={editMode} setEditMode={setEditMode}
        handlePreviewPdf={handlePreviewPdf} handlePrintAndRecord={handlePrintAndRecord} handleRecordOnly={handleRecordOnly}
        activeProfile={activeProfile} data={data} setData={setData}
      />

      <div className="layout">
        <Sidebar
          ledgers={ledgers} setLedgers={setLedgers} activeLedgerId={activeLedgerId} setActiveLedgerId={setActiveLedgerId} activeLedger={activeLedger}
          showLedgerManager={showLedgerManager} setShowLedgerManager={setShowLedgerManager} editingLedgerName={editingLedgerName} setEditingLedgerName={setEditingLedgerName}
          hybridBalance={hybridBalance} pendingAmount={pendingAmount} isOverdrawn={isOverdrawn} projectedBalance={projectedBalance}
          editingBalance={editingBalance} tempBalance={tempBalance} setTempBalance={setTempBalance} preferences={preferences} setPreferences={setPreferences}
          deleteLedger={deleteLedger} renameLedger={renameLedger} createNewLedger={createNewLedger} updateBalance={updateBalance}
          setDepositData={setDepositData} setShowDepositModal={setShowDepositModal} setShowBalanceAdjustmentModal={setShowBalanceAdjustmentModal}
          checkHistory={checkHistory} setCheckHistory={setCheckHistory} setHistoryViewMode={setHistoryViewMode} setShowHistory={setShowHistory} setShowLedger={setShowLedger}
          fillFromHistoryEntry={fillFromHistoryEntry} deleteHistoryEntry={deleteHistoryEntry}
          importQueue={importQueue} setImportQueue={setImportQueue} selectedQueueItems={selectedQueueItems} setSelectedQueueItems={setSelectedQueueItems}
          showImportQueue={showImportQueue} setShowImportQueue={setShowImportQueue} handleBatchPrintAndRecord={handleBatchPrintAndRecord} processAllQueue={processAllQueue} clearQueue={clearQueue} loadFromQueue={loadFromQueue}
          profiles={profiles} setProfiles={setProfiles} activeProfileId={activeProfileId} activeProfile={activeProfile}
          hasUnsavedChanges={hasUnsavedChanges} profileSaved={profileSaved} showProfileManager={showProfileManager} setShowProfileManager={setShowProfileManager}
          editingProfileName={editingProfileName} setEditingProfileName={setEditingProfileName}
          loadProfile={loadProfile} createNewProfile={createNewProfile} saveCurrentProfile={saveCurrentProfile} renameProfile={renameProfile} deleteProfile={deleteProfile}
          model={model} setModel={setModel} resetModel={resetModel}
          data={data} setData={setData} sheetData={sheetData} activeSlot={activeSlot} setActiveSlot={setActiveSlot}
          checkMode={checkMode} setCheckMode={setCheckMode} lineItems={lineItems} setLineItems={setLineItems} nextLineItemId={nextLineItemId} setNextLineItemId={setNextLineItemId}
          autoIncrementCheckNumbers={autoIncrementCheckNumbers} setAutoIncrementCheckNumbers={setAutoIncrementCheckNumbers}
          getCurrentCheckData={getCurrentCheckData} updateCurrentCheckData={updateCurrentCheckData} clearCurrentSlot={clearCurrentSlot} clearAllSlots={clearAllSlots} isSlotEmpty={isSlotEmpty}
          compiledGlCodes={compiledGlCodes}
          templateDataUrl={templateDataUrl} templateLoadError={templateLoadError} templateDecodeError={templateDecodeError} handleSelectTemplate={handleSelectTemplate}
          templateName={templateName} isFullPageTemplate={isFullPageTemplate}
          editMode={editMode} selected={selected} setSelected={setSelected}
          showStub1Labels={showStub1Labels} setShowStub1Labels={setShowStub1Labels} showStub2Labels={showStub2Labels} setShowStub2Labels={setShowStub2Labels}
          setField={setField} ensureStub={ensureStub} reorderSections={reorderSections} getSectionHeight={getSectionHeight}
          showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced}
          handleUnlockRequest={handleUnlockRequest}
          showToast={showToast}
        />

        <CheckCanvas
          profiles={profiles} model={model} setModel={setModel} activeProfile={activeProfile}
          data={data} sheetData={sheetData} activeSlot={activeSlot} editMode={editMode}
          preferences={preferences} selected={selected} setSelected={setSelected} selectionBox={selectionBox}
          templateDataUrl={templateDataUrl} isFullPageTemplate={isFullPageTemplate} onTemplateImageError={onTemplateImageError}
          autoIncrementCheckNumbers={autoIncrementCheckNumbers} isPrinting={isPrinting}
          stageVars={stageVars} threeUpYOffset={threeUpYOffset} hybridBalance={hybridBalance} activeLedger={activeLedger}
          activeFontFamily={activeFontFamily} paperStyle={paperStyle} paperRef={paperRef} dragRef={dragRef}
          onPointerDownStage={onPointerDownStage} onPointerDownCutLine={onPointerDownCutLine}
          onPointerDownField={onPointerDownField} onPointerDownHandle={onPointerDownHandle}
          updateCurrentCheckData={updateCurrentCheckData} getSectionHeight={getSectionHeight} getSectionY={getSectionY} setField={setField}
          handleUnlockRequest={handleUnlockRequest} isSlotEmpty={isSlotEmpty}
          showStub1Labels={showStub1Labels} showStub2Labels={showStub2Labels}
        />
      </div >

      {/* PIN Authentication Modal */}
      {showPinModal && (
        <AdminPinModal
          pinInput={pinInput} setPinInput={setPinInput}
          pinError={pinError} setPinError={setPinError}
          handlePinSubmit={handlePinSubmit} handleChangePinRequest={handleChangePinRequest}
          setShowPinModal={setShowPinModal}
        />
      )}

      {/* Change PIN Modal */}
      {showChangePinModal && (
        <ChangePinModal
          currentPinInput={currentPinInput} setCurrentPinInput={setCurrentPinInput}
          newPinInput={newPinInput} setNewPinInput={setNewPinInput}
          confirmPinInput={confirmPinInput} setConfirmPinInput={setConfirmPinInput}
          changePinError={changePinError} handleChangePinSubmit={handleChangePinSubmit}
          setShowChangePinModal={setShowChangePinModal}
        />
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <DepositModal
          depositData={depositData} setDepositData={setDepositData}
          recordDeposit={recordDeposit} showToast={showToast}
          setShowDepositModal={setShowDepositModal}
        />
      )}

      {/* Balance Adjustment Modal */}
      {showBalanceAdjustmentModal && (
        <BalanceAdjustmentModal
          hybridBalance={hybridBalance} tempBalance={tempBalance}
          balanceAdjustmentReason={balanceAdjustmentReason} setBalanceAdjustmentReason={setBalanceAdjustmentReason}
          confirmBalanceAdjustment={confirmBalanceAdjustment}
          setShowBalanceAdjustmentModal={setShowBalanceAdjustmentModal}
          setEditingBalance={setEditingBalance} setTempBalance={setTempBalance}
        />
      )}

      {/* Delete Check Confirmation */}
      {showDeleteConfirm && deleteTarget && (
        <DeleteConfirmModal
          deleteTarget={deleteTarget}
          cancelDeleteHistoryEntry={cancelDeleteHistoryEntry}
          confirmDeleteHistoryEntry={confirmDeleteHistoryEntry}
        />
      )}

      {/* Backup Restore Modal */}
      {showBackupModal && (
        <BackupRestoreModal
          availableBackups={availableBackups} selectedBackup={selectedBackup} setSelectedBackup={setSelectedBackup}
          groupBackups={groupBackups} confirmRestoreBackup={confirmRestoreBackup}
          handleRestoreFromFile={handleRestoreFromFile} setShowBackupModal={setShowBackupModal}
        />
      )}

      {/* Backup Password Modal */}
      {
        showBackupPasswordModal && (
          <PasswordModal
            title="Encrypt Backup"
            message="Enter a password to encrypt this backup file. If you leave this blank, the file will be saved as plain text."
            value={backupPassword}
            onChange={setBackupPassword}
            onSubmit={handleBackupPasswordSubmit}
            onCancel={() => setShowBackupPasswordModal(false)}
            confirmButtonText={backupPassword ? "Save Encrypted" : "Save Unencrypted"}
            allowEmpty={true}
          />
        )
      }

      {/* Restore Password Modal */}
      {
        showRestorePasswordModal && (
          <PasswordModal
            title="Enter Password"
            message="This backup file is encrypted. Please enter the password to restore it."
            value={restorePassword}
            onChange={(val) => {
              setRestorePassword(val)
              setRestoreError(null)
            }}
            onSubmit={handleRestorePasswordSubmit}
            onCancel={() => {
              setShowRestorePasswordModal(false)
              setPendingRestorePath(null)
              setRestoreError(null)
            }}
            error={restoreError}
            confirmButtonText="Unlock & Restore"
            allowEmpty={false}
          />
        )
      }

      {/* Manual Backup Modal */}
      {showManualBackupModal && (
        <ManualBackupModal
          confirmManualBackup={confirmManualBackup}
          setShowManualBackupModal={setShowManualBackupModal}
        />
      )}

      {/* Generic Confirmation Modal */}
      {
        showConfirmModal && (
          <div className="modal-overlay confirm-modal no-print" onClick={handleConfirmModalCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
              <div className="modal-header">
                <h2>{confirmConfig.title}</h2>
                <button className="btn-icon" onClick={handleConfirmModalCancel}>×</button>
              </div>
              <div className="modal-body">
                <p>{confirmConfig.message}</p>
              </div>
              <div className="modal-footer">
                <button className="btn ghost" onClick={handleConfirmModalCancel}>Cancel</button>
                <button className="btn primary" onClick={handleConfirmModalConfirm}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Batch Print Confirmation */}
      {showBatchPrintConfirm && (
        <BatchPrintDialog
          importQueue={importQueue} activeProfile={activeProfile}
          batchAutoNumber={batchAutoNumber} setBatchAutoNumber={setBatchAutoNumber}
          batchStartNumber={batchStartNumber} setBatchStartNumber={setBatchStartNumber}
          preferences={preferences} setPreferences={setPreferences}
          availablePrinters={availablePrinters} loadAvailablePrinters={loadAvailablePrinters}
          cancelBatchPrintConfirm={cancelBatchPrintConfirm} confirmBatchPrint={confirmBatchPrint}
        />
      )}

      {/* Batch Print Progress */}
      {isBatchPrinting && (
        <BatchProgressModal
          batchPrintProgress={batchPrintProgress}
          cancelBatchPrint={cancelBatchPrint}
        />
      )}

      {/* Batch Complete Modal */}
      {showBatchCompleteModal && (
        <BatchCompleteModal
          batchCompleteData={batchCompleteData}
          setShowBatchCompleteModal={setShowBatchCompleteModal}
        />
      )}

      {/* Column Mapping Modal */}
      {showColumnMapping && (
        <ColumnMappingModal
          columnMapping={columnMapping} setColumnMapping={setColumnMapping}
          fileHeaders={fileHeaders} rawFileData={rawFileData} fileExtension={fileExtension}
          previewRow={previewRow} setPreviewRow={setPreviewRow}
          processImportWithMapping={processImportWithMapping} setShowColumnMapping={setShowColumnMapping}
        />
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          ledgers={ledgers} checkHistory={checkHistory} glCodes={glCodes}
          selectedLedgersForExport={selectedLedgersForExport} setSelectedLedgersForExport={setSelectedLedgersForExport}
          exportGlCodeFilter={exportGlCodeFilter} setExportGlCodeFilter={setExportGlCodeFilter}
          exportDateRange={exportDateRange} setExportDateRange={setExportDateRange}
          exportStartDate={exportStartDate} setExportStartDate={setExportStartDate}
          exportEndDate={exportEndDate} setExportEndDate={setExportEndDate}
          exportSortOrder={exportSortOrder} setExportSortOrder={setExportSortOrder}
          exportFormat={exportFormat} setExportFormat={setExportFormat}
          executeExport={executeExport} setShowExportDialog={setShowExportDialog}
        />
      )}

      {/* History Modal */}
      {showHistory && (
        <HistoryModal
          historyViewMode={historyViewMode}
          activeLedger={activeLedger}
          activeLedgerId={activeLedgerId}
          checkHistory={checkHistory}
          ledgers={ledgers}
          profiles={profiles}
          glCodes={glCodes}
          historySearchTerm={historySearchTerm}
          setHistorySearchTerm={setHistorySearchTerm}
          historyGlCodeFilter={historyGlCodeFilter}
          setHistoryGlCodeFilter={setHistoryGlCodeFilter}
          historySortOrder={historySortOrder}
          setHistorySortOrder={setHistorySortOrder}
          selectedHistoryItem={selectedHistoryItem}
          setSelectedHistoryItem={setSelectedHistoryItem}
          deleteHistoryEntry={deleteHistoryEntry}
          fillFromHistoryEntry={fillFromHistoryEntry}
          setShowHistory={setShowHistory}
        />
      )}

      {/* Print Failure Modal */}
      {showPrintFailureModal && (
        <PrintFailureModal
          printFailureInfo={printFailureInfo}
          handlePrintFailureAbort={handlePrintFailureAbort}
          handlePrintFailureContinue={handlePrintFailureContinue}
        />
      )}

      {/* GL Description Modal */}
      {showGlModal && pendingGlCode && (
        <GlDescriptionModal
          code={pendingGlCode}
          onClose={() => { setShowGlModal(false); setPendingGlCode(null); setPendingAction(null); }}
          onSave={(code, description) => {
            handleSaveGlCode(code, description)
            if (pendingAction === 'print_single') handlePrintAndRecordSingle()
            else if (pendingAction === 'print_sheet') handlePrintAndRecordSheet()
            setPendingAction(null)
          }}
        />
      )}

      {/* Toast Notification */}

      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Update Notification */}
      <UpdateNotification isAdmin={!preferences.adminLocked} />
    </div >
  )
}
