import {
  clamp, roundTo, calculateBaseYForSection,
  formatAmountForDisplay, formatDate, formatDateByPreference,
  formatLineItems, formatLedgerSnapshot, getDateRangeForFilter,
  normalizeModel, DEFAULT_LAYOUT, DEFAULT_FIELDS, DEFAULT_MODEL
} from './defaults'

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('clamps to min when below', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('clamps to max when above', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('returns min when equal to min', () => {
    expect(clamp(0, 0, 10)).toBe(0)
  })

  it('returns max when equal to max', () => {
    expect(clamp(10, 0, 10)).toBe(10)
  })
})

describe('roundTo', () => {
  it('rounds to step increments', () => {
    expect(roundTo(0.13, 0.125)).toBeCloseTo(0.125)
    expect(roundTo(0.19, 0.125)).toBeCloseTo(0.25)
  })

  it('rounds to whole numbers when step is 1', () => {
    expect(roundTo(3.7, 1)).toBe(4)
    expect(roundTo(3.2, 1)).toBe(3)
  })

  it('handles step of 0 (defaults to 1)', () => {
    expect(roundTo(3.7, 0)).toBe(4)
  })
})

describe('calculateBaseYForSection', () => {
  const layout = {
    checkHeightIn: 3.0,
    stub1Enabled: true,
    stub1HeightIn: 3.0,
    stub2Enabled: true,
    stub2HeightIn: 3.0,
    sectionOrder: ['check', 'stub1', 'stub2']
  }

  it('returns 0 for the first section', () => {
    expect(calculateBaseYForSection('check', layout)).toBe(0)
  })

  it('stacks sections correctly', () => {
    expect(calculateBaseYForSection('stub1', layout)).toBe(3.0)
    expect(calculateBaseYForSection('stub2', layout)).toBe(6.0)
  })

  it('skips disabled stubs', () => {
    const layoutDisabled = { ...layout, stub1Enabled: false }
    expect(calculateBaseYForSection('stub2', layoutDisabled)).toBe(3.0)
  })

  it('handles custom section order', () => {
    const reversed = { ...layout, sectionOrder: ['stub2', 'stub1', 'check'] }
    expect(calculateBaseYForSection('stub2', reversed)).toBe(0)
    expect(calculateBaseYForSection('stub1', reversed)).toBe(3.0)
    expect(calculateBaseYForSection('check', reversed)).toBe(6.0)
  })

  it('defaults to standard order when sectionOrder is missing', () => {
    const noOrder = { ...layout }
    delete noOrder.sectionOrder
    expect(calculateBaseYForSection('check', noOrder)).toBe(0)
    expect(calculateBaseYForSection('stub1', noOrder)).toBe(3.0)
  })
})

describe('formatAmountForDisplay', () => {
  it('formats numbers to 2 decimal places', () => {
    expect(formatAmountForDisplay(100)).toBe('100.00')
    expect(formatAmountForDisplay('$1,234.5')).toBe('1234.50')
  })

  it('handles zero and empty', () => {
    expect(formatAmountForDisplay(0)).toBe('0.00')
    expect(formatAmountForDisplay('')).toBe('0.00')
  })
})

describe('formatDate', () => {
  it('formats date string to readable format', () => {
    // Use toLocaleDateString to get expected output (avoids timezone issues)
    const expected = new Date('2025-01-15').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    expect(formatDate('2025-01-15')).toBe(expected)
  })

  it('returns empty string for empty input', () => {
    expect(formatDate('')).toBe('')
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
  })
})

