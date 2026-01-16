import React, { useState, useEffect, useRef } from 'react'

export default function PayeeAutocomplete({ value, onChange, checkHistory, placeholder }) {
    const [showSuggestions, setShowSuggestions] = useState(false)
    const wrapperRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Get unique payees from history
    const suggestions = [...new Set(checkHistory.map(c => c.payee))]
        .filter(p => p && p.toLowerCase().includes((value || '').toLowerCase()))
        .slice(0, 5)

    return (
        <div className="autocomplete-wrapper" ref={wrapperRef} style={{ position: 'relative' }}>
            <input
                value={value}
                onChange={(e) => {
                    onChange(e.target.value)
                    setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder={placeholder}
            />
            {showSuggestions && value && suggestions.length > 0 && (
                <div className="suggestions-list" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    zIndex: 1000,
                    marginTop: '4px'
                }}>
                    {suggestions.map((payee, i) => (
                        <div
                            key={i}
                            className="suggestion-item"
                            onClick={() => {
                                onChange(payee)
                                setShowSuggestions(false)
                            }}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: i < suggestions.length - 1 ? '1px solid #334155' : 'none'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {payee}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
