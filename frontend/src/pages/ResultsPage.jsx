import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useBeginnerMode } from '../contexts/BeginnerModeContext'
import { useComparison } from '../hooks/useComparison'
import { useCreateComparison } from '../hooks/useCreateComparison'
import ComparisonStatus from '../components/comparison/ComparisonStatus'
import SummaryCards from '../components/comparison/SummaryCards'
import ScreenshotPanel from '../components/comparison/ScreenshotPanel'
import VisualDiffViewer from '../components/comparison/VisualDiffViewer'
import DomDiffList from '../components/comparison/DomDiffList'
import TextDiffViewer from '../components/comparison/TextDiffViewer'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import ErrorAlert from '../components/shared/ErrorAlert'
import {
  IconChart, IconImage, IconEye, IconCode, IconText,
  IconRefresh, IconCopy, IconCheck, IconArrowLeft,
  IconTarget,
} from '../components/shared/Icons'

const SECTIONS = [
  { id: 'summary', Icon: IconChart, labelKey: 'results.nav_summary' },
  { id: 'screenshots', Icon: IconImage, labelKey: 'results.nav_screenshots' },
  { id: 'visual-diff', Icon: IconEye, labelKey: 'results.nav_visual' },
  { id: 'dom-diff', Icon: IconCode, labelKey: 'results.nav_dom' },
  { id: 'text-diff', Icon: IconText, labelKey: 'results.nav_text' },
]

function useActiveSection(sectionIds) {
  const [active, setActive] = useState(sectionIds[0])
  const observerRef = useRef(null)

  useEffect(() => {
    const els = sectionIds.map(id => document.getElementById(id)).filter(Boolean)
    if (els.length === 0) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length > 0) setActive(visible[0].target.id)
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: [0, 0.25, 0.5] }
    )

    els.forEach(el => observerRef.current.observe(el))
    return () => { if (observerRef.current) observerRef.current.disconnect() }
  }, [sectionIds])

  return active
}

function getOverallSimilarity(summary) {
  if (!summary) return null
  let domScore = 100, visualScore = 100, textScore = 100
  if (summary.dom_diff_count) domScore = Math.max(0, 100 - Math.min(summary.dom_diff_count * 0.3, 100))
  if (summary.visual_diff_percentage) visualScore = Math.max(0, 100 - summary.visual_diff_percentage)
  if (summary.text_diff_count) textScore = Math.max(0, 100 - Math.min(summary.text_diff_count * 1.5, 100))
  return Math.round(domScore * 0.3 + visualScore * 0.5 + textScore * 0.2)
}

function SimilarityBadge({ score }) {
  const { t } = useTranslation()
  const { isBeginner } = useBeginnerMode()
  if (score === null || score === undefined) return null
  let colorClass, label, barColor
  if (score >= 95) { colorClass = 'text-apple-green'; barColor = '#34C759'; label = 'almost_identical' }
  else if (score >= 80) { colorClass = 'text-apple-orange'; barColor = '#FF9500'; label = 'minor_diff' }
  else if (score >= 50) { colorClass = 'text-apple-orange'; barColor = '#FF9500'; label = 'notable_diff' }
  else { colorClass = 'text-apple-red'; barColor = '#FF3B30'; label = 'major_diff' }

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14 shrink-0">
        <svg className="h-14 w-14 -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#E8E8ED" strokeWidth="3.5" />
          <circle cx="20" cy="20" r="17" fill="none" stroke={barColor} strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 106.8} 106.8`}
            style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold tracking-tight ${colorClass}`}>{score}%</span>
      </div>
      <div>
        <p className={`text-lg font-semibold tracking-tight ${colorClass}`}>{score}% {t(`similarity.${label}`)}</p>
        <p className="text-xs text-apple-gray-400">{t(`similarity.hint_${label}`)}</p>
        {isBeginner && <p className="text-[10px] text-apple-blue/70 mt-1 leading-relaxed">{t('beginner_mode.hint_similarity')}</p>}
      </div>
    </div>
  )
}

