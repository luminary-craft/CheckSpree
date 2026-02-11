import { numberToWords } from './numberToWords'

describe('numberToWords', () => {
  // Basic amounts
  it('converts whole dollar amounts', () => {
    expect(numberToWords('100.00')).toBe('One Hundred and 00/100')
    expect(numberToWords('1.00')).toBe('One and 00/100')
    expect(numberToWords('10.00')).toBe('Ten and 00/100')
    expect(numberToWords('15.00')).toBe('Fifteen and 00/100')
  })

  it('converts amounts with cents', () => {
    expect(numberToWords('0.99')).toBe('Zero and 99/100')
    expect(numberToWords('1.50')).toBe('One and 50/100')
    expect(numberToWords('123.45')).toBe('One Hundred Twenty-Three and 45/100')
  })

  it('converts zero', () => {
    expect(numberToWords('0')).toBe('Zero and 00/100')
    expect(numberToWords('0.00')).toBe('Zero and 00/100')
  })

  // Tens
  it('converts tens correctly', () => {
    expect(numberToWords('20.00')).toBe('Twenty and 00/100')
    expect(numberToWords('30.00')).toBe('Thirty and 00/100')
    expect(numberToWords('99.00')).toBe('Ninety-Nine and 00/100')
  })

  // Hundreds
  it('converts hundreds', () => {
    expect(numberToWords('500.00')).toBe('Five Hundred and 00/100')
    expect(numberToWords('999.00')).toBe('Nine Hundred Ninety-Nine and 00/100')
  })

  // Thousands
  it('converts thousands', () => {
    expect(numberToWords('1000.00')).toBe('One Thousand and 00/100')
    expect(numberToWords('1234.56')).toBe('One Thousand Two Hundred Thirty-Four and 56/100')
    expect(numberToWords('50000.00')).toBe('Fifty Thousand and 00/100')
    expect(numberToWords('999999.00')).toBe('Nine Hundred Ninety-Nine Thousand Nine Hundred Ninety-Nine and 00/100')
  })

  // Millions
  it('converts millions', () => {
    expect(numberToWords('1000000.00')).toBe('One Million and 00/100')
    expect(numberToWords('2500000.00')).toBe('Two Million Five Hundred Thousand and 00/100')
  })

  // Billions
  it('converts billions', () => {
    expect(numberToWords('1000000000.00')).toBe('One Billion and 00/100')
  })

  // Input cleaning
  it('strips dollar signs, commas, and spaces', () => {
    expect(numberToWords('$1,234.56')).toBe('One Thousand Two Hundred Thirty-Four and 56/100')
    expect(numberToWords('$ 1,000.00')).toBe('One Thousand and 00/100')
  })

  // Edge cases
  it('handles negative amounts (uses absolute value)', () => {
    expect(numberToWords('-50.00')).toBe('Fifty and 00/100')
  })

  it('returns empty string for non-numeric input', () => {
    expect(numberToWords('abc')).toBe('')
    expect(numberToWords('not a number')).toBe('')
  })

  it('returns empty string for Infinity', () => {
    expect(numberToWords('Infinity')).toBe('')
  })

  it('handles null and undefined', () => {
    expect(numberToWords(null)).toBe('Zero and 00/100')
    expect(numberToWords(undefined)).toBe('Zero and 00/100')
    expect(numberToWords('')).toBe('Zero and 00/100')
  })

  it('handles numeric input (not just strings)', () => {
    expect(numberToWords(100)).toBe('One Hundred and 00/100')
    expect(numberToWords(0)).toBe('Zero and 00/100')
  })

  // Decimal rounding
  it('rounds cents from extra decimal places', () => {
    expect(numberToWords('123.456')).toBe('One Hundred Twenty-Three and 46/100')
  })

  // Single-digit cents get zero-padded
  it('pads single-digit cents with leading zero', () => {
    expect(numberToWords('10.05')).toBe('Ten and 05/100')
    expect(numberToWords('10.01')).toBe('Ten and 01/100')
  })
})
