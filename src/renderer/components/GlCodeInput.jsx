import React, { useState, useMemo, useEffect, useRef } from 'react'

// GL Code Input with Autocomplete
export function GlCodeInput({ value, onChange, glCodes = [], placeholder = 'GL Code' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Filter suggestions based on current input
  const suggestions = useMemo(() => {
    if (!value || value.trim() === '') return glCodes.slice(0, 50)
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
    if (typeof item === 'object') {
      onChange({ code: item.code, description: item.description })
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
        <div ref={dropdownRef} className="autocomplete-dropdown gl-dropdown">
          {suggestions.map((item, index) => (
            <div
              key={item.code}
              className={`autocomplete-item ${index === highlightedIndex ? 'active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(item)
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <span className="gl-item-code">{item.code}</span>
              <span className="gl-item-desc">{item.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
