import { useState, useCallback } from 'react'

/**
 * Hook for managing digital signature image state and operations.
 *
 * Signatures are stored per-profile so each check profile can have
 * its own signature image. The signature data includes the base64
 * image, position/size on the check canvas, and opacity.
 *
 * @param {Object} activeProfile - The currently active check profile
 * @param {Function} setProfiles - State setter to update all profiles
 * @param {string} activeProfileId - ID of the active profile
 * @returns {Object} Signature state and actions
 */
export function useSignature(activeProfile, setProfiles, activeProfileId) {
    // Whether the signature file picker is currently open
    const [isLoadingSignature, setIsLoadingSignature] = useState(false)

    // Extract signature data from the active profile (or use defaults)
    const signature = activeProfile?.signature || null
    const signatureImage = signature?.imageDataUrl || null
    const signatureOpacity = signature?.opacity ?? 1.0
    const signatureEnabled = signature?.enabled ?? false

    /**
     * Update the signature config on the active profile.
     * Merges the partial update into the existing signature object.
     *
     * @param {Object} partial - Partial signature update to merge
     */
    const updateSignature = useCallback((partial) => {
        setProfiles(prev => prev.map(p =>
            p.id === activeProfileId
                ? {
                    ...p,
                    signature: {
                        ...(p.signature || {}),
                        opacity: signatureOpacity,
                        enabled: signatureEnabled,
                        ...partial
                    }
                }
                : p
        ))
    }, [activeProfileId, setProfiles, signatureOpacity, signatureEnabled])

    /**
     * Load a signature image from the file system.
     * Uses the existing IPC readFileAsDataURL to load the image
     * and stores the base64 data URL in the profile.
     */
    const loadSignature = useCallback(async () => {
        try {
            setIsLoadingSignature(true)

            // Use existing template select dialog (reuses file picker IPC)
            const result = await window.cs2.selectTemplate()
            if (!result?.success || !result.path) {
                setIsLoadingSignature(false)
                return
            }

            // Read the selected image as a data URL
            const imageData = await window.cs2.readFileAsDataURL(result.path)
            if (!imageData?.success || !imageData.dataUrl) {
                console.error('[Signature] Failed to read image:', imageData?.error)
                setIsLoadingSignature(false)
                return
            }

            // Store the image data URL and enable the signature
            updateSignature({
                imageDataUrl: imageData.dataUrl,
                imagePath: result.path,
                enabled: true
            })

            setIsLoadingSignature(false)
        } catch (error) {
            console.error('[Signature] Error loading signature:', error)
            setIsLoadingSignature(false)
        }
    }, [updateSignature])

    /**
     * Clear the signature image and disable it.
     */
    const clearSignature = useCallback(() => {
        updateSignature({
            imageDataUrl: null,
            imagePath: null,
            enabled: false
        })
    }, [updateSignature])

    /**
     * Toggle signature visibility on/off without removing the image.
     */
    const toggleSignature = useCallback(() => {
        updateSignature({ enabled: !signatureEnabled })
    }, [updateSignature, signatureEnabled])

    /**
     * Update the signature opacity (0.0 to 1.0).
     *
     * @param {number} opacity - Opacity value between 0 and 1
     */
    const updateOpacity = useCallback((opacity) => {
        const clamped = Math.max(0, Math.min(1, opacity))
        updateSignature({ opacity: clamped })
    }, [updateSignature])

    return {
        // State
        signatureImage,
        signatureOpacity,
        signatureEnabled,
        isLoadingSignature,

        // Actions
        loadSignature,
        clearSignature,
        toggleSignature,
        updateOpacity,
        updateSignature
    }
}
