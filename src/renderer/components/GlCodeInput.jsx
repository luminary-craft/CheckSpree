import React, { useState, useMemo, useEffect, useRef } from 'react'

// GL Code Input with Autocomplete
export function GlCodeInput({ value, onChange, glCodes = [], placeholder = 'GL Code', ...props }) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Filter suggestions based on current input
  const suggestions = useMemo(() => {
    if (!value || value.trim() === '') return glCodes.slice(0, 50) // Show top 50 if empty
    const searchTerm = value.toLowerCase().trim()
    return glCodes.filter(item =>
      item.code.toLowerCase().includes(searchTerm) ||
      (item.description && item.description.toLowerCase().includes(searchTerm))
    ).slice(0, 8)
  }, [value, glCodes])

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
    // Explicitly pass the structure expected by App.jsx
    if (typeof item === 'object') {
      if (props.onSelect) {
        props.onSelect(item)
      } else {
        onChange({
          code: item.code,
          description: item.description
        })
      }
    } else {
      onChange(item)
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
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {suggestions.map((item, index) => (
            <div
              key={item.code}
              onMouseDown={(e) => {
                e.preventDefault() // Prevent blur
                handleSelect(item)
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: index === highlightedIndex ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: index === highlightedIndex ? '#60a5fa' : '#e2e8f0',
                borderBottom: index < suggestions.length - 1 ? '1px solid #334155' : 'none',
                fontSize: '13px',
                transition: 'background-color 0.1s',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '8px'
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <span style={{ fontWeight: 600 }}>{item.code}</span>
              <span style={{ opacity: 0.7, fontSize: '0.9em' }}>{item.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
