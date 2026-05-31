import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import UrlInputForm from '../components/comparison/UrlInputForm'
import { useCreateComparison } from '../hooks/useCreateComparison'

export default function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const mutation = useCreateComparison()

  async function handleSubmit(data) {
    try {
      const result = await mutation.mutateAsync(data)
      navigate(`/compare/${result.id}`)
    } catch (err) {
      // handled by form/mutation state
    }
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-[28px] font-bold tracking-tight text-apple-gray-900">{t('home.title')}</h1>
        <p className="mt-2 text-[15px] text-apple-gray-500">{t('home.description')}</p>
      </div>

      <UrlInputForm onSubmit={handleSubmit} isLoading={mutation.isPending} />

      {mutation.isError && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-apple-red-light bg-apple-red-light/50 p-4 text-sm text-apple-red">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {t('home.failed_to_start', { message: mutation.error?.message || t('error.unexpected') })}
        </div>
      )}
    </div>
  )
}
