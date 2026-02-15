import { describe, test, expect } from 'vitest'
import { calculate1099Totals, generate1099CSV, fuzzyMatch, validateVendor } from './vendorHelpers'

const sampleVendors = [
    { id: '1', name: 'Acme Corp', is1099Eligible: true, taxId: '12-3456789', email: 'acme@test.com', address: '123 Main', city: 'Dallas', state: 'TX', zip: '75001' },
    { id: '2', name: 'Office Depot', is1099Eligible: true, taxId: '98-7654321', email: '', address: '', city: '', state: '', zip: '' },
    { id: '3', name: 'Internal Services', is1099Eligible: false, taxId: '', email: '', address: '', city: '', state: '', zip: '' },
    { id: '4', name: 'Alpha Beta', is1099Eligible: true, taxId: '', email: '', address: '', city: '', state: '', zip: '' }
]

const sampleChecks = [
    { payee: 'Acme Corp', amount: '500.00', date: '2025-03-15', status: 'printed' },
    { payee: 'Acme Corp', amount: '300.00', date: '2025-06-20', status: 'printed' },
    { payee: 'Acme Corp', amount: '100.00', date: '2025-08-01', status: 'void' },
    { payee: 'Office Depot', amount: '700.00', date: '2025-04-10', status: 'printed' },
    { payee: 'Office Depot', amount: '50.00', date: '2024-12-01', status: 'printed' },
    { payee: 'Alpha Beta', amount: '100.00', date: '2025-02-15', status: 'printed' }
]

describe('calculate1099Totals', () => {
    test('returns eligible vendors above threshold', () => {
        const result = calculate1099Totals(sampleVendors, sampleChecks, 2025, 600)
        expect(result.length).toBe(2)
        expect(result[0].name).toBe('Acme Corp')
        expect(result[0].yearTotal).toBe(800) // 500 + 300, void excluded
        expect(result[1].name).toBe('Office Depot')
        expect(result[1].yearTotal).toBe(700)
    })

    test('excludes vendors below threshold', () => {
        const result = calculate1099Totals(sampleVendors, sampleChecks, 2025, 600)
        expect(result.find(v => v.name === 'Alpha Beta')).toBeUndefined()
    })

    test('excludes non-1099-eligible vendors', () => {
        const result = calculate1099Totals(sampleVendors, sampleChecks, 2025, 0)
        expect(result.find(v => v.name === 'Internal Services')).toBeUndefined()
    })

    test('filters by year', () => {
        const result = calculate1099Totals(sampleVendors, sampleChecks, 2024, 1)
        expect(result.length).toBe(1)
        expect(result[0].name).toBe('Office Depot')
        expect(result[0].yearTotal).toBe(50)
    })

    test('handles null inputs', () => {
        expect(calculate1099Totals(null, sampleChecks, 2025)).toEqual([])
        expect(calculate1099Totals(sampleVendors, null, 2025)).toEqual([])
    })

    test('excludes voided checks', () => {
        const result = calculate1099Totals(sampleVendors, sampleChecks, 2025, 0)
        const acme = result.find(v => v.name === 'Acme Corp')
        expect(acme.yearTotal).toBe(800) // 500 + 300, not 900
    })
})

describe('generate1099CSV', () => {
    test('generates CSV with correct headers', () => {
        const vendors = [{ name: 'Test', taxId: '12-3456789', address: '', city: '', state: '', zip: '', yearTotal: 1000, email: '' }]
        const csv = generate1099CSV(vendors, 2025)
        const lines = csv.split('\n')
        expect(lines[0]).toContain('Vendor Name')
        expect(lines[0]).toContain('2025 Total')
        expect(lines.length).toBe(2)
    })

    test('escapes commas in vendor names', () => {
        const vendors = [{ name: 'Smith, Jones & Co', taxId: '', address: '', city: '', state: '', zip: '', yearTotal: 800, email: '' }]
        const csv = generate1099CSV(vendors, 2025)
        expect(csv).toContain('"Smith, Jones & Co"')
    })

    test('formats amount with two decimal places', () => {
        const vendors = [{ name: 'Test', taxId: '', address: '', city: '', state: '', zip: '', yearTotal: 1500, email: '' }]
        const csv = generate1099CSV(vendors, 2025)
        expect(csv).toContain('1500.00')
    })
})

describe('fuzzyMatch', () => {
    test('exact match scores highest', () => {
        const result = fuzzyMatch('Acme Corp', sampleVendors)
        expect(result[0].name).toBe('Acme Corp')
    })

    test('prefix match ranks above contains', () => {
        const result = fuzzyMatch('Acme', sampleVendors)
        expect(result[0].name).toBe('Acme Corp')
    })

    test('substring match works', () => {
        const result = fuzzyMatch('Depot', sampleVendors)
        expect(result[0].name).toBe('Office Depot')
    })

    test('subsequence match works', () => {
        const result = fuzzyMatch('AcCr', sampleVendors)
        expect(result.length).toBeGreaterThan(0)
        expect(result[0].name).toBe('Acme Corp')
    })

    test('returns empty for no match', () => {
        expect(fuzzyMatch('zzzzz', sampleVendors)).toEqual([])
    })

    test('returns empty for empty query', () => {
        expect(fuzzyMatch('', sampleVendors)).toEqual([])
        expect(fuzzyMatch(null, sampleVendors)).toEqual([])
    })

    test('respects limit parameter', () => {
        const result = fuzzyMatch('a', sampleVendors, 2)
        expect(result.length).toBeLessThanOrEqual(2)
    })
})

describe('validateVendor', () => {
    test('passes valid vendor', () => {
        expect(validateVendor({ name: 'Test Co', email: 'a@b.com', taxId: '12-3456789' })).toEqual([])
    })

    test('requires vendor name', () => {
        const errors = validateVendor({ name: '', email: '' })
        expect(errors).toContain('Vendor name is required')
    })

    test('requires vendor name (whitespace only)', () => {
        const errors = validateVendor({ name: '   ', email: '' })
        expect(errors).toContain('Vendor name is required')
    })

    test('validates email format', () => {
        const errors = validateVendor({ name: 'Test', email: 'not-an-email' })
        expect(errors).toContain('Invalid email address')
    })

    test('skips email validation when empty', () => {
        expect(validateVendor({ name: 'Test', email: '' })).toEqual([])
    })

    test('validates EIN format', () => {
        expect(validateVendor({ name: 'Test', taxId: '12-3456789' })).toEqual([])
    })

    test('validates SSN format', () => {
        expect(validateVendor({ name: 'Test', taxId: '123-45-6789' })).toEqual([])
    })

    test('rejects invalid tax ID', () => {
        const errors = validateVendor({ name: 'Test', taxId: 'abc' })
        expect(errors.length).toBe(1)
        expect(errors[0]).toContain('Tax ID')
    })

    test('skips tax ID validation when empty', () => {
        expect(validateVendor({ name: 'Test', taxId: '' })).toEqual([])
    })
})
