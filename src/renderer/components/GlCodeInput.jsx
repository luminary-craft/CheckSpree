import React, { useState, useEffect, useRef } from 'react'

export default function GlCodeInput({ value, onChange, glCodes = [], onManage }) {
    const [showDropdown, setShowDropdown] = useState(false)
    const [filter, setFilter] = useState('')
    const wrapperRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredCodes = glCodes.filter(c =>
        c.code.toLowerCase().includes(filter.toLowerCase()) ||
        c.description.toLowerCase().includes(filter.toLowerCase())
    )

    const exactMatch = glCodes.find(c => c.code === value)

    return (
        <div className="gl-code-input-wrapper" ref={wrapperRef} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
                <input
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value)
                        setFilter(e.target.value)
                        setShowDropdown(true)
                    }}
                    onFocus={() => {
                        setFilter(value)
                        setShowDropdown(true)
                    }}
                    placeholder="Code"
                    style={{ width: '120px' }}
                />
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', fontSize: '13px', color: '#94a3b8' }}>
                    {exactMatch ? exactMatch.description : (value ? <span style={{ color: '#f59e0b' }}>New Code</span> : '')}
                </div>
                <button
                    className="btn btn-sm"
                    onClick={() => onManage(value)}
                    title="Manage GL Codes"
                >
                    Manage
                </button>
            </div>

            {showDropdown && (
                <div className="dropdown-menu" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    zIndex: 1000,
                    marginTop: '4px'
                }}>
                    {filteredCodes.length > 0 ? (
                        filteredCodes.map(c => (
                            <div
                                key={c.id}
                                className="dropdown-item"
                                onClick={() => {
                                    onChange(c.code)
                                    setShowDropdown(false)
                                }}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #334155',
                                    display: 'flex',
                                    justifyContent: 'space-between'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <span style={{ fontWeight: 'bold', color: '#fff' }}>{c.code}</span>
                                <span style={{ color: '#94a3b8' }}>{c.description}</span>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '8px 12px', color: '#94a3b8', fontSize: '12px' }}>
                            No matches found. Press Manage to add.
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
