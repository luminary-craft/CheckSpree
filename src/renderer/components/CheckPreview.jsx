import React, { useState, useRef, useCallback } from 'react'
import { formatCurrency, formatDateByPreference } from '../utils/helpers'
import { numberToWords } from '../utils/numberToWords'

// Physical inches to pixels conversion (96 DPI standard)
const PX_PER_IN = 96

/**
 * CheckPreview Component - Renders check with stubs using physical inch measurements
 * 
 * Features:
 * - Physical inch to pixel conversion for accurate printing
 * - Dynamic section ordering (check/stub arrangements)
 * - Edit mode with drag & drop field positioning
 * - Resize handles with proper event handling
 * - Live data preview
 * 
 * @param {Object} props
 * @param {Object} props.formData - Check data to display (payee, amount, date, etc.)
 * @param {Object} props.layoutProfile - Field positions and sizes { fields: { fieldName: { x, y, w, h, fontIn } } }
 * @param {Object} props.layout - Layout configuration (widthIn, checkHeightIn, stub1/2 config)
 * @param {boolean} props.isEditing - Enable drag/drop editing mode
 * @param {Function} props.onLayoutChange - Callback when field moved/resized: (fieldKey, updates) => void
 * @param {Array} props.layoutOrder - Section order array, e.g., ['stub1', 'check', 'stub2']
 * @param {number} props.zoom - Zoom level (default: 1.0)
 * @param {string} props.fontFamily - Font family for text rendering
 * @param {Object} props.dateFormat - Date formatting preferences
 */
