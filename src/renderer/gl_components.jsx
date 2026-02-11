
// GL Code Input with Autocomplete
function GlCodeInput({ value, onChange, glCodes = [], placeholder = 'GL Code', style, ...props }) {
    // HMR Reset: Force update for GL Logic
    const [isOpen, setIsOpen] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(-1)
    const inputRef = useRef(null)
    const dropdownRef = useRef(null)

    // Filter suggestions based on current input
    const suggestions = useMemo(() => {
        if (!value || value.trim() === '') return glCodes.slice(0, 200) // Show first 200 codes if empty
        const searchTerm = value.toLowerCase().trim()
        return glCodes.filter(item =>
            item.code.toLowerCase().includes(searchTerm) ||
            (item.description && item.description.toLowerCase().includes(searchTerm))
        ).slice(0, 50)
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
        console.log('DEBUG: GlCodeInput handleSelect item:', item)
        // Explicitly pass the structure expected by App.jsx
        onChange({
            code: item.code,
            description: item.description
        })
        setIsOpen(false)
        setHighlightedIndex(-1)
        inputRef.current?.focus()
    }

    const handleKeyDown = (e) => {
        if (!isOpen || suggestions.length === 0) {
            if (e.key === 'ArrowDown' && suggestions.length > 0) {
                setIsOpen(true)
                setHighlightedIndex(0)
                e.preventDefault()
            }
            return
        }

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

    const showDropdown = isOpen

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsOpen(true)}
                onClick={(e) => {
                    setIsOpen(true)
                    props.onClick?.(e)
                }}
                placeholder={placeholder}
                autoComplete="off"
                style={style}
                {...props}
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
                    {suggestions.length === 0 ? (
                        <div style={{ padding: '8px 12px', color: 'var(--text-label)', fontSize: '13px', fontStyle: 'italic' }}>
                            No GL codes found
                        </div>
                    ) : (
                        suggestions.map((item, index) => (
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
                                    color: index === highlightedIndex ? 'var(--accent-hover)' : 'var(--text-bright)',
                                    borderBottom: index < suggestions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
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
                        )))}
                </div>
            )}
        </div>
    )
}

function GlDescriptionModal({ code, onClose, onSave }) {
    const [description, setDescription] = useState('')

    return (
        <div className="modal-overlay no-print" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>New GL Code: {code}</h2>
                    <button className="btn-icon" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <p style={{ marginBottom: '16px', color: 'var(--text-label)' }}>
                        This GL Code is not recognized. Would you like to add a description for future reference?
                    </p>
                    <div className="field">
                        <label>Description (Optional)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="e.g. Office Supplies"
                            autoFocus
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn ghost" onClick={onClose}>Skip</button>
                    <button
                        className="btn primary"
                        onClick={() => onSave(code, description)}
                    >
                        Save GL Code
                    </button>
                </div>
            </div>
        </div>
    )
}
