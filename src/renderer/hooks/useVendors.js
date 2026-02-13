import { useState, useCallback, useMemo } from 'react'

/**
 * Hook for managing the vendor/payee database.
 *
 * Vendors are stored as a top-level array in the app state and
 * persisted via the standard usePersistenceSaver pipeline.
 * Each vendor has contact info, address, 1099 eligibility flag,
 * and a default GL code.
 *
 * @param {Array} initialVendors - Persisted vendor array (or empty)
 * @param {Array} checkHistory - Full check history for payment lookups
 * @returns {Object} Vendor state and CRUD actions
 */
export function useVendors(initialVendors, checkHistory = []) {
    const [vendors, setVendors] = useState(initialVendors || [])

    /**
     * Generate a unique vendor ID.
     * Uses timestamp + random suffix for collision avoidance.
     */
    const generateId = useCallback(() => {
        return `vendor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    }, [])

    /**
     * Add a new vendor to the database.
     *
     * @param {Object} vendorData - Vendor fields (name, address, etc.)
     * @returns {Object} The newly created vendor with generated ID
     */
    const addVendor = useCallback((vendorData) => {
        const newVendor = {
            id: generateId(),
            name: vendorData.name || '',
            address: vendorData.address || '',
            city: vendorData.city || '',
            state: vendorData.state || '',
            zip: vendorData.zip || '',
            phone: vendorData.phone || '',
            email: vendorData.email || '',
            taxId: vendorData.taxId || '',
            is1099Eligible: vendorData.is1099Eligible || false,
            defaultGlCode: vendorData.defaultGlCode || '',
            notes: vendorData.notes || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
        setVendors(prev => [...prev, newVendor])
        return newVendor
    }, [generateId])

    /**
     * Update an existing vendor by ID.
     *
     * @param {string} vendorId - ID of the vendor to update
     * @param {Object} updates - Partial vendor fields to merge
     */
    const updateVendor = useCallback((vendorId, updates) => {
        setVendors(prev =>
            prev.map(v =>
                v.id === vendorId
                    ? { ...v, ...updates, updatedAt: new Date().toISOString() }
                    : v
            )
        )
    }, [])

    /**
     * Delete a vendor by ID.
     *
     * @param {string} vendorId - ID of the vendor to remove
     */
    const deleteVendor = useCallback((vendorId) => {
        setVendors(prev => prev.filter(v => v.id !== vendorId))
    }, [])

    /**
     * Fuzzy-match vendors by name for autocomplete.
     * Case-insensitive substring match, sorted by relevance.
     *
     * @param {string} query - Search query
     * @param {number} limit - Max results to return
     * @returns {Array} Matching vendors
     */
    const searchVendors = useCallback((query, limit = 10) => {
        if (!query || !query.trim()) return []
        const q = query.toLowerCase().trim()
        return vendors
            .filter(v => v.name.toLowerCase().includes(q))
            .sort((a, b) => {
                // Exact start match ranks higher
                const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1
                const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1
                return aStarts - bStarts || a.name.localeCompare(b.name)
            })
            .slice(0, limit)
    }, [vendors])

    /**
     * Look up a vendor by exact name.
     *
     * @param {string} name - Exact vendor name
     * @returns {Object|null} Matching vendor or null
     */
    const getVendorByName = useCallback((name) => {
        if (!name) return null
        return vendors.find(v => v.name.toLowerCase() === name.toLowerCase()) || null
    }, [vendors])

    /**
     * Get all check history entries for a specific vendor.
     * Matches by payee name (case-insensitive).
     *
     * @param {string} vendorId - Vendor ID to look up
     * @returns {Array} Check history entries for this vendor
     */
    const getVendorPayments = useCallback((vendorId) => {
        const vendor = vendors.find(v => v.id === vendorId)
        if (!vendor) return []
        const nameLC = vendor.name.toLowerCase()
        return checkHistory.filter(
            c => c.payee && c.payee.toLowerCase() === nameLC
        )
    }, [vendors, checkHistory])

    /**
     * Calculate total payments to a vendor for a given year.
     * Used for 1099 threshold checks and reporting.
     *
     * @param {string} vendorId - Vendor ID
     * @param {number} year - Calendar year
     * @returns {number} Total payment amount
     */
    const getVendorYearTotal = useCallback((vendorId, year) => {
        const payments = getVendorPayments(vendorId)
        return payments
            .filter(c => {
                const checkDate = new Date(c.date || c.printedAt)
                return checkDate.getFullYear() === year
            })
            .reduce((sum, c) => {
                const amount = typeof c.amount === 'string'
                    ? parseFloat(c.amount.replace(/[^0-9.-]/g, ''))
                    : (c.amount || 0)
                return sum + (isNaN(amount) ? 0 : amount)
            }, 0)
    }, [getVendorPayments])

    /**
     * Get all 1099-eligible vendors with their yearly totals.
     * Filters to vendors above the $600 threshold.
     *
     * @param {number} year - Calendar year
     * @param {number} threshold - Minimum amount (default $600)
     * @returns {Array} Vendors with yearTotal above threshold
     */
    const get1099Vendors = useCallback((year, threshold = 600) => {
        return vendors
            .filter(v => v.is1099Eligible)
            .map(v => ({
                ...v,
                yearTotal: getVendorYearTotal(v.id, year)
            }))
            .filter(v => v.yearTotal >= threshold)
            .sort((a, b) => b.yearTotal - a.yearTotal)
    }, [vendors, getVendorYearTotal])

    /**
     * Computed vendor count and 1099-eligible count for the current year.
     */
    const vendorStats = useMemo(() => {
        const currentYear = new Date().getFullYear()
        const eligible = vendors.filter(v => v.is1099Eligible).length
        return {
            total: vendors.length,
            eligible1099: eligible,
            currentYear
        }
    }, [vendors])

    return {
        // State
        vendors,
        setVendors,
        vendorStats,

        // CRUD
        addVendor,
        updateVendor,
        deleteVendor,

        // Search & lookups
        searchVendors,
        getVendorByName,
        getVendorPayments,
        getVendorYearTotal,
        get1099Vendors
    }
}
