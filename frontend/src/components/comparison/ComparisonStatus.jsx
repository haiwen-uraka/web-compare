import { useTranslation } from 'react-i18next'
import { useState, useEffect, useRef, useMemo } from 'react'

const ALL_PHASES = [
  { key: 'queued', icon: '⏳', progress: 5 },
  { key: 'capturing_a', icon: '📸', progress: 20 },
  { key: 'capturing_b', icon: '📸', progress: 35 },
  { key: 'comparing_dom', icon: '🔍', progress: 50, dimension: 'dom' },
  { key: 'comparing_visual', icon: '🎨', progress: 70, dimension: 'visual' },
  { key: 'comparing_text', icon: '📝', progress: 85, dimension: 'text' },
  { key: 'completed', icon: '✅', progress: 100 },
]

export default function ComparisonStatus({ status, taskId, comparisons = ['dom', 'visual', 'text'] }) {
  const { t } = useTranslation()
  const [currentPhase, setCurrentPhase] = useState('queued')
  const eventSourceRef = useRef(null)

  // Filter phases based on selected comparisons
  const phases = useMemo(() => {
    return ALL_PHASES.filter(phase => {
      // Always show queued, capturing, and completed phases
      if (!phase.dimension) return true
      // Only show comparison phases that were selected
      return comparisons.includes(phase.dimension)
    })
  }, [comparisons])

  // Use SSE for real-time progress if taskId is provided
  useEffect(() => {
    if (!taskId || status === 'completed' || status === 'failed' || status === 'partial') {
      return
    }

    const eventSource = new EventSource(`/api/comparisons/${taskId}/progress`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.phase) {
          setCurrentPhase(data.phase)
        }
      } catch {
        // Ignore parse errors
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [taskId, status])

  // Update phase based on status prop
  useEffect(() => {
    if (status === 'pending') setCurrentPhase('queued')
    else if (status === 'processing') setCurrentPhase('comparing_dom')
    else if (status === 'completed' || status === 'partial') setCurrentPhase('completed')
  }, [status])

  const currentPhaseIndex = phases.findIndex(p => p.key === currentPhase)
  const progress = currentPhaseIndex >= 0 ? phases[currentPhaseIndex].progress : 0

  return (
    <div className="rounded-xl border border-gray-200 dark:border-apple-gray-700 bg-white dark:bg-apple-gray-800 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        {(status === 'pending' || status === 'processing') && (
          <div className="h-5 w-5 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        )}
        {status === 'completed' && (
          <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 12 9 17 20 6" /></svg>
          </div>
        )}
        {status === 'partial' && (
          <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4m0 4h.01" /></svg>
          </div>
        )}
        {status === 'failed' && (
          <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        )}
        <div>
          <p className="font-medium text-gray-900 dark:text-apple-gray-100">
            {status === 'pending' && t('status.queued')}
            {status === 'processing' && t('status.running')}
            {status === 'completed' && t('status.complete')}
            {status === 'partial' && t('status.partial_complete')}
            {status === 'failed' && t('status.failed')}
          </p>
          <p className="text-sm text-gray-500 dark:text-apple-gray-400">
            {status === 'pending' && t('status.waiting')}
            {status === 'processing' && t(`phases.${currentPhase}`)}
            {status === 'completed' && t('status.all_checks')}
            {status === 'partial' && t('status.some_errors')}
            {status === 'failed' && t('status.error_occurred')}
          </p>
        </div>
      </div>

      {/* Progress steps */}
      {(status === 'pending' || status === 'processing') && (
        <div className="mt-4 space-y-2">
          {phases.slice(0, -1).map((phase, index) => {
            const isCompleted = index < currentPhaseIndex
            const isCurrent = index === currentPhaseIndex
            const isPending = index > currentPhaseIndex

            return (
              <div
                key={phase.key}
                className={`flex items-center gap-2 text-[12px] ${
                  isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600 font-medium' : 'text-gray-400'
                }`}
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  {isCompleted ? '✅' : isCurrent ? '⏳' : '⬜'}
                </span>
                <span>{t(`phases.${phase.key}`)}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-apple-gray-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            status === 'failed' ? 'bg-red-500' : 'bg-blue-600'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
