import { generateId, formatCurrency, sanitizeCurrencyInput } from './helpers'

describe('generateId', () => {
  it('returns a non-empty string', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('generates unique IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })
})

describe('formatCurrency', () => {
  it('formats positive amounts', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
    expect(formatCurrency(0)).toBe('$0.00')
    expect(formatCurrency(1)).toBe('$1.00')
  })

  it('formats negative amounts', () => {
    expect(formatCurrency(-50)).toBe('-$50.00')
  })

  it('formats large amounts with commas', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00')
  })

  it('rounds to two decimal places', () => {
    expect(formatCurrency(10.999)).toBe('$11.00')
    expect(formatCurrency(10.005)).toBe('$10.01')
  })
})

describe('sanitizeCurrencyInput', () => {
  it('strips dollar signs and commas', () => {
    expect(sanitizeCurrencyInput('$1,234.56')).toBe(1234.56)
  })

  it('strips spaces', () => {
    expect(sanitizeCurrencyInput('$ 100.00')).toBe(100.00)
  })

  it('returns 0 for empty/null/undefined', () => {
    expect(sanitizeCurrencyInput('')).toBe(0)
    expect(sanitizeCurrencyInput(null)).toBe(0)
    expect(sanitizeCurrencyInput(undefined)).toBe(0)
  })

  it('returns 0 for non-numeric strings', () => {
    expect(sanitizeCurrencyInput('abc')).toBe(0)
    expect(sanitizeCurrencyInput('$')).toBe(0)
  })

  it('handles plain numbers', () => {
    expect(sanitizeCurrencyInput('100')).toBe(100)
    expect(sanitizeCurrencyInput('99.99')).toBe(99.99)
  })

  it('handles numeric input', () => {
    expect(sanitizeCurrencyInput(42)).toBe(42)
    expect(sanitizeCurrencyInput(0)).toBe(0)
  })
})
