import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useComparisonHistory } from '../hooks/useComparisonHistory'
import { deleteComparison } from '../api/comparisons'
import { useCreateComparison } from '../hooks/useCreateComparison'
import { useQueryClient } from '@tanstack/react-query'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import ErrorAlert from '../components/shared/ErrorAlert'
import EmptyState from '../components/shared/EmptyState'
import { IconRefresh, IconTrash, IconChevronRight, IconHistory } from '../components/shared/Icons'

const statusBadgeMap = {
  completed: 'bg-apple-green-light text-apple-green',
  partial: 'bg-apple-orange-light text-apple-orange',
  failed: 'bg-apple-red-light text-apple-red',
  processing: 'bg-apple-blue-light text-apple-blue',
  pending: 'bg-apple-gray-100 text-apple-gray-500',
}

export default function HistoryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: items, isLoading, isError, error, refetch } = useComparisonHistory()
  const queryClient = useQueryClient()
  const reCompareMutation = useCreateComparison()

  async function handleDelete(taskId) {
    if (!confirm(t('history.delete_confirm'))) return
    await deleteComparison(taskId)
    queryClient.invalidateQueries({ queryKey: ['comparisons'] })
  }

  async function handleReCompare(item) {
    try {
      const result = await reCompareMutation.mutateAsync({
        url_a: item.url_a,
        url_b: item.url_b,
        viewport_width: 1280,
        viewport_height: 720,
        full_page: true,
        comparisons: ['dom', 'visual', 'text'],
      })
      navigate(`/compare/${result.id}`)
    } catch { /* mutation handles */ }
  }

  if (isLoading) return <LoadingSpinner size="lg" text={t('history.loading')} />

  if (isError) return <ErrorAlert message={error?.message || t('history.failed_to_load')} onRetry={() => refetch()} />

  if (!items || items.length === 0) {
    return (
      <div>
        <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold tracking-tight text-apple-gray-900">
          <IconHistory className="w-6 h-6" />
          {t('history.title')}
        </h1>
        <EmptyState
          icon={<IconHistory className="w-10 h-10 text-apple-gray-300" />}
          title={t('history.empty_title')}
          description={t('history.empty_description')}
          action={
            <Link to="/" className="btn-apple btn-apple-primary">
              {t('history.start_comparison')}
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold tracking-tight text-apple-gray-900">
        <IconHistory className="w-6 h-6 text-apple-blue" />
        {t('history.title')}
      </h1>

      <div className="overflow-hidden rounded-2xl border border-apple-gray-200 bg-white shadow-apple">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-apple-gray-200 bg-apple-gray-50">
                <th className="px-4 py-3 text-[12px] font-semibold text-apple-gray-500">{t('history.time')}</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-apple-gray-500">{t('history.url_a')}</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-apple-gray-500">{t('history.url_b')}</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-apple-gray-500">{t('history.status')}</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-apple-gray-500">{t('history.dom')}</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-apple-gray-500">{t('history.visual')}</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-apple-gray-500">{t('history.text')}</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-apple-gray-500">{t('history.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-apple-gray-100 last:border-0 hover:bg-apple-gray-50/70 transition-colors">
                  <td className="px-4 py-3 text-[11px] text-apple-gray-400 whitespace-nowrap">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-[12px] text-apple-gray-600" title={item.url_a}>
                    {item.url_a}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-[12px] text-apple-gray-600" title={item.url_b}>
                    {item.url_b}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge-apple ${statusBadgeMap[item.status] || statusBadgeMap.pending}`}>
                      {t(`history.${item.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] font-medium text-apple-gray-600">
                    {item.summary?.dom_diff_count ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[12px] font-medium text-apple-gray-600">
                    {item.summary?.visual_diff_percentage != null ? `${item.summary.visual_diff_percentage}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-[12px] font-medium text-apple-gray-600">
                    {item.summary?.text_diff_count ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link to={`/compare/${item.id}`}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-apple-blue hover:bg-apple-blue-light/50 transition-colors">
                        {t('history.view')}
                        <IconChevronRight className="w-3 h-3" />
                      </Link>
                      <button onClick={() => handleReCompare(item)}
                        disabled={reCompareMutation.isPending}
                        className="rounded-lg px-2 py-1 text-[11px] font-medium text-apple-gray-500 hover:bg-apple-gray-100 hover:text-apple-gray-700 transition-colors disabled:opacity-40">
                        <IconRefresh className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleDelete(item.id)}
                        className="rounded-lg px-2 py-1 text-[11px] font-medium text-apple-red hover:bg-apple-red-light/50 transition-colors">
                        <IconTrash className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
