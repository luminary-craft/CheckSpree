// Test local date logic
const d = new Date()
console.log('Current Date Obj:', d.toString())
console.log('UTC String:', d.toISOString())
console.log('Timezone Offset (min):', d.getTimezoneOffset())

const localDate1 = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
console.log('Method 1 (Current Implementation):', localDate1)

// Alternative method
const localDate2 = d.toLocaleDateString('en-CA') // YYYY-MM-DD
console.log('Method 2 (toLocaleDateString):', localDate2)

// Manual string construction
const year = d.getFullYear()
const month = String(d.getMonth() + 1).padStart(2, '0')
const day = String(d.getDate()).padStart(2, '0')
console.log('Method 3 (Manual):', `${year}-${month}-${day}`)
