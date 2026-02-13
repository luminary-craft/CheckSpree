import React from 'react'

/**
 * SignaturePad — Admin-only panel for managing digital signature images.
 *
 * Displayed inside the Sidebar's Check Profile section. Allows uploading,
 * previewing, toggling, and adjusting opacity of a signature image
 * that appears on the printed check.
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
 */
export function SignaturePad({
    signatureImage,
    signatureEnabled,
    signatureOpacity,
    isLoading,
    onLoad,
    onClear,
    onToggle,
    onOpacityChange
}) {
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

            {/* Signature preview */}
            {signatureImage ? (
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
                            onClick={onLoad}
                            disabled={isLoading}
                            title="Replace signature image"
                        >
                            Replace
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
            ) : (
                <button
                    className="btn btn-sm full-width"
                    onClick={onLoad}
                    disabled={isLoading}
                    style={{
                        padding: '16px',
                        border: '2px dashed var(--border-medium)',
                        background: 'var(--surface)',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    {/* Upload icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{isLoading ? 'Selecting...' : 'Upload Signature Image'}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>PNG with transparency recommended</span>
                </button>
            )}

            {/* Opacity slider — only show when a signature exists */}
            {signatureImage && (
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
