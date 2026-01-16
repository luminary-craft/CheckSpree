import React, { useState } from 'react'
import { parseCSV, parseExcel, parseCSVWithMapping, parseExcelWithMapping } from '../utils/helpers'

/**
 * ImportModal Component - File import with column mapping
 * 
 * Features:
 * - CSV and Excel file upload
 * - Automatic column detection
 * - Manual column mapping interface
 * - Preview of imported data
 * - Row editing before import
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal visibility
 * @param {Function} props.onClose - Close modal callback
 * @param {Function} props.onImport - Import data callback: (checksData) => void
 */
export default function ImportModal({ isOpen, onClose, onImport }) {
    const [file, setFile] = useState(null)
    const [fileType, setFileType] = useState('') // 'csv' | 'excel'
    const [fileContent, setFileContent] = useState(null)
    const [headers, setHeaders] = useState([])
    const [previewData, setPreviewData] = useState([])
    const [columnMapping, setColumnMapping] = useState({
        date: '',
        payee: '',
        amount: '',
        memo: '',
        external_memo: '',
        internal_memo: '',
        glCode: '',
        address: '',
        ledger: ''
    })
    const [step, setStep] = useState(1) // 1: Upload, 2: Map Columns, 3: Preview & Edit
    const [editingRow, setEditingRow] = useState(null)
    const [error, setError] = useState(null)

    // Field labels for mapping
    const fieldLabels = {
        date: 'Date',
        payee: 'Payee / Recipient',
        amount: 'Amount',
        memo: 'Memo',
        external_memo: 'External Memo (on check)',
        internal_memo: 'Internal Memo (private)',
        glCode: 'GL Code / Account',
        address: 'Address',
        ledger: 'Ledger / Fund'
    }

    /**
     * Handle file selection
     */
    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0]
        if (!selectedFile) return

        setError(null)
        setFile(selectedFile)

        const ext = selectedFile.name.split('.').pop().toLowerCase()

        if (ext === 'csv') {
            setFileType('csv')
            await processCSVFile(selectedFile)
        } else if (ext === 'xlsx' || ext === 'xls') {
            setFileType('excel')
            await processExcelFile(selectedFile)
        } else {
            setError('Unsupported file type. Please upload CSV or Excel files.')
        }
    }

    /**
     * Process CSV file
     */
    const processCSVFile = async (file) => {
        try {
            const text = await file.text()
            setFileContent({ text, delimiter: ',' })

            // Parse to get headers
            const lines = text.trim().split(/\r?\n/)
            if (lines.length < 2) {
                setError('File appears to be empty or has no data rows')
                return
            }

            const headerRow = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''))
            setHeaders(headerRow)

            // Try automatic parsing
            const parsed = parseCSV(text, ',')
            if (parsed.length > 0) {
                setPreviewData(parsed.slice(0, 10)) // Show first 10 rows
                autoMapColumns(headerRow)
                setStep(2)
            } else {
                setError('Could not parse CSV data')
            }
        } catch (err) {
            setError(`Error reading CSV: ${err.message}`)
        }
    }

    /**
     * Process Excel file
     */
    const processExcelFile = async (file) => {
        try {
            // Read as base64
            const reader = new FileReader()
            reader.onload = async (e) => {
                const base64 = e.target.result.split(',')[1]
                setFileContent({ base64 })

                // Parse Excel (assuming XLSX library is available globally or you need to import it)
                if (!window.XLSX) {
                    setError('Excel parsing library not loaded')
                    return
                }

                const parsed = parseExcel(base64, window.XLSX)
                if (parsed.length > 0) {
                    // Extract headers from first parsed object
                    const firstRow = parsed[0]
                    const headerRow = Object.keys(firstRow)
                    setHeaders(headerRow)
                    setPreviewData(parsed.slice(0, 10))
                    autoMapColumns(headerRow)
                    setStep(2)
                } else {
                    setError('Could not parse Excel data')
                }
            }
            reader.readAsDataURL(file)
        } catch (err) {
            setError(`Error reading Excel: ${err.message}`)
        }
    }

    /**
     * Auto-detect column mapping
     */
    const autoMapColumns = (headers) => {
        const mapping = {}
        const normalizedHeaders = headers.map(h => h.toLowerCase().trim())

        // Common patterns
        const patterns = {
            date: ['date', 'check date', 'checkdate', 'dt'],
            payee: ['payee', 'pay to', 'payto', 'recipient', 'name', 'to'],
            amount: ['amount', 'amt', 'value', 'check amount', 'sum', 'total'],
            memo: ['memo', 'description', 'desc', 'note', 'notes', 'for'],
            external_memo: ['external memo', 'public memo', 'payee memo'],
            internal_memo: ['internal memo', 'private memo', 'admin memo'],
            glCode: ['gl code', 'glcode', 'gl', 'account code'],
            address: ['address', 'addr', 'recipient address'],
            ledger: ['ledger', 'account', 'fund', 'ledger name']
        }

        Object.keys(patterns).forEach(field => {
            const matchIdx = normalizedHeaders.findIndex(h =>
                patterns[field].some(p => h.includes(p))
            )
            if (matchIdx !== -1) {
                mapping[field] = headers[matchIdx]
            }
        })

        setColumnMapping(prev => ({ ...prev, ...mapping }))
    }

    /**
     * Update column mapping
     */
    const handleMappingChange = (field, header) => {
        setColumnMapping(prev => ({ ...prev, [field]: header }))
    }

    /**
     * Process with current mapping
     */
    const handleProcessMapping = () => {
        try {
            let processedData

            if (fileType === 'csv') {
                processedData = parseCSVWithMapping(
                    fileContent.text,
                    fileContent.delimiter,
                    columnMapping
                )
            } else if (fileType === 'excel') {
                processedData = parseExcelWithMapping(
                    fileContent.base64,
                    columnMapping,
                    window.XLSX
                )
            }

            setPreviewData(processedData)
            setStep(3)
        } catch (err) {
            setError(`Error processing data: ${err.message}`)
        }
    }

    /**
     * Handle row edit
     */
    const handleEditRow = (index, field, value) => {
        setPreviewData(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], [field]: value }
            return updated
        })
    }

    /**
     * Handle import confirmation
     */
    const handleConfirmImport = () => {
        onImport(previewData)
        handleReset()
        onClose()
    }

    /**
     * Reset modal state
     */
    const handleReset = () => {
        setFile(null)
        setFileType('')
        setFileContent(null)
        setHeaders([])
        setPreviewData([])
        setColumnMapping({
            date: '',
            payee: '',
            amount: '',
            memo: '',
            external_memo: '',
            internal_memo: '',
            glCode: '',
            address: '',
            ledger: ''
        })
        setStep(1)
        setEditingRow(null)
        setError(null)
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <h2>Import Checks from File</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Step 1: File Upload */}
                    {step === 1 && (
                        <div className="import-upload">
                            <p style={{ marginBottom: '16px', color: '#94a3b8' }}>
                                Upload a CSV or Excel file containing check data. The file should include columns for payee, amount, date, etc.
                            </p>

                            <div className="file-upload-area">
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileSelect}
                                    style={{ marginBottom: '12px' }}
                                />

                                {file && (
                                    <div style={{ fontSize: '13px', color: '#10b981', marginTop: '8px' }}>
                                        ✓ {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="error-message" style={{ marginTop: '16px', padding: '12px', background: '#7f1d1d', borderRadius: '6px', color: '#fca5a5' }}>
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Column Mapping */}
                    {step === 2 && (
                        <div className="import-mapping">
                            <p style={{ marginBottom: '16px', color: '#94a3b8' }}>
                                Map the columns from your file to check fields. Auto-detected mappings are pre-filled.
                            </p>

                            <div className="mapping-grid" style={{ display: 'grid', gap: '12px' }}>
                                {Object.entries(fieldLabels).map(([field, label]) => (
                                    <div key={field} className="mapping-row" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <label style={{ flex: '0 0 180px', fontSize: '13px' }}>{label}</label>
                                        <select
                                            value={columnMapping[field]}
                                            onChange={(e) => handleMappingChange(field, e.target.value)}
                                            style={{ flex: 1 }}
                                        >
                                            <option value="">-- Not Mapped --</option>
                                            {headers.map(header => (
                                                <option key={header} value={header}>{header}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Preview & Edit */}
                    {step === 3 && (
                        <div className="import-preview">
                            <p style={{ marginBottom: '16px', color: '#94a3b8' }}>
                                Preview the imported data. Click any cell to edit before importing.
                            </p>

                            <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 }}>
                                        <tr>
                                            <th style={{ padding: '8px', borderBottom: '1px solid #475569', textAlign: 'left' }}>Date</th>
                                            <th style={{ padding: '8px', borderBottom: '1px solid #475569', textAlign: 'left' }}>Payee</th>
                                            <th style={{ padding: '8px', borderBottom: '1px solid #475569', textAlign: 'right' }}>Amount</th>
                                            <th style={{ padding: '8px', borderBottom: '1px solid #475569', textAlign: 'left' }}>Memo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.map((row, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                                                <td style={{ padding: '8px' }}>
                                                    <input
                                                        type="text"
                                                        value={row.date || ''}
                                                        onChange={(e) => handleEditRow(idx, 'date', e.target.value)}
                                                        style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit', fontSize: '12px' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <input
                                                        type="text"
                                                        value={row.payee || ''}
                                                        onChange={(e) => handleEditRow(idx, 'payee', e.target.value)}
                                                        style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit', fontSize: '12px' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'right' }}>
                                                    <input
                                                        type="text"
                                                        value={row.amount || ''}
                                                        onChange={(e) => handleEditRow(idx, 'amount', e.target.value)}
                                                        style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit', fontSize: '12px', textAlign: 'right' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <input
                                                        type="text"
                                                        value={row.memo || ''}
                                                        onChange={(e) => handleEditRow(idx, 'memo', e.target.value)}
                                                        style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit', fontSize: '12px' }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
                                Showing {previewData.length} rows
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    {step > 1 && (
                        <button className="btn ghost" onClick={() => setStep(step - 1)}>
                            Back
                        </button>
                    )}

                    <button className="btn ghost" onClick={handleReset}>
                        Reset
                    </button>

                    {step === 2 && (
                        <button className="btn primary" onClick={handleProcessMapping}>
                            Next: Preview
                        </button>
                    )}

                    {step === 3 && (
                        <button className="btn primary" onClick={handleConfirmImport}>
                            Import {previewData.length} Checks
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
