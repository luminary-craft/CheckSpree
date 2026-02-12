import React, { useState, useCallback } from 'react'

/**
 * SetupWizard — First-launch onboarding modal
 *
 * 5-step wizard that guides new users through initial configuration:
 *   Step 1: Welcome (logo + tagline)
 *   Step 2: Ledger setup (name + starting balance)
 *   Step 3: Theme & accent color picker (live preview)
 *   Step 4: Feature tour (4-panel visual explainer)
 *   Step 5: All set! (summary + quick-start actions)
 *
 * The wizard cannot be dismissed without completing it.
 * On completion it sets preferences.setupCompleted = true so it
 * never shows again.
 *
 * @param {Object} props
 * @param {Function} props.onComplete - Called with { ledgerName, startingBalance, theme, accentColor }
 * @param {Object}   props.preferences - Current preferences (for live theme preview)
 * @param {Function} props.setPreferences - Setter to update preferences live
 */

// ─── Accent Colors ────────────────────────────────────────────────
const ACCENT_COLORS = [
    { id: 'amber', color: '#f59e0b', label: 'Amber' },
    { id: 'blue', color: '#3b82f6', label: 'Blue' },
    { id: 'emerald', color: '#10b981', label: 'Emerald' },
    { id: 'rose', color: '#f43f5e', label: 'Rose' },
    { id: 'purple', color: '#a855f7', label: 'Purple' }
]

// ─── Theme Choices ────────────────────────────────────────────────
const THEMES = [
    {
        id: 'dark',
        label: 'Dark',
        description: 'Easy on the eyes',
        icon: '🌙',
        preview: { bg: '#141210', surface: '#1c1a17', text: '#faf0e0' }
    },
    {
        id: 'light',
        label: 'Light',
        description: 'Classic & clean',
        icon: '☀️',
        preview: { bg: '#f8f6f3', surface: '#ffffff', text: '#1a1a1a' }
    },
    {
        id: 'glass',
        label: 'Glass',
        description: 'Modern & sleek',
        icon: '🔮',
        preview: { bg: '#0f172a', surface: 'rgba(255,255,255,0.06)', text: '#e2e8f0' }
    }
]

// ─── Tour Steps (Step 4 content) ──────────────────────────────────
const TOUR_PANELS = [
    {
        icon: '✏️',
        title: 'Fill in the Details',
        description: 'Enter the payee, amount, memo, and date — just like writing a check by hand, but faster.',
        imageKey: 'setup_tour_fill'
    },
    {
        icon: '👁️',
        title: 'Preview Before Printing',
        description: 'See exactly how your check will look with a live on-screen preview. No surprises.',
        imageKey: 'setup_tour_preview'
    },
    {
        icon: '🖨️',
        title: 'Print with Precision',
        description: 'Physical-unit positioning means your fields land exactly where they should. Every time.',
        imageKey: 'setup_tour_print'
    },
    {
        icon: '📊',
        title: 'Track Your Balance',
        description: 'Every check is recorded automatically. Watch your balance update in real time across ledgers.',
        imageKey: 'setup_tour_track'
    }
]

const TOTAL_STEPS = 5

