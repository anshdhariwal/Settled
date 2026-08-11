export function Shell({ children, maxWidth = "max-w-[390px] sm:max-w-[420px]" }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      <div className={`w-full ${maxWidth} screen-transition`}>{children}</div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}