export default function CheckPreview({
    formData = {},
    layoutProfile = {},
    layout = {},
    isEditing = false,
    onLayoutChange,
    layoutOrder = ['check'],
    zoom = 1.0,
    fontFamily = '"Courier New", monospace',
    dateFormat = { dateSlot1: 'MM', dateSlot2: 'DD', dateSlot3: 'YYYY', dateSeparator: '/', useLongDate: false }
}) {
    const [dragging, setDragging] = useState(null)
    const [resizing, setResizing] = useState(null)
    const containerRef = useRef(null)

    // Get field configuration with defaults
    const fields = layoutProfile.fields || {}

    // Calculate section heights
    const checkHeightIn = layout.checkHeightIn || 3.0
    const stub1HeightIn = layout.stub1Enabled ? (layout.stub1HeightIn || 3.0) : 0
    const stub2HeightIn = layout.stub2Enabled ? (layout.stub2HeightIn || 3.0) : 0
    const widthIn = layout.widthIn || 8.5

    // Calculate total height based on enabled sections
    const totalHeightIn = checkHeightIn + stub1HeightIn + stub2HeightIn
    const totalWidthPx = widthIn * PX_PER_IN * zoom
    const totalHeightPx = totalHeightIn * PX_PER_IN * zoom

    // Section configuration
    const sections = {
        check: {
            name: 'Check',
            heightIn: checkHeightIn,
            enabled: true,
            fields: ['date', 'payee', 'amount', 'amountWords', 'memo', 'checkNumber', 'address']
        },
        stub1: {
            name: 'Stub 1',
            heightIn: stub1HeightIn,
            enabled: layout.stub1Enabled || false,
            fields: ['stub1_date', 'stub1_payee', 'stub1_amount', 'stub1_memo']
        },
        stub2: {
            name: 'Stub 2',
            heightIn: stub2HeightIn,
            enabled: layout.stub2Enabled || false,
            fields: ['stub2_date', 'stub2_payee', 'stub2_amount', 'stub2_memo']
        }
    }

    // Calculate Y offsets for each section based on order
    const getSectionOffsets = () => {
        const offsets = {}
        let currentY = 0

        layoutOrder.forEach(sectionKey => {
            const section = sections[sectionKey]
            if (section && section.enabled) {
                offsets[sectionKey] = currentY
                currentY += section.heightIn
            }
        })

        return offsets
    }

    const sectionOffsets = getSectionOffsets()

    // Format field value based on field type
    const getFieldValue = (fieldKey) => {
        switch (fieldKey) {
            case 'date':
            case 'stub1_date':
            case 'stub2_date':
                return formatDateByPreference(formData.date, dateFormat)

            case 'payee':
            case 'stub1_payee':
            case 'stub2_payee':
                return formData.payee || ''

            case 'amount':
            case 'stub1_amount':
            case 'stub2_amount':
                return formData.amount ? formatCurrency(formData.amount) : ''

            case 'amountWords':
                if (!formData.amount || formData.amount === '' || formData.amount === '0') return ''
                try {
                    const num = parseFloat(formData.amount)
                    return numberToWords(num)
                } catch (e) {
                    return ''
                }

            case 'memo':
            case 'stub1_memo':
            case 'stub2_memo':
                return formData.memo || formData.external_memo || ''

            case 'checkNumber':
                return formData.checkNumber || ''

            case 'address':
                return formData.address || ''

            default:
                return ''
        }
    }

    // Handle mouse down on field (start drag)
    const handleFieldMouseDown = (fieldKey, e) => {
        if (!isEditing) return

        // Check if this is a resize handle click
        if (e.target.classList.contains('resize-handle')) {
            return // Let resize handler handle it
        }

        e.preventDefault()
        e.stopPropagation()

        const field = fields[fieldKey]
        if (!field) return

        const rect = containerRef.current.getBoundingClientRect()
        const startX = (e.clientX - rect.left) / zoom
        const startY = (e.clientY - rect.top) / zoom

        setDragging({
            fieldKey,
            startX,
            startY,
            initialX: field.x * PX_PER_IN,
            initialY: field.y * PX_PER_IN
        })
    }

    // Handle mouse down on resize handle
    const handleResizeMouseDown = (fieldKey, e) => {
        if (!isEditing) return

        e.preventDefault()
        e.stopPropagation() // CRITICAL: Stop propagation to prevent drag

        const field = fields[fieldKey]
        if (!field) return

        const rect = containerRef.current.getBoundingClientRect()
        const startX = (e.clientX - rect.left) / zoom
        const startY = (e.clientY - rect.top) / zoom

        setResizing({
            fieldKey,
            startX,
            startY,
            initialW: field.w * PX_PER_IN,
            initialH: field.h * PX_PER_IN
        })
    }

    // Handle mouse move (drag or resize)
    const handleMouseMove = useCallback((e) => {
        if (!containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const currentX = (e.clientX - rect.left) / zoom
        const currentY = (e.clientY - rect.top) / zoom

        if (dragging) {
            const deltaX = currentX - dragging.startX
            const deltaY = currentY - dragging.startY

            const newX = (dragging.initialX + deltaX) / PX_PER_IN
            const newY = (dragging.initialY + deltaY) / PX_PER_IN

            if (onLayoutChange) {
                onLayoutChange(dragging.fieldKey, { x: newX, y: newY })
            }
        } else if (resizing) {
            const deltaX = currentX - resizing.startX
            const deltaY = currentY - resizing.startY

            const newW = Math.max(0.5, (resizing.initialW + deltaX) / PX_PER_IN)
            const newH = Math.max(0.2, (resizing.initialH + deltaY) / PX_PER_IN)

            if (onLayoutChange) {
                onLayoutChange(resizing.fieldKey, { w: newW, h: newH })
            }
        }
    }, [dragging, resizing, zoom, onLayoutChange])

    // Handle mouse up (end drag or resize)
    const handleMouseUp = useCallback(() => {
        setDragging(null)
        setResizing(null)
    }, [])

    // Attach global mouse listeners for drag/resize
    React.useEffect(() => {
        if (dragging || resizing) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)

            return () => {
                window.removeEventListener('mousemove', handleMouseMove)
                window.removeEventListener('mouseup', handleMouseUp)
            }
        }
    }, [dragging, resizing, handleMouseMove, handleMouseUp])

    // Render a single field
    const renderField = (fieldKey, sectionOffsetY = 0) => {
        const field = fields[fieldKey]
        if (!field) return null

        const value = getFieldValue(fieldKey)
        if (!value && !isEditing) return null // Hide empty fields in preview mode

        const xPx = field.x * PX_PER_IN * zoom
        const yPx = (field.y + sectionOffsetY) * PX_PER_IN * zoom
        const wPx = field.w * PX_PER_IN * zoom
        const hPx = field.h * PX_PER_IN * zoom
        const fontSizePt = (field.fontIn || 0.12) * PX_PER_IN * zoom

        const isDraggingThis = dragging?.fieldKey === fieldKey
        const isResizingThis = resizing?.fieldKey === fieldKey

        return (
            <div
                key={fieldKey}
                className={`field-box ${isEditing ? 'editable' : ''} ${isDraggingThis ? 'dragging' : ''} ${isResizingThis ? 'resizing' : ''}`}
                style={{
                    position: 'absolute',
                    left: `${xPx}px`,
                    top: `${yPx}px`,
                    width: `${wPx}px`,
                    height: `${hPx}px`,
                    fontSize: `${fontSizePt}px`,
                    fontFamily: fontFamily,
                    display: 'flex',
                    alignItems: 'center',
                    overflow: 'hidden',
                    whiteSpace: fieldKey === 'address' ? 'pre-wrap' : 'nowrap',
                    cursor: isEditing ? 'move' : 'default',
                    border: isEditing ? '1px dashed rgba(59, 130, 246, 0.5)' : 'none',
                    backgroundColor: isEditing ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    padding: '2px',
                    userSelect: isEditing ? 'none' : 'text',
                    transition: isDraggingThis || isResizingThis ? 'none' : 'all 0.1s ease'
                }}
                onMouseDown={(e) => handleFieldMouseDown(fieldKey, e)}
                title={isEditing ? field.label : undefined}
            >
                <span style={{
                    width: '100%',
                    textAlign: fieldKey === 'amount' || fieldKey.includes('_amount') ? 'right' : 'left'
                }}>
                    {value}
                </span>

                {/* Resize Handle */}
                {isEditing && (
                    <div
                        className="resize-handle"
                        onMouseDown={(e) => handleResizeMouseDown(fieldKey, e)}
                        style={{
                            position: 'absolute',
                            right: '0',
                            bottom: '0',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#3b82f6',
                            cursor: 'nwse-resize',
                            borderRadius: '2px',
                            opacity: 0.7,
                            transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                    />
                )}

                {/* Field Label (Edit Mode) */}
                {isEditing && (
                    <div style={{
                        position: 'absolute',
                        top: '-18px',
                        left: '0',
                        fontSize: '9px',
                        color: '#3b82f6',
                        backgroundColor: '#1e293b',
                        padding: '2px 4px',
                        borderRadius: '2px',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none'
                    }}>
                        {field.label || fieldKey}
                    </div>
                )}
            </div>
        )
    }

    // Render a section (check or stub)
    const renderSection = (sectionKey) => {
        const section = sections[sectionKey]
        if (!section || !section.enabled) return null

        const offsetY = sectionOffsets[sectionKey] || 0
        const heightPx = section.heightIn * PX_PER_IN * zoom

        return (
            <div
                key={sectionKey}
                className={`section section-${sectionKey}`}
                style={{
                    position: 'relative',
                    width: '100%',
                    height: `${heightPx}px`,
                    borderBottom: isEditing ? '2px solid #334155' : '1px solid #e2e8f0',
                    backgroundColor: sectionKey === 'check' ? '#ffffff' : '#fafafa'
                }}
            >
                {/* Section Label (Edit Mode) */}
                {isEditing && (
                    <div style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#64748b',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        zIndex: 10,
                        pointerEvents: 'none'
                    }}>
                        {section.name} ({section.heightIn}″)
                    </div>
                )}

                {/* Render fields for this section */}
                {section.fields.map(fieldKey => renderField(fieldKey, offsetY))}
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            className="check-preview-container"
            style={{
                width: `${totalWidthPx}px`,
                height: `${totalHeightPx}px`,
                position: 'relative',
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                overflow: 'hidden',
                cursor: (dragging || resizing) ? 'grabbing' : 'default',
                userSelect: isEditing ? 'none' : 'text'
            }}
        >
            {layoutOrder.map(sectionKey => renderSection(sectionKey))}

            {/* Edit Mode Overlay Info */}
            {isEditing && (
                <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    fontSize: '10px',
                    color: '#64748b',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    pointerEvents: 'none',
                    fontFamily: 'system-ui, sans-serif'
                }}>
                    Edit Mode: Drag to move • Resize from corner
                </div>
            )}
        </div>
    )
}
