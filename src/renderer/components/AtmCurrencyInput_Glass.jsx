import React from 'react'

export default function AtmCurrencyInput_Glass({ value, onChange, isWarning }) {
    const handleChange = (e) => {
        // Remove non-digits
        let val = e.target.value.replace(/[^0-9]/g, '')

        // Convert to decimal
        if (val) {
            const num = parseInt(val, 10) / 100
            onChange(num.toFixed(2))
        } else {
            onChange('')
        }
    }

    return (
        <input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder="0.00"
            className={isWarning ? 'warning' : ''}
            style={{ textAlign: 'right' }} // Keep text align, let CSS handle the rest
        />
    )
}
