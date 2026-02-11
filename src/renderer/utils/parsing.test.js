import { convertExcelDate, parseCSV, autoDetectMapping, extractHeaders } from './parsing'

describe('convertExcelDate', () => {
  it('passes through YYYY-MM-DD strings unchanged', () => {
    expect(convertExcelDate('2025-01-15')).toBe('2025-01-15')
    expect(convertExcelDate('2000-12-31')).toBe('2000-12-31')
  })

  it('parses common date string formats', () => {
    // "Jan 15, 2025" -> ISO date
    const result = convertExcelDate('Jan 15, 2025')
    expect(result).toBe('2025-01-15')
  })

  it('converts Excel serial date numbers', () => {
    // Excel serial 44927 = 2023-01-01 (approx)
    const result = convertExcelDate(44927)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('converts Date objects', () => {
    const d = new Date(2025, 5, 15) // June 15, 2025
    expect(convertExcelDate(d)).toBe('2025-06-15')
  })

  it('falls back to current date for invalid values', () => {
    // Invalid strings that can't be parsed fall back to today
    const result = convertExcelDate('not-a-date')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('parseCSV', () => {
  it('parses simple CSV with standard headers', () => {
    const csv = `Date,Payee,Amount,Memo\n2025-01-15,John Doe,100.00,Office supplies`
    const result = parseCSV(csv)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      date: '2025-01-15',
      payee: 'John Doe',
      amount: '100.00',
      memo: 'Office supplies',
      external_memo: '',
      internal_memo: '',
      ledger: '',
      glCode: '',
      glDescription: ''
    })
  })

  it('handles multiple rows', () => {
    const csv = `Payee,Amount\nAlice,50.00\nBob,75.00\nCharlie,100.00`
    const result = parseCSV(csv)
    expect(result).toHaveLength(3)
    expect(result[0].payee).toBe('Alice')
    expect(result[2].amount).toBe('100.00')
  })

  it('skips rows without payee or amount', () => {
    const csv = `Payee,Amount,Memo\n,,Just a memo\nAlice,50.00,`
    const result = parseCSV(csv)
    expect(result).toHaveLength(1)
    expect(result[0].payee).toBe('Alice')
  })

  it('strips dollar signs and commas from amounts', () => {
    const csv = `Payee,Amount\nAlice,"$1,234.56"`
    const result = parseCSV(csv)
    expect(result[0].amount).toBe('1234.56')
  })

  it('handles quoted fields with commas', () => {
    const csv = `Payee,Amount,Memo\n"Smith, John",100.00,"For rent, January"`
    const result = parseCSV(csv)
    expect(result[0].payee).toBe('Smith, John')
    expect(result[0].memo).toBe('For rent, January')
  })

  it('handles header variations (case-insensitive)', () => {
    const csv = `NAME,AMT,DESC\nAlice,50.00,Test`
    const result = parseCSV(csv)
    expect(result[0].payee).toBe('Alice')
    expect(result[0].amount).toBe('50.00')
    expect(result[0].memo).toBe('Test')
  })

  it('returns empty array for single-line input (no data rows)', () => {
    expect(parseCSV('Payee,Amount')).toEqual([])
  })

  it('returns empty array for empty input', () => {
    expect(parseCSV('')).toEqual([])
  })

  it('handles Windows-style line endings', () => {
    const csv = "Payee,Amount\r\nAlice,50.00\r\nBob,75.00"
    const result = parseCSV(csv)
    expect(result).toHaveLength(2)
  })

  it('supports tab delimiter', () => {
    const csv = "Payee\tAmount\nAlice\t50.00"
    const result = parseCSV(csv, '\t')
    expect(result[0].payee).toBe('Alice')
    expect(result[0].amount).toBe('50.00')
  })

  it('maps GL code and description headers', () => {
    const csv = `Payee,Amount,GL Code,GL Description\nAlice,50.00,4100,Office Expenses`
    const result = parseCSV(csv)
    expect(result[0].glCode).toBe('4100')
    expect(result[0].glDescription).toBe('Office Expenses')
  })
})

describe('autoDetectMapping', () => {
  it('detects standard headers', () => {
    const headers = ['Date', 'Payee', 'Amount', 'Memo']
    const mapping = autoDetectMapping(headers)
    expect(mapping.date).toBe('Date')
    expect(mapping.payee).toBe('Payee')
    expect(mapping.amount).toBe('Amount')
    expect(mapping.memo).toBe('Memo')
  })

  it('detects header variations', () => {
    const headers = ['Check Date', 'Pay To', 'Amt', 'Description']
    const mapping = autoDetectMapping(headers)
    expect(mapping.date).toBe('Check Date')
    expect(mapping.payee).toBe('Pay To')
    expect(mapping.amount).toBe('Amt')
    expect(mapping.memo).toBe('Description')
  })

  it('detects vendor as payee', () => {
    const headers = ['Date', 'Vendor', 'Total']
    const mapping = autoDetectMapping(headers)
    expect(mapping.payee).toBe('Vendor')
    expect(mapping.amount).toBe('Total')
  })

  it('detects address field', () => {
    const headers = ['Payee', 'Address', 'Amount']
    const mapping = autoDetectMapping(headers)
    expect(mapping.address).toBe('Address')
  })

  it('returns empty strings for unmatched fields', () => {
    const headers = ['Column A', 'Column B']
    const mapping = autoDetectMapping(headers)
    expect(mapping.date).toBe('')
    expect(mapping.payee).toBe('')
    expect(mapping.amount).toBe('')
  })

  it('preserves original header casing', () => {
    const headers = ['DATE', 'PAYEE', 'AMOUNT']
    // These won't match because the variations are lowercase
    // "DATE" !== "date" in strict comparison, but autoDetect lowercases
    const mapping = autoDetectMapping(headers)
    // The mapping returns the original case header
    expect(mapping.date).toBe('DATE')
    expect(mapping.payee).toBe('PAYEE')
    expect(mapping.amount).toBe('AMOUNT')
  })
})

describe('extractHeaders', () => {
  it('extracts CSV headers', () => {
    const csv = 'Date,Payee,Amount\n2025-01-01,Alice,100'
    const headers = extractHeaders(csv, 'csv')
    expect(headers).toEqual(['Date', 'Payee', 'Amount'])
  })

  it('handles .csv extension with dot', () => {
    const csv = 'Date,Payee\n2025-01-01,Alice'
    const headers = extractHeaders(csv, '.csv')
    expect(headers).toEqual(['Date', 'Payee'])
  })

  it('extracts TSV headers with tab delimiter', () => {
    const tsv = "Date\tPayee\tAmount\n2025-01-01\tAlice\t100"
    const headers = extractHeaders(tsv, 'tsv')
    expect(headers).toEqual(['Date', 'Payee', 'Amount'])
  })

  it('strips quotes from headers', () => {
    const csv = '"Date","Payee","Amount"\n2025-01-01,Alice,100'
    const headers = extractHeaders(csv, 'csv')
    expect(headers).toEqual(['Date', 'Payee', 'Amount'])
  })

  it('returns empty array for empty content', () => {
    expect(extractHeaders('', 'csv')).toEqual([])
  })

  it('returns empty array for unknown extension', () => {
    expect(extractHeaders('some data', 'json')).toEqual([])
  })
})
