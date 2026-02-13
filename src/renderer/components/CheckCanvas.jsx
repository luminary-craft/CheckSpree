import React from 'react'
import { formatCurrency, sanitizeCurrencyInput } from '../utils/helpers'
import { formatDateByPreference, formatLedgerSnapshot, DEFAULT_LAYOUT, DEFAULT_FIELDS } from '../constants/defaults'

export function CheckCanvas({
  profiles, model, setModel, activeProfile,
  data, sheetData, activeSlot, editMode,
  preferences, selected, setSelected, selectionBox,
  templateDataUrl, isFullPageTemplate, onTemplateImageError,
  autoIncrementCheckNumbers, isPrinting,
  stageVars, threeUpYOffset, hybridBalance, activeLedger,
  activeFontFamily, paperStyle, paperRef, dragRef,
  onPointerDownStage, onPointerDownCutLine, onPointerDownField, onPointerDownHandle,
  updateCurrentCheckData, getSectionHeight, getSectionY, setField,
  handleUnlockRequest, isSlotEmpty,
  showStub1Labels, showStub2Labels,
  signature
}) {
  return (
    <div className="workspace">
      {profiles.length === 0 ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '400px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '32px',
            color: 'var(--text-label)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <h3 style={{ color: '#e2e8f0', marginBottom: '12px', fontSize: '20px' }}>No Check Profiles Found</h3>
            <p style={{ marginBottom: '20px', lineHeight: '1.6' }}>
              Please unlock <strong>Admin Mode</strong> to create your first check layout.
            </p>
            <button
              className="btn primary"
              onClick={preferences.adminLocked ? handleUnlockRequest : () => { }}
              style={{ marginTop: '8px' }}
            >
              {preferences.adminLocked ? '🔓 Unlock Admin' : '✓ Admin Unlocked'}
            </button>
          </div>
        </div>
      ) : (
        <div className="paperWrap" onPointerDown={onPointerDownStage}>
          <div className="paper" style={paperStyle} ref={paperRef}>
            {/* Full-page template overlay */}
            {templateDataUrl && isFullPageTemplate && (
              <img
                className="full-page-template no-print"
                src={templateDataUrl}
                alt="Template"
                draggable="false"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: model.template.opacity ?? 0,
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              />
            )}

            {/* Digital signature overlay — positioned on the check face */}
            {signature?.signatureEnabled && signature?.signatureImage && (
              <img
                src={signature.signatureImage}
                alt=""
                draggable="false"
                className="no-print-if-disabled"
                style={{
                  position: 'absolute',
                  left: `${signature.signaturePosition.x}in`,
                  top: `${signature.signaturePosition.y}in`,
                  width: `${signature.signaturePosition.w}in`,
                  height: `${signature.signaturePosition.h}in`,
                  objectFit: 'contain',
                  opacity: signature.signatureOpacity,
                  pointerEvents: 'none',
                  zIndex: 3
                }}
              />
            )}
            {selectionBox && (
              <div style={{
                position: 'absolute',
                left: Math.min(selectionBox.startX, selectionBox.currentX) + 'in',
                top: Math.min(selectionBox.startY, selectionBox.currentY) + 'in',
                width: Math.abs(selectionBox.currentX - selectionBox.startX) + 'in',
                height: Math.abs(selectionBox.currentY - selectionBox.startY) + 'in',
                border: '1px solid var(--accent)',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                pointerEvents: 'none',
                zIndex: 9999
              }} />
            )}
            {activeProfile?.layoutMode !== 'three_up' && editMode && (() => {
              const order = model.layout.sectionOrder || ['check', 'stub1', 'stub2']
              let currentY = 0
              return order.slice(0, -1).map((sectionName, idx) => {
                currentY += getSectionHeight(sectionName, model.layout)
                return (
                  <div
                    key={`fold-line-${sectionName}`}
                    className="fold-line no-print"
                    style={{
                      position: 'absolute',
                      top: `${currentY}in`,
                      left: 0,
                      right: 0,
                      borderBottom: '1px dashed #ccc',
                      pointerEvents: 'none',
                      zIndex: 5
                    }}
                  />
                )
              })
            })()}

            {/* Standard Fold Lines (Draggable in Edit Mode) */}
            {activeProfile?.layoutMode !== 'three_up' && (() => {
              const order = model.layout.sectionOrder || ['check', 'stub1', 'stub2']
              let currentY = 0
              return order.slice(0, -1).map((sectionName, idx) => {
                const sectionHeight = getSectionHeight(sectionName, model.layout)
                const thisSectionY = currentY
                currentY += sectionHeight

                return (
                  <div
                    key={`fold-line-${sectionName}`}
                    className="fold-line no-print"
                    onPointerDown={(e) => {
                      if (!editMode) return
                      e.preventDefault()
                      e.stopPropagation()

                      // Initialize Drag
                      dragRef.current = {
                        mode: 'resize-section',
                        sectionName: sectionName,
                        startX: e.clientX,
                        startY: e.clientY,
                        startHeight: sectionHeight,
                        startSectionY: thisSectionY,
                        initialFields: JSON.parse(JSON.stringify(model.fields)) // Deep copy for stable delta calculation
                      }
                      e.currentTarget.setPointerCapture?.(e.pointerId)
                    }}
                    style={{
                      position: 'absolute',
                      top: `${currentY}in`,
                      left: 0,
                      right: 0,
                      height: '10px', // Hit area
                      marginTop: '-5px', // Center hit area
                      cursor: editMode ? 'ns-resize' : 'default',
                      zIndex: 50, // High z-index for interaction
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {/* Visible Line */}
                    <div style={{
                      width: '100%',
                      height: '1px',
                      borderBottom: '1px dashed #ccc',
                      pointerEvents: 'none'
                    }} />
                  </div>
                )
              })
            })()}

            {/* Three-up visual cut lines (perforation marks) - FIXED position */}
            {activeProfile?.layoutMode === 'three_up' && (
              <>
                {/* Cut Line 1 - Draggable when admin unlocked */}
                <div
                  className="three-up-cut-line no-print"
                  onPointerDown={(e) => onPointerDownCutLine(e, 1)}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: `calc(${model.placement.offsetYIn}in + ${model.layout.cutLine1In ?? DEFAULT_LAYOUT.cutLine1In}in)`,
                    height: '20px',
                    marginTop: '-10px',
                    borderTop: `2px dashed ${preferences.adminLocked ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.5)'}`,
                    zIndex: 100,
                    cursor: preferences.adminLocked ? 'default' : 'ns-resize',
                    pointerEvents: 'auto'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    left: '4px',
                    top: '-10px',
                    background: 'rgba(128, 128, 128, 0.2)',
                    color: 'rgba(128, 128, 128, 0.9)',
                    padding: '2px 8px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: '600',
                    pointerEvents: 'none',
                    userSelect: 'none'
                  }}>
                    ✂ Cut 1 ({(model.layout.cutLine1In ?? DEFAULT_LAYOUT.cutLine1In).toFixed(2)}")
                  </div>
                </div>

                {/* Cut Line 2 - Draggable when admin unlocked */}
                <div
                  className="three-up-cut-line no-print"
                  onPointerDown={(e) => onPointerDownCutLine(e, 2)}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: `calc(${model.placement.offsetYIn}in + ${model.layout.cutLine2In ?? DEFAULT_LAYOUT.cutLine2In}in)`,
                    height: '20px',
                    marginTop: '-10px',
                    borderTop: `2px dashed ${preferences.adminLocked ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.5)'}`,
                    zIndex: 100,
                    cursor: preferences.adminLocked ? 'default' : 'ns-resize',
                    pointerEvents: 'auto'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    left: '4px',
                    top: '-10px',
                    background: 'rgba(128, 128, 128, 0.2)',
                    color: 'rgba(128, 128, 128, 0.9)',
                    padding: '2px 8px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: '600',
                    pointerEvents: 'none',
                    userSelect: 'none'
                  }}>
                    ✂ Cut 2 ({(model.layout.cutLine2In ?? DEFAULT_LAYOUT.cutLine2In).toFixed(2)}")
                  </div>
                </div>
              </>
            )}

            {/* Render check(s) - single for standard mode, multiple for three_up mode */}
            {(activeProfile?.layoutMode === 'three_up'
              ? ['top', 'middle', 'bottom'].map((slot, index) => ({ slot, index, yOffset: [0, model.layout.cutLine1In ?? DEFAULT_LAYOUT.cutLine1In, model.layout.cutLine2In ?? DEFAULT_LAYOUT.cutLine2In][index] }))
              : [{ slot: null, index: 0, yOffset: threeUpYOffset }]
            ).map(({ slot, index, yOffset }) => {
              // Get data for this slot (three-up uses slot data, standard uses data)
              const checkData = slot ? sheetData[slot] : data
              const isActiveSlot = slot ? (activeSlot === slot) : true

              // In three-up mode, skip empty slots unless:
              // - It's the active slot in edit mode
              // - Auto-increment is enabled (need to show check numbers)
              // - Show Date is enabled (need to show date even on empty slots)
              if (slot && isSlotEmpty(checkData) && !(editMode && isActiveSlot) && !autoIncrementCheckNumbers && !preferences.showDate) {
                return null
              }

              return (
                <div
                  key={slot || 'single'}
                  className="checkStage"
                  style={{
                    '--offset-x': `${model.placement.offsetXIn}in`,
                    '--offset-y': `${isPrinting ? yOffset : (model.placement.offsetYIn + yOffset)}in`,
                    ...stageVars,
                    opacity: editMode && !isActiveSlot ? 0.3 : 1,
                    pointerEvents: editMode && !isActiveSlot ? 'none' : 'auto'
                  }}
                >
                  {/* Rigid check face container - moves with section order */}
                  <div
                    className="check-face-container"
                    style={{
                      '--check-height': `${model.layout.checkHeightIn}in`,
                      top: `${getSectionY('check', model.layout)}in`
                    }}
                  >
                    {/* Check-only template image (wide images) */}
                    {templateDataUrl && !isFullPageTemplate && (
                      <img
                        className="templateImg no-print"
                        src={templateDataUrl}
                        alt="Template"
                        draggable="false"
                        onError={onTemplateImageError}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: 'auto',
                          opacity: model.template.opacity ?? 0,
                          pointerEvents: 'none',
                          zIndex: 0
                        }}
                      />
                    )}
                  </div>

                  {/* Section Labels (Edit Mode Only) */}
                  {editMode && activeProfile?.layoutMode !== 'three_up' && (() => {
                    const order = model.layout.sectionOrder || ['check', 'stub1', 'stub2']
                    const visibleSections = order.filter(s => {
                      if (s === 'check') return true
                      if (s === 'stub1') return model.layout.stub1Enabled
                      if (s === 'stub2') return model.layout.stub2Enabled
                      return false
                    })

                    return visibleSections.map((sectionName) => {
                      const topY = getSectionY(sectionName, model.layout)
                      const sectionLabel = sectionName === 'check' ? 'Check' :
                        sectionName === 'stub1' ? 'Stub 1 (Payee Copy)' : 'Stub 2 (Bookkeeper Copy)'

                      return (
                        <div
                          key={`section-label-${sectionName}`}
                          className="no-print"
                          style={{
                            position: 'absolute',
                            top: `calc(${topY}in + 4px)`,
                            right: '8px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: 'var(--accent)',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '9px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            pointerEvents: 'none',
                            zIndex: 50,
                            border: '1px solid rgba(245, 158, 11, 0.2)'
                          }}
                        >
                          {sectionLabel}
                        </div>
                      )
                    })
                  })()}

                  {/* Draggable Fold Lines (Dynamic based on Section Order) */}
                  {editMode && activeProfile?.layoutMode !== 'three_up' && (() => {
                    const order = model.layout.sectionOrder || ['check', 'stub1', 'stub2']
                    // Filter to visible sections only
                    const visibleSections = order.filter(s => {
                      if (s === 'check') return true
                      if (s === 'stub1') return model.layout.stub1Enabled
                      if (s === 'stub2') return model.layout.stub2Enabled
                      return false
                    })

                    return visibleSections.slice(0, visibleSections.length - 1).map((sectionName, index) => {
                      // Fold line is at the bottom of the current section
                      const topY = getSectionY(sectionName, model.layout)
                      const height = getSectionHeight(sectionName, model.layout)
                      const foldY = topY + height

                      const nextSection = visibleSections[index + 1]
                      const label = `${sectionName}/${nextSection} Fold`
                        .replace('check', 'Check')
                        .replace('stub1', 'Stub 1')
                        .replace('stub2', 'Stub 2')

                      return (
                        <div
                          key={`fold-${index}`}
                          className="fold-line no-print"
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `${foldY}in`,
                            height: '2px',
                            borderTop: '2px dashed var(--accent)',
                            cursor: 'ns-resize',
                            zIndex: 1000
                          }}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', `fold-${sectionName}`)
                          }}
                          onDrag={(e) => {
                            if (e.clientY === 0) return
                            const paperRect = e.currentTarget.closest('.paper').getBoundingClientRect()
                            const relativeY = e.clientY - paperRect.top
                            const yInInches = relativeY / (96 * model.view.zoom)

                            // Height = MouseY - TopOfThisSection
                            // We calculate Top safely using the helper
                            const currentTopY = getSectionY(sectionName, model.layout)

                            // Constrain height (min 1.5, max 6.0)
                            const newHeight = Math.max(1.5, Math.min(6.0, yInInches - currentTopY))

                            const propName = sectionName === 'check'
                              ? 'checkHeightIn'
                              : (sectionName === 'stub1' ? 'stub1HeightIn' : 'stub2HeightIn')

                            setModel(m => ({
                              ...m,
                              layout: { ...m.layout, [propName]: newHeight }
                            }))
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            left: '50%',
                            top: '-8px',
                            transform: 'translateX(-50%)',
                            background: 'var(--accent)',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600',
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap'
                          }}>
                            {label}
                          </div>
                        </div>
                      )
                    })
                  })()}

                  {/* Use slot-specific fields in three-up mode, shared fields in standard mode */}
                  {Object.entries(slot ? model.slotFields[slot] : model.fields)
                    .filter(([key]) => {
                      const isStub1 = key.startsWith('stub1_')
                      const isStub2 = key.startsWith('stub2_')

                      // Always hide if it's a stub field and that stub is disabled
                      if (isStub1 && !model.layout.stub1Enabled) return false
                      if (isStub2 && !model.layout.stub2Enabled) return false

                      // Hiding check number on check face check
                      if (key === 'checkNumber' && !preferences.showCheckNumber) return false

                      // Hiding date on check face
                      if (key === 'date' && !preferences.showDate) return false

                      // Address visibility (Check face ONLY - stub addresses handled in map section)
                      if (key === 'address' && !isStub1 && !isStub2 && !preferences.showAddressOnCheck) return false

                      // GL Code visibility (Check face ONLY)
                      // Stub fields should NOT be affected by 'showGlOnCheck'
                      if ((key === 'glCode' || key === 'glDescription') && !isStub1 && !isStub2 && !preferences.showGlOnCheck) return false

                      return true
                    })
                    .map(([key, f]) => {
                      // Check if this field belongs to a disabled stub
                      const isStub1Field = key.startsWith('stub1_')
                      const isStub2Field = key.startsWith('stub2_')

                      // Skip rendering stub fields if their stub is disabled OR in three_up mode
                      if (isStub1Field && (!model.layout.stub1Enabled || activeProfile?.layoutMode === 'three_up')) return null
                      if (isStub2Field && (!model.layout.stub2Enabled || activeProfile?.layoutMode === 'three_up')) return null

                      // Apply Stub Preferences (Hide if toggle is off)
                      if (isStub1Field) {
                        if (key.includes('_ledger') && !preferences.stub1ShowLedger) return null
                        if (key.includes('_approved') && !preferences.stub1ShowApproved) return null
                        if ((key.includes('_glCode') || key.includes('_glcode') || key.includes('_glDescription')) && !preferences.stub1ShowGLCode) return null
                        if (key.includes('_line_items') && !preferences.stub1ShowLineItems) return null
                        if (key.includes('_checkNumber') && !preferences.stub1ShowCheckNumber) return null
                        if (key.includes('_date') && !preferences.stub1ShowDate) return null
                        if (key.includes('_address') && !preferences.showAddressOnStub1) return null
                      }
                      if (isStub2Field) {
                        if (key.includes('_ledger') && !preferences.stub2ShowLedger) return null
                        if (key.includes('_approved') && !preferences.stub2ShowApproved) return null
                        if ((key.includes('_glCode') || key.includes('_glcode') || key.includes('_glDescription')) && !preferences.stub2ShowGLCode) return null
                        if (key.includes('_line_items') && !preferences.stub2ShowLineItems) return null
                        if (key.includes('_checkNumber') && !preferences.stub2ShowCheckNumber) return null
                        if (key.includes('_date') && !preferences.stub2ShowDate) return null
                        if (key.includes('_address') && !preferences.showAddressOnStub2) return null
                      }
                      // Smart field value handling
                      let value = checkData[key] ?? ''
                      let isTextarea = false
                      let isReadOnly = editMode || key === 'amountWords'

                      // Force Hide MICR (legacy data cleanup)
                      if (key === 'micr') return null

                      // Special Handling: Unified GL Field on Check Face
                      if (key === 'glCode' && !isStub1Field && !isStub2Field) {
                        // Apply Visibility Toggle (Check Face Only)
                        if (!preferences.showGlOnCheck && !editMode) return null

                        const desc = checkData.glDescription ? ` - ${checkData.glDescription}` : ''
                        value = `GL Code: ${checkData.glCode || ''}${desc}`
                      }

                      // Hide glDescription on check face
                      if (key === 'glDescription' && !isStub1Field && !isStub2Field) {
                        return null
                      }

                      // Unified GL Field on Stub 1 (Generic lowercase match)
                      if (isStub1Field && key.toLowerCase().endsWith('_glcode')) {
                        const codeVal = checkData[key] || checkData.glCode || ''
                        // Fallback to main glDescription
                        const descRaw = checkData.stub1_glDescription || checkData.glDescription
                        const descVal = descRaw ? ` - ${descRaw}` : ''
                        value = `GL Code: ${codeVal}${descVal}`
                      }
                      // Hide Stub 1 Description (Generic lowercase match)
                      if (isStub1Field && key.toLowerCase().endsWith('_gldescription')) return null


                      // Unified GL Field on Stub 2 (Generic lowercase match)
                      if (isStub2Field && key.toLowerCase().endsWith('_glcode')) {
                        const codeVal = checkData[key] || checkData.glCode || ''
                        // Fallback to main glDescription
                        const descRaw = checkData.stub2_glDescription || checkData.glDescription
                        const descVal = descRaw ? ` - ${descRaw}` : ''
                        value = `GL Code: ${codeVal}${descVal}`
                      }
                      // Hide Stub 2 Description (Generic lowercase match)
                      if (isStub2Field && key.toLowerCase().endsWith('_gldescription')) return null

                      // Special handling for check number - default to profile's nextCheckNumber
                      if (key === 'checkNumber' && !value) {
                        value = String(activeProfile.nextCheckNumber || '')
                      }

                      // Sync stub check numbers from check data
                      if ((key === 'stub1_checkNumber' || key === 'stub2_checkNumber')) {
                        value = checkData.checkNumber || String(activeProfile.nextCheckNumber || '')
                        isReadOnly = true
                      }

                      // Sync stub dates from check data
                      if ((key === 'stub1_date' || key === 'stub2_date')) {
                        value = checkData.date || ''
                        isReadOnly = true
                      }

                      // Sync stub payee from check data
                      if ((key === 'stub1_payee' || key === 'stub2_payee')) {
                        value = checkData.payee || ''
                        isReadOnly = true
                      }

                      // Sync stub amount from check data
                      if ((key === 'stub1_amount' || key === 'stub2_amount')) {
                        value = checkData.amount || ''
                        isReadOnly = true
                      }

                      // Sync stub memo from check data (with fallback)
                      if (key === 'stub1_memo') {
                        value = checkData.external_memo || checkData.memo || ''
                        isReadOnly = true
                      }
                      if (key === 'stub2_memo') {
                        value = checkData.internal_memo || checkData.memo || ''
                        isReadOnly = true
                      }

                      // Address Field Logic (Check & Stubs)
                      // Visibility is handled in filter/preferences sections above
                      if (key === 'address' && !isStub1Field && !isStub2Field) {
                        value = checkData.address || ''
                        isTextarea = true
                      }
                      if ((key === 'stub1_address' || key === 'stub2_address')) {
                        // Sync from main address
                        value = checkData.address || ''
                        isReadOnly = true
                        isTextarea = true
                      }

                      // Special handling for date formatting (check and stubs)
                      if ((key === 'date' || key === 'stub1_date' || key === 'stub2_date') && value) {
                        value = formatDateByPreference(value, preferences)
                      }

                      // Special handling for amount fields - format with commas (1,250.00)
                      if ((key === 'amount' || key === 'stub1_amount' || key === 'stub2_amount') && value) {
                        const numValue = parseFloat(value)
                        if (!isNaN(numValue)) {
                          value = numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        }
                      }

                      // Special handling for smart stub fields
                      if (key.endsWith('_line_items')) {
                        value = checkData.line_items_text || ''
                        isTextarea = true
                        isReadOnly = true
                      } else if (key.endsWith('_ledger')) {
                        // Generate live ledger snapshot based on current hybrid balance and check amount
                        const checkAmount = sanitizeCurrencyInput(checkData.amount)
                        const snapshot = checkData.ledger_snapshot || {
                          previous_balance: hybridBalance,
                          transaction_amount: checkAmount,
                          new_balance: hybridBalance - checkAmount
                        }
                        value = formatLedgerSnapshot(snapshot, activeLedger?.name)
                        isTextarea = true
                        isReadOnly = true
                      } else if (key.endsWith('_approved')) {
                        value = 'Approved By: ___________________'
                        isReadOnly = true
                      } else if (key.toLowerCase().endsWith('_glcode') || key.toLowerCase().endsWith('_gldescription')) {
                        // Value is handled by early unification logic. Just ensure read-only.
                        isReadOnly = true
                      }

                      const isSelected = editMode && selected.includes(key)
                      // Use field's customFontIn if explicitly set by user, otherwise use global preference
                      // customFontIn is in inches, convert to points (1 inch = 72 points)
                      const globalFontPt = (isStub1Field || isStub2Field) ? preferences.stubFontSizePt : preferences.checkFontSizePt
                      const fontSizePt = f.customFontIn ? (f.customFontIn * 72) : globalFontPt

                      // Don't show labels for stub2 approved/glcode fields since they already have labels in the value
                      const showFriendlyLabel = !editMode && (
                        (isStub1Field && showStub1Labels) ||
                        (isStub2Field && showStub2Labels && key !== 'stub2_approved' && key !== 'stub2_glcode')
                      )

                      // Use direct field position - fields are stored at absolute Y coordinates
                      // No adjustment needed since normalizeModel creates fields at correct positions
                      const actualY = f.y

                      return (
                        <div
                          key={key}
                          className={`fieldBox ${editMode ? 'editable' : ''} ${isSelected ? 'selected' : ''}`}
                          style={{
                            position: 'absolute',
                            left: `${f.x}in`,
                            top: `${actualY}in`,
                            minWidth: !isTextarea ? `${f.w}in` : undefined,
                            width: !isTextarea ? 'fit-content' : `${f.w}in`,
                            height: showFriendlyLabel ? `${f.h + 14 / 96}in` : `${f.h}in`
                          }}
                          onPointerDown={(e) => onPointerDownField(e, key)}
                        >
                          {/* Ghost element for auto-width expansion (Inputs only) */}
                          {!isTextarea && (
                            <div style={{
                              visibility: 'hidden',
                              height: 0,
                              overflow: 'hidden',
                              whiteSpace: 'pre',
                              fontSize: `${fontSizePt}pt`,
                              fontFamily: activeFontFamily,
                              fontWeight: f.bold ? 'bold' : 'normal',
                              fontStyle: f.italic ? 'italic' : 'normal',
                              paddingTop: showFriendlyLabel ? '14px' : '0',
                              paddingLeft: '2px', // Match input default padding
                              paddingRight: '10px' // Extra buffer to prevent cutoff
                            }}>
                              {(value || ' ') + '  '}
                            </div>
                          )}

                          {editMode && (
                            <div className="label" style={{ fontSize: `${preferences.labelSize}px` }}>
                              {f.label}
                            </div>
                          )}
                          {showFriendlyLabel && (
                            <div className="friendly-label" style={{ fontSize: `${Math.max(preferences.labelSize - 2, 7)}px` }}>
                              {f.label}
                            </div>
                          )}
                          {isTextarea ? (
                            <textarea
                              value={value}
                              readOnly={isReadOnly}
                              onChange={(e) => !isReadOnly && updateCurrentCheckData({ [key]: e.target.value })}
                              style={{
                                fontSize: `${fontSizePt}pt`,
                                fontFamily: activeFontFamily,
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                background: 'transparent',
                                resize: 'none',
                                padding: showFriendlyLabel ? '14px 0 0 0' : '0',
                                lineHeight: '1.3',
                                fontWeight: f.bold ? 'bold' : 'normal',
                                fontStyle: f.italic ? 'italic' : 'normal'
                              }}
                            />
                          ) : (
                            <input
                              value={value}
                              readOnly={isReadOnly}
                              onChange={(e) => updateCurrentCheckData({ [key]: e.target.value })}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                fontSize: `${fontSizePt}pt`,
                                fontFamily: activeFontFamily,
                                paddingTop: showFriendlyLabel ? '14px' : '0',
                                fontWeight: f.bold ? 'bold' : 'normal',
                                fontStyle: f.italic ? 'italic' : 'normal',
                                background: 'transparent',
                                border: 'none',
                                outline: 'none'
                              }}
                            />
                          )}
                          {/* Floating Formatting Toolbar */}
                          {/* Formatting toolbar - show for selected field (works with single or multi-select, shows on first selected) */}
                          {/* Position using field's defined width (f.w), not rendered width, so it stays stable */}
                          {editMode && selected.length > 0 && selected[0] === key && (
                            <div
                              className="formatting-toolbar no-print"
                              onPointerDown={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                top: `${f.h}in`,
                                left: `${f.w / 2}in`,
                                transform: 'translateX(-50%)',
                                marginTop: '8px',
                                display: 'flex',
                                gap: '4px',
                                backgroundColor: 'var(--surface-elevated)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                border: '1px solid var(--border-subtle)',
                                zIndex: 1000
                              }}
                            >
                              {/* Bold button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Check if ALL selected fields are bold (for toggle logic)
                                  const allBold = selected.every(k => {
                                    const field = activeProfile?.layoutMode === 'three_up'
                                      ? model.slotFields?.[activeSlot]?.[k]
                                      : model.fields[k]
                                    return field?.bold
                                  })
                                  // Apply to all selected fields
                                  selected.forEach(k => setField(k, { bold: !allBold }))
                                }}
                                style={{
                                  background: f.bold ? 'var(--accent)' : 'transparent',
                                  color: f.bold ? '#fff' : 'var(--text-label)',
                                  border: '1px solid',
                                  borderColor: f.bold ? 'var(--accent)' : 'var(--border-medium)',
                                  borderRadius: '4px',
                                  width: '24px',
                                  height: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  fontSize: '14px'
                                }}
                                title={selected.length > 1 ? `Bold (${selected.length} fields)` : 'Bold'}
                              >
                                B
                              </button>
                              {/* Italic button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Check if ALL selected fields are italic
                                  const allItalic = selected.every(k => {
                                    const field = activeProfile?.layoutMode === 'three_up'
                                      ? model.slotFields?.[activeSlot]?.[k]
                                      : model.fields[k]
                                    return field?.italic
                                  })
                                  // Apply to all selected fields
                                  selected.forEach(k => setField(k, { italic: !allItalic }))
                                }}
                                style={{
                                  background: f.italic ? 'var(--accent)' : 'transparent',
                                  color: f.italic ? '#fff' : 'var(--text-label)',
                                  border: '1px solid',
                                  borderColor: f.italic ? 'var(--accent)' : 'var(--border-medium)',
                                  borderRadius: '4px',
                                  width: '24px',
                                  height: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  fontStyle: 'italic',
                                  fontFamily: 'serif',
                                  fontSize: '14px'
                                }}
                                title={selected.length > 1 ? `Italic (${selected.length} fields)` : 'Italic'}
                              >
                                I
                              </button>
                              {/* Separator */}
                              <div style={{ width: '1px', background: 'var(--border-medium)', margin: '2px 2px' }} />
                              {/* Decrease font size button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const isStub = key.startsWith('stub1_') || key.startsWith('stub2_')
                                  const globalPt = isStub ? preferences.stubFontSizePt : preferences.checkFontSizePt
                                  selected.forEach(k => {
                                    const field = activeProfile?.layoutMode === 'three_up'
                                      ? model.slotFields?.[activeSlot]?.[k]
                                      : model.fields[k]
                                    // Use customFontIn if set, otherwise convert global pt to inches
                                    const currentSize = field?.customFontIn || (globalPt / 72)
                                    const newSize = Math.max(0.08, currentSize - 0.02) // Min 0.08in
                                    setField(k, { customFontIn: newSize })
                                  })
                                }}
                                style={{
                                  background: 'transparent',
                                  color: 'var(--text-label)',
                                  border: '1px solid var(--border-medium)',
                                  borderRadius: '4px',
                                  width: '24px',
                                  height: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  fontSize: '16px',
                                  fontWeight: 'bold'
                                }}
                                title={selected.length > 1 ? `Decrease font size (${selected.length} fields)` : 'Decrease font size'}
                              >
                                −
                              </button>
                              {/* Font size indicator - show current effective size */}
                              <div
                                title={f.customFontIn ? 'Custom font size (click to reset)' : 'Using global font size'}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Reset to global by removing customFontIn
                                  if (f.customFontIn) {
                                    selected.forEach(k => setField(k, { customFontIn: undefined }))
                                  }
                                }}
                                style={{
                                  color: f.customFontIn ? 'var(--accent-hover)' : 'var(--text-label)',
                                  fontSize: '11px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '0 2px',
                                  minWidth: '28px',
                                  justifyContent: 'center',
                                  cursor: f.customFontIn ? 'pointer' : 'default'
                                }}
                              >
                                {fontSizePt.toFixed(0)}pt{f.customFontIn ? '*' : ''}
                              </div>
                              {/* Increase font size button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const isStub = key.startsWith('stub1_') || key.startsWith('stub2_')
                                  const globalPt = isStub ? preferences.stubFontSizePt : preferences.checkFontSizePt
                                  selected.forEach(k => {
                                    const field = activeProfile?.layoutMode === 'three_up'
                                      ? model.slotFields?.[activeSlot]?.[k]
                                      : model.fields[k]
                                    // Use customFontIn if set, otherwise convert global pt to inches
                                    const currentSize = field?.customFontIn || (globalPt / 72)
                                    const newSize = Math.min(0.5, currentSize + 0.02) // Max 0.5in
                                    setField(k, { customFontIn: newSize })
                                  })
                                }}
                                style={{
                                  background: 'transparent',
                                  color: 'var(--text-label)',
                                  border: '1px solid var(--border-medium)',
                                  borderRadius: '4px',
                                  width: '24px',
                                  height: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  fontSize: '16px',
                                  fontWeight: 'bold'
                                }}
                                title={selected.length > 1 ? `Increase font size (${selected.length} fields)` : 'Increase font size'}
                              >
                                +
                              </button>
                              {/* Show selection count if multiple */}
                              {selected.length > 1 && (
                                <div
                                  style={{
                                    color: 'var(--accent-hover)',
                                    fontSize: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0 4px',
                                    marginLeft: '2px'
                                  }}
                                >
                                  ×{selected.length}
                                </div>
                              )}
                            </div>
                          )}

                          {editMode && <div className="handle" onPointerDown={(e) => onPointerDownHandle(e, key)} />}
                        </div>
                      )
                    })}

                  {/* FORCE FIX: Manual Check Number Render */}
                  {preferences.showCheckNumber && !Object.keys(slot ? model.slotFields[slot] : model.fields).includes('checkNumber') && (
                    <div
                      key="manual-check-number"
                      className={`fieldBox ${editMode ? 'editable' : ''} ${editMode && selected.includes('checkNumber') ? 'selected' : ''}`}
                      style={{
                        left: '7.8in',
                        top: '0.15in',
                        width: '1.5in',
                        height: '0.30in'
                      }}
                      onPointerDown={(e) => {
                        if (!editMode) return
                        e.preventDefault()
                        e.stopPropagation()
                        setSelected(['checkNumber'])
                        // Create synthetic field in the model if it doesn't exist
                        const checkNumberField = DEFAULT_FIELDS.checkNumber
                        if (slot) {
                          // Three-up mode: add to slotFields
                          if (!model.slotFields[slot].checkNumber) {
                            setModel(m => ({
                              ...m,
                              slotFields: {
                                ...m.slotFields,
                                [slot]: {
                                  ...m.slotFields[slot],
                                  checkNumber: checkNumberField
                                }
                              }
                            }))
                          }
                          dragRef.current = {
                            key: 'checkNumber',
                            mode: 'move',
                            startX: e.clientX,
                            startY: e.clientY,
                            startField: { ...checkNumberField }
                          }
                        } else {
                          // Standard mode: add to fields
                          if (!model.fields.checkNumber) {
                            setModel(m => ({
                              ...m,
                              fields: {
                                ...m.fields,
                                checkNumber: checkNumberField
                              }
                            }))
                          }
                          dragRef.current = {
                            key: 'checkNumber',
                            mode: 'move',
                            startX: e.clientX,
                            startY: e.clientY,
                            startField: { ...checkNumberField }
                          }
                        }
                        e.currentTarget.setPointerCapture?.(e.pointerId)
                      }}
                    >
                      {editMode && (
                        <div className="label" style={{ fontSize: `${preferences.labelSize}px` }}>
                          Check #
                        </div>
                      )}
                      <input
                        value={checkData.checkNumber || String(activeProfile.nextCheckNumber || '1001')}
                        readOnly={editMode}
                        onChange={(e) => !editMode && updateCurrentCheckData({ checkNumber: e.target.value })}
                        style={{
                          fontSize: `${preferences.checkFontSizePt}pt`,
                          fontFamily: activeFontFamily
                        }}
                      />
                      {editMode && <div className="handle" onPointerDown={(e) => {
                        if (!editMode) return
                        e.preventDefault()
                        e.stopPropagation()
                        setSelected('checkNumber')
                        const checkNumberField = DEFAULT_FIELDS.checkNumber
                        dragRef.current = {
                          key: 'checkNumber',
                          mode: 'resize',
                          startX: e.clientX,
                          startY: e.clientY,
                          startField: { ...checkNumberField }
                        }
                        e.currentTarget.setPointerCapture?.(e.pointerId)
                      }} />}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Stub Buttons moved to Sidebar */}
          </div>
        </div>
      )}
    </div>
  )
}