describe('formatDateByPreference', () => {
  const defaultPrefs = {
    dateSlot1: 'MM',
    dateSlot2: 'DD',
    dateSlot3: 'YYYY',
    dateSeparator: '/',
    useLongDate: false
  }

  it('formats MM/DD/YYYY by default', () => {
    expect(formatDateByPreference('2025-01-15', defaultPrefs)).toBe('01/15/2025')
  })

  it('supports DD/MM/YYYY order', () => {
    const prefs = { ...defaultPrefs, dateSlot1: 'DD', dateSlot2: 'MM' }
    expect(formatDateByPreference('2025-01-15', prefs)).toBe('15/01/2025')
  })

  it('supports dash separator', () => {
    const prefs = { ...defaultPrefs, dateSeparator: '-' }
    expect(formatDateByPreference('2025-01-15', prefs)).toBe('01-15-2025')
  })

  it('supports 2-digit year', () => {
    const prefs = { ...defaultPrefs, dateSlot3: 'YY' }
    expect(formatDateByPreference('2025-01-15', prefs)).toBe('01/15/25')
  })

  it('supports long date format', () => {
    const prefs = { ...defaultPrefs, useLongDate: true }
    const result = formatDateByPreference('2025-01-15', prefs)
    expect(result).toMatch(/January/)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/2025/)
  })

  it('handles empty separator', () => {
    const prefs = { ...defaultPrefs, dateSeparator: 'Empty' }
    expect(formatDateByPreference('2025-01-15', prefs)).toBe('01152025')
  })

  it('skips empty slots', () => {
    const prefs = { ...defaultPrefs, dateSlot3: 'Empty' }
    expect(formatDateByPreference('2025-01-15', prefs)).toBe('01/15')
  })

  it('returns empty string for empty input', () => {
    expect(formatDateByPreference('', defaultPrefs)).toBe('')
    expect(formatDateByPreference(null, defaultPrefs)).toBe('')
  })

  it('returns empty string for invalid date', () => {
    expect(formatDateByPreference('not-a-date', defaultPrefs)).toBe('')
  })
})

describe('formatLineItems', () => {
  it('formats a single line item', () => {
    const items = [{ description: 'Office supplies', amount: '50.00' }]
    const result = formatLineItems(items)
    expect(result).toContain('1. Office supplies')
    expect(result).toContain('$50.00')
  })

  it('formats multiple line items', () => {
    const items = [
      { description: 'Item A', amount: '10.00' },
      { description: 'Item B', amount: '20.00' }
    ]
    const result = formatLineItems(items)
    expect(result).toContain('1. Item A')
    expect(result).toContain('2. Item B')
  })

  it('truncates beyond maxLines and shows count', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      description: `Item ${i + 1}`,
      amount: '10.00'
    }))
    const result = formatLineItems(items, 5)
    expect(result).toContain('5. Item 5')
    expect(result).not.toContain('6. Item 6')
    expect(result).toContain('3 more items')
    expect(result).toContain('See Attached for Full Detail')
  })

  it('returns empty string for empty/null/undefined', () => {
    expect(formatLineItems(null)).toBe('')
    expect(formatLineItems(undefined)).toBe('')
    expect(formatLineItems([])).toBe('')
  })

  it('handles items with desc alias', () => {
    const items = [{ desc: 'Short description' }]
    const result = formatLineItems(items)
    expect(result).toContain('Short description')
  })
})

describe('formatLedgerSnapshot', () => {
  it('formats a ledger snapshot', () => {
    const snapshot = {
      previous_balance: 1000,
      transaction_amount: 250,
      new_balance: 750
    }
    const result = formatLedgerSnapshot(snapshot, 'General Fund')
    expect(result).toContain('Ledger: General Fund')
    expect(result).toContain('$1,000.00')
    expect(result).toContain('$250.00')
    expect(result).toContain('$750.00')
  })

  it('omits ledger line when no name given', () => {
    const snapshot = { previous_balance: 100, transaction_amount: 50, new_balance: 50 }
    const result = formatLedgerSnapshot(snapshot)
    expect(result).not.toContain('Ledger:')
  })

  it('returns empty string for null snapshot', () => {
    expect(formatLedgerSnapshot(null)).toBe('')
  })
})

