import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { probeUrl } from '../../api/comparisons'
import { IconCompare, IconSwap, IconCheck, IconWarning, IconShield, IconLightning, IconChevronDown, IconBookmark } from '../shared/Icons'

const DEBOUNCE_MS = 600
const PRESET_KEY = 'web-compare-presets'

function loadPresets() {
  try {
    return JSON.parse(localStorage.getItem(PRESET_KEY) || '[]')
  } catch { return [] }
}

function savePresets(presets) {
  localStorage.setItem(PRESET_KEY, JSON.stringify(presets))
}

export default function UrlInputForm({ onSubmit, isLoading, initialUrlA, initialUrlB }) {
  const { t } = useTranslation()
  const [urlA, setUrlA] = useState(initialUrlA || '')
  const [urlB, setUrlB] = useState(initialUrlB || '')
  const [errors, setErrors] = useState({})
  const [probeA, setProbeA] = useState(null)   // { reachable, status_code } | null
  const [probeB, setProbeB] = useState(null)
  const [probing, setProbing] = useState({ a: false, b: false })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [presets, setPresets] = useState(loadPresets)
  const [presetName, setPresetName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const probeTimers = useRef({ a: null, b: null })
  const latestUrlRef = useRef({ a: '', b: '' })

  useEffect(() => {
    if (initialUrlA !== undefined) setUrlA(initialUrlA)
    if (initialUrlB !== undefined) setUrlB(initialUrlB)
  }, [initialUrlA, initialUrlB])

  const probe = useCallback(async (url, side) => {
    if (!url || !/^https?:\/\/.+/i.test(url)) {
      side === 'a' ? setProbeA(null) : setProbeB(null)
      return
    }
    side === 'a' ? setProbing(p => ({ ...p, a: true })) : setProbing(p => ({ ...p, b: true }))
    try {
      const res = await probeUrl(url)
      // Discard stale response if URL changed during the request
      if (latestUrlRef.current[side] !== url) return
      side === 'a' ? setProbeA(res) : setProbeB(res)
    } catch {
      if (latestUrlRef.current[side] !== url) return
      side === 'a' ? setProbeA({ reachable: false }) : setProbeB({ reachable: false })
    } finally {
      if (latestUrlRef.current[side] === url) {
        side === 'a' ? setProbing(p => ({ ...p, a: false })) : setProbing(p => ({ ...p, b: false }))
      }
    }
  }, [])

  const debouncedProbe = useCallback((url, side) => {
    latestUrlRef.current[side] = url
    if (probeTimers.current[side]) clearTimeout(probeTimers.current[side])
    probeTimers.current[side] = setTimeout(() => probe(url, side), DEBOUNCE_MS)
  }, [probe])

  function handleUrlChange(side, value) {
    if (side === 'a') { setUrlA(value); setErrors(p => ({ ...p, urlA: '' })) }
    else { setUrlB(value); setErrors(p => ({ ...p, urlB: '' })) }
    // Auto-prepend https://
    if (value && !value.match(/^https?:\/\//i) && value.includes('.')) {
      // Don't auto-correct, just probe when valid
    }
    debouncedProbe(value, side)
  }

  function validate() {
    const errs = {}
    const trimmedA = urlA.trim()
    const trimmedB = urlB.trim()
    if (!trimmedA) errs.urlA = t('form.url_required')
    if (!trimmedB) errs.urlB = t('form.url_b_required')
    const urlPattern = /^https?:\/\/.+/i
    if (trimmedA && !urlPattern.test(trimmedA)) errs.urlA = t('form.url_invalid')
    if (trimmedB && !urlPattern.test(trimmedB)) errs.urlB = t('form.url_b_invalid')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      url_a: urlA.trim(),
      url_b: urlB.trim(),
      viewport_width: 1280,
      viewport_height: 720,
      full_page: true,
      comparisons: ['dom', 'visual', 'text'],
    })
  }

  function handleSwap() {
    const tmpUrl = urlA; const tmpProbe = probeA
    setUrlA(urlB); setUrlB(tmpUrl)
    setProbeA(probeB); setProbeB(tmpProbe)
  }

  function handleSavePreset() {
    if (!presetName.trim() || !urlA.trim() || !urlB.trim()) return
    const newPresets = [...presets, { id: Date.now().toString(), name: presetName.trim(), url_a: urlA.trim(), url_b: urlB.trim(), created_at: new Date().toISOString() }]
    setPresets(newPresets)
    savePresets(newPresets)
    setPresetName('')
    setShowSaveDialog(false)
  }

  function handleLoadPreset(preset) {
    setUrlA(preset.url_a)
    setUrlB(preset.url_b)
    setShowPresets(false)
  }

  function handleDeletePreset(id) {
    const newPresets = presets.filter(p => p.id !== id)
    setPresets(newPresets)
    savePresets(newPresets)
  }

  const sameUrl = urlA.trim() && urlB.trim() && urlA.trim() === urlB.trim()

  return (
    <div className="w-full">
      {/* Quick Examples */}
      <div className="mb-8">
        <p className="text-sm font-medium text-apple-gray-500 mb-3 tracking-tight">{t('onboarding.try_examples')}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.key}
              type="button"
              onClick={() => {
                setUrlA(ex.url_a)
                setUrlB(ex.url_b)
                setErrors({})
              }}
              className="card-apple card-lift flex items-start gap-3 p-3.5 text-left scale-press"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-apple-blue-light text-apple-blue">
                <IconLightning className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-apple-gray-900 truncate">{t(ex.labelKey)}</p>
                <p className="text-[11px] text-apple-gray-400 truncate mt-0.5">{ex.url_a.split('://')[1]} vs {ex.url_b.split('://')[1]}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card-apple p-5 sm:p-6">
        {/* URL Inputs */}
        <div className="flex items-start gap-2">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium tracking-tight">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-apple-blue text-[10px] font-bold text-white">A</span>
                <span className="text-apple-gray-700">{t('form.url_a')}</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={urlA}
                  onChange={(e) => handleUrlChange('a', e.target.value)}
                  placeholder={t('form.url_a_placeholder')}
                  autoComplete="url"
                  className={`input-apple pr-8 ${errors.urlA ? 'error' : ''}`}
                />
                {probing.a && <SpinnerIcon className="absolute right-2.5 top-2.5 w-4 h-4 text-apple-gray-400 animate-spin" />}
                {!probing.a && probeA && probeA.reachable && <IconCheck className="absolute right-2.5 top-2.5 w-4 h-4 text-apple-green" />}
                {!probing.a && probeA && !probeA.reachable && <IconWarning className="absolute right-2.5 top-2.5 w-4 h-4 text-apple-orange" />}
              </div>
              {errors.urlA && <p className="mt-1 text-[11px] text-apple-red">{errors.urlA}</p>}
              {probeA && !probeA.reachable && !errors.urlA && (
                <p className="mt-1 text-[11px] text-apple-orange flex items-center gap-1">
                  <IconShield className="w-3 h-3" />
                  {t('onboarding.url_unreachable')}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium tracking-tight">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-apple-green text-[10px] font-bold text-white">B</span>
                <span className="text-apple-gray-700">{t('form.url_b')}</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={urlB}
                  onChange={(e) => handleUrlChange('b', e.target.value)}
                  placeholder={t('form.url_b_placeholder')}
                  autoComplete="url"
                  className={`input-apple pr-8 ${errors.urlB ? 'error' : ''}`}
                />
                {probing.b && <SpinnerIcon className="absolute right-2.5 top-2.5 w-4 h-4 text-apple-gray-400 animate-spin" />}
                {!probing.b && probeB && probeB.reachable && <IconCheck className="absolute right-2.5 top-2.5 w-4 h-4 text-apple-green" />}
                {!probing.b && probeB && !probeB.reachable && <IconWarning className="absolute right-2.5 top-2.5 w-4 h-4 text-apple-orange" />}
              </div>
              {errors.urlB && <p className="mt-1 text-[11px] text-apple-red">{errors.urlB}</p>}
              {probeB && !probeB.reachable && !errors.urlB && (
                <p className="mt-1 text-[11px] text-apple-orange flex items-center gap-1">
                  <IconShield className="w-3 h-3" />
                  {t('onboarding.url_unreachable')}
                </p>
              )}
            </div>
          </div>

          {/* Swap Button */}
          <button
            type="button"
            onClick={handleSwap}
            title={t('form.swap')}
            className="icon-btn mt-7 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl border border-apple-gray-200 bg-white text-apple-gray-400 hover:border-apple-gray-300 hover:text-apple-gray-600 hover:shadow-apple-sm"
          >
            <IconSwap className="w-4 h-4" />
          </button>
        </div>

        {/* Same URL Warning */}
        {sameUrl && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-apple-orange-light px-3.5 py-2.5 text-[12px] text-apple-orange">
            <IconWarning className="w-4 h-4 shrink-0" />
            <span>{t('onboarding.same_url_warning')}</span>
          </div>
        )}

        {/* Advanced Options */}
        <div className="mt-4 border-t border-apple-gray-100 pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-[12px] font-medium text-apple-gray-500 hover:text-apple-gray-700 transition-colors"
          >
            <IconChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
            {t('onboarding.advanced_options')}
          </button>

          {showAdvanced && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 animate-slide-up">
              <div>
                <label className="block text-[12px] font-medium text-apple-gray-600 mb-1">{t('onboarding.comparison_dimensions')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'dom', label: t('onboarding.dimension_dom') },
                    { key: 'visual', label: t('onboarding.dimension_visual') },
                    { key: 'text', label: t('onboarding.dimension_text') },
                  ].map(({ key, label }) => (
                    <span key={key} className="inline-flex items-center gap-1 rounded-lg bg-apple-gray-100 px-2.5 py-1 text-[12px] font-medium text-apple-gray-700">
                      <IconCheck className="w-3 h-3 text-apple-blue" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-apple-gray-600 mb-1">{t('onboarding.screenshot_mode')}</label>
                <span className="inline-flex items-center gap-1 rounded-lg bg-apple-gray-100 px-2.5 py-1 text-[12px] font-medium text-apple-gray-700">
                  <IconCheck className="w-3 h-3 text-apple-blue" />
                  {t('onboarding.full_page')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center gap-2.5">
          <button
            type="submit"
            disabled={isLoading}
            className="btn-apple btn-apple-primary px-6"
          >
            {isLoading ? (
              <>
                <SpinnerIcon className="w-4 h-4 animate-spin" />
                {t('form.starting')}
              </>
            ) : (
              <>
                <IconCompare className="w-4 h-4" />
                {t('form.compare')}
              </>
            )}
          </button>

          {/* Presets */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresets(!showPresets)}
              className="btn-apple btn-apple-secondary"
            >
              <IconBookmark className="w-4 h-4" />
              <span className="hidden sm:inline">{t('onboarding.presets')}</span>
            </button>
            {showPresets && (
              <div className="absolute bottom-full left-0 mb-2 w-72 card-apple p-1.5 z-20 animate-scale-in">
                {presets.length === 0 ? (
                  <p className="px-3 py-2 text-[12px] text-apple-gray-400">{t('onboarding.no_presets')}</p>
                ) : (
                  presets.map(p => (
                    <div key={p.id} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-apple-gray-50 group">
                      <button type="button" onClick={() => handleLoadPreset(p)} className="flex-1 text-left min-w-0">
                        <p className="text-[12px] font-medium text-apple-gray-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-apple-gray-400 truncate">{p.url_a.split('://')[1]} vs {p.url_b.split('://')[1]}</p>
                      </button>
                      <button type="button" onClick={() => handleDeletePreset(p.id)} className="opacity-0 group-hover:opacity-100 text-apple-red hover:bg-apple-red-light rounded p-1 transition-all">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))
                )}
                <div className="border-t border-apple-gray-100 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowPresets(false); setShowSaveDialog(true); setPresetName('') }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-apple-blue hover:bg-apple-blue-light/50 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    {t('onboarding.save_current_preset')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Save current as preset */}
          {showSaveDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setShowSaveDialog(false)}>
              <div className="card-apple w-80 p-5 animate-scale-in" onClick={e => e.stopPropagation()}>
                <p className="text-[15px] font-semibold text-apple-gray-900 mb-3">{t('onboarding.save_preset_title')}</p>
                <input
                  type="text"
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  placeholder={t('onboarding.preset_name_placeholder')}
                  className="input-apple mb-3"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleSavePreset() }}
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowSaveDialog(false)} className="btn-apple btn-apple-secondary text-[12px]">{t('onboarding.cancel')}</button>
                  <button type="button" onClick={handleSavePreset} className="btn-apple btn-apple-primary text-[12px]">{t('onboarding.save')}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}

function SpinnerIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

const EXAMPLES = [
  { key: 'huawei', labelKey: 'onboarding.example_huawei', url_a: 'https://www.huawei.com/cn/', url_b: 'https://www.huawei.com/en/' },
  { key: 'bootstrap', labelKey: 'onboarding.example_bootstrap', url_a: 'https://getbootstrap.com/docs/5.2/', url_b: 'https://getbootstrap.com/docs/5.3/' },
]
