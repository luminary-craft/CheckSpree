import { useState, useCallback, useMemo } from 'react'

/**
 * Hook for managing recurring/scheduled check payments.
 *
 * Allows users to define recurring payment templates with
 * frequency, next due date, and check data. The hook tracks
 * which payments are due and provides actions to generate
 * checks from templates.
 *
 * @param {Array} initialSchedules - Persisted schedule records
 * @returns {Object} Schedule state, CRUD actions, and helpers
 */
export function useRecurringChecks(initialSchedules) {
    const [schedules, setSchedules] = useState(initialSchedules || [])

    /**
     * Generate a unique schedule ID.
     */
    const generateId = useCallback(() => {
        return `sched_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    }, [])

    /**
     * Add a new recurring schedule.
     *
     * @param {Object} scheduleData - Schedule template
     * @param {string} scheduleData.payee - Payee name
     * @param {number|string} scheduleData.amount - Check amount
     * @param {string} [scheduleData.memo] - Memo line
     * @param {string} scheduleData.frequency - 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'
     * @param {string} scheduleData.nextDue - Next due date (ISO string)
     * @param {boolean} [scheduleData.active] - Whether the schedule is active
     * @returns {Object} The newly created schedule record
     */
    const addSchedule = useCallback((scheduleData) => {
        const record = {
            id: generateId(),
            payee: scheduleData.payee || '',
            amount: scheduleData.amount || '',
            memo: scheduleData.memo || '',
            glCode: scheduleData.glCode || '',
            frequency: scheduleData.frequency || 'monthly',
            nextDue: scheduleData.nextDue || new Date().toISOString().split('T')[0],
            active: scheduleData.active ?? true,
            createdAt: new Date().toISOString(),
            lastGenerated: null
        }
        setSchedules(prev => [...prev, record])
        return record
    }, [generateId])

    /**
     * Update an existing schedule by ID.
     *
     * @param {string} scheduleId - ID of the schedule to update
     * @param {Object} updates - Partial fields to merge
     */
    const updateSchedule = useCallback((scheduleId, updates) => {
        setSchedules(prev =>
            prev.map(s => s.id === scheduleId ? { ...s, ...updates } : s)
        )
    }, [])

    /**
     * Delete a schedule by ID.
     *
     * @param {string} scheduleId - ID to remove
     */
    const deleteSchedule = useCallback((scheduleId) => {
        setSchedules(prev => prev.filter(s => s.id !== scheduleId))
    }, [])

    /**
     * Toggle a schedule's active/paused status.
     *
     * @param {string} scheduleId - ID to toggle
     */
    const toggleSchedule = useCallback((scheduleId) => {
        setSchedules(prev =>
            prev.map(s => s.id === scheduleId ? { ...s, active: !s.active } : s)
        )
    }, [])

    /**
     * Calculate the next due date after generating a check.
     * Advances the date by the schedule's frequency.
     *
     * @param {string} currentDate - Current due date (YYYY-MM-DD)
     * @param {string} frequency - Frequency type
     * @returns {string} Next due date (YYYY-MM-DD)
     */
    const calcNextDue = useCallback((currentDate, frequency) => {
        const d = new Date(currentDate)
        switch (frequency) {
            case 'weekly': d.setDate(d.getDate() + 7); break
            case 'biweekly': d.setDate(d.getDate() + 14); break
            case 'monthly': d.setMonth(d.getMonth() + 1); break
            case 'quarterly': d.setMonth(d.getMonth() + 3); break
            case 'annually': d.setFullYear(d.getFullYear() + 1); break
            default: d.setMonth(d.getMonth() + 1)
        }
        return d.toISOString().split('T')[0]
    }, [])

    /**
     * Mark a schedule as generated and advance its next due date.
     *
     * @param {string} scheduleId - ID of the schedule
     */
    const markGenerated = useCallback((scheduleId) => {
        setSchedules(prev =>
            prev.map(s => {
                if (s.id !== scheduleId) return s
                return {
                    ...s,
                    nextDue: calcNextDue(s.nextDue, s.frequency),
                    lastGenerated: new Date().toISOString()
                }
            })
        )
    }, [calcNextDue])

    // Schedules that are due today or overdue
    const dueSchedules = useMemo(() => {
        const today = new Date().toISOString().split('T')[0]
        return schedules.filter(s => s.active && s.nextDue <= today)
    }, [schedules])

    // Computed stats
    const stats = useMemo(() => ({
        total: schedules.length,
        active: schedules.filter(s => s.active).length,
        paused: schedules.filter(s => !s.active).length,
        due: dueSchedules.length
    }), [schedules, dueSchedules])

    return {
        // State
        schedules,
        setSchedules,
        dueSchedules,
        stats,

        // CRUD
        addSchedule,
        updateSchedule,
        deleteSchedule,
        toggleSchedule,
        markGenerated
    }
}
