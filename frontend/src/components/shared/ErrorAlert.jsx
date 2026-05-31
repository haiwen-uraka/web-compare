import { useTranslation } from 'react-i18next'

export default function ErrorAlert({ message, onRetry }) {
  const { t } = useTranslation()

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-red-500">✕</span>
        <div className="flex-1">
          <h3 className="font-medium text-red-800">{t('error.title')}</h3>
          <p className="mt-1 text-sm text-red-600">{message || t('error.unexpected')}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
            >
              {t('error.retry')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
