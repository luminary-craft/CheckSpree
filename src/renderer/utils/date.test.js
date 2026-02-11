import { getLocalDateString } from './date'

describe('getLocalDateString', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const result = getLocalDateString()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns today\'s date', () => {
    const now = new Date()
    const expected = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-')
    expect(getLocalDateString()).toBe(expected)
  })
})
