import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export default function HelpDrawer({ isOpen, onClose }) {
  const { t } = useTranslation()
  const drawerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="relative w-full max-w-md bg-white shadow-apple-lg overflow-y-auto animate-slide-up"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-apple-gray-200 bg-white/90 backdrop-blur-sm px-5 py-4">
          <h2 className="text-[17px] font-semibold tracking-tight text-apple-gray-900">{t('help.title')}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-apple-gray-400 hover:bg-apple-gray-100 hover:text-apple-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Quick Start */}
          <section>
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-apple-gray-900 mb-3">
              <span className="text-lg">🚀</span>
              {t('help.quick_start')}
            </h3>
            <div className="space-y-3">
              {[
                { step: '1', title: t('help.quick_start_step1'), desc: t('help.quick_start_step1_desc') },
                { step: '2', title: t('help.quick_start_step2'), desc: t('help.quick_start_step2_desc') },
                { step: '3', title: t('help.quick_start_step3'), desc: t('help.quick_start_step3_desc') },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-3 rounded-xl bg-apple-gray-50 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-apple-blue text-[12px] font-bold text-white">
                    {step}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-apple-gray-800">{title}</p>
                    <p className="text-[12px] text-apple-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Dimensions */}
          <section>
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-apple-gray-900 mb-3">
              <span className="text-lg">📊</span>
              {t('help.dimensions')}
            </h3>
            <div className="space-y-3">
              {[
                { icon: '🏗', title: t('help.dom_dimension'), desc: t('help.dom_dimension_desc') },
                { icon: '🎨', title: t('help.visual_dimension'), desc: t('help.visual_dimension_desc') },
                { icon: '📝', title: t('help.text_dimension'), desc: t('help.text_dimension_desc') },
              ].map(({ icon, title, desc }, i) => (
                <div key={i} className="rounded-xl border border-apple-gray-200 p-3">
                  <p className="flex items-center gap-2 text-[13px] font-medium text-apple-gray-800">
                    <span>{icon}</span>
                    {title}
                  </p>
                  <p className="text-[12px] text-apple-gray-500 mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-apple-gray-900 mb-3">
              <span className="text-lg">❓</span>
              {t('help.faq')}
            </h3>
            <div className="space-y-3">
              {[
                { q: t('help.faq_large_screenshot'), a: t('help.faq_large_screenshot_desc') },
                { q: t('help.faq_slow_compare'), a: t('help.faq_slow_compare_desc') },
              ].map(({ q, a }, i) => (
                <div key={i} className="rounded-xl bg-apple-gray-50 p-3">
                  <p className="text-[13px] font-medium text-apple-gray-800">{q}</p>
                  <p className="text-[12px] text-apple-gray-500 mt-1">{a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section>
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-apple-gray-900 mb-3">
              <span className="text-lg">⌨️</span>
              {t('help.shortcuts')}
            </h3>
            <div className="rounded-xl border border-apple-gray-200 overflow-hidden">
              <table className="w-full text-left">
                <tbody>
                  {[
                    { keys: 'Ctrl + Enter', action: t('help.shortcut_ctrl_enter') },
                    { keys: 'Ctrl + K', action: t('help.shortcut_ctrl_k') },
                    { keys: '?', action: t('help.shortcut_question') },
                    { keys: '1 - 5', action: t('help.shortcut_1_5') },
                    { keys: '← →', action: t('help.shortcut_arrows') },
                    { keys: 'Esc', action: t('help.shortcut_escape') },
                  ].map(({ keys, action }, i) => (
                    <tr key={i} className="border-b border-apple-gray-100 last:border-0">
                      <td className="px-3 py-2 text-[12px] font-mono font-medium text-apple-gray-700">
                        <kbd className="rounded bg-apple-gray-100 px-1.5 py-0.5">{keys}</kbd>
                      </td>
                      <td className="px-3 py-2 text-[12px] text-apple-gray-500">{action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
