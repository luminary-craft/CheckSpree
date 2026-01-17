import { useState, useEffect, useRef, useCallback } from 'react'
import { generateId, normalizeModel } from '../utils/helpers'
import { getLocalDateString } from '../utils/date'
import { numberToWords } from '../utils/numberToWords'
import { usePersistenceSaver } from './usePersistenceSaver'

const DEFAULT_FIELDS = {
    date: { x: 6.65, y: 0.50, w: 1.6, h: 0.40, fontIn: 0.28, label: 'Date' },
    payee: { x: 0.75, y: 1.05, w: 6.2, h: 0.45, fontIn: 0.32, label: 'Pay to the Order of' },
    amount: { x: 6.95, y: 1.05, w: 1.25, h: 0.45, fontIn: 0.32, label: 'Amount ($)' },
    amountWords: { x: 0.75, y: 1.55, w: 7.5, h: 0.45, fontIn: 0.30, label: 'Amount in Words' },
    memo: { x: 0.75, y: 2.35, w: 3.8, h: 0.45, fontIn: 0.28, label: 'Memo' },
    address: { x: 0.75, y: 1.6, w: 3.5, h: 0.8, fontIn: 0.12, label: 'Address' },
    checkNumber: { x: 7.8, y: 0.15, w: 0.6, h: 0.30, fontIn: 0.24, label: 'Check #' }
}

const DEFAULT_LAYOUT = {
    widthIn: 8.5,
    checkHeightIn: 3.0,
    stub1Enabled: false,
    stub1HeightIn: 3.0,
    stub2Enabled: false,
    stub2HeightIn: 3.0,
    cutLine1In: 3.66,
    cutLine2In: 7.33
}

const DEFAULT_MODEL = {
    page: { size: 'Letter', widthIn: 8.5, heightIn: 11 },
    placement: { offsetXIn: 0, offsetYIn: 0 },
    layout: DEFAULT_LAYOUT,
    view: { zoom: 0.9 },
    template: { path: null, opacity: 0.9, fit: 'cover' },
    fields: DEFAULT_FIELDS,
    slotFields: {
        top: DEFAULT_FIELDS,
        middle: DEFAULT_FIELDS,
        bottom: DEFAULT_FIELDS
    }
}

