import React, { useState, useRef, useEffect } from 'react'

const ACCENT_COLORS = [
  { id: 'amber', color: '#f59e0b', label: 'Amber' },
  { id: 'blue', color: '#3b82f6', label: 'Blue' },
  { id: 'emerald', color: '#10b981', label: 'Emerald' },
  { id: 'rose', color: '#f43f5e', label: 'Rose' },
  { id: 'purple', color: '#a855f7', label: 'Purple' }
]

const THEMES = ['dark', 'light', 'glass']

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 2V4M10 16V18M18 10H16M4 10H2M15.66 4.34L14.24 5.76M5.76 14.24L4.34 15.66M15.66 15.66L14.24 14.24M5.76 5.76L4.34 4.34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M17.1 12.6A7.5 7.5 0 017.4 2.9a7.5 7.5 0 109.7 9.7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GlassIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
      <circle cx="8" cy="8" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="13" cy="12" r="1.5" fill="currentColor" opacity="0.2" />
    </svg>
  )
}

export function ThemePicker({ preferences, setPreferences }) {
  const [showColors, setShowColors] = useState(false)
  const pickerRef = useRef(null)

  // Click outside to close color picker
  useEffect(() => {
    if (!showColors) return
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowColors(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showColors])

  const currentTheme = preferences.theme || 'dark'
  const currentAccent = preferences.accentColor || 'amber'
  const currentAccentColor = ACCENT_COLORS.find(c => c.id === currentAccent)?.color || '#f59e0b'

  const cycleTheme = () => {
    const idx = THEMES.indexOf(currentTheme)
    const next = THEMES[(idx + 1) % THEMES.length]
    setPreferences(p => ({ ...p, theme: next }))
  }

  const selectAccent = (id) => {
    setPreferences(p => ({ ...p, accentColor: id }))
    setShowColors(false)
  }

  const ThemeIcon = currentTheme === 'light' ? SunIcon : currentTheme === 'glass' ? GlassIcon : MoonIcon

  return (
    <div className="theme-picker no-print" ref={pickerRef}>
      {/* Expanded color swatches */}
      {showColors && (
        <div className="theme-picker-colors">
          {ACCENT_COLORS.filter(c => c.id !== currentAccent).reverse().map(c => (
            <button
              key={c.id}
              className="color-swatch"
              title={c.label}
              onClick={() => selectAccent(c.id)}
              style={{ background: c.color }}
            />
          ))}
        </div>
      )}

      {/* Accent color circle */}
      <button
        className={`theme-picker-btn accent-btn${showColors ? ' expanded' : ''}`}
        title="Change accent color"
        onClick={() => setShowColors(v => !v)}
        style={{ background: currentAccentColor }}
      >
        <span className="sr-only">Accent color</span>
      </button>

      {/* Theme mode circle */}
      <button
        className="theme-picker-btn mode-btn"
        title={`Theme: ${currentTheme} (click to cycle)`}
        onClick={cycleTheme}
      >
        <ThemeIcon />
      </button>
    </div>
  )
}
