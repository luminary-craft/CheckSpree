import { filterHistoryByLedger, filterAndSortHistory, getUniqueFilterValues } from './historyHelpers'

const makeEntry = (overrides = {}) => ({
  id: Math.random().toString(36).slice(2),
  type: 'check',
  date: '2026-01-15',
  payee: 'Acme Corp',
  amount: 100,
  memo: '',
  ledgerId: 'default',
  glCode: '',
  glDescription: '',
  checkNumber: '1001',
  timestamp: Date.now(),
  ...overrides
})

describe('filterHistoryByLedger', () => {
  const entries = [
    makeEntry({ ledgerId: 'ledger-a' }),
    makeEntry({ ledgerId: 'ledger-b' }),
    makeEntry({ ledgerId: 'ledger-a' }),
    makeEntry({ ledgerId: 'default' }),
  ]

  it('returns all entries in "all" mode', () => {
    expect(filterHistoryByLedger(entries, 'all', 'ledger-a')).toHaveLength(4)
  })

  it('filters by activeLedgerId in "current" mode', () => {
    const result = filterHistoryByLedger(entries, 'current', 'ledger-a')
    expect(result).toHaveLength(2)
    expect(result.every(e => e.ledgerId === 'ledger-a')).toBe(true)
  })

  it('returns empty array when no entries match', () => {
    expect(filterHistoryByLedger(entries, 'current', 'nonexistent')).toHaveLength(0)
  })

  it('handles empty array', () => {
    expect(filterHistoryByLedger([], 'all', 'x')).toHaveLength(0)
    expect(filterHistoryByLedger([], 'current', 'x')).toHaveLength(0)
  })

  it('handles non-array input', () => {
    expect(filterHistoryByLedger(null, 'all', 'x')).toEqual([])
    expect(filterHistoryByLedger(undefined, 'current', 'x')).toEqual([])
  })

  it('excludes entries without ledgerId in current mode', () => {
    const withMissing = [...entries, makeEntry({ ledgerId: undefined })]
    const result = filterHistoryByLedger(withMissing, 'current', 'ledger-a')
    expect(result).toHaveLength(2)
  })
})

