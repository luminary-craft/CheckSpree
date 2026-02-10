import React, { useRef } from 'react'

// ATM-style currency input - digits build from right (typing 123 shows $1.23)
export function AtmCurrencyInput({ value, onChange, isWarning, placeholder = '$0.00' }) {
  const inputRef = useRef(null)

  // Convert external value (string like "1.23") to cents (123)
  const valueToCents = (val) => {
    if (!val || val === '') return 0
    const cleaned = String(val).replace(/[^0-9.]/g, '')
    const num = parseFloat(cleaned)
    if (isNaN(num)) return 0
    return Math.round(num * 100)
  }

  // Convert cents to display string with comma formatting
  const centsToDisplay = (cents) => {
    if (cents === 0) return '0.00'
    const dollars = cents / 100
    // Format with commas and always 2 decimal places
    return dollars.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  // Convert cents to external value (for onChange)
  const centsToValue = (cents) => {
    if (cents === 0) return ''
    return (cents / 100).toFixed(2)
  }

  const cents = valueToCents(value)
  const displayValue = centsToDisplay(cents)

  const handleKeyDown = (e) => {
    const input = e.target
    const isAllSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length

    // Allow: backspace, delete, tab, escape, enter, arrows
    if ([8, 46, 9, 27, 13, 37, 38, 39, 40].includes(e.keyCode)) {
      if (e.keyCode === 8) { // Backspace
        e.preventDefault()
        // If all selected, clear to zero
        if (isAllSelected) {
          onChange('')
        } else {
          // Remove rightmost digit
          const newCents = Math.floor(cents / 10)
          onChange(centsToValue(newCents))
        }
      }
      return
    }

    // Block non-numeric keys
    if (e.key < '0' || e.key > '9') {
      e.preventDefault()
      return
    }

    e.preventDefault()

    // If entire value is selected, start fresh with this digit
    const digit = parseInt(e.key, 10)
    let newCents
    if (isAllSelected) {
      newCents = digit // Start fresh from this digit
    } else {
      // Append digit and shift value left
      newCents = (cents * 10) + digit
    }

    // Limit to reasonable max (e.g., $999,999,999.99 - nearly $1 billion)
    if (newCents > 99999999999) return

    onChange(centsToValue(newCents))
  }

  const handleFocus = (e) => {
    // Select all on focus for easy replacement
    e.target.select()
  }

  const handleChange = (e) => {
    // Ignore direct input - we handle everything through keyDown
    // This prevents issues with paste and other input methods
  }

  return (
    <div className={`input-prefix ${isWarning ? 'warning' : ''}`}>
      <span>$</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder="0.00"
        style={{ textAlign: 'right' }}
      />
    </div>
  )
}
