import React, { useState, useMemo, useRef, useEffect } from 'react'

export function AddressInput({ value, onChange, history = [], placeholder = 'Address' }) {
    const [isOpen, setIsOpen] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(-1)
    const inputRef = useRef(null)
    const dropdownRef = useRef(null)

    // Extract and sort addresses from history (MRU + MCU)
    const uniqueAddresses = useMemo(() => {
        if (!history || !Array.isArray(history)) return []

        // 1. Analyze Order and Frequency
        const stats = new Map() // address -> { count, firstSeenIndex }

        // Iterate history (assuming index 0 is NEWEST)
        history.forEach((entry, index) => {
            const addr = entry.address ? entry.address.trim() : ''
            if (addr) {
                if (!stats.has(addr)) {
                    stats.set(addr, { count: 1, firstSeenIndex: index })
                } else {
                    const s = stats.get(addr)
                    s.count++
                    // Keep firstSeenIndex as min (newest)
                }
            }
        })

        const addresses = Array.from(stats.keys())
        if (addresses.length === 0) return []

        // Find MRU (Most Recently Used) - Lowest firstSeenIndex
        let mruAddr = addresses[0]
        let minIndex = stats.get(mruAddr).firstSeenIndex

        addresses.forEach(a => {
            if (stats.get(a).firstSeenIndex < minIndex) {
                minIndex = stats.get(a).firstSeenIndex
                mruAddr = a
            }
        })

        // Find MCU (Most Commonly Used) - Highest count (excluding MRU)
        let mcuAddr = null
        let maxCount = -1

        addresses.forEach(a => {
            if (a === mruAddr) return
            if (stats.get(a).count > maxCount) {
                maxCount = stats.get(a).count
                mcuAddr = a
            }
        })

        // Sort the rest alphabetically
        const others = addresses.filter(a => a !== mruAddr && a !== mcuAddr).sort()

        // Construct final list
        const result = [mruAddr]
        if (mcuAddr) result.push(mcuAddr)
        return [...result, ...others]
    }, [history])

    // Filter suggestions
    const suggestions = useMemo(() => {
        if (!value || value.trim() === '') return uniqueAddresses.slice(0, 8)
        const searchTerm = value.toLowerCase().trim()
        return uniqueAddresses.filter(addr =>
            addr.toLowerCase().includes(searchTerm)
        ).slice(0, 8)
    }, [value, uniqueAddresses])

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

    const handleChange = (e) => {
        onChange(e.target.value)
        setIsOpen(true)
        setHighlightedIndex(-1)
    }

    const handleSelect = (addr) => {
        onChange(addr)
        setIsOpen(false)
        setHighlightedIndex(-1)
        inputRef.current?.focus()
    }

    const handleKeyDown = (e) => {
        if (!isOpen || suggestions.length === 0) {
            if (e.key === 'ArrowDown' && suggestions.length > 0) {
                setIsOpen(true)
                setHighlightedIndex(0)
            }
            return
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setHighlightedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0)
                break
            case 'ArrowUp':
                e.preventDefault()
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1)
                break
            case 'Enter':
                if (highlightedIndex >= 0) {
                    e.preventDefault()
                    handleSelect(suggestions[highlightedIndex])
                }
                break
            case 'Escape':
                setIsOpen(false)
                break
            case 'Tab':
                setIsOpen(false)
                break
        }
    }

    const showDropdown = isOpen && suggestions.length > 0

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <textarea
                ref={inputRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={3}
                style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: 'rgba(255, 255, 255, 0.92)',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'all 150ms ease',
                    minHeight: '80px',
                    lineHeight: '1.4'
                }}
                onFocus={(e) => {
                    setIsOpen(true)
                    e.target.style.background = 'rgba(0, 0, 0, 0.3)'
                    e.target.style.borderColor = 'rgba(56, 189, 248, 0.5)'
                    e.target.style.boxShadow = '0 0 0 2px rgba(56, 189, 248, 0.2)'
                }}
                onBlur={(e) => {
                    e.target.style.background = 'rgba(0, 0, 0, 0.2)'
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                    e.target.style.boxShadow = 'none'
                }}
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
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflowY: 'auto'
                    }}
                >
                    {suggestions.map((addr, index) => (
                        <div
                            key={index}
                            onClick={() => handleSelect(addr)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: index < suggestions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                                color: index === highlightedIndex ? 'var(--accent-hover)' : 'var(--text-bright)',
                                backgroundColor: index === highlightedIndex ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                transition: 'background-color 0.1s'
                            }}
                        >
                            <div style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{addr}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