export default function ResultsPage() {
  const { t } = useTranslation()
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useComparison(taskId)
  const reCompareMutation = useCreateComparison()
  const sectionIds = useMemo(() => SECTIONS.map(s => s.id), [])
  const activeSection = useActiveSection(sectionIds)
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef(null)

  useEffect(() => {
    return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current) }
  }, [])

  const [reCompareError, setReCompareError] = useState(null)

  const handleReCompare = useCallback(async () => {
    if (!data) return
    setReCompareError(null)
    try {
      const result = await reCompareMutation.mutateAsync({
        url_a: data.url_a, url_b: data.url_b,
        viewport_width: 1280, viewport_height: 720, full_page: true,
        comparisons: ['dom', 'visual', 'text'],
        _force: true,
      })
      if (result?.id) {
        navigate(`/compare/${result.id}`)
      } else {
        setReCompareError(t('error.unexpected'))
      }
    } catch (err) {
      setReCompareError(err?.response?.data?.detail || err?.message || t('error.unexpected'))
    }
  }, [data, reCompareMutation.mutateAsync, navigate, t])

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may be blocked; fallback silently
    }
  }, [])

  if (isLoading) return <div className="mx-auto max-w-5xl animate-fade-in"><LoadingSpinner size="lg" text={t('results.loading')} /></div>

  if (isError) return <div className="mx-auto max-w-5xl animate-fade-in"><ErrorAlert message={error?.message || t('results.failed_to_load')} onRetry={() => refetch()} /></div>

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl animate-fade-in">
        <ErrorAlert message={t('results.not_found')} />
        <Link to="/" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-apple-blue link-apple">
          <IconArrowLeft className="w-4 h-4" />{t('results.start_new')}
        </Link>
      </div>
    )
  }

  const isProcessing = data.status === 'pending' || data.status === 'processing'

  if (isProcessing) {
    return (
      <div className="mx-auto max-w-5xl animate-fade-in">
        <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-apple-blue link-apple">
          <IconArrowLeft className="w-4 h-4" />{t('results.new_comparison')}
        </Link>
        <div className="card-apple mb-4 p-4 text-sm text-apple-gray-600 space-y-1.5">
          <div className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-apple-blue text-[10px] font-bold text-white">A</span><span className="truncate">{data.url_a}</span></div>
          <div className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-apple-green text-[10px] font-bold text-white">B</span><span className="truncate">{data.url_b}</span></div>
        </div>
        <ComparisonStatus status={data.status} taskId={taskId} comparisons={data.comparisons} />
      </div>
    )
  }

  if (data.status === 'failed') {
    return (
      <div className="mx-auto max-w-5xl animate-fade-in">
        <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-apple-blue link-apple">
          <IconArrowLeft className="w-4 h-4" />{t('results.new_comparison')}
        </Link>
        <div className="card-apple mb-4 p-4 text-sm text-apple-gray-600 space-y-1.5">
          <div className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-apple-blue text-[10px] font-bold text-white">A</span><span className="truncate">{data.url_a}</span></div>
          <div className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-apple-green text-[10px] font-bold text-white">B</span><span className="truncate">{data.url_b}</span></div>
        </div>
        <ErrorAlert message={data.error || t('status.failed')} onRetry={() => refetch()} />
      </div>
    )
  }

  const similarity = getOverallSimilarity(data.summary)
  const hasVisualDiff = data.visual_diff && data.visual_diff.diff_percentage > 0

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      {/* Sticky Navigation */}
      <nav className="glass-nav sticky top-[53px] z-20 -mx-4 mb-6 border-b border-apple-gray-200/60 px-4">
        <div className="flex items-center justify-between py-2">
          <Link to="/" className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-apple-blue link-apple mr-2">
            <IconArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('results.new_comparison')}</span>
          </Link>
          <div className="segmented-control overflow-x-auto">
            {SECTIONS.map(({ id, Icon: NavIcon, labelKey }) => (
              <a key={id} href={`#${id}`} className={`flex items-center gap-1 whitespace-nowrap ${activeSection === id ? 'active' : ''}`}>
                <NavIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t(labelKey)}</span>
              </a>
            ))}
          </div>
          {data.status === 'partial' && (
            <span className="badge-apple ml-2 bg-apple-orange-light text-apple-orange shrink-0">{t('results.partial_results')}</span>
          )}
        </div>
      </nav>

      {/* Quick Insight Card */}
      <div className="card-apple mb-6 p-5 sm:p-6 animate-slide-up">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <SimilarityBadge score={similarity} />
            <div className="text-sm space-y-1">
              {data.summary?.dom_diff_count !== undefined && (
                <p className="text-apple-gray-600">
                  <span className="font-medium">{t('summary.dom_structure')}: </span>
                  <span className={data.summary.dom_diff_count > 0 ? 'text-apple-orange font-medium' : 'text-apple-green'}>{data.summary.dom_diff_count} {t('summary.differences')}</span>
                </p>
              )}
              {data.summary?.visual_diff_percentage !== undefined && (
                <p className="text-apple-gray-600">
                  <span className="font-medium">{t('summary.visual')}: </span>
                  <span className={data.summary.visual_diff_percentage > 1 ? 'text-apple-red font-medium' : 'text-apple-green'}>{data.summary.visual_diff_percentage}% {t('summary.percent_diff')}</span>
                </p>
              )}
              {data.summary?.text_diff_count !== undefined && (
                <p className="text-apple-gray-600">
                  <span className="font-medium">{t('summary.text_content')}: </span>
                  <span className={data.summary.text_diff_count > 0 ? 'text-apple-orange font-medium' : 'text-apple-green'}>{data.summary.text_diff_count} {t('summary.changes')}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReCompare} disabled={reCompareMutation.isPending} className="btn-apple btn-apple-secondary text-[12px]">
              <IconRefresh className={`w-3.5 h-3.5 ${reCompareMutation.isPending ? 'animate-spin' : ''}`} />
              {t('results.re_compare')}
            </button>
            <button onClick={handleCopyLink} className="btn-apple btn-apple-secondary text-[12px]">
              {copied ? <IconCheck className="w-3.5 h-3.5 text-apple-green" /> : <IconCopy className="w-3.5 h-3.5" />}
              {copied ? t('results.copied') : t('results.copy_link')}
            </button>
          </div>
        </div>

        {reCompareError && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-apple-red-light bg-apple-red-light/50 p-3 text-[12px] text-apple-red">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {reCompareError}
          </div>
        )}

        {hasVisualDiff && data.visual_diff.diff_regions && data.visual_diff.diff_regions.length > 0 && (
          <div className="mt-4 rounded-xl bg-apple-blue-light/50 p-3.5 flex items-center gap-3">
            <IconTarget className="w-4 h-4 text-apple-blue shrink-0" />
            <div>
              <p className="text-[13px] font-medium text-apple-blue">{t('results.top_diff_regions', { count: data.visual_diff.diff_regions.length })}</p>
              <p className="text-[11px] text-apple-gray-500 mt-0.5">{t('results.top_diff_regions_hint')}</p>
            </div>
          </div>
        )}
      </div>

      {/* URL info */}
      <div className="mb-6 grid gap-2 sm:grid-cols-2 animate-slide-up">
        <div className="flex items-center gap-2 rounded-xl bg-apple-blue-light/50 border border-apple-blue-light px-3.5 py-2.5 text-[12px]">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-apple-blue text-[10px] font-bold text-white">A</span>
          <a href={data.url_a} target="_blank" rel="noopener noreferrer" className="text-apple-blue font-medium truncate hover:underline">{data.url_a}</a>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-apple-green-light/50 border border-apple-green-light px-3.5 py-2.5 text-[12px]">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-apple-green text-[10px] font-bold text-white">B</span>
          <a href={data.url_b} target="_blank" rel="noopener noreferrer" className="text-apple-green font-medium truncate hover:underline">{data.url_b}</a>
        </div>
      </div>

      {/* Summary Cards */}
      <section id="summary" className="scroll-mt-28 animate-slide-up">
        {data.summary && <SummaryCards summary={data.summary} similarity={similarity} />}
      </section>

      <div className="mt-6 space-y-6">
        <section id="screenshots" className="scroll-mt-28">
          <ScreenshotPanel taskId={taskId} captureA={data.capture_a} captureB={data.capture_b} urlA={data.url_a} urlB={data.url_b} />
        </section>

        {data.visual_diff && (
          <section id="visual-diff" className="scroll-mt-28">
            <VisualDiffViewer taskId={taskId} visualDiff={data.visual_diff} />
          </section>
        )}

        {data.dom_diff && (
          <section id="dom-diff" className="scroll-mt-28">
            <DomDiffList domDiff={data.dom_diff} />
          </section>
        )}

        {data.text_diff && (
          <section id="text-diff" className="scroll-mt-28">
            <TextDiffViewer textDiff={data.text_diff} />
          </section>
        )}
      </div>
    </div>
  )
}
