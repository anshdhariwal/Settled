export function formatINR(val) {
  const num = Number(val)
  if (isNaN(num)) return '0'
  return num.toLocaleString('en-IN')
}
