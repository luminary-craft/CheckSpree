/**
 * Locale definitions for international support.
 *
 * IMPORTANT: All paper dimensions are in INCHES for the render engine.
 * The app's coordinate system is entirely inch-based; for metric locales,
 * we store the pre-converted inch values. The ui.measurementUnit field
 * controls what the user sees in the sidebar.
 */

export const LOCALES = {
  US: {
    id: 'US',
    label: 'United States',
    paper: {
      name: 'Letter',
      width: 8.5,
      height: 11,
      code: 'Letter'
    },
    ui: {
      measurementUnit: 'in'
    },
    currency: { symbol: '$', code: 'USD', locale: 'en-US' },
    dateFormat: {
      order: ['MM', 'DD', 'YYYY'],
      separator: '/',
      locale: 'en-US'
    },
    numberToWords: { langCode: 'en', centsFormat: 'fraction' }
  },
  CA: {
    id: 'CA',
    label: 'Canada',
    paper: {
      name: 'Letter',
      width: 8.5,
      height: 11,
      code: 'Letter'
    },
    ui: {
      measurementUnit: 'in'
    },
    currency: { symbol: '$', code: 'CAD', locale: 'en-CA' },
    dateFormat: {
      order: ['YYYY', 'MM', 'DD'],
      separator: '-',
      locale: 'en-CA'
    },
    numberToWords: { langCode: 'en', centsFormat: 'fraction' }
  },
  GB: {
    id: 'GB',
    label: 'United Kingdom',
    paper: {
      name: 'A4',
      width: 8.27,   // 210mm in inches
      height: 11.69,  // 297mm in inches
      code: 'A4'
    },
    ui: {
      measurementUnit: 'mm'
    },
    currency: { symbol: '£', code: 'GBP', locale: 'en-GB' },
    dateFormat: {
      order: ['DD', 'MM', 'YYYY'],
      separator: '/',
      locale: 'en-GB'
    },
    numberToWords: { langCode: 'en', centsFormat: 'fraction' }
  },
  FR: {
    id: 'FR',
    label: 'France',
    paper: {
      name: 'A4',
      width: 8.27,
      height: 11.69,
      code: 'A4'
    },
    ui: {
      measurementUnit: 'mm'
    },
    currency: { symbol: '€', code: 'EUR', locale: 'fr-FR' },
    dateFormat: {
      order: ['DD', 'MM', 'YYYY'],
      separator: '/',
      locale: 'fr-FR'
    },
    numberToWords: { langCode: 'fr', centsFormat: 'centimes' }
  },
  PH: {
    id: 'PH',
    label: 'Philippines',
    paper: {
      name: 'Letter',
      width: 8.5,
      height: 11,
      code: 'Letter'
    },
    ui: {
      measurementUnit: 'in'
    },
    currency: { symbol: '₱', code: 'PHP', locale: 'en-PH' },
    dateFormat: {
      order: ['MM', 'DD', 'YYYY'],
      separator: '/',
      locale: 'en-PH'
    },
    numberToWords: { langCode: 'en', centsFormat: 'fraction' }
  }
}

export const DEFAULT_LOCALE_ID = 'US'

/**
 * Get a locale config by ID, falling back to US if not found.
 */
export function getLocale(localeId) {
  return LOCALES[localeId] || LOCALES.US
}

/**
 * Convert inches to the locale's display unit.
 */
export function inchesToDisplayUnit(inches, locale) {
  if (locale?.ui?.measurementUnit === 'mm') {
    return Math.round(inches * 25.4 * 10) / 10
  }
  return Math.round(inches * 1000) / 1000
}

/**
 * Convert from display unit back to inches.
 */
export function displayUnitToInches(value, locale) {
  if (locale?.ui?.measurementUnit === 'mm') {
    return value / 25.4
  }
  return value
}
