import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useMemo, useCallback } from 'react'
import { useComparisonHistory } from '../hooks/useComparisonHistory'
import { deleteComparison, restoreComparison } from '../api/comparisons'
import { useCreateComparison } from '../hooks/useCreateComparison'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '../contexts/ToastContext'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import ErrorAlert from '../components/shared/ErrorAlert'
import EmptyState from '../components/shared/EmptyState'
import { IconRefresh, IconTrash, IconChevronRight, IconHistory, IconSearch } from '../components/shared/Icons'

const statusBadgeMap = {
  completed: 'bg-apple-green-light text-apple-green',
  partial: 'bg-apple-orange-light text-apple-orange',
  failed: 'bg-apple-red-light text-apple-red',
  processing: 'bg-apple-blue-light text-apple-blue',
  pending: 'bg-apple-gray-100 text-apple-gray-500',
}

const TIME_FILTERS = [
  { key: 'all', label: 'history.time_all' },
  { key: 'today', label: 'history.time_today' },
  { key: 'week', label: 'history.time_week' },
  { key: 'month', label: 'history.time_month' },
]

const SORT_OPTIONS = [
  { key: 'newest', label: 'history.sort_newest' },
  { key: 'oldest', label: 'history.sort_oldest' },
  { key: 'most_diff', label: 'history.sort_most_diff' },
  { key: 'least_diff', label: 'history.sort_least_diff' },
]

