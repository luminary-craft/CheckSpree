import { useState, useCallback } from 'react'

export function useAdmin(preferences, setPreferences, showToast) {
  // Admin PIN modal
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')

  // Change PIN modal
  const [showChangePinModal, setShowChangePinModal] = useState(false)
  const [currentPinInput, setCurrentPinInput] = useState('')
  const [newPinInput, setNewPinInput] = useState('')
  const [confirmPinInput, setConfirmPinInput] = useState('')
  const [changePinError, setChangePinError] = useState('')

  const handleUnlockRequest = useCallback(() => {
    setPinInput('')
    setPinError('')
    setShowPinModal(true)
  }, [])

  const handlePinSubmit = useCallback(() => {
    if (pinInput === preferences.adminPin) {
      setPreferences(p => ({ ...p, adminLocked: false }))
      setShowPinModal(false)
      setPinInput('')
      setPinError('')
    } else {
      setPinError('Incorrect PIN')
      setPinInput('')
    }
  }, [pinInput, preferences.adminPin, setPreferences])

  const handleLock = useCallback(() => {
    setPreferences(p => ({ ...p, adminLocked: true }))
  }, [setPreferences])

  const handleChangePinRequest = useCallback(() => {
    setCurrentPinInput('')
    setNewPinInput('')
    setConfirmPinInput('')
    setChangePinError('')
    setShowChangePinModal(true)
  }, [])

  const handleChangePinSubmit = useCallback(() => {
    // Verify current PIN
    if (currentPinInput !== preferences.adminPin) {
      setChangePinError('Current PIN is incorrect')
      return
    }

    // Validate new PIN format
    if (!/^\d{4}$/.test(newPinInput)) {
      setChangePinError('New PIN must be exactly 4 digits')
      return
    }

    // Verify PINs match
    if (newPinInput !== confirmPinInput) {
      setChangePinError('New PINs do not match')
      return
    }

    // Update PIN
    setPreferences(p => ({ ...p, adminPin: newPinInput }))
    setShowChangePinModal(false)
    showToast('PIN updated successfully', 'success')
  }, [currentPinInput, newPinInput, confirmPinInput, preferences.adminPin, setPreferences, showToast])

  return {
    // State
    showPinModal, setShowPinModal,
    pinInput, setPinInput,
    pinError, setPinError,
    showChangePinModal, setShowChangePinModal,
    currentPinInput, setCurrentPinInput,
    newPinInput, setNewPinInput,
    confirmPinInput, setConfirmPinInput,
    changePinError,
    // Actions
    handleUnlockRequest,
    handlePinSubmit,
    handleLock,
    handleChangePinRequest,
    handleChangePinSubmit
  }
}
