// Number-to-words helper for check printing.
// Supports locale-aware output. English is built-in; other languages
// can be added to the registry or plugged in via an npm package like n2words.

// Module-level locale config — defaults to English fraction format
let _wordsConfig = { langCode: 'en', centsFormat: 'fraction' }

/**
 * Set the active number-to-words locale config.
 * Call this once at app startup when preferences are loaded.
 *
 * @param {Object} config - { langCode: 'en', centsFormat: 'fraction' | 'centimes' }
 */
export function setNumberToWordsLocale(config) {
  _wordsConfig = config || { langCode: 'en', centsFormat: 'fraction' }
}

// --- English word tables ---
const ones = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
]

const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function intToWordsEN(n) {
  if (n < 20) return ones[n]
  if (n < 100) {
    const t = Math.floor(n / 10)
    const r = n % 10
    return r ? `${tens[t]}-${ones[r]}` : tens[t]
  }
  if (n < 1000) {
    const h = Math.floor(n / 100)
    const r = n % 100
    return r ? `${ones[h]} Hundred ${intToWordsEN(r)}` : `${ones[h]} Hundred`
  }
  if (n < 1000000) {
    const th = Math.floor(n / 1000)
    const r = n % 1000
    return r ? `${intToWordsEN(th)} Thousand ${intToWordsEN(r)}` : `${intToWordsEN(th)} Thousand`
  }
  if (n < 1000000000) {
    const m = Math.floor(n / 1000000)
    const r = n % 1000000
    return r ? `${intToWordsEN(m)} Million ${intToWordsEN(r)}` : `${intToWordsEN(m)} Million`
  }
  if (n < 1000000000000) {
    const b = Math.floor(n / 1000000000)
    const r = n % 1000000000
    return r ? `${intToWordsEN(b)} Billion ${intToWordsEN(r)}` : `${intToWordsEN(b)} Billion`
  }
  return String(n)
}

/**
 * Language registry — maps langCode to an intToWords function.
 * Add new languages here or plug in an npm package like n2words.
 */
const LANG_REGISTRY = {
  en: intToWordsEN
  // fr: intToWordsFR,  // future: add French number-to-words
  // es: intToWordsES,  // future: add Spanish number-to-words
}

/**
 * Convert a numeric amount to words for check printing.
 *
 * Uses the module-level locale config set by setNumberToWordsLocale().
 * Falls back to English if the configured language isn't in the registry.
 *
 * @param {string|number} amountStr - The amount to convert
 * @param {Object} [localeOverride] - Optional override: { langCode, centsFormat }
 * @returns {string} Words representation (e.g. "One Hundred and 45/100")
 */
export function numberToWords(amountStr, localeOverride) {
  const config = localeOverride || _wordsConfig
  if (amountStr === null || amountStr === undefined || amountStr === '') {
    amountStr = '0'
  }
  const raw = String(amountStr)
  const cleaned = raw.replace(/[^0-9.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return ''
  const num = Number(cleaned)
  if (!Number.isFinite(num)) return ''

  const wholePart = Math.floor(Math.abs(num))
  const centsPart = Math.round((Math.abs(num) - wholePart) * 100)

  // Get the word converter for the configured language, fallback to English
  const intToWords = LANG_REGISTRY[config.langCode] || LANG_REGISTRY.en
  const wholeWords = wholePart === 0 ? 'Zero' : intToWords(wholePart)
  const centsStr = String(centsPart).padStart(2, '0')

  // Format cents based on locale preference
  if (config.centsFormat === 'centimes') {
    // European style — for now uses same format until proper translations are added
    return `${wholeWords} and ${centsStr}/100`
  }

  // Default fraction format: "One Hundred and 45/100"
  return `${wholeWords} and ${centsStr}/100`
}
