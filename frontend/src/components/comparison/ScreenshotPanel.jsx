import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { IconImage, IconSlider, IconLayout, IconLayers } from '../shared/Icons'

const LOAD_TIMEOUT_MS = 15000

function LazyImage({ src, alt, className, style, onError, wrapperClass, eager = false }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef(null)
  const srcSetRef = useRef(false)
  const settledRef = useRef(false) // true once loaded or errored — prevents stale-closure timeout
  const { t } = useTranslation()

  useEffect(() => {
    const el = imgRef.current
    if (!el) return

    setLoaded(false)
    setError(false)
    srcSetRef.current = false
    settledRef.current = false

    const setSrc = () => {
      if (srcSetRef.current) return
      srcSetRef.current = true
      el.src = src
    }

    if (eager) {
      setSrc()
    } else {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setSrc()
            observer.disconnect()
          }
        },
        { rootMargin: '200px', threshold: 0.01 }
      )
      observer.observe(el)

      requestAnimationFrame(() => {
        if (!el.isConnected || srcSetRef.current) return
        const rect = el.getBoundingClientRect()
        const inView = rect.top < window.innerHeight + 200 && rect.bottom > -200
        if (inView) {
          setSrc()
          observer.disconnect()
        }
      })

      var observerRef = observer
    }

    // Safety timeout: use ref to avoid stale closure of loaded/error state
    const timer = setTimeout(() => {
      if (!settledRef.current) {
        settledRef.current = true
        setError(true)
        onError && onError()
      }
    }, LOAD_TIMEOUT_MS)

    return () => {
      clearTimeout(timer)
      if (typeof observerRef !== 'undefined') observerRef.disconnect()
    }
  }, [src, eager])

  return (
    <div className={`relative ${wrapperClass || ''}`}>
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-apple-gray-100 rounded-xl pointer-events-none">
          <div className="skeleton h-full w-full rounded-xl" />
        </div>
      )}
      {error ? (
        <div className="flex h-48 items-center justify-center rounded-xl bg-apple-red-light text-[13px] text-apple-red border border-apple-red/20">
          {t('screenshots.unavailable')}
        </div>
      ) : (
        <img
          ref={imgRef}
          alt={alt}
          className={`${className || ''} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
          style={style}
          onLoad={() => { settledRef.current = true; setLoaded(true) }}
          onError={() => { settledRef.current = true; setError(true); onError && onError() }}
        />
      )}
    </div>
  )
}

function ScreenshotUnavailable({ message }) {
  const { t } = useTranslation()
  return (
    <div className="flex h-48 items-center justify-center rounded-xl bg-apple-red-light text-sm text-apple-red border border-apple-red/20">
      {message || t('screenshots.unavailable')}
    </div>
  )
}

export default function ScreenshotPanel({ taskId, captureA, captureB, urlA, urlB }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState('side-by-side')
  const [sliderPos, setSliderPos] = useState(50)
  const [dragging, setDragging] = useState(false)
  const [zoom, setZoom] = useState('fit')
  const [imgErrorA, setImgErrorA] = useState(false)
  const [imgErrorB, setImgErrorB] = useState(false)
  const [syncScroll, setSyncScroll] = useState(true)
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const sliderRef = useRef(null)
  const isSyncingRef = useRef(false)

  const imgUrlA = `/api/comparisons/${taskId}/screenshots/a`
  const imgUrlB = `/api/comparisons/${taskId}/screenshots/b`
  const hasErrorA = imgErrorA
  const hasErrorB = imgErrorB
  const hasWarningA = !!captureA?.error
  const hasWarningB = !!captureB?.error

  const onLeftScroll = useCallback(() => {
    if (!syncScroll || !leftRef.current || !rightRef.current || isSyncingRef.current) return
    isSyncingRef.current = true
    rightRef.current.scrollTop = leftRef.current.scrollTop
    rightRef.current.scrollLeft = leftRef.current.scrollLeft
    requestAnimationFrame(() => { isSyncingRef.current = false })
  }, [syncScroll])

  const onRightScroll = useCallback(() => {
    if (!syncScroll || !leftRef.current || !rightRef.current || isSyncingRef.current) return
    isSyncingRef.current = true
    leftRef.current.scrollTop = rightRef.current.scrollTop
    leftRef.current.scrollLeft = rightRef.current.scrollLeft
    requestAnimationFrame(() => { isSyncingRef.current = false })
  }, [syncScroll])

  const handleSliderMouseDown = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  useEffect(() => {
    if (!dragging) return
    const handleMove = (e) => {
      if (!sliderRef.current) return
      const rect = sliderRef.current.getBoundingClientRect()
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
      const pct = Math.max(5, Math.min(95, (x / rect.width) * 100))
      setSliderPos(Math.round(pct))
    }
    const handleUp = () => setDragging(false)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [dragging])

  useEffect(() => {
    const handleKey = (e) => {
      if (mode !== 'slider') return
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowLeft') { e.preventDefault(); setSliderPos(p => Math.max(1, p - 1)) }
      if (e.key === 'ArrowRight') { e.preventDefault(); setSliderPos(p => Math.min(100, p + 1)) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [mode])

  if (!captureA && !captureB) return null

  const zoomClass = zoom === 'fit' ? 'max-h-[500px]' : ''
  const imgClass = zoom === 'fit' ? 'w-full object-contain' : zoom === 'full' ? 'w-full' : 'w-auto max-w-none'

  // Render a single screenshot column (used in side-by-side)
  function renderSide(isA) {
    const hasError = isA ? hasErrorA : hasErrorB
    const hasWarning = isA ? hasWarningA : hasWarningB
    const capture = isA ? captureA : captureB
    const url = isA ? urlA : urlB
    const imgUrl = isA ? imgUrlA : imgUrlB
    const scrollRef = isA ? leftRef : rightRef
    const onScroll = isA ? onLeftScroll : onRightScroll
    const setImgError = isA ? setImgErrorA : setImgErrorB

    return (
      <div>
        <p className={`mb-1.5 flex items-center gap-1.5 text-[12px] font-medium truncate ${isA ? 'text-apple-blue' : 'text-apple-green'}`} title={url}>
          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md text-[9px] font-bold text-white ${isA ? 'bg-apple-blue' : 'bg-apple-green'}`}>
            {isA ? 'A' : 'B'}
          </span>
          {url}
        </p>
        {hasWarning && !hasError && (
          <div className="mb-1.5 rounded-lg bg-apple-orange-light/60 px-3 py-1.5 text-[11px] text-apple-orange">
            ⚠ {capture?.error?.message || capture?.error}
          </div>
        )}
        {hasError ? (
          <ScreenshotUnavailable />
        ) : (
          <div ref={scrollRef} onScroll={onScroll} className={`overflow-auto rounded-xl border border-apple-gray-200 ${zoomClass}`}>
            <LazyImage src={imgUrl} alt={isA ? t('screenshots.alt_a') : t('screenshots.alt_b')}
              className={imgClass}
              onError={() => setImgError(true)} wrapperClass="min-h-[200px]" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="card-apple p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-apple-gray-900">
          <IconImage className="w-5 h-5 text-apple-blue" />
          {t('screenshots.title')}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode selector — always enabled */}
          <div className="segmented-control">
            <button type="button" onClick={() => setMode('side-by-side')} className={mode === 'side-by-side' ? 'active' : ''}>
              <IconLayout className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1">{t('screenshots.side_by_side')}</span>
            </button>
            <button type="button" onClick={() => setMode('slider')} className={mode === 'slider' ? 'active' : ''}>
              <IconLayers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1">{t('screenshots.slider_overlay')}</span>
            </button>
          </div>
          {/* Zoom selector — hidden in slider mode but keeps layout space */}
          <div className={`segmented-control ${mode === 'slider' ? 'invisible' : ''}`}>
            {[
              { key: 'fit', label: t('screenshots.fit') },
              { key: 'full', label: t('screenshots.full_width') },
              { key: 'scroll', label: t('screenshots.scroll') },
            ].map(({ key, label }) => (
              <button key={key} type="button" onClick={() => setZoom(key)} className={zoom === key ? 'active' : ''}>
                {label}
              </button>
            ))}
          </div>
          {zoom === 'scroll' && (
            <button type="button" onClick={() => setSyncScroll(!syncScroll)}
              className={`btn-apple btn-apple-secondary text-[11px] ${mode === 'slider' ? 'invisible' : ''} ${syncScroll ? '!bg-apple-blue-light !text-apple-blue' : ''}`}>
              {syncScroll ? t('screenshots.synced') : t('screenshots.unsynced')}
            </button>
          )}
        </div>
      </div>

      {/* Side-by-side mode */}
      {mode === 'side-by-side' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {renderSide(true)}
          {renderSide(false)}
        </div>
      )}

      {/* Slider overlay mode */}
      {mode === 'slider' && (
        hasErrorA || hasErrorB ? (
          <div className="rounded-xl border border-apple-gray-200 p-8 text-center">
            <p className="text-[13px] text-apple-gray-500 mb-2">{t('screenshots.slider_overlay')}</p>
            <ScreenshotUnavailable />
          </div>
        ) : (
          <div
            ref={sliderRef}
            className={`relative overflow-hidden rounded-xl border border-apple-gray-200 select-none ${dragging ? 'cursor-ew-resize' : ''}`}
            style={{ background: '#f5f5f7' }}
          >
            {/* Base layer: Screenshot B */}
            <div className="relative">
              <LazyImage src={imgUrlB} alt={t('screenshots.alt_base')} className="w-full block" eager={true} />
            </div>

            {/* Overlay layer: Screenshot A clipped */}
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
              <img
                src={imgUrlA}
                alt={t('screenshots.alt_overlay')}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>

            {/* Divider line */}
            <div className="absolute top-0 bottom-0 w-[1.5px] bg-white shadow-[0_0_8px_rgba(0,0,0,0.15)] pointer-events-none z-10" style={{ left: `${sliderPos}%` }} />

            {/* Draggable handle */}
            <div
              className="absolute top-1/2 z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full bg-white/90 shadow-apple-md border border-apple-gray-200/80 backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
              style={{ left: `${sliderPos}%` }}
              onMouseDown={handleSliderMouseDown}
              onTouchStart={handleSliderMouseDown}
            >
              <IconSlider className="w-4 h-4 text-apple-gray-500" />
            </div>

            {/* Range input for slider control */}
            <input
              type="range" min={1} max={100} value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              className="apple-slider absolute bottom-3 left-3 right-3 z-10"
              style={{ width: 'calc(100% - 24px)' }}
            />

            {/* Labels */}
            <div className="absolute top-3 left-3 z-10">
              <span className="rounded-lg bg-apple-blue/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-white shadow-apple-sm">A</span>
            </div>
            <div className="absolute top-3 right-3 z-10">
              <span className="rounded-lg bg-apple-green/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-white shadow-apple-sm">B</span>
            </div>

            {/* Keyboard hint */}
            <div className="absolute bottom-3 right-3 z-10">
              <span className="rounded-lg bg-black/20 backdrop-blur-sm px-2 py-0.5 text-[10px] text-white/80">
                ← → {t('screenshots.adjust')}
              </span>
            </div>
          </div>
        )
      )}

      {/* Legend */}
      <div className="mt-3 flex gap-4 text-[11px] text-apple-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-apple-blue/30 bg-apple-blue-light" />
          A {t('results.a_label')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-apple-green/30 bg-apple-green-light" />
          B {t('results.b_label')}
        </span>
      </div>
    </div>
  )
}
