import { useState, useCallback, useEffect } from 'react'

/**
 * useProfiles Hook - Manages check profiles, calibration, and preferences
 * 
 * Features:
 * - Profile management (layout, payee info)
 * - Calibration settings (printer offsets)
 * - Global preferences
 * - Persistence via localStorage
 * 
 * @returns {Object} Profiles state and functions
 */
export function useProfiles() {
    const [profiles, setProfiles] = useState([])
    const [activeProfileId, setActiveProfileId] = useState('default')
    const [calibration, setCalibration] = useState({
        offsetX: 0,
        offsetY: 0,
        printerName: '',
        testsPrinted: 0
    })
    const [preferences, setPreferences] = useState({
        theme: 'dark',
        defaultLedger: 'default',
        autoBackup: true,
        adminPassword: '',
        adminLocked: false
    })

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const savedProfiles = localStorage.getItem('checkspree_profiles')
            const savedCalibration = localStorage.getItem('checkspree_calibration')
            const savedPreferences = localStorage.getItem('checkspree_preferences')

            if (savedProfiles) {
                setProfiles(JSON.parse(savedProfiles))
            } else {
                // Initialize with default profile
                const defaultProfile = {
                    id: 'default',
                    name: 'Default Profile',
                    layout: {
                        widthIn: 8.5,
                        checkHeightIn: 3.0,
                        stub1Enabled: false,
                        stub1HeightIn: 3.0,
                        stub2Enabled: false,
                        stub2HeightIn: 3.0
                    },
                    fields: {
                        date: { x: 6.65, y: 0.50, w: 1.6, h: 0.40, fontIn: 0.28, label: 'Date' },
                        payee: { x: 0.75, y: 1.05, w: 6.2, h: 0.45, fontIn: 0.32, label: 'Pay to the Order of' },
                        amount: { x: 6.95, y: 1.05, w: 1.25, h: 0.45, fontIn: 0.32, label: 'Amount ($)' },
                        amountWords: { x: 0.75, y: 1.55, w: 7.5, h: 0.45, fontIn: 0.30, label: 'Amount in Words' },
                        memo: { x: 0.75, y: 2.35, w: 3.8, h: 0.45, fontIn: 0.28, label: 'Memo' },
                        checkNumber: { x: 7.8, y: 0.15, w: 0.6, h: 0.30, fontIn: 0.24, label: 'Check #' }
                    },
                    payeeInfo: {
                        name: '',
                        address: '',
                        phone: ''
                    }
                }
                setProfiles([defaultProfile])
            }

            if (savedCalibration) {
                setCalibration(JSON.parse(savedCalibration))
            }

            if (savedPreferences) {
                setPreferences(JSON.parse(savedPreferences))
            }
        } catch (error) {
            console.error('Error loading profiles:', error)
        }
    }, [])

    // Save to localStorage whenever data changes
    useEffect(() => {
        try {
            localStorage.setItem('checkspree_profiles', JSON.stringify(profiles))
        } catch (error) {
            console.error('Error saving profiles:', error)
        }
    }, [profiles])

    useEffect(() => {
        try {
            localStorage.setItem('checkspree_calibration', JSON.stringify(calibration))
        } catch (error) {
            console.error('Error saving calibration:', error)
        }
    }, [calibration])

    useEffect(() => {
        try {
            localStorage.setItem('checkspree_preferences', JSON.stringify(preferences))
        } catch (error) {
            console.error('Error saving preferences:', error)
        }
    }, [preferences])

    /**
     * Get active profile
     */
    const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0]

    /**
     * Create new profile
     */
    const createProfile = useCallback((name) => {
        const newProfile = {
            id: `profile-${Date.now()}`,
            name: name || `Profile ${profiles.length + 1}`,
            layout: activeProfile?.layout || {
                widthIn: 8.5,
                checkHeightIn: 3.0,
                stub1Enabled: false,
                stub1HeightIn: 3.0,
                stub2Enabled: false,
                stub2HeightIn: 3.0
            },
            fields: { ...activeProfile?.fields } || {},
            payeeInfo: {
                name: '',
                address: '',
                phone: ''
            }
        }

        setProfiles(prev => [...prev, newProfile])
        setActiveProfileId(newProfile.id)

        return newProfile
    }, [profiles, activeProfile])

    /**
     * Update profile
     */
    const updateProfile = useCallback((profileId, updates) => {
        setProfiles(prev => prev.map(p =>
            p.id === profileId ? { ...p, ...updates } : p
        ))
    }, [])

    /**
     * Delete profile
     */
    const deleteProfile = useCallback((profileId) => {
        if (profiles.length <= 1) {
            return { success: false, error: 'Cannot delete the last profile' }
        }

        setProfiles(prev => prev.filter(p => p.id !== profileId))

        if (activeProfileId === profileId) {
            setActiveProfileId(profiles[0].id)
        }

        return { success: true }
    }, [profiles, activeProfileId])

    /**
     * Switch active profile
     */
    const switchProfile = useCallback((profileId) => {
        const profile = profiles.find(p => p.id === profileId)
        if (profile) {
            setActiveProfileId(profileId)
            return { success: true, profile }
        }
        return { success: false, error: 'Profile not found' }
    }, [profiles])

    /**
     * Update calibration
     */
    const updateCalibration = useCallback((updates) => {
        setCalibration(prev => ({ ...prev, ...updates }))
    }, [])

    /**
     * Increment test print counter
     */
    const incrementTestPrints = useCallback(() => {
        setCalibration(prev => ({
            ...prev,
            testsPrinted: (prev.testsPrinted || 0) + 1
        }))
    }, [])

    /**
     * Update preferences
     */
    const updatePreferences = useCallback((updates) => {
        setPreferences(prev => ({ ...prev, ...updates }))
    }, [])

    /**
     * Verify admin password
     */
    const verifyAdminPassword = useCallback((password) => {
        if (!preferences.adminPassword) {
            return true // No password set
        }
        return password === preferences.adminPassword
    }, [preferences.adminPassword])

    /**
     * Set admin password
     */
    const setAdminPassword = useCallback((newPassword) => {
        updatePreferences({ adminPassword: newPassword, adminLocked: !!newPassword })
    }, [updatePreferences])

    /**
     * Export all profiles
     */
    const exportProfiles = useCallback(() => {
        const exportData = {
            profiles,
            calibration,
            preferences: {
                ...preferences,
                adminPassword: '' // Don't export password
            },
            exportDate: new Date().toISOString(),
            version: '2.0'
        }

        return JSON.stringify(exportData, null, 2)
    }, [profiles, calibration, preferences])

    /**
     * Import profiles from JSON
     */
    const importProfiles = useCallback((jsonString) => {
        try {
            const importData = JSON.parse(jsonString)

            if (importData.profiles) {
                setProfiles(importData.profiles)
            }

            if (importData.calibration) {
                setCalibration(importData.calibration)
            }

            if (importData.preferences) {
                setPreferences(prev => ({
                    ...importData.preferences,
                    adminPassword: prev.adminPassword // Keep current password
                }))
            }

            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }, [])

    return {
        // State
        profiles,
        activeProfileId,
        activeProfile,
        calibration,
        preferences,

        // Profile functions
        createProfile,
        updateProfile,
        deleteProfile,
        switchProfile,

        // Calibration functions
        updateCalibration,
        incrementTestPrints,

        // Preferences functions
        updatePreferences,
        verifyAdminPassword,
        setAdminPassword,

        // Import/Export
        exportProfiles,
        importProfiles
    }
}
