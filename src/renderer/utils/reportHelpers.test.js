import { describe, test, expect } from 'vitest'
import {
    generateCheckRegister,
    generateSpendingSummary,
    generateVoidReport,
    getDashboardStats,
    exportReportCSV
} from './reportHelpers'

const sampleChecks = [
    { checkNumber: '1001', payee: 'Acme Corp', amount: '500.00', date: '2025-03-15', status: 'printed', memo: 'supplies', glCode: 'EXP-100' },
    { checkNumber: '1002', payee: 'Rent LLC', amount: '2000.00', date: '2025-03-20', status: 'printed', memo: 'march rent', glCode: 'EXP-200' },
    { checkNumber: '1003', payee: 'Acme Corp', amount: '300.00', date: '2025-04-10', status: 'printed', memo: '', glCode: 'EXP-100' },
    { checkNumber: '1004', payee: 'Office Depot', amount: '150.00', date: '2025-04-15', status: 'void', voidedAt: '2025-04-16', memo: 'voided' },
    { checkNumber: '1005', payee: 'Rent LLC', amount: '2000.00', date: '2025-04-20', status: 'printed', memo: 'april rent', glCode: 'EXP-200' }
]

describe('generateCheckRegister', () => {
    test('returns all checks sorted by date descending', () => {
        const result = generateCheckRegister(sampleChecks)
        expect(result.length).toBe(5)
        expect(result[0].checkNumber).toBe('1005')
        expect(result[4].checkNumber).toBe('1001')
    })

    test('filters by date range', () => {
        const result = generateCheckRegister(sampleChecks, {
            startDate: '2025-04-01',
            endDate: '2025-04-30'
        })
        expect(result.length).toBe(3)
        expect(result.every(c => c.date >= '2025-04-01')).toBe(true)
    })

    test('filters by payee', () => {
        const result = generateCheckRegister(sampleChecks, { payee: 'acme' })
        expect(result.length).toBe(2)
        expect(result.every(c => c.payee === 'Acme Corp')).toBe(true)
    })

    test('filters by status', () => {
        const result = generateCheckRegister(sampleChecks, { status: 'void' })
        expect(result.length).toBe(1)
        expect(result[0].checkNumber).toBe('1004')
    })

    test('general search across fields', () => {
        const result = generateCheckRegister(sampleChecks, { search: 'rent' })
        expect(result.length).toBe(2) // 2 Rent LLC checks (payee match)
    })

    test('handles null input', () => {
        expect(generateCheckRegister(null)).toEqual([])
    })

    test('handles empty filters', () => {
        const result = generateCheckRegister(sampleChecks, {})
        expect(result.length).toBe(5)
    })
})

describe('generateSpendingSummary', () => {
    test('groups by payee', () => {
        const result = generateSpendingSummary(sampleChecks, 'payee', 2025)
        expect(result.length).toBe(2) // Acme, Rent (Office Depot void excluded)
        const rent = result.find(g => g.label === 'Rent LLC')
        expect(rent.count).toBe(2)
        expect(rent.total).toBe(4000)
    })

    test('excludes voided checks', () => {
        const result = generateSpendingSummary(sampleChecks, 'payee', 2025)
        expect(result.find(g => g.label === 'Office Depot')).toBeUndefined()
    })

    test('groups by month', () => {
        const result = generateSpendingSummary(sampleChecks, 'month', 2025)
        expect(result.length).toBe(2) // 2025-03 and 2025-04
        const march = result.find(g => g.label === '2025-03')
        expect(march.count).toBe(2)
        expect(march.total).toBe(2500)
    })

    test('groups by GL code', () => {
        const result = generateSpendingSummary(sampleChecks, 'glCode', 2025)
        const exp100 = result.find(g => g.label === 'EXP-100')
        expect(exp100.count).toBe(2)
        expect(exp100.total).toBe(800)
    })

    test('sorts by total descending', () => {
        const result = generateSpendingSummary(sampleChecks, 'payee', 2025)
        for (let i = 1; i < result.length; i++) {
            expect(result[i - 1].total).toBeGreaterThanOrEqual(result[i].total)
        }
    })

    test('handles null input', () => {
        expect(generateSpendingSummary(null)).toEqual([])
    })
})

describe('generateVoidReport', () => {
    test('returns only voided checks', () => {
        const result = generateVoidReport(sampleChecks)
        expect(result.length).toBe(1)
        expect(result[0].checkNumber).toBe('1004')
    })

    test('returns empty for no voids', () => {
        const checks = sampleChecks.filter(c => c.status !== 'void')
        expect(generateVoidReport(checks)).toEqual([])
    })

    test('handles null input', () => {
        expect(generateVoidReport(null)).toEqual([])
    })
})

describe('getDashboardStats', () => {
    test('calculates totals correctly', () => {
        const stats = getDashboardStats(sampleChecks)
        expect(stats.totalChecks).toBe(5)
        expect(stats.totalAmount).toBe(4800) // excludes void
        expect(stats.voidCount).toBe(1)
        expect(stats.averageAmount).toBe(1200) // 4800 / 4 active checks
    })

    test('returns zeros for empty input', () => {
        const stats = getDashboardStats([])
        expect(stats.totalChecks).toBe(0)
        expect(stats.totalAmount).toBe(0)
        expect(stats.voidCount).toBe(0)
        expect(stats.averageAmount).toBe(0)
    })

    test('handles null input', () => {
        const stats = getDashboardStats(null)
        expect(stats.totalChecks).toBe(0)
    })
})

describe('exportReportCSV', () => {
    test('generates CSV with headers and rows', () => {
        const data = [
            { name: 'Acme', total: 500 },
            { name: 'Rent', total: 2000 }
        ]
        const columns = [
            { key: 'name', label: 'Name' },
            { key: 'total', label: 'Total' }
        ]
        const csv = exportReportCSV(data, columns)
        const lines = csv.split('\n')
        expect(lines[0]).toBe('Name,Total')
        expect(lines.length).toBe(3)
    })

    test('escapes commas in values', () => {
        const data = [{ name: 'Smith, Jones' }]
        const columns = [{ key: 'name', label: 'Name' }]
        const csv = exportReportCSV(data, columns)
        expect(csv).toContain('"Smith, Jones"')
    })

    test('handles null values', () => {
        const data = [{ name: null }]
        const columns = [{ key: 'name', label: 'Name' }]
        const csv = exportReportCSV(data, columns)
        expect(csv.split('\n')[1]).toBe('')
    })
})
