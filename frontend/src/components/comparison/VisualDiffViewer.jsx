import { useTranslation } from 'react-i18next'
import { useState, useRef, useCallback, useEffect } from 'react'
import { IconZoomIn, IconZoomOut, IconReset, IconTarget, IconChevronRight, IconLayers } from '../shared/Icons'

export default function VisualDiffViewer({ taskId, visualDiff }) {
  const { t } = useTranslation()
  const [view, setView] = useState('diff')
  const [imgError, setImgError] = useState({})
  const [zoom, setZoom] = useState(1)
  const [panning, setPanning] = useState(false)
  const [panPos, setPanPos] = useState({ x: 0, y: 0 })
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 })
  const [activeRegion, setActiveRegion] = useState(null)
  const [showRegions, setShowRegions] = useState(true)
  const imgRef = useRef(null)
  const containerRef = useRef(null)
  const regionListRef = useRef(null)

  if (!visualDiff) return null

  const diffUrl = `/api/comparisons/${taskId}/diffs/visual`
  const hlAUrl = `/api/comparisons/${taskId}/diffs/visual-highlight/a`
  const hlBUrl = `/api/comparisons/${taskId}/diffs/visual-highlight/b`

  const noDiff = visualDiff.diff_percentage === 0
  const currentSrc = view === 'diff' ? diffUrl : view === 'hl-a' ? hlAUrl : hlBUrl
  const regions = visualDiff.diff_regions || []
  const maxW = imageSize.w || visualDiff.width_a || visualDiff.width_b || 1280
  const maxH = imageSize.h || Math.max(visualDiff.height_a || 0, visualDiff.height_b || 0) || 720

  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom(z => Math.max(0.25, Math.min(5, z + delta)))
    }
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (zoom > 1) {
      setPanning(true)
      setPanStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y })
    }
  }, [zoom, panPos])

  const handleMouseMove = useCallback((e) => {
    if (panning && zoom > 1) {
      setPanPos({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    }
  }, [panning, panStart])

  const handleMouseUp = useCallback(() => setPanning(false), [])

  const resetZoom = useCallback(() => {
    setZoom(1)
    setPanPos({ x: 0, y: 0 })
    setActiveRegion(null)
  }, [])

  const handleImageLoad = useCallback((e) => {
    setImageSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })
  }, [])

  const scrollToRegion = useCallback((region) => {
    setActiveRegion(region.y)
    if (!containerRef.current) return
    // Calculate position to center the region
    const containerH = containerRef.current.clientHeight
    const targetY = region.y * zoom - containerH / 2 + region.height * zoom / 2
    setPanPos(prev => ({ ...prev, y: -targetY }))
    // Adjust zoom to fit region width if zoom = 1
    if (zoom === 1 && region.width < maxW * 0.6) {
      setZoom(Math.min(3, containerRef.current.clientWidth / region.width * 0.8))
    }
  }, [zoom, maxW])

  const highlightRegion = useCallback((y) => {
    setActiveRegion(y)
  }, [])

  if (noDiff) {
    return (
      <div id="visual-diff" className="card-apple p-5">
        <h3 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-apple-gray-900 mb-3">
          <IconLayers className="w-5 h-5 text-apple-green" />
          {t('visual_diff.title')}
        </h3>
        <div className="flex items-center gap-2 rounded-xl bg-apple-green-light p-4 text-apple-green">
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 12 9 17 20 6" />
          </svg>
          <span className="text-[13px] font-medium">{t('visual_diff.no_diff')}</span>
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
          {t('visual_diff.title')}
          <span className="text-[13px] font-normal text-apple-gray-500">
            {t('visual_diff.diff_percentage', { percentage: visualDiff.diff_percentage })}
          </span>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {/* View selector */}
          <div className="segmented-control">
            {[
              { key: 'diff', label: t('visual_diff.diff') },
              { key: 'hl-a', label: t('visual_diff.a_highlight') },
              { key: 'hl-b', label: t('visual_diff.b_highlight') },
            ].map(({ key, label }) => (
              <button key={key} type="button" onClick={() => setView(key)} className={`${view === key ? 'active' : ''}`}>
                {label}
              </button>
            ))}
          </div>
          {/* Region toggle */}
          {regions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowRegions(!showRegions)}
              className={`btn-apple btn-apple-secondary text-[11px] ${showRegions ? '!bg-apple-blue-light !text-apple-blue !border-apple-blue/20' : ''}`}
            >
              <IconTarget className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{regions.length} {t('visual_diff.regions')}</span>
            </button>
          )}
          {/* Zoom controls */}
          <div className="flex items-center rounded-xl bg-apple-gray-100 p-0.5">
            <button type="button" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="icon-btn rounded-lg px-1.5 py-1 text-apple-gray-500 hover:text-apple-gray-700">
              <IconZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="min-w-[42px] text-center text-[11px] font-medium text-apple-gray-600">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom(z => Math.min(5, z + 0.25))} className="icon-btn rounded-lg px-1.5 py-1 text-apple-gray-500 hover:text-apple-gray-700">
              <IconZoomIn className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={resetZoom} className="icon-btn rounded-lg px-1.5 py-1 text-apple-gray-400 hover:text-apple-gray-600">
              <IconReset className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Diff image with regions */}
        <div className="flex-1 min-w-0">
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-xl border border-apple-gray-200 bg-[#fafafa]"
            style={{ cursor: zoom > 1 ? (panning ? 'grabbing' : 'grab') : 'default', minHeight: 300 }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="flex items-start justify-center transition-transform duration-75"
              style={{
                transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
            >
              {!imgError[view] ? (
                <div className="relative inline-block">
                  <img
                    ref={imgRef}
                    src={currentSrc}
                    alt={t('visual_diff.diff')}
                    className="max-w-none"
                    draggable={false}
                    onLoad={handleImageLoad}
                    onError={() => setImgError(e => ({ ...e, [view]: true }))}
                  />
                  {/* Diff region overlays */}
                  {showRegions && regions.map((region, i) => (
                    <div
                      key={i}
                      className={`absolute border-2 rounded transition-all duration-200 cursor-pointer ${
                        activeRegion === region.y
                          ? 'border-apple-blue bg-apple-blue/15 shadow-[0_0_0_4px_rgba(0,122,255,0.2)] z-10'
                          : 'border-apple-red/60 bg-transparent hover:border-apple-red hover:bg-apple-red/8'
                      }`}
                      style={{
                        left: region.x,
                        top: region.y,
                        width: region.width,
                        height: region.height,
                      }}
                      onClick={() => scrollToRegion(region)}
                      onMouseEnter={() => highlightRegion(region.y)}
                      onMouseLeave={() => highlightRegion(null)}
                      title={`#${i + 1}: ${region.diff_ratio}% diff`}
                    >
                      <span className={`absolute -top-5 left-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        activeRegion === region.y ? 'bg-apple-blue text-white' : 'bg-apple-red text-white'
                      }`}>
                        #{i + 1} {region.diff_ratio}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-48 w-full items-center justify-center text-sm text-apple-red">
                  {view === 'diff' ? t('visual_diff.diff_unavailable') : t('visual_diff.hl_unavailable')}
                </div>
              )}
            </div>
          </div>

          {/* Zoom hint */}
          {zoom === 1 && (
            <p className="mt-1.5 text-[10px] text-apple-gray-400">Ctrl+{t('visual_diff.scroll_zoom')} &middot; {t('visual_diff.drag_to_pan')}</p>
          )}
        </div>

        {/* Region list sidebar */}
        {showRegions && regions.length > 0 && (
          <div ref={regionListRef} className="hidden lg:block w-56 shrink-0">
            <p className="text-[12px] font-semibold text-apple-gray-700 mb-2 flex items-center gap-1.5">
              <IconTarget className="w-3.5 h-3.5" />
              {t('visual_diff.diff_regions')}
            </p>
            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {regions.map((region, i) => {
                const severity = region.diff_ratio > 50 ? 'high' : region.diff_ratio > 20 ? 'medium' : 'low'
                const colors = {
                  high: 'border-l-apple-red bg-apple-red-light/30',
                  medium: 'border-l-apple-orange bg-apple-orange-light/30',
                  low: 'border-l-apple-blue bg-apple-blue-light/30',
                }
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToRegion(region)}
                    onMouseEnter={() => highlightRegion(region.y)}
                    onMouseLeave={() => highlightRegion(null)}
                    className={`w-full text-left rounded-lg border-l-[3px] px-2.5 py-2 text-[11px] transition-all hover:shadow-apple-sm ${
                      colors[severity]
                    } ${activeRegion === region.y ? 'ring-2 ring-apple-blue/30 scale-[1.02]' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-apple-gray-800">#{i + 1}</span>
                      <span className={`font-medium ${
                        severity === 'high' ? 'text-apple-red' : severity === 'medium' ? 'text-apple-orange' : 'text-apple-blue'
                      }`}>{region.diff_ratio}%</span>
                    </div>
                    <p className="text-apple-gray-500 mt-0.5">{region.width}×{region.height}px</p>
                    <p className="text-apple-gray-400 text-[10px] mt-0.5">{region.diff_pixel_count.toLocaleString()} px diff</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pixel diff stats */}
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
