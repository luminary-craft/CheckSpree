import { useState, useCallback } from 'react'
import { formatCurrency, formatDateByPreference } from '../utils/helpers'
import { numberToWords } from '../utils/numberToWords'

// Physical inches to pixels conversion (96 DPI standard)
const PX_PER_IN = 96

/**
 * usePrinting Hook - Handles check printing and PDF generation
 * 
 * Features:
 * - Print checks to physical printer
 * - Generate PDF files
 * - Batch printing support
 * - Physical inch-accurate rendering
 * - Status tracking and error handling
 * 
 * @returns {Object} Printing state and functions
 */
export function usePrinting() {
    const [isPrinting, setIsPrinting] = useState(false)
    const [printStatus, setPrintStatus] = useState('')
    const [printError, setPrintError] = useState(null)

    /**
     * Generate HTML content for check printing
     */
    const generateCheckHTML = useCallback((checkData, layoutProfile, layout, options = {}) => {
        const {
            fontFamily = '"Courier New", Courier, monospace',
            dateFormat = { dateSlot1: 'MM', dateSlot2: 'DD', dateSlot3: 'YYYY', dateSeparator: '/', useLongDate: false },
            layoutOrder = ['check'],
            showTemplate = false,
            templateDataUrl = null,
            sheetMode = false // New option for 3-up sheet mode
        } = options

        const fields = layoutProfile.fields || {}
        const checkHeightIn = layout.checkHeightIn || 3.0
        const stub1HeightIn = layout.stub1Enabled ? (layout.stub1HeightIn || 3.0) : 0
        const stub2HeightIn = layout.stub2Enabled ? (layout.stub2HeightIn || 3.0) : 0
        const widthIn = layout.widthIn || 8.5

        // Calculate total height based on mode
        const totalHeightIn = sheetMode ? (checkHeightIn * 3) : (checkHeightIn + stub1HeightIn + stub2HeightIn)

        // Calculate section offsets
        const sections = {
            check: { heightIn: checkHeightIn, enabled: true },
            stub1: { heightIn: stub1HeightIn, enabled: layout.stub1Enabled || false },
            stub2: { heightIn: stub2HeightIn, enabled: layout.stub2Enabled || false }
        }

        const getSectionOffsets = () => {
            const offsets = {}
            let currentY = 0

            if (sheetMode) {
                // In sheet mode, we handle offsets manually in the loop
                return {}
            }

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

        // Get field value
        const getFieldValue = (fieldKey) => {
            switch (fieldKey) {
                case 'date':
                case 'stub1_date':
                case 'stub2_date':
                    return formatDateByPreference(checkData.date, dateFormat)

                case 'payee':
                case 'stub1_payee':
                case 'stub2_payee':
                    return checkData.payee || ''

                case 'amount':
                case 'stub1_amount':
                case 'stub2_amount':
                    return checkData.amount ? formatCurrency(checkData.amount) : ''

                case 'amountWords':
                    if (!checkData.amount || checkData.amount === '' || checkData.amount === '0') return ''
                    try {
                        const num = parseFloat(checkData.amount)
                        return numberToWords(num)
                    } catch (e) {
                        return ''
                    }

                case 'memo':
                case 'stub1_memo':
                case 'stub2_memo':
                    return checkData.memo || checkData.external_memo || ''

                case 'checkNumber':
                    return checkData.checkNumber || ''

                case 'address':
                    return checkData.address || ''

                default:
                    return ''
            }
        }

        // Generate field HTML
        const generateFieldHTML = (fieldKey, sectionOffsetY = 0) => {
            const field = fields[fieldKey]
            if (!field) return ''

            const value = getFieldValue(fieldKey)
            if (!value) return '' // Skip empty fields

            const xPx = field.x * PX_PER_IN
            const yPx = (field.y + sectionOffsetY) * PX_PER_IN
            const wPx = field.w * PX_PER_IN
            const hPx = field.h * PX_PER_IN
            const fontSizePt = (field.fontIn || 0.12) * 72 // Convert inches to points for print

            const isMultiline = fieldKey === 'address'
            const textAlign = (fieldKey === 'amount' || fieldKey.includes('_amount')) ? 'right' : 'left'

            return `
        <div class="field field-${fieldKey}" style="
          position: absolute;
          left: ${xPx}px;
          top: ${yPx}px;
          width: ${wPx}px;
          height: ${hPx}px;
          font-size: ${fontSizePt}pt;
          font-family: ${fontFamily};
          display: flex;
          align-items: center;
          overflow: hidden;
          white-space: ${isMultiline ? 'pre-wrap' : 'nowrap'};
          text-align: ${textAlign};
        ">
          ${value}
        </div>
      `
        }

        // Generate section HTML
        const generateSectionHTML = (sectionKey, slotIndex = 0) => {
            const section = sections[sectionKey]
            if (!section || !section.enabled) return ''

            let offsetY = 0
            if (sheetMode) {
                offsetY = slotIndex * checkHeightIn
            } else {
                offsetY = sectionOffsets[sectionKey] || 0
            }

            const heightPx = section.heightIn * PX_PER_IN

            const sectionFields = {
                check: ['date', 'payee', 'amount', 'amountWords', 'memo', 'checkNumber', 'address'],
                stub1: ['stub1_date', 'stub1_payee', 'stub1_amount', 'stub1_memo'],
                stub2: ['stub2_date', 'stub2_payee', 'stub2_amount', 'stub2_memo']
            }

            const fieldsHTML = (sectionFields[sectionKey] || [])
                .map(fieldKey => generateFieldHTML(fieldKey, offsetY))
                .join('')

            return `
        <div class="section section-${sectionKey}" style="
          position: relative;
          width: 100%;
          height: ${heightPx}px;
        ">
          ${fieldsHTML}
        </div>
      `
        }

        // Generate complete HTML document
        const totalWidthPx = widthIn * PX_PER_IN
        const totalHeightPx = totalHeightIn * PX_PER_IN

        const templateHTML = showTemplate && templateDataUrl ? `
      <div class="template-background" style="
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: url('${templateDataUrl}');
        background-size: cover;
        background-repeat: no-repeat;
        opacity: 0.9;
        z-index: -1;
      "></div>
    ` : ''

        // Determine content to render
        let contentHTML = ''
        if (sheetMode) {
            // Render 3 checks
            contentHTML = [0, 1, 2].map(i => generateSectionHTML('check', i)).join('')
        } else {
            // Render standard layout
            contentHTML = layoutOrder.map(sectionKey => generateSectionHTML(sectionKey)).join('')
        }

        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Check Print</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page {
              size: ${widthIn}in ${totalHeightIn}in;
              margin: 0;
            }
            
            @media print {
              html, body {
                width: ${totalWidthPx}px;
                height: ${totalHeightPx}px;
                margin: 0;
                padding: 0;
              }
              
              .check-container {
                page-break-after: avoid;
                page-break-inside: avoid;
              }
            }
            
            body {
              width: ${totalWidthPx}px;
              height: ${totalHeightPx}px;
              margin: 0;
              padding: 0;
              font-family: ${fontFamily};
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .check-container {
              position: relative;
              width: ${totalWidthPx}px;
              height: ${totalHeightPx}px;
              background: white;
            }
            
            .field {
              color: black;
            }
          </style>
        </head>
        <body>
          <div class="check-container">
            ${templateHTML}
            ${contentHTML}
          </div>
        </body>
      </html>
    `
    }, [])

    /**
     * Print a single check
     */
    const printCheck = useCallback(async (checkData, layoutProfile, layout, options = {}) => {
        const {
            silent = false,
            deviceName = null,
            mode = 'print' // 'print' | 'pdf'
        } = options

        setIsPrinting(true)
        setPrintStatus('Preparing...')
        setPrintError(null)

        try {
            // Generate HTML content
            const htmlContent = generateCheckHTML(checkData, layoutProfile, layout, options)

            setPrintStatus('Spooling...')

            // Check if Electron IPC is available
            if (!window.cs2) {
                throw new Error('Electron IPC not available. This feature requires the desktop app.')
            }

            let result

            if (mode === 'pdf') {
                // Generate PDF
                setPrintStatus('Generating PDF...')
                result = await window.cs2.printCheckToPDF({
                    htmlContent,
                    options: {
                        landscape: false,
                        printBackground: true,
                        pageSize: {
                            width: layout.widthIn * 25.4, // Convert inches to mm
                            height: (layout.checkHeightIn + (layout.stub1Enabled ? layout.stub1HeightIn : 0) + (layout.stub2Enabled ? layout.stub2HeightIn : 0)) * 25.4
                        }
                    }
                })
            } else {
                // Print to printer
                result = await window.cs2.printCheck({
                    htmlContent,
                    options: {
                        silent,
                        deviceName,
                        printBackground: true,
                        margins: { top: 0, bottom: 0, left: 0, right: 0 }
                    }
                })
            }

            if (!result.success) {
                throw new Error(result.error || 'Print failed')
            }

            setPrintStatus('Done')

            // Clear status after delay
            setTimeout(() => {
                setPrintStatus('')
                setIsPrinting(false)
            }, 1500)

            return { success: true, result }

        } catch (error) {
            console.error('Print error:', error)
            setPrintError(error.message)
            setPrintStatus('Failed')
            setIsPrinting(false)

            return { success: false, error: error.message }
        }
    }, [generateCheckHTML])

    /**
     * Print multiple checks (batch)
     */
    const printBatch = useCallback(async (checksData, layoutProfile, layout, options = {}) => {
        const {
            onProgress,
            continueOnError = false
        } = options

        setIsPrinting(true)
        setPrintStatus('Preparing batch...')
        setPrintError(null)

        const results = []
        let successCount = 0
        let failCount = 0

        try {
            for (let i = 0; i < checksData.length; i++) {
                const checkData = checksData[i]
                setPrintStatus(`Printing ${i + 1} of ${checksData.length}...`)

                if (onProgress) {
                    onProgress({ current: i + 1, total: checksData.length })
                }

                const result = await printCheck(checkData, layoutProfile, layout, {
                    ...options,
                    silent: true // Force silent mode for batch
                })

                results.push(result)

                if (result.success) {
                    successCount++
                } else {
                    failCount++
                    if (!continueOnError) {
                        throw new Error(`Batch print failed at check ${i + 1}: ${result.error}`)
                    }
                }

                // Small delay between prints
                if (i < checksData.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500))
                }
            }

            setPrintStatus(`Batch complete: ${successCount} succeeded, ${failCount} failed`)

            setTimeout(() => {
                setPrintStatus('')
                setIsPrinting(false)
            }, 3000)

            return {
                success: failCount === 0,
                results,
                summary: { total: checksData.length, succeeded: successCount, failed: failCount }
            }

        } catch (error) {
            console.error('Batch print error:', error)
            setPrintError(error.message)
            setPrintStatus('Batch failed')
            setIsPrinting(false)

            return {
                success: false,
                error: error.message,
                results,
                summary: { total: checksData.length, succeeded: successCount, failed: failCount }
            }
        }
    }, [printCheck])

    /**
     * Preview check in new window (for testing)
     */
    const previewCheck = useCallback((checkData, layoutProfile, layout, options = {}) => {
        try {
            const htmlContent = generateCheckHTML(checkData, layoutProfile, layout, options)

            const previewWindow = window.open('', '_blank', 'width=800,height=600')
            if (previewWindow) {
                previewWindow.document.write(htmlContent)
                previewWindow.document.close()
            } else {
                throw new Error('Could not open preview window. Please check your popup blocker.')
            }

            return { success: true }
        } catch (error) {
            console.error('Preview error:', error)
            return { success: false, error: error.message }
        }
    }, [generateCheckHTML])

    /**
     * Cancel ongoing print operation
     */
    const cancelPrint = useCallback(() => {
        setIsPrinting(false)
        setPrintStatus('Cancelled')
        setPrintError(null)

        setTimeout(() => {
            setPrintStatus('')
        }, 1500)
    }, [])

    /**
     * Clear print error
     */
    const clearError = useCallback(() => {
        setPrintError(null)
    }, [])

    return {
        // State
        isPrinting,
        printStatus,
        printError,

        // Functions
        printCheck,
        printBatch,
        previewCheck,
        cancelPrint,
        clearError,

        // Utilities
        generateCheckHTML
    }
}