export function useCheckForm({ profiles, activeProfileId, ledgers, activeLedgerId, checkHistory, preferences, importQueue }) {
    // ========================================
    // STATE
    // ========================================

    const [model, setModel] = useState(DEFAULT_MODEL)

    // Single check state
    const [data, setData] = useState({
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
        glCode: '',
        address: '',
        checkNumber: ''
    })

    // Three-up sheet state
    const [sheetData, setSheetData] = useState({
        top: { ...data, date: getLocalDateString() },
        middle: { ...data, date: getLocalDateString() },
        bottom: { ...data, date: getLocalDateString() }
    })

    const [activeSlot, setActiveSlot] = useState('top') // 'top' | 'middle' | 'bottom'
    const [autoIncrementCheckNumbers, setAutoIncrementCheckNumbers] = useState(false)
    const [checkMode, setCheckMode] = useState('simple') // 'simple' | 'itemized'
    const [lineItems, setLineItems] = useState([])
    const [editMode, setEditMode] = useState(false)

    // Derived state
    const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0]
    const isThreeUp = activeProfile?.layoutMode === 'three_up'

    // ========================================
    // DRAFT PERSISTENCE
    // ========================================

    // Load settings from disk on launch
    useEffect(() => {
        let cancelled = false
            ; (async () => {
                const persisted = await window.cs2.settingsGet()
                if (cancelled) return

                if (persisted?.model) setModel(normalizeModel(persisted.model, DEFAULT_MODEL, DEFAULT_LAYOUT, DEFAULT_FIELDS))

                if (persisted?.data) {
                    // Restore data but RESET the date to today
                    const { date, ...rest } = persisted.data
                    const today = getLocalDateString()
                    console.log('Restoring data (FORCE RESET). Date was:', date, 'Now:', today)
                    setData((prev) => ({ ...prev, ...rest, date: today }))
                }

                if (persisted?.sheetData) {
                    // Restore sheet data but RESET dates to today
                    const newSheetData = { ...persisted.sheetData }
                    const today = getLocalDateString()
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
            })()
        return () => { cancelled = true }
    }, [])

    // Save settings to disk (using the existing hook)
    usePersistenceSaver({
        model, data, sheetData, activeSlot, autoIncrementCheckNumbers,
        editMode, profiles, activeProfileId, ledgers, activeLedgerId,
        checkHistory, preferences, importQueue
    })

    // ========================================
    // HELPERS
    // ========================================

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
        glCode: '',
        address: '',
        checkNumber: ''
    })

    const isSlotEmpty = (slotData) => {
        if (!slotData) return true
        return !slotData.payee?.trim() &&
            !slotData.amount?.trim() &&
            !slotData.memo?.trim() &&
            !slotData.external_memo?.trim() &&
            !slotData.internal_memo?.trim() &&
            !slotData.glCode?.trim() &&
            !slotData.address?.trim() &&
            !slotData.line_items_text?.trim()
    }

    // Get current data based on mode
    const getCurrentData = () => {
        if (isThreeUp) {
            return sheetData[activeSlot]
        }
        return data
    }

    // Update current data based on mode
    const updateCurrentData = (updates) => {
        if (isThreeUp) {
            setSheetData(prev => {
                const newData = {
                    ...prev,
                    [activeSlot]: { ...prev[activeSlot], ...updates }
                }

                // Auto-increment check numbers for subsequent slots
                if (updates.checkNumber && autoIncrementCheckNumbers) {
                    const baseNumber = parseInt(updates.checkNumber)
                    if (!isNaN(baseNumber)) {
                        const slots = ['top', 'middle', 'bottom']
                        const currentIndex = slots.indexOf(activeSlot)

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
        if (isThreeUp) {
            setSheetData(prev => ({
                ...prev,
                [activeSlot]: getEmptySlotData()
            }))
        } else {
            setData(getEmptySlotData())
        }
    }

    const clearAllSlots = (showConfirm) => {
        if (isThreeUp) {
            showConfirm(
                'Clear All Slots?',
                'This will clear all three slots. This cannot be undone.',
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

    // ========================================
    // EFFECTS
    // ========================================

    // Sync parent fields to stubs (One-way: Parent -> Stub)
    const parentFieldsRef = useRef({ date: '', payee: '', amount: '', memo: '', external_memo: '', internal_memo: '' })

    useEffect(() => {
        const currentData = getCurrentData()
        const currentParent = {
            date: currentData.date,
            payee: currentData.payee,
            amount: currentData.amount,
            memo: currentData.memo,
            external_memo: currentData.external_memo,
            internal_memo: currentData.internal_memo
        }

        const parentChanged = Object.keys(currentParent).some(
            key => parentFieldsRef.current[key] !== currentParent[key]
        )

        if (parentChanged) {
            parentFieldsRef.current = currentParent

            // Only update if stubs are enabled in layout
            if (model.layout.stub1Enabled || model.layout.stub2Enabled) {
                const updates = {}
                if (model.layout.stub1Enabled) {
                    updates.stub1_date = currentParent.date
                    updates.stub1_payee = currentParent.payee
                    updates.stub1_amount = currentParent.amount
                    updates.stub1_memo = currentParent.external_memo || currentParent.memo || ''
                }
                if (model.layout.stub2Enabled) {
                    updates.stub2_date = currentParent.date
                    updates.stub2_payee = currentParent.payee
                    updates.stub2_amount = currentParent.amount
                    updates.stub2_memo = currentParent.internal_memo || currentParent.memo || ''
                }

                if (Object.keys(updates).length > 0) {
                    updateCurrentData(updates)
                }
            }
        }
    }, [data, sheetData, activeSlot, isThreeUp, model.layout])

    // Auto-generate amount words
    useEffect(() => {
        const currentData = getCurrentData()
        if (!currentData.amount) {
            if (currentData.amountWords) updateCurrentData({ amountWords: '' })
            return
        }
        const words = numberToWords(currentData.amount)
        if (currentData.amountWords !== words) {
            updateCurrentData({ amountWords: words })
        }
    }, [isThreeUp ? sheetData[activeSlot]?.amount : data.amount, activeSlot, isThreeUp])

    // Sync line items in itemized mode
    useEffect(() => {
        if (checkMode === 'itemized') {
            const total = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
            const lineItemsText = lineItems
                .filter(item => item.description || item.amount)
                .map(item => `${item.description} - $${parseFloat(item.amount || 0).toFixed(2)}`)
                .join('\n')

            updateCurrentData({
                amount: total.toFixed(2),
                line_items_text: lineItemsText,
                line_items: lineItems.map(item => ({
                    description: item.description,
                    amount: parseFloat(item.amount || 0)
                }))
            })
        }
    }, [checkMode, lineItems])

    // Handle switching between standard and three_up modes
    useEffect(() => {
        if (isThreeUp) {
            // Entering three_up mode
            const hasInitializedSheet = sheetData.top.payee || sheetData.top.amount ||
                sheetData.middle.payee || sheetData.middle.amount ||
                sheetData.bottom.payee || sheetData.bottom.amount

            if (!hasInitializedSheet && (data.payee || data.amount)) {
                setSheetData({
                    top: { ...data },
                    middle: getEmptySlotData(),
                    bottom: getEmptySlotData()
                })
                setActiveSlot('top')
            }
        } else {
            // Exiting three_up mode
            const currentSlot = sheetData[activeSlot]
            if (currentSlot && !isSlotEmpty(currentSlot)) {
                setData(currentSlot)
            }
        }
    }, [activeProfile?.layoutMode])

    return {
        // State
        model, setModel,
        data, setData,
        sheetData, setSheetData,
        activeSlot, setActiveSlot,
        autoIncrementCheckNumbers, setAutoIncrementCheckNumbers,
        checkMode, setCheckMode,
        lineItems, setLineItems,
        editMode, setEditMode,

        // Helpers
        getCurrentData,
        updateCurrentData,
        clearCurrentSlot,
        clearAllSlots,
        isThreeUp
    }
}
