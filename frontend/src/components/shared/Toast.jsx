import { useState, useEffect, useCallback, useRef } from 'react'
import { IconCheck, IconWarning, IconInfo } from './Icons'

const ICONS = {
  success: IconCheck,
  error: IconWarning,
  info: IconInfo,
}

const COLORS = {
  success: 'bg-apple-green-light text-apple-green border-apple-green/20',
  error: 'bg-apple-red-light text-apple-red border-apple-red/20',
  info: 'bg-apple-blue-light text-apple-blue border-apple-blue/20',
}

export default function Toast({ message, type = 'info', action, onAction, onClose, duration = 5000 }) {
  const [visible, setVisible] = useState(true)
  const Icon = ICONS[type] || ICONS.info
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (duration <= 0) return
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onCloseRef.current?.(), 300) // Wait for exit animation
    }, duration)
    return () => clearTimeout(timer)
  }, [duration])

  const handleAction = useCallback(() => {
    if (onAction) onAction()
    setVisible(false)
    setTimeout(onClose, 300)
  }, [onAction, onClose])

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-apple-md backdrop-blur-sm transition-all duration-300 ${
        visible ? 'toast-enter' : 'toast-exit'
      } ${COLORS[type] || COLORS.info}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <p className="flex-1 text-[13px] font-medium">{message}</p>
      {action && (
        <button
          onClick={handleAction}
          className="shrink-0 rounded-lg bg-white/80 px-3 py-1 text-[12px] font-semibold text-apple-blue hover:bg-white transition-colors"
        >
          {action}
        </button>
      )}
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 300) }}
        className="shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