export function SetupWizard({ onComplete, preferences, setPreferences }) {
    // ─── Wizard State ─────────────────────────────────────────
    const [currentStep, setCurrentStep] = useState(0)
    const [slideDirection, setSlideDirection] = useState('right') // 'right' | 'left' for animation

    // Step 2: Ledger configuration
    const [ledgerName, setLedgerName] = useState('Primary Ledger')
    const [startingBalance, setStartingBalance] = useState('')

    // Step 3: Theme & accent (applied live via setPreferences)
    const selectedTheme = preferences.theme || 'dark'
    const selectedAccent = preferences.accentColor || 'amber'

    // ─── Navigation ───────────────────────────────────────────

    /**
     * Advance to the next step with a slide-right animation.
     * On the last step this triggers completion.
     */
    const goNext = useCallback(() => {
        if (currentStep === TOTAL_STEPS - 1) {
            // Final step — finish setup
            handleComplete()
            return
        }
        setSlideDirection('right')
        setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS - 1))
    }, [currentStep])

    /**
     * Go back to the previous step with a slide-left animation.
     */
    const goBack = useCallback(() => {
        setSlideDirection('left')
        setCurrentStep(s => Math.max(s - 1, 0))
    }, [])

    /**
     * Complete the wizard: persist choices and notify the parent.
     * This marks setupCompleted = true so the wizard never shows again.
     */
    const handleComplete = useCallback(() => {
        // Parse starting balance — default to 0 if empty or invalid
        const parsedBalance = parseFloat(startingBalance.replace(/[^0-9.-]/g, '')) || 0

        onComplete({
            ledgerName: ledgerName.trim() || 'Primary Ledger',
            startingBalance: parsedBalance,
            theme: selectedTheme,
            accentColor: selectedAccent
        })
    }, [ledgerName, startingBalance, selectedTheme, selectedAccent, onComplete])

    // ─── Theme helpers (Step 3) ───────────────────────────────

    /** Apply theme change live so the user sees an instant preview */
    const selectTheme = (themeId) => {
        setPreferences(p => ({ ...p, theme: themeId }))
    }

    /** Apply accent color change live */
    const selectAccent = (accentId) => {
        setPreferences(p => ({ ...p, accentColor: accentId }))
    }

    // ─── Validate current step (controls Next button enabled) ─
    const isNextDisabled = () => {
        if (currentStep === 1) {
            // Ledger name must not be blank
            return !ledgerName.trim()
        }
        return false
    }

    // ─── Step Renderers ───────────────────────────────────────

    /**
     * Step 1: Welcome — Logo, app name, tagline
     */
    const renderWelcome = () => (
        <div className="setup-step-content setup-welcome">
            <div className="setup-logo-container">
                {/* Try to load the app logo; fall back to a large emoji */}
                <img
                    src={new URL('../../assets/logo.png', import.meta.url).href}
                    alt="CheckSpree Logo"
                    className="setup-logo"
                    onError={(e) => {
                        // If image fails, hide it and show fallback
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                    }}
                />
                <div className="setup-logo-fallback" style={{ display: 'none' }}>✅</div>
            </div>

            <h1 className="setup-app-title">Welcome to CheckSpree</h1>
            <p className="setup-tagline">
                Professional check printing with physical-unit precision
            </p>

            <div className="setup-feature-pills">
                <span className="setup-pill">🖨️ Precision Printing</span>
                <span className="setup-pill">📒 Multi-Ledger</span>
                <span className="setup-pill">📊 Balance Tracking</span>
                <span className="setup-pill">📥 CSV Import</span>
            </div>

            <p className="setup-subtitle">
                Let's get you set up in under a minute.
            </p>
        </div>
    )

    /**
     * Step 2: Ledger Setup — Name your first checking account & set balance
     */
    const renderLedgerSetup = () => (
        <div className="setup-step-content setup-ledger">
            <div className="setup-step-icon">
                {/* Try to load the ledger illustration */}
                <img
                    src={new URL('../../assets/setup/setup_ledger.png', import.meta.url).href}
                    alt="Ledger illustration"
                    className="setup-illustration"
                    onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                    }}
                />
                <div className="setup-illustration-fallback" style={{ display: 'none' }}>📒</div>
            </div>

            <h2 className="setup-step-title">Set Up Your First Ledger</h2>
            <p className="setup-step-description">
                A ledger is like a checking account. You can create more later for
                different accounts (personal, business, etc.)
            </p>

            <div className="setup-form">
                <div className="setup-field">
                    <label htmlFor="setup-ledger-name">Ledger Name</label>
                    <input
                        id="setup-ledger-name"
                        type="text"
                        value={ledgerName}
                        onChange={(e) => setLedgerName(e.target.value)}
                        placeholder="e.g. Business Checking"
                        maxLength={50}
                        autoFocus
                    />
                </div>

                <div className="setup-field">
                    <label htmlFor="setup-balance">Starting Balance ($)</label>
                    <input
                        id="setup-balance"
                        type="text"
                        value={startingBalance}
                        onChange={(e) => {
                            // Allow only numbers, decimal, commas
                            const val = e.target.value.replace(/[^0-9.,]/g, '')
                            setStartingBalance(val)
                        }}
                        placeholder="0.00"
                        inputMode="decimal"
                    />
                    <span className="setup-field-hint">
                        You can change this anytime from the ledger manager.
                    </span>
                </div>
            </div>
        </div>
    )

    /**
     * Step 3: Theme & Accent color — live preview
     */
    const renderThemePicker = () => (
        <div className="setup-step-content setup-theme">
            <h2 className="setup-step-title">Choose Your Look</h2>
            <p className="setup-step-description">
                Pick a visual theme and accent color. You can change these later in Admin Settings.
            </p>

            {/* Theme Cards */}
            <div className="setup-theme-grid">
                {THEMES.map(theme => (
                    <button
                        key={theme.id}
                        className={`setup-theme-card ${selectedTheme === theme.id ? 'active' : ''}`}
                        onClick={() => selectTheme(theme.id)}
                        style={{
                            '--preview-bg': theme.preview.bg,
                            '--preview-surface': theme.preview.surface,
                            '--preview-text': theme.preview.text
                        }}
                    >
                        <div className="setup-theme-preview">
                            <div className="setup-theme-preview-bar" />
                            <div className="setup-theme-preview-content">
                                <div className="setup-theme-preview-line short" />
                                <div className="setup-theme-preview-line" />
                                <div className="setup-theme-preview-line medium" />
                            </div>
                        </div>
                        <div className="setup-theme-label">
                            <span className="setup-theme-icon">{theme.icon}</span>
                            <span className="setup-theme-name">{theme.label}</span>
                        </div>
                        <span className="setup-theme-desc">{theme.description}</span>
                        {selectedTheme === theme.id && (
                            <div className="setup-theme-check">✓</div>
                        )}
                    </button>
                ))}
            </div>

            {/* Accent Color Row */}
            <div className="setup-accent-section">
                <label className="setup-accent-label">Accent Color</label>
                <div className="setup-accent-row">
                    {ACCENT_COLORS.map(c => (
                        <button
                            key={c.id}
                            className={`setup-accent-swatch ${selectedAccent === c.id ? 'active' : ''}`}
                            title={c.label}
                            onClick={() => selectAccent(c.id)}
                            style={{ background: c.color }}
                        >
                            {selectedAccent === c.id && <span className="setup-accent-check">✓</span>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )

    /**
     * Step 4: Feature Tour — 4-panel visual walkthrough
     */
    const renderFeatureTour = () => (
        <div className="setup-step-content setup-tour">
            <h2 className="setup-step-title">How CheckSpree Works</h2>
            <p className="setup-step-description">
                Writing and printing checks in 4 simple steps:
            </p>

            <div className="setup-tour-grid">
                {TOUR_PANELS.map((panel, idx) => (
                    <div key={idx} className="setup-tour-card">
                        <div className="setup-tour-number">{idx + 1}</div>
                        <div className="setup-tour-icon-area">
                            {/* Try the PNG image first; fall back to emoji icon */}
                            <img
                                src={new URL(`../../assets/setup/${panel.imageKey}.png`, import.meta.url).href}
                                alt={panel.title}
                                className="setup-tour-image"
                                onError={(e) => {
                                    e.target.style.display = 'none'
                                    e.target.nextSibling.style.display = 'flex'
                                }}
                            />
                            <div className="setup-tour-emoji-fallback" style={{ display: 'none' }}>
                                {panel.icon}
                            </div>
                        </div>
                        <h3 className="setup-tour-card-title">{panel.title}</h3>
                        <p className="setup-tour-card-desc">{panel.description}</p>
                    </div>
                ))}
            </div>
        </div>
    )

    /**
     * Step 5: All Set — summary and quick-start actions
     */
    const renderComplete = () => (
        <div className="setup-step-content setup-complete">
            <div className="setup-step-icon">
                <img
                    src={new URL('../../assets/setup/setup_complete.png', import.meta.url).href}
                    alt="Setup complete"
                    className="setup-illustration"
                    onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                    }}
                />
                <div className="setup-illustration-fallback" style={{ display: 'none' }}>🚀</div>
            </div>

            <h2 className="setup-step-title">You're All Set!</h2>
            <p className="setup-step-description">
                Here's what we've configured for you:
            </p>

            {/* Summary Cards */}
            <div className="setup-summary-grid">
                <div className="setup-summary-card">
                    <span className="setup-summary-icon">📒</span>
                    <div>
                        <strong>{ledgerName.trim() || 'Primary Ledger'}</strong>
                        <span className="setup-summary-detail">
                            Balance: ${startingBalance ? parseFloat(startingBalance.replace(/[^0-9.-]/g, '')).toFixed(2) : '0.00'}
                        </span>
                    </div>
                </div>
                <div className="setup-summary-card">
                    <span className="setup-summary-icon">
                        {THEMES.find(t => t.id === selectedTheme)?.icon || '🌙'}
                    </span>
                    <div>
                        <strong>{THEMES.find(t => t.id === selectedTheme)?.label || 'Dark'} Theme</strong>
                        <span className="setup-summary-detail">
                            {ACCENT_COLORS.find(c => c.id === selectedAccent)?.label || 'Amber'} accent
                        </span>
                    </div>
                </div>
            </div>

            <div className="setup-tips">
                <h4>💡 Quick Tips</h4>
                <ul>
                    <li>Upload a check template image for precise alignment</li>
                    <li>Use <strong>Admin Settings</strong> to manage profiles and preferences</li>
                    <li>Import checks from CSV or Excel for bulk processing</li>
                </ul>
            </div>
        </div>
    )

    // ─── Step Mapping ─────────────────────────────────────────
    const STEP_RENDERERS = [
        renderWelcome,
        renderLedgerSetup,
        renderThemePicker,
        renderFeatureTour,
        renderComplete
    ]

    const STEP_LABELS = ['Welcome', 'Ledger', 'Theme', 'Tour', 'Ready']

    // ─── Button Labels ────────────────────────────────────────
    const getNextLabel = () => {
        if (currentStep === 0) return 'Get Started →'
        if (currentStep === TOTAL_STEPS - 1) return '🚀 Start Writing Checks'
        return 'Next →'
    }

    // ─── Render ───────────────────────────────────────────────
    return (
        <div className="setup-wizard-overlay">
            <div className="setup-wizard-card">
                {/* Step Indicator */}
                <div className="setup-step-indicator">
                    {STEP_LABELS.map((label, idx) => (
                        <div
                            key={idx}
                            className={`setup-step-dot-group ${idx === currentStep ? 'active' : idx < currentStep ? 'completed' : ''
                                }`}
                        >
                            <div className="setup-step-dot">
                                {idx < currentStep ? '✓' : idx + 1}
                            </div>
                            <span className="setup-step-dot-label">{label}</span>
                        </div>
                    ))}
                    {/* Connection lines between dots */}
                    <div className="setup-step-progress-track">
                        <div
                            className="setup-step-progress-fill"
                            style={{ width: `${(currentStep / (TOTAL_STEPS - 1)) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Step Content */}
                <div className="setup-step-body" key={currentStep} data-direction={slideDirection}>
                    {STEP_RENDERERS[currentStep]()}
                </div>

                {/* Footer Navigation */}
                <div className="setup-wizard-footer">
                    {currentStep > 0 ? (
                        <button className="btn ghost" onClick={goBack}>
                            ← Back
                        </button>
                    ) : (
                        <div /> /* Spacer to push Next to the right */
                    )}

                    <button
                        className="btn primary setup-next-btn"
                        onClick={goNext}
                        disabled={isNextDisabled()}
                    >
                        {getNextLabel()}
                    </button>
                </div>
            </div>
        </div>
    )
}
