import React, { useState, useMemo, useEffect, useRef } from 'react'

// Payee autocomplete - suggests previously used payees from history
export function PayeeAutocomplete({ value, onChange, checkHistory = [], placeholder = 'Recipient name' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Get unique payees from check history (only checks, not deposits)
  const uniquePayees = useMemo(() => {
    if (!checkHistory || !Array.isArray(checkHistory)) return []
    const payees = new Set()
    checkHistory
      .filter(entry => entry.type === 'check' || !entry.type) // Include legacy entries
      .forEach(entry => {
        if (entry.payee?.trim()) {
          payees.add(entry.payee.trim())
        }
      })
    return Array.from(payees).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
  }, [checkHistory])

  // Filter suggestions based on current input
  const suggestions = useMemo(() => {
    if (!value || value.trim() === '') return uniquePayees.slice(0, 50) // Show top 50 if empty
    const searchTerm = value.toLowerCase().trim()
    return uniquePayees.filter(payee =>
      payee.toLowerCase().includes(searchTerm) &&
      payee.toLowerCase() !== searchTerm // Don't show if exact match
    ).slice(0, 8) // Limit to 8 suggestions
  }, [value, uniquePayees])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e) => {
    onChange(e.target.value)
    setIsOpen(true)
    setHighlightedIndex(-1)
  }

  const handleSelect = (payee) => {
    onChange(payee)
    setIsOpen(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (!isOpen) { // Removed empty check to allow opening on arrow down even if empty
      if (e.key === 'ArrowDown') {
        setIsOpen(true)
        setHighlightedIndex(0)
        e.preventDefault()
      }
      return
    }

    if (suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault()
          handleSelect(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  const showDropdown = isOpen && suggestions.length > 0

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)} // Open on focus
        onClick={() => setIsOpen(true)} // Open on click
        placeholder={placeholder}
        autoComplete="off"
      />
      {showDropdown && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {suggestions.map((payee, index) => (
            <div
              key={payee}
              onMouseDown={(e) => {
                e.preventDefault() // Prevent blur
                handleSelect(payee)
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: index === highlightedIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: index === highlightedIndex ? 'var(--accent-hover)' : '#e2e8f0',
                borderBottom: index < suggestions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                fontSize: '13px',
                transition: 'background-color 0.1s'
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {payee}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
