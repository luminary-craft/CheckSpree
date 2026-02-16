import React, { useState } from 'react'
import { SignatureCanvas } from './SignatureCanvas'

/**
 * SignaturePad — Admin-only panel for managing digital signature images.
 *
 * Displayed inside the Sidebar's Design section. Supports two input modes:
 *   1. Upload — Load a signature image from file (PNG with transparency recommended)
 *   2. Draw — Freehand drawing pad with pen customization
 *
 * @param {Object} props
 * @param {string|null} props.signatureImage - Base64 data URL of the signature
 * @param {boolean} props.signatureEnabled - Whether the signature is visible
 * @param {number} props.signatureOpacity - Opacity value (0–1)
 * @param {boolean} props.isLoading - Whether a file picker is open
 * @param {Function} props.onLoad - Upload a new signature image
 * @param {Function} props.onClear - Remove the signature image
 * @param {Function} props.onToggle - Toggle visibility
 * @param {Function} props.onOpacityChange - Update opacity (0–1)
 * @param {Function} props.onSaveDrawn - Save a drawn signature (receives data URL)
 */
export function SignaturePad({
    signatureImage,
    signatureEnabled,
    signatureOpacity,
    isLoading,
    onLoad,
    onClear,
    onToggle,
    onOpacityChange,
    onSaveDrawn
}) {
    const [showDrawPad, setShowDrawPad] = useState(false)

    const handleSaveDrawn = (dataUrl) => {
        if (onSaveDrawn) {
            onSaveDrawn(dataUrl)
        }
        setShowDrawPad(false)
    }

    return (
        <div className="signature-pad">
            <div className="signature-pad-header">
                <span className="signature-pad-title">Digital Signature</span>
                {signatureImage && (
                    <label className="toggle-switch" title={signatureEnabled ? 'Hide signature' : 'Show signature'}>
                        <input
                            type="checkbox"
                            checked={signatureEnabled}
                            onChange={onToggle}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                )}
            </div>

            {/* Drawing Pad */}
            {showDrawPad && (
                <SignatureCanvas
                    onSave={handleSaveDrawn}
                    onCancel={() => setShowDrawPad(false)}
                />
            )}

            {/* Signature preview (when a signature exists and draw pad is closed) */}
            {!showDrawPad && signatureImage ? (
                <div className="signature-preview-container">
                    <img
                        src={signatureImage}
                        alt="Signature preview"
                        className="signature-preview-img"
                        style={{ opacity: signatureOpacity }}
                    />
                    <div className="signature-actions">
                        <button
                            className="btn btn-sm"
                            onClick={() => setShowDrawPad(true)}
                            title="Draw a new signature"
                        >
                            ✏️ Draw
                        </button>
                        <button
                            className="btn btn-sm"
                            onClick={onLoad}
                            disabled={isLoading}
                            title="Replace with image file"
                        >
                            Upload
                        </button>
                        <button
                            className="btn btn-sm danger"
                            onClick={onClear}
                            title="Remove signature"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            ) : !showDrawPad && (
                /* No signature yet — show both options */
                <div className="signature-empty-options">
                    <button
                        className="sig-option-btn"
                        onClick={() => setShowDrawPad(true)}
                    >
                        {/* Pen icon */}
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                        <span className="sig-option-label">Draw Signature</span>
                        <span className="sig-option-hint">Sign with your mouse or touchpad</span>
                    </button>
                    <button
                        className="sig-option-btn"
                        onClick={onLoad}
                        disabled={isLoading}
                    >
                        {/* Upload icon */}
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span className="sig-option-label">{isLoading ? 'Selecting...' : 'Upload Image'}</span>
                        <span className="sig-option-hint">PNG with transparency recommended</span>
                    </button>
                </div>
            )}

            {/* Opacity slider — only show when a signature exists */}
            {signatureImage && !showDrawPad && (
                <div className="signature-opacity-control">
                    <label style={{ fontSize: '12px', color: 'var(--text-label)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Opacity</span>
                        <span>{Math.round(signatureOpacity * 100)}%</span>
                    </label>
                    <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={signatureOpacity}
                        onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                        className="signature-opacity-slider"
                    />
                </div>
            )}
        </div>
    )
}