export default function HistoryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: items, isLoading, isError, error, refetch } = useComparisonHistory()
  const queryClient = useQueryClient()
  const reCompareMutation = useCreateComparison()
  const { showToast } = useToast()

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)

  // Filter and sort items
  const filteredItems = useMemo(() => {
    if (!items) return []

    let result = [...items]

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(item =>
        item.url_a?.toLowerCase().includes(q) ||
        item.url_b?.toLowerCase().includes(q)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(item => item.status === statusFilter)
    }

    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      result = result.filter(item => {
        const itemDate = new Date(item.created_at)
        switch (timeFilter) {
          case 'today':
            return itemDate >= startOfDay
          case 'week': {
            const weekAgo = new Date(startOfDay)
            weekAgo.setDate(weekAgo.getDate() - 7)
            return itemDate >= weekAgo
          }
          case 'month': {
            const monthAgo = new Date(startOfDay)
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            return itemDate >= monthAgo
          }
          default:
            return true
        }
      })
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        break
      case 'most_diff':
        result.sort((a, b) => {
          const diffA = (a.summary?.dom_diff_count || 0) + (a.summary?.text_diff_count || 0)
          const diffB = (b.summary?.dom_diff_count || 0) + (b.summary?.text_diff_count || 0)
          return diffB - diffA
        })
        break
      case 'least_diff':
        result.sort((a, b) => {
          const diffA = (a.summary?.dom_diff_count || 0) + (a.summary?.text_diff_count || 0)
          const diffB = (b.summary?.dom_diff_count || 0) + (b.summary?.text_diff_count || 0)
          return diffA - diffB
        })
        break
    }

    return result
  }, [items, searchQuery, statusFilter, timeFilter, sortBy])

  // Batch selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map(item => item.id)))
    }
  }, [filteredItems, selectedIds])

  const handleSelectItem = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Delete handlers
  async function handleDelete(taskId) {
    if (!confirm(t('history.delete_confirm'))) return

    const item = items.find(i => i.id === taskId)

    try {
      await deleteComparison(taskId)
      queryClient.invalidateQueries({ queryKey: ['comparisons'] })

      showToast({
        message: t('history.deleted_success'),
        type: 'info',
        action: t('history.undo'),
        onAction: async () => {
          try {
            await restoreComparison(taskId)
            queryClient.invalidateQueries({ queryKey: ['comparisons'] })
            showToast({
              message: t('history.restored'),
              type: 'success',
              duration: 3000,
            })
          } catch {
            showToast({
              message: t('history.restore_failed'),
              type: 'error',
              duration: 3000,
            })
          }
        },
        duration: 5000,
      })
    } catch {
      showToast({
        message: t('history.delete_failed'),
        type: 'error',
        duration: 3000,
      })
    }
  }

  async function handleBatchDelete() {
    const idsToDelete = Array.from(selectedIds)
    if (idsToDelete.length === 0) return

    setShowBatchDeleteConfirm(false)

    try {
      await Promise.all(idsToDelete.map(id => deleteComparison(id)))
      queryClient.invalidateQueries({ queryKey: ['comparisons'] })
      setSelectedIds(new Set())

      showToast({
        message: t('history.batch_deleted', { count: idsToDelete.length }),
        type: 'info',
        action: t('history.undo'),
        onAction: async () => {
          try {
            await Promise.all(idsToDelete.map(id => restoreComparison(id)))
            queryClient.invalidateQueries({ queryKey: ['comparisons'] })
            showToast({
              message: t('history.restored'),
              type: 'success',
              duration: 3000,
            })
          } catch {
            showToast({
              message: t('history.restore_failed'),
              type: 'error',
              duration: 3000,
            })
          }
        },
        duration: 5000,
      })
    } catch {
      showToast({
        message: t('history.batch_delete_failed'),
        type: 'error',
        duration: 3000,
      })
    }
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

      {/* Search and Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('history.search_placeholder')}
            className="w-full rounded-xl border border-apple-gray-200 bg-white py-2 pl-10 pr-4 text-[13px] outline-none focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray-400 hover:text-apple-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-apple-gray-200 bg-white px-3 py-2 text-[13px] text-apple-gray-700 outline-none focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 transition-colors"
        >
          <option value="all">{t('history.status_all')}</option>
          <option value="completed">{t('history.completed')}</option>
          <option value="partial">{t('history.partial')}</option>
          <option value="failed">{t('history.failed')}</option>
          <option value="processing">{t('history.processing')}</option>
          <option value="pending">{t('history.pending')}</option>
        </select>

        {/* Time filter */}
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="rounded-xl border border-apple-gray-200 bg-white px-3 py-2 text-[13px] text-apple-gray-700 outline-none focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 transition-colors"
        >
          {TIME_FILTERS.map(({ key, label }) => (
            <option key={key} value={key}>{t(label)}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-xl border border-apple-gray-200 bg-white px-3 py-2 text-[13px] text-apple-gray-700 outline-none focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 transition-colors"
        >
          {SORT_OPTIONS.map(({ key, label }) => (
            <option key={key} value={key}>{t(label)}</option>
          ))}
        </select>
      </div>

      {/* Batch actions toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
            onChange={handleSelectAll}
            className="h-4 w-4 rounded border-apple-gray-300 text-apple-blue focus:ring-apple-blue"
          />
          <span className="text-[13px] text-apple-gray-600">{t('history.select_all')}</span>
        </label>

        {selectedIds.size > 0 && (
          <button
            onClick={() => setShowBatchDeleteConfirm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-apple-red-light px-3 py-1.5 text-[12px] font-medium text-apple-red hover:bg-apple-red/10 transition-colors"
          >
            <IconTrash className="w-3.5 h-3.5" />
            {t('history.batch_delete', { count: selectedIds.size })}
          </button>
        )}

        {selectedIds.size > 0 && (
          <span className="text-[12px] text-apple-gray-400">
            {t('history.selected_count', { count: selectedIds.size, total: filteredItems.length })}
          </span>
        )}
      </div>

      {/* Results count */}
      <div className="mb-3 text-[12px] text-apple-gray-400">
        {t('history.showing_count', { showing: filteredItems.length, total: items.length })}
      </div>

      {/* Table */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<IconSearch className="w-10 h-10 text-apple-gray-300" />}
          title={t('history.no_results')}
          description={t('history.no_results_desc')}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-apple-gray-200 bg-white shadow-apple">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-apple-gray-200 bg-apple-gray-50">
                  <th className="px-4 py-3 text-[12px] font-semibold text-apple-gray-500 w-10">
                    <span className="sr-only">{t('history.select')}</span>
                  </th>
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
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-apple-gray-100 last:border-0 hover:bg-apple-gray-50/70 transition-colors ${
                      selectedIds.has(item.id) ? 'bg-apple-blue-light/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        className="h-4 w-4 rounded border-apple-gray-300 text-apple-blue focus:ring-apple-blue"
                      />
                    </td>
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
      )}

      {/* Batch delete confirmation dialog */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setShowBatchDeleteConfirm(false)}>
          <div className="card-apple w-96 p-5 animate-scale-in" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-semibold text-apple-gray-900 mb-3">{t('history.batch_delete_title')}</p>
            <p className="text-[13px] text-apple-gray-600 mb-4">
              {t('history.batch_delete_confirm', { count: selectedIds.size })}
            </p>
            <div className="max-h-40 overflow-y-auto mb-4 rounded-lg bg-apple-gray-50 p-3">
              {Array.from(selectedIds).map(id => {
                const item = items.find(i => i.id === id)
                return item ? (
                  <div key={id} className="text-[12px] text-apple-gray-600 py-1 truncate">
                    {item.url_a} vs {item.url_b}
                  </div>
                ) : null
              })}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="btn-apple btn-apple-secondary text-[12px]"
              >
                {t('onboarding.cancel')}
              </button>
              <button
                onClick={handleBatchDelete}
                className="btn-apple text-[12px] bg-apple-red text-white hover:bg-apple-red/90"
              >
                {t('history.confirm_delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
