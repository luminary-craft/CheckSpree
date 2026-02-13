import { describe, test, expect } from 'vitest'
import {
    generatePositivePayCSV,
    generatePositivePayFixedWidth,
    filterChecksByDateRange,
    getCheckSummary
} from './positivePayExport'

// Sample check history data for testing
const sampleChecks = [
    {
        checkNumber: '1001',
        date: '2026-01-15',
        amount: '1500.00',
        payee: 'Acme Corp',
        status: 'printed',
        printedAt: '2026-01-15T10:00:00Z'
    },
    {
        checkNumber: '1002',
        date: '2026-01-20',
        amount: '250.75',
        payee: 'Office Supplies, Inc.',
        status: 'printed',
        printedAt: '2026-01-20T14:30:00Z'
    },
    {
        checkNumber: '1003',
        date: '2026-02-01',
        amount: '3200.00',
        payee: 'Rent LLC',
        status: 'void',
        printedAt: '2026-02-01T09:00:00Z'
    }
]

describe('generatePositivePayCSV', () => {
    test('generates valid CSV with headers', () => {
        const csv = generatePositivePayCSV(sampleChecks)
        const lines = csv.split('\n')
        expect(lines[0]).toBe('Check Number,Date,Amount,Payee,Status')
        expect(lines.length).toBe(3) // header + 2 non-voided checks
    })

    test('excludes voided checks by default', () => {
        const csv = generatePositivePayCSV(sampleChecks)
        expect(csv).not.toContain('VOID')
        expect(csv).not.toContain('1003')
    })

    test('includes voided checks when option is set', () => {
        const csv = generatePositivePayCSV(sampleChecks, { includeVoided: true })
        const lines = csv.split('\n')
        expect(lines.length).toBe(4) // header + 3 checks
        expect(csv).toContain('VOID')
    })

    test('includes account number column when provided', () => {
        const csv = generatePositivePayCSV(sampleChecks, { accountNumber: '123456789' })
        const header = csv.split('\n')[0]
        expect(header).toContain('Account Number')
        const dataLine = csv.split('\n')[1]
        expect(dataLine).toContain('123456789')
    })

    test('escapes CSV fields with commas', () => {
        const csv = generatePositivePayCSV(sampleChecks)
        // "Office Supplies, Inc." should be quoted because it contains a comma
        expect(csv).toContain('"Office Supplies, Inc."')
    })

    test('formats amounts with two decimal places', () => {
        const csv = generatePositivePayCSV(sampleChecks)
        expect(csv).toContain('1500.00')
        expect(csv).toContain('250.75')
    })

    test('handles empty check array', () => {
        const csv = generatePositivePayCSV([])
        const lines = csv.split('\n')
        expect(lines.length).toBe(1) // header only
    })
})

describe('generatePositivePayFixedWidth', () => {
    test('generates fixed-width lines with correct field lengths', () => {
        const output = generatePositivePayFixedWidth(sampleChecks)
        const lines = output.split('\n')
        expect(lines.length).toBe(2) // 2 non-voided checks

        // Each line should have consistent length (10 + 8 + 12 + 40 + 6 = 76)
        const firstLine = lines[0]
        expect(firstLine.length).toBe(76)
    })

    test('right-justifies check number with leading zeros', () => {
        const output = generatePositivePayFixedWidth(sampleChecks)
        const firstLine = output.split('\n')[0]
        expect(firstLine.substring(0, 10)).toBe('0000001001')
    })

    test('formats amount in cents, right-justified', () => {
        const output = generatePositivePayFixedWidth(sampleChecks)
        const firstLine = output.split('\n')[0]
        // Amount field is chars 18-29 (10 checkNum + 8 date = 18, then 12 amount)
        const amount = firstLine.substring(18, 30)
        expect(amount).toBe('000000150000') // 1500.00 = 150000 cents
    })

    test('prepends account number when provided', () => {
        const output = generatePositivePayFixedWidth(sampleChecks, { accountNumber: '12345' })
        const firstLine = output.split('\n')[0]
        expect(firstLine.startsWith('12345')).toBe(true)
    })
})

describe('filterChecksByDateRange', () => {
    test('filters checks within date range', () => {
        const result = filterChecksByDateRange(sampleChecks, '2026-01-10', '2026-01-25')
        expect(result.length).toBe(2)
    })

    test('returns empty array for empty input', () => {
        expect(filterChecksByDateRange([], '2026-01-01', '2026-12-31')).toEqual([])
        expect(filterChecksByDateRange(null, '2026-01-01', '2026-12-31')).toEqual([])
    })

    test('handles open-ended date ranges', () => {
        // No start date — returns all before end
        const result = filterChecksByDateRange(sampleChecks, null, '2026-01-20')
        expect(result.length).toBe(2) // 1001 and 1002
    })
})

describe('getCheckSummary', () => {
    test('calculates correct count and total', () => {
        const summary = getCheckSummary(sampleChecks)
        expect(summary.count).toBe(3)
        expect(summary.totalAmount).toBeCloseTo(4950.75)
    })

    test('returns zeroed summary for empty array', () => {
        const summary = getCheckSummary([])
        expect(summary.count).toBe(0)
        expect(summary.totalAmount).toBe(0)
        expect(summary.dateRange.start).toBeNull()
        expect(summary.dateRange.end).toBeNull()
    })

    test('handles null input', () => {
        const summary = getCheckSummary(null)
        expect(summary.count).toBe(0)
    })
})
