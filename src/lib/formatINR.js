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

