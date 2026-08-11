export function formatINR(val) {
  const num = Number(val)
  if (isNaN(num)) return '0'
  return num.toLocaleString('en-IN')
}

export function formatDOB(val) {
  const digits = (val || '').replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
}

export function isValidDOB(dobStr) {
  if (!dobStr || dobStr.length !== 10) return false
  const parts = dobStr.split('-')
  if (parts.length !== 3) return false
  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const year = parseInt(parts[2], 10)

  if (isNaN(day) || isNaN(month) || isNaN(year)) return false
  if (year < 1500 || year > 2500) return false
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false

  const isLeap = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0))
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (day > daysInMonth[month - 1]) return false

  return true
}

