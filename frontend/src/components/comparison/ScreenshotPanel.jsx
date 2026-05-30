import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { IconImage, IconSlider, IconLayout, IconLayers } from '../shared/Icons'

function LazyImage({ src, alt, className, onError, wrapperClass }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef(null)

  useEffect(() => {
    const el = imgRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.src = src; observer.disconnect() } },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [src])

  return (
    <div className={`relative ${wrapperClass || ''}`}>
      {!loaded && !error && (
        <div className="flex h-48 items-center justify-center bg-apple-gray-100 rounded-xl">
          <div className="skeleton h-full w-full rounded-xl" />
        </div>
      )}
      {error ? (
        <div className="flex h-48 items-center justify-center rounded-xl bg-apple-red-light text-[13px] text-apple-red border border-apple-red/20">
          {alt} unavailable
        </div>
      ) : (
        <img
          ref={imgRef}
          alt={alt}
          className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
          onLoad={() => setLoaded(true)}
          onError={() => { setError(true); onError && onError() }}
        />
      )}
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

  const imgUrlA = `/api/comparisons/${taskId}/screenshots/a`
  const imgUrlB = `/api/comparisons/${taskId}/screenshots/b`
  const hasErrorA = captureA?.error || imgErrorA
  const hasErrorB = captureB?.error || imgErrorB

  const onLeftScroll = useCallback(() => {
    if (!syncScroll || !leftRef.current || !rightRef.current) return
    rightRef.current.scrollTop = leftRef.current.scrollTop
    rightRef.current.scrollLeft = leftRef.current.scrollLeft
  }, [syncScroll])

  const onRightScroll = useCallback(() => {
    if (!syncScroll || !leftRef.current || !rightRef.current) return
    leftRef.current.scrollTop = rightRef.current.scrollTop
    leftRef.current.scrollLeft = rightRef.current.scrollLeft
  }, [syncScroll])

  // Slider drag handlers
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
      if (e.key === 'ArrowLeft') setSliderPos(p => Math.max(0, p - 1))
      if (e.key === 'ArrowRight') setSliderPos(p => Math.min(100, p + 1))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [mode])

  if (!captureA && !captureB) return null

  const zoomClass = zoom === 'fit' ? 'max-h-[500px]' : ''

  return (
    <div id="screenshots" className="card-apple p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-apple-gray-900">
          <IconImage className="w-5 h-5 text-apple-blue" />
          {t('screenshots.title')}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode selector */}
          <div className="segmented-control">
            <button type="button" onClick={() => setMode('side-by-side')} className={mode === 'side-by-side' ? 'active' : ''}>
              <IconLayout className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1">{t('screenshots.side_by_side')}</span>
            </button>
            <button type="button" onClick={() => setMode('slider')} className={`${mode === 'slider' ? 'active' : ''} ${hasErrorA || hasErrorB ? 'opacity-40 cursor-not-allowed' : ''}`} disabled={hasErrorA || hasErrorB}>
              <IconLayers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1">{t('screenshots.slider_overlay')}</span>
            </button>
          </div>
          {/* Zoom selector */}
          <div className="segmented-control">
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
          {mode === 'side-by-side' && zoom === 'scroll' && (
            <button onClick={() => setSyncScroll(!syncScroll)}
              className={`btn-apple btn-apple-secondary text-[11px] ${syncScroll ? '!bg-apple-blue-light !text-apple-blue' : ''}`}>
              {syncScroll ? t('screenshots.synced') : t('screenshots.unsynced')}
            </button>
          )}
        </div>
      </div>

      {/* Side-by-side mode */}
      {mode === 'side-by-side' && (
        <div className={`grid gap-4 ${hasErrorA || hasErrorB ? 'sm:grid-cols-1' : 'sm:grid-cols-2'}`}>
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-apple-blue truncate" title={urlA}>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-apple-blue text-[9px] font-bold text-white">A</span>
              {urlA}
            </p>
            {hasErrorA ? (
              <div className="flex h-48 items-center justify-center rounded-xl bg-apple-red-light text-sm text-apple-red">{t('screenshots.unavailable')}</div>
            ) : (
              <div ref={leftRef} onScroll={onLeftScroll} className={`overflow-auto rounded-xl border border-apple-gray-200 ${zoomClass}`}>
                <LazyImage src={imgUrlA} alt={t('screenshots.alt_a')}
                  className={`${zoom === 'fit' ? 'w-full object-contain' : zoom === 'full' ? 'w-full' : 'w-auto max-w-none'}`}
                  onError={() => setImgErrorA(true)} wrapperClass="min-h-[200px]" />
              </div>
            )}
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-apple-green truncate" title={urlB}>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-apple-green text-[9px] font-bold text-white">B</span>
              {urlB}
            </p>
            {hasErrorB ? (
              <div className="flex h-48 items-center justify-center rounded-xl bg-apple-red-light text-sm text-apple-red">{t('screenshots.unavailable')}</div>
            ) : (
              <div ref={rightRef} onScroll={onRightScroll} className={`overflow-auto rounded-xl border border-apple-gray-200 ${zoomClass}`}>
                <LazyImage src={imgUrlB} alt={t('screenshots.alt_b')}
                  className={`${zoom === 'fit' ? 'w-full object-contain' : zoom === 'full' ? 'w-full' : 'w-auto max-w-none'}`}
                  onError={() => setImgErrorB(true)} wrapperClass="min-h-[200px]" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slider overlay mode */}
      {mode === 'slider' && !hasErrorA && !hasErrorB && (
        <div
          ref={sliderRef}
          className={`relative overflow-hidden rounded-xl border border-apple-gray-200 select-none ${dragging ? 'cursor-ew-resize' : ''}`}
          style={{ background: '#f5f5f7' }}
        >
          {/* Base layer: Screenshot B */}
          <div className="relative">
            <LazyImage src={imgUrlB} alt={t('screenshots.alt_base')} className="w-full" />
          </div>

          {/* Overlay layer: Screenshot A clipped */}
          <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
            <LazyImage src={imgUrlA} alt={t('screenshots.alt_overlay')} className="absolute top-0 left-0 w-full max-w-none"
              style={{ width: `${100 / (sliderPos / 100)}%`, minWidth: '100%' }} />
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
            type="range" min={0} max={100} value={sliderPos}
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
