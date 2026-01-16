import React from 'react'

export default function AtmCurrencyInput({ value, onChange, isWarning }) {
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
            value={value ? `$${value}` : ''}
            onChange={handleChange}
            placeholder="$0.00"
            className={isWarning ? 'warning' : ''}
            style={{
                fontSize: '24px',
                fontWeight: 'bold',
                textAlign: 'right',
                color: isWarning ? '#f87171' : '#10b981',
                padding: '12px',
                height: 'auto'
            }}
        />
    )
}
