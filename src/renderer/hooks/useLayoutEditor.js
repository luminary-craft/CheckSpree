import { useMemo, useRef, useCallback } from 'react'
import { PX_PER_IN, clamp, roundTo, calculateBaseYForSection } from '../constants/defaults'

export function useLayoutEditor(model, setModel, setData, preferences, editMode, selected, setSelected, selectionBox, setSelectionBox, isPrinting, activeProfile, activeSlot) {
  const paperRef = useRef(null)
  const dragRef = useRef(null)

  const paperStyle = useMemo(() => {
    return {
      transform: isPrinting ? 'none' : `scale(${model.view.zoom})`
    }
  }, [isPrinting, model.view.zoom])

  const stageHeightIn = useMemo(() => {
    const l = model.layout
    return (
      l.checkHeightIn +
      (l.stub1Enabled ? l.stub1HeightIn : 0) +
      (l.stub2Enabled ? l.stub2HeightIn : 0)
    )
  }, [model.layout])

  const stageVars = useMemo(() => {
    return {
      '--stage-w': `${model.layout.widthIn}in`,
      '--stage-h': `${stageHeightIn}in`
    }
  }, [model.layout.widthIn, stageHeightIn])

  const checkPlacementStyle = useMemo(() => {
    return {
      transform: `translate(${model.placement.offsetXIn}in, ${model.placement.offsetYIn}in)`
    }
  }, [model.placement.offsetXIn, model.placement.offsetYIn])

  // Snap to grid: 0.125 inches when enabled, 0.01 inches (fine) when disabled
  const snapStepIn = preferences.enableSnapping ? 0.125 : 0.01

  // Helper to get height of a specific section
  const getSectionHeight = (s, l) => {
    if (s === 'check') return l.checkHeightIn
    if (s === 'stub1') return l.stub1HeightIn // Always return height (preserving space)
    if (s === 'stub2') return l.stub2HeightIn
    return 0
  }

  // Helper to calculate Y position of a section based on current order
  const getSectionY = (targetSection, layout) => {
    const order = layout.sectionOrder || ['check', 'stub1', 'stub2']
    let y = 0
    for (const s of order) {
      if (s === targetSection) return y
      y += getSectionHeight(s, layout)
    }
    return y
  }

  // Helper to get the starting Y position for placing fields in a section
  // This respects section order and only counts enabled sections
  const getBaseYForSection = (sectionName, layout) => calculateBaseYForSection(sectionName, layout)

  const reorderSections = (newOrder) => {
    setModel(m => {
      const layout = m.layout
      const oldOrder = layout.sectionOrder || ['check', 'stub1', 'stub2']

      // Calculate OLD positions
      const oldYs = {}
      let y = 0
      oldOrder.forEach(s => {
        oldYs[s] = y
        y += getSectionHeight(s, layout)
      })

      // Calculate NEW positions
      const newYs = {}
      y = 0
      newOrder.forEach(s => {
        newYs[s] = y
        y += getSectionHeight(s, layout)
      })

      // Calculate Deltas
      const deltas = {
        check: newYs.check - oldYs.check,
        stub1: newYs.stub1 - oldYs.stub1,
        stub2: newYs.stub2 - oldYs.stub2
      }

      // Migrate Fields
      const newFields = { ...m.fields }
      Object.keys(newFields).forEach(k => {
        // Identify section
        let section = 'check'
        if (k.startsWith('stub1_')) section = 'stub1'
        if (k.startsWith('stub2_')) section = 'stub2'

        const delta = deltas[section]
        if (delta && delta !== 0) {
          newFields[k] = { ...newFields[k], y: parseFloat((newFields[k].y + delta).toFixed(3)) }
        }
      })

      return {
        ...m,
        layout: { ...layout, sectionOrder: newOrder },
        fields: newFields
      }
    })
  }

  const setField = (key, patch) => {
    // In three-up mode, update slot-specific fields instead of shared fields
    if (activeProfile?.layoutMode === 'three_up') {
      setModel((m) => ({
        ...m,
        slotFields: {
          ...m.slotFields,
          [activeSlot]: {
            ...m.slotFields[activeSlot],
            [key]: { ...m.slotFields[activeSlot][key], ...patch }
          }
        }
      }))
    } else {
      setModel((m) => ({
        ...m,
        fields: { ...m.fields, [key]: { ...m.fields[key], ...patch } }
      }))
    }
  }

  const ensureStub = (which, enabled) => {
    setModel((m) => {
      const l = m.layout
      const nextLayout =
        which === 'stub1'
          ? { ...l, stub1Enabled: enabled }
          : which === 'stub2'
            ? { ...l, stub2Enabled: enabled }
            : l

      // If enabling, create/update fields for this stub with correct positions
      if (enabled) {
        const prefix = which === 'stub1' ? 'stub1_' : 'stub2_'
        // Calculate base Y position respecting section order
        // Use nextLayout so we account for the stub we're enabling
        const baseY = getBaseYForSection(which, nextLayout)

        const isPayeeCopy = which === 'stub1'
        const defaults = isPayeeCopy
          ? {
            [`${prefix}date`]: { x: 0.55, y: baseY + 0.25, w: 1.3, h: 0.30, fontIn: 0.20, label: 'Date' },
            [`${prefix}payee`]: { x: 2.0, y: baseY + 0.25, w: 3.5, h: 0.30, fontIn: 0.20, label: 'Pay To' },
            [`${prefix}address`]: { x: 2.0, y: baseY + 0.55, w: 3.5, h: 0.60, fontIn: 0.18, label: 'Address' },
            [`${prefix}amount`]: { x: l.widthIn - 1.75, y: baseY + 0.25, w: 1.20, h: 0.30, fontIn: 0.20, label: 'Amount' },
            [`${prefix}checkNumber`]: { x: 6.35, y: baseY + 0.25, w: 0.85, h: 0.30, fontIn: 0.18, label: 'Check #' },
            [`${prefix}memo`]: { x: 0.55, y: baseY + 0.70, w: l.widthIn - 1.10, h: 0.30, fontIn: 0.18, label: 'Memo' },
            [`${prefix}line_items`]: { x: 0.55, y: baseY + 1.25, w: l.widthIn - 1.10, h: 1.10, fontIn: 0.16, label: 'Line Items' },
            [`${prefix}ledger`]: { x: 0.55, y: baseY + 2.45, w: 3.5, h: 0.85, fontIn: 0.16, label: 'Ledger Snapshot' },
            [`${prefix}approved`]: { x: 4.25, y: baseY + 2.45, w: 1.85, h: 0.35, fontIn: 0.16, label: 'Approved By' },
            [`${prefix}glcode`]: { x: 4.25, y: baseY + 2.95, w: 1.85, h: 0.35, fontIn: 0.16, label: 'GL Code' }
          }
          : {
            [`${prefix}date`]: { x: 0.55, y: baseY + 0.25, w: 1.3, h: 0.30, fontIn: 0.20, label: 'Date' },
            [`${prefix}payee`]: { x: 2.0, y: baseY + 0.25, w: 3.5, h: 0.30, fontIn: 0.20, label: 'Pay To' },
            [`${prefix}address`]: { x: 2.0, y: baseY + 0.55, w: 3.5, h: 0.60, fontIn: 0.18, label: 'Address' },
            [`${prefix}amount`]: { x: l.widthIn - 1.75, y: baseY + 0.25, w: 1.20, h: 0.30, fontIn: 0.20, label: 'Amount' },
            [`${prefix}checkNumber`]: { x: 6.35, y: baseY + 0.25, w: 0.85, h: 0.30, fontIn: 0.18, label: 'Check #' },
            [`${prefix}memo`]: { x: 0.55, y: baseY + 0.70, w: l.widthIn - 1.10, h: 0.30, fontIn: 0.18, label: 'Internal Memo' },
            [`${prefix}ledger`]: { x: 0.55, y: baseY + 1.15, w: 3.5, h: 0.85, fontIn: 0.16, label: 'Ledger Snapshot' },
            [`${prefix}approved`]: { x: 4.25, y: baseY + 1.15, w: 1.85, h: 0.35, fontIn: 0.16, label: 'Approved By' },
            [`${prefix}glcode`]: { x: 4.25, y: baseY + 1.65, w: 1.85, h: 0.35, fontIn: 0.16, label: 'GL Code' },
            [`${prefix}line_items`]: { x: 6.35, y: baseY + 1.15, w: 1.60, h: 0.85, fontIn: 0.16, label: 'Line Items' }
          }

        // Always update field positions when enabling to ensure correct placement
        const nextFields = { ...m.fields }
        for (const [k, v] of Object.entries(defaults)) {
          // Merge: keep existing non-position properties but update positions
          nextFields[k] = { ...(nextFields[k] || {}), ...v }
        }

        return { ...m, layout: nextLayout, fields: nextFields }
      }

      return { ...m, layout: nextLayout }
    })

    // Sync data fields when enabling
    if (enabled) {
      const prefix = which === 'stub1' ? 'stub1_' : 'stub2_'
      setData((d) => {
        const defaultMemo = which === 'stub1'
          ? (d.external_memo || d.memo || '')
          : (d.internal_memo || d.memo || '')

        return {
          ...d,
          [`${prefix}date`]: d.date,
          [`${prefix}payee`]: d.payee,
          [`${prefix}amount`]: d.amount,
          [`${prefix}memo`]: defaultMemo
        }
      })
    }
  }

  const onPointerDownField = (e, key) => {
    if (!editMode) return
    e.preventDefault()
    e.stopPropagation()

    let newSelected = [...selected]
    const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey

    if (isMultiSelect) {
      if (newSelected.includes(key)) {
        newSelected = newSelected.filter(k => k !== key)
      } else {
        newSelected.push(key)
      }
    } else {
      if (!newSelected.includes(key)) {
        newSelected = [key]
      }
    }

    setSelected(newSelected)

    // If we just deselected the item with a modifier click, don't start dragging
    if (isMultiSelect && selected.includes(key)) {
      return
    }

    // Capture start positions for all selected fields
    const startFields = {}
    newSelected.forEach(k => {
      let f = null
      if (activeProfile?.layoutMode === 'three_up') {
        f = model.slotFields?.[activeSlot]?.[k]
      } else {
        f = model.fields[k]
      }

      if (f) {
        startFields[k] = { ...f }
      }
    })

    dragRef.current = {
      mode: 'move',
      startX: e.clientX,
      startY: e.clientY,
      startFields
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerDownHandle = (e, key) => {
    if (!editMode) return
    e.preventDefault()
    e.stopPropagation()

    setSelected([key]) // Force single selection for resize

    let f = null
    if (activeProfile?.layoutMode === 'three_up') {
      f = model.slotFields?.[activeSlot]?.[key]
    } else {
      f = model.fields[key]
    }

    dragRef.current = {
      key,
      mode: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      startField: { ...f }
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerDownCutLine = (e, lineNumber) => {
    // Lock behind admin control - only allow when admin unlocked
    if (preferences.adminLocked) return

    e.stopPropagation()
    const fieldName = lineNumber === 1 ? 'cutLine1In' : 'cutLine2In'
    const startValue = model.layout[fieldName]

    dragRef.current = {
      mode: 'cutLine',
      lineNumber,
      fieldName,
      startY: e.clientY,
      startValue
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerDownStage = (e) => {
    if (!editMode) return
    if (e.button !== 0) return // Only left click

    const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey
    if (!isMultiSelect) {
      setSelected([])
    }

    if (!paperRef.current) return
    const paperRect = paperRef.current.getBoundingClientRect()
    const startX = (e.clientX - paperRect.left) / (PX_PER_IN * model.view.zoom)
    const startY = (e.clientY - paperRect.top) / (PX_PER_IN * model.view.zoom)

    setSelectionBox({
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      initialSelected: isMultiSelect ? [...selected] : []
    })

    dragRef.current = {
      mode: 'marquee'
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e) => {
    const d = dragRef.current
    if (!d) return
    const dxIn = (e.clientX - d.startX) / (PX_PER_IN * model.view.zoom)
    const dyIn = (e.clientY - d.startY) / (PX_PER_IN * model.view.zoom)

    if (d.mode === 'move') {
      // Calculate new positions for all selected fields
      const updates = {}
      Object.entries(d.startFields).forEach(([key, startField]) => {
        const nx = roundTo(startField.x + dxIn, snapStepIn)
        const ny = roundTo(startField.y + dyIn, snapStepIn)
        updates[key] = {
          x: clamp(nx, 0, model.layout.widthIn - 0.2),
          y: clamp(ny, 0, stageHeightIn - 0.2)
        }
      })

      // Batch update
      if (activeProfile?.layoutMode === 'three_up') {
        setModel(m => {
          const currentSlotFields = m.slotFields[activeSlot]
          const newSlotFields = { ...currentSlotFields }
          let changed = false
          Object.entries(updates).forEach(([key, patch]) => {
            if (newSlotFields[key]) {
              newSlotFields[key] = { ...newSlotFields[key], ...patch }
              changed = true
            }
          })
          if (!changed) return m
          return {
            ...m,
            slotFields: {
              ...m.slotFields,
              [activeSlot]: newSlotFields
            }
          }
        })
      } else {
        setModel(m => {
          const newFields = { ...m.fields }
          let changed = false
          Object.entries(updates).forEach(([key, patch]) => {
            if (newFields[key]) {
              newFields[key] = { ...newFields[key], ...patch }
              changed = true
            }
          })
          if (!changed) return m
          return { ...m, fields: newFields }
        })
      }
    } else if (d.mode === 'resize') {
      const nw = roundTo(d.startField.w + dxIn, snapStepIn)
      const nh = roundTo(d.startField.h + dyIn, snapStepIn)

      setField(d.key, {
        w: clamp(nw, 0.2, model.layout.widthIn - d.startField.x),
        h: clamp(nh, 0.18, stageHeightIn - d.startField.y)
      })
    } else if (d.mode === 'marquee') {
      // Calculate selection box
      if (!paperRef.current) return
      const paperRect = paperRef.current.getBoundingClientRect()
      const currentX = (e.clientX - paperRect.left) / (PX_PER_IN * model.view.zoom)
      const currentY = (e.clientY - paperRect.top) / (PX_PER_IN * model.view.zoom)

      setSelectionBox(prev => ({ ...prev, currentX, currentY }))

      // Calculate intersection
      const boxX = Math.min(selectionBox.startX, currentX)
      const boxY = Math.min(selectionBox.startY, currentY)
      const boxW = Math.abs(currentX - selectionBox.startX)
      const boxH = Math.abs(currentY - selectionBox.startY)

      const newSelection = [...selectionBox.initialSelected]

      const fieldsToCheck = activeProfile?.layoutMode === 'three_up'
        ? Object.entries(model.slotFields[activeSlot] || {})
        : Object.entries(model.fields)

      fieldsToCheck.forEach(([key, f]) => {
        let fieldY = f.y
        // Handle stub offsets
        const isStub1Field = key.startsWith('stub1_')
        const isStub2Field = key.startsWith('stub2_')

        if (isStub1Field) {
          const originalStub1Start = 3.0
          const relativeY = f.y - originalStub1Start
          fieldY = model.layout.checkHeightIn + relativeY
        } else if (isStub2Field) {
          const originalStub2Start = 6.0
          const relativeY = f.y - originalStub2Start
          fieldY = model.layout.checkHeightIn + model.layout.stub1HeightIn + relativeY
        }

        if (
          boxX < f.x + f.w &&
          boxX + boxW > f.x &&
          boxY < fieldY + f.h &&
          boxY + boxH > fieldY
        ) {
          if (!newSelection.includes(key)) {
            newSelection.push(key)
          }
        }
      })

      setSelected(newSelection)
    } else if (d.mode === 'cutLine') {
      const newY = roundTo(d.startValue + dyIn, snapStepIn)
      // Constrain cut line 1 between 1" and 6" (before second cut line)
      // Constrain cut line 2 between cutLine1 + 1" and 10"
      const minY = d.lineNumber === 1 ? 1.0 : (model.layout.cutLine1In ?? DEFAULT_LAYOUT.cutLine1In) + 1.0
      const maxY = d.lineNumber === 1 ? (model.layout.cutLine2In ?? DEFAULT_LAYOUT.cutLine2In) - 1.0 : 10.0

      setModel(m => ({
        ...m,
        layout: {
          ...m.layout,
          [d.fieldName]: clamp(newY, minY, maxY)
        }
      }))
    } else if (d.mode === 'resize-section') {
      const dyIn = (e.clientY - d.startY) / (PX_PER_IN * model.view.zoom)
      // Min height 0.5" to prevent collapse
      const newHeight = Math.max(0.5, d.startHeight + dyIn)
      const delta = newHeight - d.startHeight

      // Identify sections to shift (those AFTER the dragged section)
      const order = model.layout.sectionOrder || ['check', 'stub1', 'stub2']
      const draggedIdx = order.indexOf(d.sectionName)
      const sectionsToShift = order.slice(draggedIdx + 1)
      const cutoffY = d.startSectionY + d.startHeight // Original cut line Y

      setModel(m => {
        // 1. Update Layout Height
        const nextLayout = { ...m.layout, [`${d.sectionName}HeightIn`]: newHeight }

        // 2. Shift Fields (Using INITIAL fields to prevent drift/compounding errors)
        const nextFields = { ...d.initialFields }

        Object.keys(nextFields).forEach(key => {
          let shouldShift = false

          // Determine which section this field belongs to
          let fieldSection = 'check'
          if (key.startsWith('stub1_')) fieldSection = 'stub1'
          else if (key.startsWith('stub2_')) fieldSection = 'stub2'

          // Shift fields that belong to sections AFTER the resized section
          if (sectionsToShift.includes(fieldSection)) {
            shouldShift = true
          }

          // Also shift any generic fields below the cut line
          if (fieldSection === 'check' && !key.startsWith('stub1_') && !key.startsWith('stub2_')) {
            if (nextFields[key].y >= cutoffY - 0.01) { // -0.01 tolerance
              shouldShift = true
            }
          }

          if (shouldShift) {
            nextFields[key] = { ...nextFields[key], y: parseFloat((nextFields[key].y + delta).toFixed(3)) }
          }
        })

        return { ...m, layout: nextLayout, fields: nextFields }
      })
    }
  }

  const onPointerUp = (e) => {
    if (dragRef.current) {
      if (dragRef.current.mode === 'marquee') {
        setSelectionBox(null)
      }
      dragRef.current = null
      // Release pointer capture if it was set
      if (e?.target?.releasePointerCapture && e.pointerId) {
        try {
          e.target.releasePointerCapture(e.pointerId)
        } catch (err) {
          // Ignore errors if capture wasn't set
        }
      }
    }
  }

  return {
    paperRef, dragRef,
    paperStyle, stageVars, stageHeightIn,
    getSectionHeight, getSectionY,
    setField, ensureStub, reorderSections,
    onPointerDownField, onPointerDownHandle, onPointerDownCutLine,
    onPointerDownStage, onPointerMove, onPointerUp
  }
}
