import React, { useState, useMemo, useEffect, useRef } from 'react'

// Payee autocomplete - suggests vendors and previously used payees from history
// When a vendor is selected, onVendorSelect fires with the vendor object for auto-fill
export function PayeeAutocomplete({ value, onChange, onVendorSelect, checkHistory = [], vendors = [], placeholder = 'Recipient name' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Build unified suggestion list: vendors first (with full data), then history-only payees
  const suggestions = useMemo(() => {
    const searchTerm = (value || '').toLowerCase().trim()

    // Vendor matches
    const vendorMatches = (vendors || [])
      .filter(v => {
        if (!searchTerm) return true
        return v.name.toLowerCase().includes(searchTerm) &&
          v.name.toLowerCase() !== searchTerm
      })
      .sort((a, b) => {
        if (!searchTerm) return a.name.localeCompare(b.name)
        const aStarts = a.name.toLowerCase().startsWith(searchTerm) ? 0 : 1
        const bStarts = b.name.toLowerCase().startsWith(searchTerm) ? 0 : 1
        return aStarts - bStarts || a.name.localeCompare(b.name)
      })
      .slice(0, 5)
      .map(v => ({ label: v.name, type: 'vendor', vendor: v }))

    // History payee names (excluding any that already appear as vendors)
    const vendorNames = new Set((vendors || []).map(v => v.name.toLowerCase()))
    const historyPayees = new Set()
    if (checkHistory && Array.isArray(checkHistory)) {
      checkHistory
        .filter(entry => entry.type === 'check' || !entry.type)
        .forEach(entry => {
          if (entry.payee?.trim() && !vendorNames.has(entry.payee.trim().toLowerCase())) {
            historyPayees.add(entry.payee.trim())
          }
        })
    }

    const historyMatches = Array.from(historyPayees)
      .filter(p => {
        if (!searchTerm) return true
        return p.toLowerCase().includes(searchTerm) &&
          p.toLowerCase() !== searchTerm
      })
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .slice(0, 5)
      .map(p => ({ label: p, type: 'history' }))

    return [...vendorMatches, ...historyMatches]
  }, [value, vendors, checkHistory])

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

  const handleSelect = (item) => {
    onChange(item.label)
    if (item.type === 'vendor' && item.vendor && onVendorSelect) {
      onVendorSelect(item.vendor)
    }
    setIsOpen(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (!isOpen) {
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
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
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
          {suggestions.map((item, index) => (
            <div
              key={`${item.type}-${item.label}`}
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(item)
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: index === highlightedIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: index === highlightedIndex ? 'var(--accent-hover)' : '#e2e8f0',
                borderBottom: index < suggestions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                fontSize: '13px',
                transition: 'background-color 0.1s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.type === 'vendor' && (
                <span style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  backgroundColor: 'rgba(99, 179, 237, 0.15)',
                  color: '#63b3ed',
                  fontWeight: 500
                }}>vendor</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
