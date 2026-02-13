import { useState, useCallback, useMemo } from 'react'

/**
 * Hook for managing check approval workflow.
 *
 * Supports a simple approval gate: checks above a configurable
 * threshold require approval before printing. Each approval record
 * tracks who requested and who approved/rejected, with timestamps.
 *
 * Statuses: 'pending' | 'approved' | 'rejected'
 *
 * @param {Array} initialApprovals - Persisted approval records
 * @param {Object} options - Configuration
 * @param {number} [options.threshold] - Amount above which approval is required ($0 = all)
 * @param {boolean} [options.enabled] - Whether approval workflow is active
 * @returns {Object} Approval state, actions, and helpers
 */
export function useApprovals(initialApprovals, options = {}) {
    const [approvals, setApprovals] = useState(initialApprovals || [])
    const [settings, setSettings] = useState({
        enabled: options.enabled ?? false,
        threshold: options.threshold ?? 1000,
        requireForAll: options.requireForAll ?? false
    })

    /**
     * Generate a unique approval ID.
     */
    const generateId = useCallback(() => {
        return `appr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    }, [])

    /**
     * Submit a check for approval.
     *
     * @param {Object} checkData - The check data to submit
     * @param {string} checkData.checkNumber - Check number
     * @param {number|string} checkData.amount - Check amount
     * @param {string} checkData.payee - Payee name
     * @param {string} [checkData.memo] - Check memo
     * @param {string} [requestedBy] - Who requested the approval
     * @returns {Object} The new approval record
     */
    const submitForApproval = useCallback((checkData, requestedBy = 'User') => {
        const amount = typeof checkData.amount === 'string'
            ? parseFloat(checkData.amount.replace(/[^0-9.-]/g, ''))
            : (checkData.amount || 0)

        const record = {
            id: generateId(),
            checkNumber: checkData.checkNumber || '',
            amount,
            payee: checkData.payee || '',
            memo: checkData.memo || '',
            status: 'pending',
            requestedBy,
            requestedAt: new Date().toISOString(),
            decidedBy: null,
            decidedAt: null,
            decisionNote: ''
        }

        setApprovals(prev => [record, ...prev])
        return record
    }, [generateId])

    /**
     * Approve a pending check.
     *
     * @param {string} approvalId - ID of the approval record
     * @param {string} [approvedBy] - Who approved
     * @param {string} [note] - Optional approval note
     */
    const approveCheck = useCallback((approvalId, approvedBy = 'Admin', note = '') => {
        setApprovals(prev =>
            prev.map(a =>
                a.id === approvalId && a.status === 'pending'
                    ? {
                        ...a,
                        status: 'approved',
                        decidedBy: approvedBy,
                        decidedAt: new Date().toISOString(),
                        decisionNote: note
                    }
                    : a
            )
        )
    }, [])

    /**
     * Reject a pending check.
     *
     * @param {string} approvalId - ID of the approval record
     * @param {string} [rejectedBy] - Who rejected
     * @param {string} [reason] - Rejection reason
     */
    const rejectCheck = useCallback((approvalId, rejectedBy = 'Admin', reason = '') => {
        setApprovals(prev =>
            prev.map(a =>
                a.id === approvalId && a.status === 'pending'
                    ? {
                        ...a,
                        status: 'rejected',
                        decidedBy: rejectedBy,
                        decidedAt: new Date().toISOString(),
                        decisionNote: reason
                    }
                    : a
            )
        )
    }, [])

    /**
     * Remove an approval record (e.g., after printing or cleanup).
     *
     * @param {string} approvalId - ID to remove
     */
    const removeApproval = useCallback((approvalId) => {
        setApprovals(prev => prev.filter(a => a.id !== approvalId))
    }, [])

    /**
     * Check if a given check amount requires approval.
     *
     * @param {number|string} amount - Check amount to evaluate
     * @returns {boolean} True if approval is required
     */
    const requiresApproval = useCallback((amount) => {
        if (!settings.enabled) return false
        if (settings.requireForAll) return true
        const num = typeof amount === 'string'
            ? parseFloat(amount.replace(/[^0-9.-]/g, ''))
            : amount
        return !isNaN(num) && num >= settings.threshold
    }, [settings])

    /**
     * Check if a specific check number has been approved.
     *
     * @param {string} checkNumber - Check number to look up
     * @returns {boolean} True if approved
     */
    const isApproved = useCallback((checkNumber) => {
        return approvals.some(
            a => a.checkNumber === checkNumber && a.status === 'approved'
        )
    }, [approvals])

    // Computed counts by status
    const counts = useMemo(() => ({
        pending: approvals.filter(a => a.status === 'pending').length,
        approved: approvals.filter(a => a.status === 'approved').length,
        rejected: approvals.filter(a => a.status === 'rejected').length,
        total: approvals.length
    }), [approvals])

    return {
        // State
        approvals,
        setApprovals,
        settings,
        setSettings,
        counts,

        // Actions
        submitForApproval,
        approveCheck,
        rejectCheck,
        removeApproval,

        // Helpers
        requiresApproval,
        isApproved
    }
}
