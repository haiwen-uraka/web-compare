import { useTranslation } from 'react-i18next'

export default function ComparisonStatus({ status }) {
  const { t } = useTranslation()

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
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
