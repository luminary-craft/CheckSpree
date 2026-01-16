import React, { useState, useRef, useCallback } from 'react'
import { formatCurrency, formatDateByPreference } from '../utils/helpers'
import { numberToWords } from '../utils/numberToWords'

const PX_PER_IN = 96

/**
 * CheckPreview_Glass Component - Restored "Glass" aesthetic + 3-Up Sheet Mode
 */
export default function CheckPreview_Glass({
    formData = {},
    layoutProfile = {},
    layout = {},
    isEditing = false,
    onLayoutChange,
    layoutOrder = ['check'],
    zoom = 1.0,
    fontFamily = '"Courier New", monospace',
    dateFormat = { dateSlot1: 'MM', dateSlot2: 'DD', dateSlot3: 'YYYY', dateSeparator: '/', useLongDate: false },
    sheetMode = false // New prop for 3-up mode
}) {
    const [dragging, setDragging] = useState(null)
    const [resizing, setResizing] = useState(null)
    const containerRef = useRef(null)

    const fields = layoutProfile.fields || {}
    const checkHeightIn = layout.checkHeightIn || 3.0
    const stub1HeightIn = layout.stub1Enabled ? (layout.stub1HeightIn || 3.0) : 0
    const stub2HeightIn = layout.stub2Enabled ? (layout.stub2HeightIn || 3.0) : 0
    const widthIn = layout.widthIn || 8.5

    const isSheet = sheetMode

    // Calculate total dimensions
    const totalHeightIn = isSheet ? (checkHeightIn * 3) : (checkHeightIn + stub1HeightIn + stub2HeightIn)
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
            enabled: !isSheet && (layout.stub1Enabled || false),
            fields: ['stub1_date', 'stub1_payee', 'stub1_amount', 'stub1_memo']
        },
        stub2: {
            name: 'Stub 2',
            heightIn: stub2HeightIn,
            enabled: !isSheet && (layout.stub2Enabled || false),
            fields: ['stub2_date', 'stub2_payee', 'stub2_amount', 'stub2_memo']
        }
    }

    // Get offsets
    const getSectionOffsets = () => {
        const offsets = {}
        let currentY = 0

        if (isSheet) return {}

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

    // Helper to get field value
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
                try { return numberToWords(parseFloat(formData.amount)) } catch (e) { return '' }
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

    // Mouse handlers
    const handleFieldMouseDown = (fieldKey, e) => {
        if (!isEditing) return
        if (e.target.classList.contains('resize-handle')) return
        e.preventDefault(); e.stopPropagation()
        const field = fields[fieldKey]
        if (!field) return
        const rect = containerRef.current.getBoundingClientRect()
        setDragging({
            fieldKey,
            startX: (e.clientX - rect.left) / zoom,
            startY: (e.clientY - rect.top) / zoom,
            initialX: field.x * PX_PER_IN,
            initialY: field.y * PX_PER_IN
        })
    }

    const handleResizeMouseDown = (fieldKey, e) => {
        if (!isEditing) return
        e.preventDefault(); e.stopPropagation()
        const field = fields[fieldKey]
        if (!field) return
        const rect = containerRef.current.getBoundingClientRect()
        setResizing({
            fieldKey,
            startX: (e.clientX - rect.left) / zoom,
            startY: (e.clientY - rect.top) / zoom,
            initialW: field.w * PX_PER_IN,
            initialH: field.h * PX_PER_IN
        })
    }

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
            if (onLayoutChange) onLayoutChange(dragging.fieldKey, { x: newX, y: newY })
        } else if (resizing) {
            const deltaX = currentX - resizing.startX
            const deltaY = currentY - resizing.startY
            const newW = Math.max(0.5, (resizing.initialW + deltaX) / PX_PER_IN)
            const newH = Math.max(0.2, (resizing.initialH + deltaY) / PX_PER_IN)
            if (onLayoutChange) onLayoutChange(resizing.fieldKey, { w: newW, h: newH })
        }
    }, [dragging, resizing, zoom, onLayoutChange])

    const handleMouseUp = useCallback(() => {
        setDragging(null)
        setResizing(null)
    }, [])

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

    // Render Field
    const renderField = (fieldKey, sectionOffsetY = 0) => {
        const field = fields[fieldKey]
        if (!field) return null
        const value = getFieldValue(fieldKey)
        if (!value && !isEditing) return null

        const xPx = field.x * PX_PER_IN * zoom
        const yPx = (field.y + sectionOffsetY) * PX_PER_IN * zoom
        const wPx = field.w * PX_PER_IN * zoom
        const hPx = field.h * PX_PER_IN * zoom
        const fontSizePt = (field.fontIn || 0.12) * PX_PER_IN * zoom

        return (
            <div
                key={`${fieldKey}-${sectionOffsetY}`}
                className={`field-box ${isEditing ? 'editable' : ''}`}
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
                    userSelect: isEditing ? 'none' : 'text'
                }}
                onMouseDown={(e) => handleFieldMouseDown(fieldKey, e)}
            >
                <span style={{ width: '100%', textAlign: fieldKey === 'amount' || fieldKey.includes('_amount') ? 'right' : 'left' }}>
                    {value}
                </span>
                {isEditing && (
                    <div
                        className="resize-handle"
                        onMouseDown={(e) => handleResizeMouseDown(fieldKey, e)}
                        style={{
                            position: 'absolute', right: '0', bottom: '0', width: '12px', height: '12px',
                            backgroundColor: '#3b82f6', cursor: 'nwse-resize', borderRadius: '2px', opacity: 0.7
                        }}
                    />
                )}
            </div>
        )
    }

    // Render Section
    const renderSection = (sectionKey, slotIndex = 0) => {
        const section = sections[sectionKey]
        if (!section || !section.enabled) return null

        let offsetY = 0
        if (isSheet) {
            offsetY = slotIndex * checkHeightIn
        } else {
            offsetY = sectionOffsets[sectionKey] || 0
        }

        const heightPx = section.heightIn * PX_PER_IN * zoom
        const topPx = offsetY * PX_PER_IN * zoom

        return (
            <div
                key={`${sectionKey}-${slotIndex}`}
                className={`section section-${sectionKey}`}
                style={{
                    position: 'absolute',
                    top: `${topPx}px`,
                    left: 0,
                    width: '100%',
                    height: `${heightPx}px`,
                    borderBottom: isEditing ? '1px dashed #334155' : 'none',
                    backgroundColor: '#ffffff'
                }}
            >
                {section.fields.map(fieldKey => renderField(fieldKey, offsetY))}

                {isEditing && isSheet && (
                    <div style={{
                        position: 'absolute', top: '4px', left: '4px',
                        fontSize: '10px', color: '#cbd5e1', pointerEvents: 'none'
                    }}>
                        Slot {slotIndex + 1}
                    </div>
                )}
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
                cursor: (dragging || resizing) ? 'grabbing' : 'default'
            }}
        >
            {isSheet ? (
                [0, 1, 2].map(i => renderSection('check', i))
            ) : (
                layoutOrder.map(sectionKey => renderSection(sectionKey))
            )}
        </div>
    )
}
