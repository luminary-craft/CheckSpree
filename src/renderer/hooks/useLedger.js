import { useState, useMemo, useCallback } from 'react'
import { generateId, sanitizeCurrencyInput } from '../utils/helpers'
import { getLocalDateString } from '../utils/date'

/**
 * Custom hook for managing ledgers and check history
 * 
 * Extracted from App_MONOLITH.jsx to centralize ledger state management
 * This includes:
 * - Multiple ledgers with hybrid balance calculation
 * - Check and deposit history tracking
 * - CRUD operations for ledgers and transactions
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.activeProfileId - Current active profile ID
 * @param {Function} options.showConfirm - Confirmation dialog function
 * @returns {Object} Ledger state and functions
 */
export function useLedger({ activeProfileId, showConfirm }) {
    // ========================================
    // STATE
    // ========================================

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

    // ========================================
    // COMPUTED VALUES
    // ========================================

    /**
     * Get the active ledger object
     */
    const activeLedger = useMemo(() => {
        return ledgers.find(l => l.id === activeLedgerId) || ledgers[0]
    }, [ledgers, activeLedgerId])

    /**
     * Calculate hybrid balance from startingBalance + deposits - checks
     * This is the "truth" of the ledger balance
     */
    const calculateHybridBalance = useCallback((ledgerId) => {
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
    }, [ledgers, checkHistory])

    /**
     * Current balance of the active ledger
     */
    const currentBalance = useMemo(() => {
        return calculateHybridBalance(activeLedgerId)
    }, [activeLedgerId, calculateHybridBalance])

    /**
     * Get balance for a specific ledger
     */
    const getLedgerBalance = useCallback((ledgerId) => {
        return calculateHybridBalance(ledgerId)
    }, [calculateHybridBalance])

    /**
     * Get check history for a specific ledger
     */
    const getLedgerHistory = useCallback((ledgerId) => {
        return checkHistory.filter(entry => entry.ledgerId === ledgerId)
    }, [checkHistory])

    // ========================================
    // LEDGER MANAGEMENT
    // ========================================

    /**
     * Create a new ledger
     */
    const createNewLedger = useCallback(() => {
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
        setLedgers(prev => [...prev, newLedger])
        setActiveLedgerId(newLedger.id)

        return newLedger
    }, [ledgers])

    /**
     * Delete a ledger (with confirmation if it has checks)
     */
    const deleteLedger = useCallback((ledgerId) => {
        if (ledgers.length <= 1) {
            alert('You must have at least one ledger')
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
                    setCheckHistory(prev => prev.filter(c => c.ledgerId !== ledgerId))
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
    }, [ledgers, checkHistory, activeLedgerId, showConfirm])

    /**
     * Rename a ledger
     */
    const renameLedger = useCallback((ledgerId, newName) => {
        setLedgers(prev => prev.map(l =>
            l.id === ledgerId ? { ...l, name: newName } : l
        ))
    }, [])

    /**
     * Update ledger balance (legacy - not used in hybrid mode)
     */
    const updateLedgerBalance = useCallback((ledgerId, newBalance) => {
        setLedgers(prev => prev.map(l =>
            l.id === ledgerId ? { ...l, balance: newBalance } : l
        ))
    }, [])

    /**
     * Update ledger starting balance
     */
    const updateLedgerStartingBalance = useCallback((ledgerId, newStartingBalance) => {
        setLedgers(prev => prev.map(l =>
            l.id === ledgerId ? { ...l, startingBalance: newStartingBalance } : l
        ))
    }, [])

    /**
     * Toggle ledger lock status
     */
    const toggleLedgerLock = useCallback((ledgerId) => {
        setLedgers(prev => prev.map(l =>
            l.id === ledgerId ? { ...l, lockLedgerStart: !l.lockLedgerStart } : l
        ))
    }, [])

    /**
     * Switch to a different ledger
     */
    const switchLedger = useCallback((ledgerId) => {
        const ledger = ledgers.find(l => l.id === ledgerId)
        if (ledger) {
            setActiveLedgerId(ledgerId)
            return true
        }
        return false
    }, [ledgers])

    // ========================================
    // CHECK/DEPOSIT MANAGEMENT
    // ========================================

    /**
     * Record a check transaction
     */
    const recordCheck = useCallback((checkData) => {
        const amount = sanitizeCurrencyInput(checkData.amount)
        if (amount <= 0) return false
        if (!checkData.payee?.trim()) return false

        // Use hybrid balance for accurate balance tracking
        const previousBalance = calculateHybridBalance(activeLedgerId)
        const newBalance = previousBalance - amount

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
            glCode: checkData.glCode || '',
            address: checkData.address || '',
            checkNumber: checkData.checkNumber || '',
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

        setCheckHistory(prev => [checkEntry, ...prev])

        // Trigger auto-backup (debounced, silent)
        if (window.cs2?.backupTriggerAuto) {
            window.cs2.backupTriggerAuto().catch(err => {
                console.error('Auto-backup trigger failed:', err)
            })
        }

        return true
    }, [activeLedgerId, activeProfileId, calculateHybridBalance])

    /**
     * Record a deposit/adjustment transaction
     */
    const recordDeposit = useCallback((depositData) => {
        const amount = sanitizeCurrencyInput(depositData.amount)
        if (amount <= 0) return false
        if (!depositData.description?.trim()) return false

        // Use hybrid balance for accurate balance tracking
        const previousBalance = calculateHybridBalance(activeLedgerId)
        const newBalance = previousBalance + amount

        const depositEntry = {
            id: generateId(),
            type: 'deposit', // Transaction type
            date: depositData.date || getLocalDateString(),
            payee: depositData.description, // Using payee field for deposit description
            amount: amount,
            memo: depositData.description || '',
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

        // Trigger auto-backup (debounced, silent)
        if (window.cs2?.backupTriggerAuto) {
            window.cs2.backupTriggerAuto().catch(err => {
                console.error('Auto-backup trigger failed:', err)
            })
        }

        return true
    }, [activeLedgerId, activeProfileId, calculateHybridBalance])

    /**
     * Delete a history entry (check or deposit)
     */
    const deleteHistoryEntry = useCallback((entryId) => {
        setCheckHistory(prev => prev.filter(e => e.id !== entryId))
    }, [])

    /**
     * Fill form from a history entry (for "Copy Previous" feature)
     */
    const fillFromHistoryEntry = useCallback((entry) => {
        if (!entry || entry.type === 'deposit') return null // Don't fill from deposits

        const today = getLocalDateString()

        return {
            date: today, // Use today's date, not historical
            payee: entry.payee || '',
            amount: entry.amount ? String(entry.amount) : '',
            memo: entry.memo || '',
            external_memo: entry.external_memo || '',
            internal_memo: entry.internal_memo || '',
            line_items: entry.line_items || [],
            line_items_text: entry.line_items_text || '',
            glCode: entry.glCode || '',
            address: entry.address || '',
            checkNumber: '' // Clear - user assigns new number
        }
    }, [])

    /**
     * Get filtered and sorted history
     */
    const getFilteredHistory = useCallback((options = {}) => {
        const {
            ledgerId = null,
            searchTerm = '',
            sortOrder = 'date-desc',
            viewMode = 'all' // 'all' or 'current'
        } = options

        let filtered = [...checkHistory]

        // Filter by ledger
        if (viewMode === 'current') {
            filtered = filtered.filter(entry => entry.ledgerId === activeLedgerId)
        } else if (ledgerId) {
            filtered = filtered.filter(entry => entry.ledgerId === ledgerId)
        }

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(entry => {
                const payee = (entry.payee || '').toLowerCase()
                const memo = (entry.memo || '').toLowerCase()
                const amount = String(entry.amount || '')
                return payee.includes(term) || memo.includes(term) || amount.includes(term)
            })
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortOrder) {
                case 'date-desc':
                    return new Date(b.date) - new Date(a.date)
                case 'date-asc':
                    return new Date(a.date) - new Date(b.date)
                case 'amount-desc':
                    return (b.amount || 0) - (a.amount || 0)
                case 'amount-asc':
                    return (a.amount || 0) - (b.amount || 0)
                case 'payee-asc':
                    return (a.payee || '').localeCompare(b.payee || '')
                case 'payee-desc':
                    return (b.payee || '').localeCompare(a.payee || '')
                default:
                    return 0
            }
        })

        return filtered
    }, [checkHistory, activeLedgerId])

    // ========================================
    // BULK OPERATIONS
    // ========================================

    /**
     * Import ledger data (for restore/migration)
     */
    const importLedgerData = useCallback((data) => {
        if (data.ledgers) setLedgers(data.ledgers)
        if (data.activeLedgerId) setActiveLedgerId(data.activeLedgerId)
        if (data.checkHistory) setCheckHistory(data.checkHistory)
    }, [])

    /**
     * Export ledger data (for backup/migration)
     */
    const exportLedgerData = useCallback(() => {
        return {
            ledgers,
            activeLedgerId,
            checkHistory
        }
    }, [ledgers, activeLedgerId, checkHistory])

    /**
     * Clear all history (with confirmation)
     */
    const clearAllHistory = useCallback(() => {
        setCheckHistory([])
    }, [])

    /**
     * Reset ledger to initial state
     */
    const resetLedger = useCallback((ledgerId) => {
        // Clear all history for this ledger
        setCheckHistory(prev => prev.filter(entry => entry.ledgerId !== ledgerId))
        // Reset starting balance to 0
        setLedgers(prev => prev.map(l =>
            l.id === ledgerId ? { ...l, startingBalance: 0, balance: 0 } : l
        ))
    }, [])

    // ========================================
    // RETURN API
    // ========================================

    return {
        // State
        ledgers,
        activeLedgerId,
        activeLedger,
        checkHistory,
        currentBalance,

        // Ledger Management
        createNewLedger,
        deleteLedger,
        renameLedger,
        switchLedger,
        updateLedgerBalance,
        updateLedgerStartingBalance,
        toggleLedgerLock,
        getLedgerBalance,
        getLedgerHistory,
        resetLedger,

        // Transaction Management
        recordCheck,
        recordDeposit,
        deleteHistoryEntry,
        fillFromHistoryEntry,
        getFilteredHistory,

        // Bulk Operations
        importLedgerData,
        exportLedgerData,
        clearAllHistory,

        // Utilities
        calculateHybridBalance,

        // Setters (for external state management/persistence)
        setLedgers,
        setActiveLedgerId,
        setCheckHistory
    }
}