describe('getDateRangeForFilter', () => {
  it('returns null/null for "all"', () => {
    const { start, end } = getDateRangeForFilter('all')
    expect(start).toBeNull()
    expect(end).toBeNull()
  })

  it('returns null/null for unknown type', () => {
    const { start, end } = getDateRangeForFilter('unknown')
    expect(start).toBeNull()
    expect(end).toBeNull()
  })

  it('returns Date objects for "thisWeek"', () => {
    const { start, end } = getDateRangeForFilter('thisWeek')
    expect(start).toBeInstanceOf(Date)
    expect(end).toBeInstanceOf(Date)
    expect(start.getDay()).toBe(0) // Sunday
    expect(end.getDay()).toBe(6) // Saturday
    expect(start <= end).toBe(true)
  })

  it('returns Date objects for "thisMonth"', () => {
    const { start, end } = getDateRangeForFilter('thisMonth')
    expect(start.getDate()).toBe(1) // First day
    expect(end.getDate()).toBe(new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()) // Last day
  })

  it('returns Date objects for "lastMonth"', () => {
    const { start, end } = getDateRangeForFilter('lastMonth')
    const now = new Date()
    const expectedMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    expect(start.getMonth()).toBe(expectedMonth)
    expect(start.getDate()).toBe(1)
  })

  it('returns Date objects for "ytd"', () => {
    const { start, end } = getDateRangeForFilter('ytd')
    expect(start.getMonth()).toBe(0) // January
    expect(start.getDate()).toBe(1) // 1st
    expect(end).toBeInstanceOf(Date)
  })

  it('uses custom dates for "custom"', () => {
    const { start, end } = getDateRangeForFilter('custom', '2025-01-01', '2025-06-30')
    expect(start).toBeInstanceOf(Date)
    expect(end).toBeInstanceOf(Date)
    expect(start.getMonth()).toBe(0)
    expect(end.getMonth()).toBe(5)
  })

  it('handles custom with null dates', () => {
    const { start, end } = getDateRangeForFilter('custom')
    expect(start).toBeNull()
    expect(end).toBeNull()
  })

  it('returns Date objects for "last60"', () => {
    const { start, end } = getDateRangeForFilter('last60')
    expect(start).toBeInstanceOf(Date)
    expect(end).toBeInstanceOf(Date)
    // start is 60 days ago, end is today at 23:59:59 — diff is ~60-61 days
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBeGreaterThanOrEqual(60)
    expect(diffDays).toBeLessThanOrEqual(61)
  })
})

describe('normalizeModel', () => {
  it('returns full defaults for null/undefined input', () => {
    const result = normalizeModel(null)
    expect(result.layout).toEqual(DEFAULT_LAYOUT)
    expect(result.fields).toEqual(expect.objectContaining(DEFAULT_FIELDS))
  })

  it('preserves provided fields', () => {
    const customFields = {
      date: { x: 1, y: 1, w: 2, h: 0.5, fontIn: 0.3, label: 'Custom Date' }
    }
    const result = normalizeModel({ fields: customFields })
    expect(result.fields.date.label).toBe('Custom Date')
    // Other fields filled from defaults
    expect(result.fields.payee).toEqual(DEFAULT_FIELDS.payee)
  })

  it('adds stub1 default fields when stub1 is enabled', () => {
    const result = normalizeModel({})
    expect(result.fields.stub1_date).toBeDefined()
    expect(result.fields.stub1_payee).toBeDefined()
    expect(result.fields.stub1_amount).toBeDefined()
  })

  it('adds stub2 default fields when stub2 is enabled', () => {
    const result = normalizeModel({})
    expect(result.fields.stub2_date).toBeDefined()
    expect(result.fields.stub2_payee).toBeDefined()
    expect(result.fields.stub2_amount).toBeDefined()
  })

  it('does not overwrite existing stub fields', () => {
    const customStubField = { x: 99, y: 99, w: 1, h: 1, fontIn: 0.2, label: 'My Date' }
    const result = normalizeModel({ fields: { stub1_date: customStubField } })
    expect(result.fields.stub1_date.x).toBe(99)
  })

  it('ensures slotFields have all required fields', () => {
    const result = normalizeModel({})
    expect(result.slotFields.top).toEqual(expect.objectContaining(DEFAULT_FIELDS))
    expect(result.slotFields.middle).toEqual(expect.objectContaining(DEFAULT_FIELDS))
    expect(result.slotFields.bottom).toEqual(expect.objectContaining(DEFAULT_FIELDS))
  })

  it('merges template with defaults', () => {
    const result = normalizeModel({ template: { opacity: 0.5 } })
    expect(result.template.opacity).toBe(0.5)
    expect(result.template.fit).toBe('cover') // from default
  })

  it('handles legacy check field migration', () => {
    const legacy = { check: { widthIn: 8.5, heightIn: 3.5 } }
    const result = normalizeModel(legacy)
    expect(result.layout.widthIn).toBe(8.5)
    expect(result.layout.checkHeightIn).toBe(3.5)
  })
})
