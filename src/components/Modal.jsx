import { createPortal } from 'react-dom'

export default function Modal({
  isOpen,
  onClose,
  title = 'Confirm Action',
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  loading = false,
  danger = true,
}) {
  if (!isOpen) return null

  const modalContent = (
    <div
      className="settled-modal-backdrop animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="settled-modal-card settled-card p-6 space-y-4 text-left border border-zinc-800 rounded-2xl bg-zinc-950/95 shadow-2xl">
        <div className="space-y-2">
          <h3 className="font-dotted text-xl sm:text-2xl text-white font-medium tracking-wide leading-snug">
            {title}
          </h3>
          <div className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            {children}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-s flex-1 !py-3 !text-sm font-semibold rounded-xl"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`btn ${danger ? 'btn-danger' : 'btn-p'} flex-1 !py-3 !text-sm font-bold rounded-xl disabled:opacity-50`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
