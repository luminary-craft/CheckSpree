// Minimal number-to-words helper (US check style): "One Hundred and 00/100"
// Not exhaustive, but good enough for common check amounts.

const ones = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
]

const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function intToWords(n) {
  if (n < 20) return ones[n]
  if (n < 100) {
    const t = Math.floor(n / 10)
    const r = n % 10
    return r ? `${tens[t]}-${ones[r]}` : tens[t]
  }
  if (n < 1000) {
    const h = Math.floor(n / 100)
    const r = n % 100
    return r ? `${ones[h]} Hundred ${intToWords(r)}` : `${ones[h]} Hundred`
  }
  if (n < 1000000) {
    const th = Math.floor(n / 1000)
    const r = n % 1000
    return r ? `${intToWords(th)} Thousand ${intToWords(r)}` : `${intToWords(th)} Thousand`
  }
  if (n < 1000000000) {
    const m = Math.floor(n / 1000000)
    const r = n % 1000000
    return r ? `${intToWords(m)} Million ${intToWords(r)}` : `${intToWords(m)} Million`
  }
  if (n < 1000000000000) {
    const b = Math.floor(n / 1000000000)
    const r = n % 1000000000
    return r ? `${intToWords(b)} Billion ${intToWords(r)}` : `${intToWords(b)} Billion`
  }
  // For anything larger, just return the number
  return String(n)
}

export function numberToWords(amountStr) {
  const cleaned = String(amountStr ?? '').replace(/[$, ]/g, '')
  const num = Number(cleaned)
  if (!Number.isFinite(num)) return ''

  const dollars = Math.floor(Math.abs(num))
  const cents = Math.round((Math.abs(num) - dollars) * 100)

  const dollarWords = dollars === 0 ? 'Zero' : intToWords(dollars)
  const centsStr = String(cents).padStart(2, '0')
  return `${dollarWords} and ${centsStr}/100`
}

