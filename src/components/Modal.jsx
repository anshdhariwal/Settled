import { IconClose } from './icons'

export default function Modal({
  isOpen,
  onClose,
  title = 'Confirm Action',
  icon: Icon = null,
  iconColor = 'text-rose-400',
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  loading = false,
  danger = true,
}) {
  if (!isOpen) return null

  return (
    <div className="settled-modal-backdrop animate-fade-in">
      <div className={`settled-modal-card settled-card p-6 space-y-4 text-left border ${danger ? 'border-rose-500/30' : 'border-zinc-800'}`}>
        <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            {Icon ? <Icon className={`w-4 h-4 ${iconColor}`} /> : danger ? <span className="text-rose-400">⚠️</span> : null}
            <span>{title}</span>
          </h3>
          <button onClick={onClose} className="back-btn" title="Close">
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-sm text-zinc-300">
          {children}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-s text-xs px-4 py-2"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`btn ${danger ? 'btn-danger' : 'btn-p'} text-xs px-4 py-2 disabled:opacity-50`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
