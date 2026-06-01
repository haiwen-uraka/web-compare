import { useTranslation } from 'react-i18next'
import { useState, useRef, useCallback, useEffect } from 'react'
import { IconTarget, IconLayers, IconSlider } from '../shared/Icons'
import { useBeginnerMode } from '../../contexts/BeginnerModeContext'

function getRegionSeverity(ratio) {
  if (ratio > 50) return 'high'
  if (ratio > 20) return 'medium'
  return 'low'
}

export default function VisualDiffViewer({ taskId, visualDiff }) {
  const { t } = useTranslation()
  const { isBeginner } = useBeginnerMode()
  const [view, setView] = useState('diff')
  const [imgError, setImgError] = useState({})
  const [imgLoaded, setImgLoaded] = useState({})
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 })
  const [activeRegion, setActiveRegion] = useState(null)
  const [showRegions, setShowRegions] = useState(true)
  const [swipePos, setSwipePos] = useState(50)
  const [swipeDragging, setSwipeDragging] = useState(false)
  const [onionOpacity, setOnionOpacity] = useState(50)
  const containerRef = useRef(null)
  const swipeRef = useRef(null)
  const imgRef = useRef(null)

  if (!visualDiff) return null

  const screenshotAUrl = `/api/comparisons/${taskId}/screenshots/a`
  const screenshotBUrl = `/api/comparisons/${taskId}/screenshots/b`
  const diffUrl = `/api/comparisons/${taskId}/diffs/visual`

  const noDiff = visualDiff.diff_percentage === 0
  const regions = visualDiff.diff_regions || []
  const diffReady = imgLoaded['diff'] && imageSize.w > 0

  const handleImageLoad = useCallback((e) => {
    setImageSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })
  }, [])

  // Scroll to center a region in the container
  const scrollToRegion = useCallback((region, index) => {
    setActiveRegion(index)
    const el = containerRef.current
    if (!el) return

    const cx = region.x + region.width / 2
    const cy = region.y + region.height / 2

    el.scrollTo({
      left: Math.max(0, cx - el.clientWidth / 2),
      top: Math.max(0, cy - el.clientHeight / 2),
      behavior: 'smooth',
    })
  }, [])

  // Swipe drag — global listeners so dragging works even outside the container
  const handleSwipeMouseDown = useCallback((e) => {
    e.preventDefault()
    setSwipeDragging(true)
  }, [])

  useEffect(() => {
    if (!swipeDragging) return
    const handleMove = (e) => {
      if (!swipeRef.current) return
      const rect = swipeRef.current.getBoundingClientRect()
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
      setSwipePos(Math.max(5, Math.min(95, Math.round((x / rect.width) * 100))))
    }
    const handleUp = () => setSwipeDragging(false)
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
  }, [swipeDragging])

  // Switch view and reset
  const switchView = useCallback((newView) => {
    setView(newView)
    setActiveRegion(null)
  }, [])

  if (noDiff) {
    return (
      <div id="visual-diff" className="card-apple p-5">
        <h3 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-apple-gray-900 mb-3">
          <IconLayers className="w-5 h-5 text-apple-green" />
          {t('visual_diff.title')}
        </h3>
        <div className="flex items-center gap-2 rounded-xl bg-apple-green-light p-4 text-apple-green">
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 12 9 17 20 6" /></svg>
          <span className="text-[13px] font-medium">{t('visual_diff.no_diff')}</span>
        </div>
      </div>
    )
  }

  const viewTabs = [
    { key: 'diff', label: t('visual_diff.diff'), desc: t('visual_diff.diff') },
    { key: 'overlay', label: t('screenshots.slider_overlay'), desc: t('screenshots.slider_overlay') },
    { key: 'onion', label: t('visual_diff.onion_skin'), desc: t('visual_diff.onion_skin') },
  ]

  // Render region overlays (shared between diff and onion views)
  function renderRegionOverlays(isDiffView) {
    if (!showRegions || !diffReady) return null
    return regions.map((region, i) => {
      const sev = getRegionSeverity(region.diff_ratio)
      const isActive = activeRegion === i
      const labelTop = region.y < 24 ? region.y + 4 : -22
      return (
        <div
          key={i}
          className="absolute cursor-pointer transition-all duration-200"
          style={{
            left: region.x, top: region.y, width: region.width, height: region.height,
            border: isActive
              ? '2.5px solid #007AFF'
              : isDiffView
                ? (sev === 'high' ? '2px solid #FF3B30' : sev === 'medium' ? '2px solid #FF9500' : '1.5px solid rgba(0,122,255,0.5)')
                : '1.5px dashed rgba(255,59,48,0.6)',
            borderRadius: 3,
            background: isActive ? 'rgba(0,122,255,0.12)' : (isDiffView && sev === 'high' ? 'rgba(255,59,48,0.10)' : 'transparent'),
            boxShadow: isActive ? '0 0 0 3px rgba(0,122,255,0.2), 0 0 12px rgba(0,122,255,0.15)' : (isDiffView && sev === 'high' ? '0 0 8px rgba(255,59,48,0.2)' : 'none'),
          }}
          onClick={() => scrollToRegion(region, i)}
          onMouseEnter={() => setActiveRegion(i)}
          onMouseLeave={() => setActiveRegion(null)}
        >
          {isDiffView && (
            <span
              className="absolute font-bold px-1.5 py-0.5 rounded text-white shadow-sm whitespace-nowrap"
              style={{ top: labelTop, left: 0, fontSize: 10, background: isActive ? '#007AFF' : sev === 'high' ? '#FF3B30' : sev === 'medium' ? '#FF9500' : '#007AFF' }}
            >
              #{i + 1} {region.diff_ratio}%
            </span>
          )}
        </div>
      )
    })
  }

  // Render region list sidebar
  function renderRegionSidebar() {
    if (view === 'overlay' || !showRegions || regions.length === 0) return null
    return (
      <div className="hidden lg:flex lg:flex-col lg:w-56 lg:shrink-0">
        <p className="text-[12px] font-semibold text-apple-gray-700 mb-2 flex items-center gap-1.5 shrink-0">
          <IconTarget className="w-3.5 h-3.5" />
          {t('visual_diff.diff_regions')}
        </p>
        <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 min-h-0">
          {regions.map((region, i) => {
            const sev = getRegionSeverity(region.diff_ratio)
            const isActive = activeRegion === i
            const sc = {
              high: { border: '#FF3B30', bg: 'rgba(255,59,48,0.06)', text: '#FF3B30', label: 'HIGH' },
              medium: { border: '#FF9500', bg: 'rgba(255,149,0,0.06)', text: '#FF9500', label: 'MED' },
              low: { border: '#007AFF', bg: 'rgba(0,122,255,0.06)', text: '#007AFF', label: 'LOW' },
            }[sev]
            return (
              <button
                key={i}
                type="button"
                onClick={() => scrollToRegion(region, i)}
                onMouseEnter={() => setActiveRegion(i)}
                onMouseLeave={() => setActiveRegion(null)}
                className="w-full text-left rounded-lg px-2.5 py-2 text-[11px] transition-all hover:shadow-apple-sm"
                style={{
                  borderLeft: `3px solid ${sc.border}`,
                  background: isActive ? sc.bg : 'transparent',
                  outline: isActive ? `2px solid ${sc.border}40` : 'none',
                  outlineOffset: -2,
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-apple-gray-800">#{i + 1}</span>
                    <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: `${sc.border}15`, color: sc.text }}>{sc.label}</span>
                  </div>
                  <span className="font-bold" style={{ color: sc.text, fontSize: 13 }}>{region.diff_ratio}%</span>
                </div>
                <p className="text-apple-gray-500 mt-0.5">{region.width}×{region.height}px</p>
                <div className="mt-1 h-1 rounded-full bg-apple-gray-200 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(region.diff_ratio, 100)}%`, background: sc.border }} />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div id="visual-diff" className="card-apple p-5">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-apple-gray-900">
          <IconLayers className="w-5 h-5 text-apple-blue" />
          {isBeginner ? t('beginner_mode.visual_diff_title') : t('visual_diff.title')}
          <span className="text-[13px] font-normal text-apple-gray-500">
            {isBeginner ? t('beginner_mode.diff_percentage') : t('visual_diff.diff_percentage', { percentage: visualDiff.diff_percentage })}
          </span>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="segmented-control">
            {viewTabs.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => switchView(key)} className={view === key ? 'active' : ''} title={viewTabs.find(v => v.key === key)?.desc}>
                {label}
              </button>
            ))}
          </div>
          {view === 'onion' && (
            <div className="flex items-center gap-1.5 rounded-xl bg-apple-gray-100 px-2.5 py-1">
              <span className="text-[10px] font-medium text-apple-blue">A</span>
              <input type="range" min={0} max={100} value={onionOpacity} onChange={(e) => setOnionOpacity(Number(e.target.value))} className="apple-slider w-24" />
              <span className="text-[10px] font-medium text-apple-green">B</span>
              <span className="text-[10px] text-apple-gray-500 min-w-[28px] text-right">{onionOpacity}%</span>
            </div>
          )}
          {view !== 'overlay' && regions.length > 0 && (
            <button type="button" onClick={() => setShowRegions(!showRegions)}
              className={`btn-apple btn-apple-secondary text-[11px] ${showRegions ? '!bg-apple-blue-light !text-apple-blue !border-apple-blue/20' : ''}`}>
              <IconTarget className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{regions.length} {t('visual_diff.regions')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Beginner hint banner */}
      {isBeginner && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-apple-blue-light/50 border border-apple-blue-light/60 px-3.5 py-2.5 text-[11px] text-apple-gray-600 leading-relaxed">
          <span className="shrink-0 mt-0.5">💡</span>
          <span>{t('beginner_mode.hint_visual_banner')}</span>
        </div>
      )}

      <div className="flex gap-4 items-stretch">
          {/* ── DIFF VIEW — scrollable ── */}
          {view === 'diff' && (
            <div
              ref={containerRef}
              className="flex-1 min-w-0 overflow-auto rounded-xl border border-apple-gray-200"
              style={{ height: 1400, background: '#fafafa' }}
            >
              {!imgError['diff'] ? (
                <div className="relative inline-block" style={imageSize.w ? { width: imageSize.w, height: imageSize.h, background: '#fff' } : undefined}>
                  {!imgLoaded['diff'] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-apple-gray-100 min-h-[300px] pointer-events-none z-10">
                      <div className="skeleton h-full w-full" />
                    </div>
                  )}
                  <img src={screenshotAUrl} alt="" className="max-w-none block" draggable={false} />
                  <img
                    ref={imgRef}
                    src={diffUrl}
                    alt={t('visual_diff.diff')}
                    className={`max-w-none absolute top-0 left-0 transition-opacity duration-300 mix-blend-multiply ${imgLoaded['diff'] ? 'opacity-80' : 'opacity-0'}`}
                    draggable={false}
                    onLoad={(e) => { setImgLoaded(p => ({ ...p, diff: true })); handleImageLoad(e) }}
                    onError={() => setImgError(e => ({ ...e, diff: true }))}
                  />
                  {renderRegionOverlays(true)}
                </div>
              ) : (
                <div className="flex h-48 w-full items-center justify-center text-sm text-apple-red">
                  {t('visual_diff.diff_unavailable')}
                </div>
              )}
            </div>
          )}

          {/* ── OVERLAY / SWIPE VIEW ── */}
          {view === 'overlay' && (
            <div
              ref={swipeRef}
              className={`flex-1 min-w-0 relative overflow-hidden rounded-xl border border-apple-gray-200 select-none ${swipeDragging ? 'cursor-ew-resize' : ''}`}
              style={{ background: '#f5f5f7', height: 1400 }}
            >
              <div className="relative overflow-auto h-[1400px]">
                <img src={screenshotBUrl} alt="B" className="max-w-none block" draggable={false} />
              </div>
              <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - swipePos}% 0 0)` }}>
                <img src={screenshotAUrl} alt="A" className="max-w-none block" draggable={false} />
              </div>
              <div className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_8px_rgba(0,0,0,0.2)] pointer-events-none z-10" style={{ left: `${swipePos}%` }} />
              <div
                className="absolute top-1/2 z-20 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full bg-white/90 shadow-apple-md border border-apple-gray-200/80 backdrop-blur-sm transition-transform hover:scale-110 active:scale-95"
                style={{ left: `${swipePos}%` }}
                onMouseDown={handleSwipeMouseDown}
                onTouchStart={handleSwipeMouseDown}
              >
                <IconSlider className="w-5 h-5 text-apple-gray-500" />
              </div>
              <input type="range" min={1} max={100} value={swipePos} onChange={(e) => setSwipePos(Number(e.target.value))} className="apple-slider absolute bottom-3 left-3 right-3 z-10" style={{ width: 'calc(100% - 24px)' }} />
              <div className="absolute top-3 left-3 z-10"><span className="rounded-lg bg-apple-blue/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-white shadow-apple-sm">A</span></div>
              <div className="absolute top-3 right-3 z-10"><span className="rounded-lg bg-apple-green/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-white shadow-apple-sm">B</span></div>
              <div className="absolute bottom-3 right-3 z-10"><span className="rounded-lg bg-black/20 backdrop-blur-sm px-2 py-0.5 text-[10px] text-white/80">← → {t('screenshots.adjust')}</span></div>
            </div>
          )}

          {/* ── ONION SKIN VIEW — scrollable ── */}
          {view === 'onion' && (
            <div
              ref={containerRef}
              className="flex-1 min-w-0 overflow-auto rounded-xl border border-apple-gray-200"
              style={{ height: 1400, background: '#fafafa' }}
            >
              <div className="relative inline-block" style={imageSize.w ? { width: imageSize.w, height: imageSize.h, background: '#fff' } : undefined}>
                <img src={screenshotAUrl} alt="A" className="max-w-none block" draggable={false}
                  style={{ opacity: 1 - onionOpacity / 100 }} />
                <img src={screenshotBUrl} alt="B" className="max-w-none absolute top-0 left-0" draggable={false}
                  style={{ opacity: onionOpacity / 100 }} />
                {renderRegionOverlays(false)}
              </div>
            </div>
          )}

        {renderRegionSidebar()}
      </div>

      <p className="mt-1.5 text-[10px] text-apple-gray-400">{t('visual_diff.scroll_zoom')} · {t('visual_diff.drag_to_pan')}</p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-apple-gray-400">
        <span className="font-medium text-apple-gray-500">{t('visual_diff.pixel_diff')}</span>
        <span>{visualDiff.diff_pixel_count.toLocaleString()} / {visualDiff.total_pixels.toLocaleString()} {t('visual_diff.pixels')}</span>
        {(visualDiff.width_a || visualDiff.width_b) && (
          <>
            <span className="text-apple-gray-300">|</span>
            <span>A: {visualDiff.width_a}×{visualDiff.height_a}</span>
            {visualDiff.width_b && <span>B: {visualDiff.width_b}×{visualDiff.height_b}</span>}
          </>
        )}
      </div>
    </div>
  )
}