describe('filterAndSortHistory', () => {
  const entries = [
    makeEntry({ payee: 'Acme Corp', amount: 500, glCode: 'GL-100', glDescription: 'Office', memo: 'supplies', checkNumber: '1001', date: '2026-01-10', timestamp: 100 }),
    makeEntry({ payee: 'Beta LLC', amount: 200, glCode: 'GL-200', glDescription: 'Travel', memo: 'flight', checkNumber: '1002', date: '2026-01-15', timestamp: 200 }),
    makeEntry({ payee: 'Acme Corp', amount: 300, glCode: 'GL-100', glDescription: 'Office', memo: 'paper', checkNumber: '1003', date: '2026-01-20', timestamp: 300 }),
    makeEntry({ payee: 'Charlie Inc', amount: 150, glCode: '', memo: '', checkNumber: '1004', date: '2026-01-20', timestamp: 400 }),
  ]

  describe('search filtering', () => {
    it('searches by payee', () => {
      const result = filterAndSortHistory(entries, { searchTerm: 'acme' })
      expect(result).toHaveLength(2)
    })

    it('searches by memo', () => {
      const result = filterAndSortHistory(entries, { searchTerm: 'flight' })
      expect(result).toHaveLength(1)
      expect(result[0].payee).toBe('Beta LLC')
    })

    it('searches by amount', () => {
      const result = filterAndSortHistory(entries, { searchTerm: '500' })
      expect(result).toHaveLength(1)
    })

    it('searches by check number', () => {
      const result = filterAndSortHistory(entries, { searchTerm: '1003' })
      expect(result).toHaveLength(1)
    })

    it('searches by GL code', () => {
      const result = filterAndSortHistory(entries, { searchTerm: 'GL-200' })
      expect(result).toHaveLength(1)
    })

    it('searches by GL description', () => {
      const result = filterAndSortHistory(entries, { searchTerm: 'travel' })
      expect(result).toHaveLength(1)
    })

    it('returns all when searchTerm is empty', () => {
      const result = filterAndSortHistory(entries, { searchTerm: '' })
      expect(result).toHaveLength(4)
    })

    it('returns empty when no match', () => {
      const result = filterAndSortHistory(entries, { searchTerm: 'zzzzz' })
      expect(result).toHaveLength(0)
    })
  })

  describe('GL code filtering', () => {
    it('filters by specific GL code', () => {
      const result = filterAndSortHistory(entries, { glCodeFilter: 'GL-100' })
      expect(result).toHaveLength(2)
    })

    it('returns all when glCodeFilter is "all"', () => {
      const result = filterAndSortHistory(entries, { glCodeFilter: 'all' })
      expect(result).toHaveLength(4)
    })
  })

  describe('vendor filtering', () => {
    it('filters by specific vendor/payee', () => {
      const result = filterAndSortHistory(entries, { vendorFilter: 'Acme Corp' })
      expect(result).toHaveLength(2)
    })

    it('returns all when vendorFilter is "all"', () => {
      const result = filterAndSortHistory(entries, { vendorFilter: 'all' })
      expect(result).toHaveLength(4)
    })

    it('returns empty when vendor not found', () => {
      const result = filterAndSortHistory(entries, { vendorFilter: 'Nonexistent' })
      expect(result).toHaveLength(0)
    })
  })

  describe('combined filters', () => {
    it('applies GL code + vendor filter together', () => {
      const result = filterAndSortHistory(entries, { glCodeFilter: 'GL-100', vendorFilter: 'Acme Corp' })
      expect(result).toHaveLength(2)
    })

    it('applies search + vendor filter together', () => {
      const result = filterAndSortHistory(entries, { searchTerm: 'supplies', vendorFilter: 'Acme Corp' })
      expect(result).toHaveLength(1)
    })

    it('applies all filters together', () => {
      const result = filterAndSortHistory(entries, { searchTerm: 'paper', glCodeFilter: 'GL-100', vendorFilter: 'Acme Corp' })
      expect(result).toHaveLength(1)
      expect(result[0].memo).toBe('paper')
    })
  })

  describe('sorting', () => {
    it('sorts date-desc (default)', () => {
      const result = filterAndSortHistory(entries, { sortOrder: 'date-desc' })
      expect(result[0].timestamp).toBe(400) // Latest first
      expect(result[3].timestamp).toBe(100)
    })

    it('sorts date-asc', () => {
      const result = filterAndSortHistory(entries, { sortOrder: 'date-asc' })
      expect(result[0].timestamp).toBe(100)
      expect(result[3].timestamp).toBe(400)
    })

    it('sorts amount-desc', () => {
      const result = filterAndSortHistory(entries, { sortOrder: 'amount-desc' })
      expect(result[0].amount).toBe(500)
      expect(result[3].amount).toBe(150)
    })

    it('sorts amount-asc', () => {
      const result = filterAndSortHistory(entries, { sortOrder: 'amount-asc' })
      expect(result[0].amount).toBe(150)
      expect(result[3].amount).toBe(500)
    })

    it('sorts payee-asc', () => {
      const result = filterAndSortHistory(entries, { sortOrder: 'payee-asc' })
      expect(result[0].payee).toBe('Acme Corp')
      expect(result[3].payee).toBe('Charlie Inc')
    })

    it('breaks date ties by timestamp', () => {
      const result = filterAndSortHistory(entries, { sortOrder: 'date-desc' })
      // Two entries share date 2026-01-20; timestamp 400 should come before 300
      expect(result[0].timestamp).toBe(400)
      expect(result[1].timestamp).toBe(300)
    })
  })

  describe('edge cases', () => {
    it('handles empty array', () => {
      expect(filterAndSortHistory([], {})).toEqual([])
    })

    it('handles non-array input', () => {
      expect(filterAndSortHistory(null)).toEqual([])
    })

    it('handles entries with undefined fields', () => {
      const sparse = [makeEntry({ payee: undefined, memo: undefined, amount: undefined, glCode: undefined })]
      expect(() => filterAndSortHistory(sparse, { searchTerm: 'test' })).not.toThrow()
      expect(filterAndSortHistory(sparse, { searchTerm: 'test' })).toHaveLength(0)
    })

    it('uses default options when none provided', () => {
      const result = filterAndSortHistory(entries)
      expect(result).toHaveLength(4)
    })
  })
})

describe('getUniqueFilterValues', () => {
  const entries = [
    makeEntry({ glCode: 'GL-100', payee: 'Acme Corp' }),
    makeEntry({ glCode: 'GL-200', payee: 'Beta LLC' }),
    makeEntry({ glCode: 'GL-100', payee: 'Acme Corp' }),
    makeEntry({ glCode: '', payee: 'Charlie Inc' }),
    makeEntry({ glCode: undefined, payee: undefined }),
  ]

  it('extracts unique GL codes, skipping empty/null', () => {
    const result = getUniqueFilterValues(entries, 'glCode')
    expect(result).toEqual(['GL-100', 'GL-200'])
  })

  it('extracts unique payees, skipping empty/null', () => {
    const result = getUniqueFilterValues(entries, 'payee')
    expect(result).toEqual(['Acme Corp', 'Beta LLC', 'Charlie Inc'])
  })

  it('returns sorted values', () => {
    const result = getUniqueFilterValues(entries, 'payee')
    expect(result).toEqual([...result].sort())
  })

  it('handles empty array', () => {
    expect(getUniqueFilterValues([], 'glCode')).toEqual([])
  })

  it('handles non-array input', () => {
    expect(getUniqueFilterValues(null, 'glCode')).toEqual([])
  })

  it('handles field that does not exist on entries', () => {
    expect(getUniqueFilterValues(entries, 'nonexistentField')).toEqual([])
  })
})
