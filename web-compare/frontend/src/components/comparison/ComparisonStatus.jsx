import { useTranslation } from 'react-i18next'

export default function ComparisonStatus({ status }) {
  const { t } = useTranslation()

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
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
          <p className="font-medium text-gray-900">
            {status === 'pending' && t('status.queued')}
            {status === 'processing' && t('status.running')}
            {status === 'completed' && t('status.complete')}
            {status === 'partial' && t('status.partial_complete')}
            {status === 'failed' && t('status.failed')}
          </p>
          <p className="text-sm text-gray-500">
            {status === 'pending' && t('status.waiting')}
            {status === 'processing' && t('status.capturing')}
            {status === 'completed' && t('status.all_checks')}
            {status === 'partial' && t('status.some_errors')}
            {status === 'failed' && t('status.error_occurred')}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            status === 'failed' ? 'bg-red-500' : 'bg-blue-600'
          }`}
          style={{
            width: status === 'completed' || status === 'partial' ? '100%'
              : status === 'processing' ? '60%'
              : '10%',
          }}
        />
      </div>
    </div>
  )
}
