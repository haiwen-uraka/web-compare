import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Badge from '../shared/Badge'

const PAGE_SIZE = 50
const FILTER_TABS = ['all', 'added', 'removed', 'changed', 'text']

function DiffItem({ item }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm hover:border-gray-300">
      <div className="flex items-start gap-2">
        <code className="shrink-0 rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs text-gray-700">
          {item.tag}
        </code>
        <span className="flex-1 font-mono text-xs text-gray-600 break-all leading-5">{item.path}</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 text-xs text-gray-400 hover:text-gray-600"
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>
      {item.reason === 'attribute_changed' && (
        <div className="mt-1 ml-1 text-xs text-gray-500">
          <span className="font-medium">{item.details?.attribute}:</span>{' '}
          <span className="text-red-600 line-through">{item.details?.old_value}</span>
          {' → '}
          <span className="text-green-600">{item.details?.new_value}</span>
        </div>
      )}
      {item.reason === 'text_changed' && (
        <div className="mt-1 ml-1 text-xs text-gray-500">
          <div className="rounded bg-red-50 px-1.5 py-0.5 text-red-600 line-through">{item.details?.old_text}</div>
          <div className="mt-0.5 rounded bg-green-50 px-1.5 py-0.5 text-green-600">{item.details?.new_text}</div>
        </div>
      )}
      {expanded && item.path && (
        <div className="mt-1.5 border-t border-gray-200 pt-1.5 text-[10px] text-gray-400 break-all font-mono">
          {item.path}
        </div>
      )}
    </div>
  )
}

export default function DomDiffList({ domDiff }) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  if (!domDiff) return null

  const allItems = useMemo(() => {
    const result = [
      ...(domDiff.added_elements || []).map(i => ({ ...i, _cat: 'added' })),
      ...(domDiff.removed_elements || []).map(i => ({ ...i, _cat: 'removed' })),
      ...(domDiff.attribute_changes || []).map(i => ({ ...i, _cat: 'changed' })),
      ...(domDiff.text_changes || []).map(i => ({ ...i, _cat: 'text' })),
    ]
    return result
  }, [domDiff])

  const filtered = useMemo(() => {
    let result = filter === 'all' ? allItems : allItems.filter(i => i._cat === filter)
    if (!search.trim()) return result
    const q = search.toLowerCase()
    return result.filter(i =>
      i.tag?.toLowerCase().includes(q) ||
      i.path?.toLowerCase().includes(q) ||
      i.reason?.toLowerCase().includes(q) ||
      (i.details?.old_value?.toLowerCase().includes(q)) ||
      (i.details?.new_value?.toLowerCase().includes(q))
    )
  }, [allItems, filter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageItems = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  // Reset page when filter/search changes
  const handleFilter = (key) => {
    setFilter(key)
    setPage(0)
    setSearch('')
  }

  const counts = {
    all: allItems.length,
    added: domDiff.added_elements?.length || 0,
    removed: domDiff.removed_elements?.length || 0,
    changed: domDiff.attribute_changes?.length || 0,
    text: domDiff.text_changes?.length || 0,
  }

  const hasChanges = allItems.length > 0

  if (!hasChanges) {
    return (
      <div id="dom-diff" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-semibold text-gray-900">{t('dom_diff.title')}</h3>
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-700">
          <span>✓</span>
          <span className="text-sm font-medium">{t('dom_diff.no_diff')}</span>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {t('dom_diff.matched_elements', { matched: domDiff.matching_elements, totalA: domDiff.total_elements_a, totalB: domDiff.total_elements_b })}
        </p>
      </div>
    )
  }

  return (
    <div id="dom-diff" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-900">{t('dom_diff.title')}</h3>
        <span className="text-xs text-gray-400">
          {t('dom_diff.matched_elements', { matched: domDiff.matching_elements, totalA: domDiff.total_elements_a, totalB: domDiff.total_elements_b })}
        </span>
      </div>

      {/* Filter tabs */}
      <div className="mb-3 flex flex-wrap gap-1">
        {FILTER_TABS.map(key => (
          <button
            key={key}
            onClick={() => handleFilter(key)}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === key
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {t(`dom_diff.filter_${key}`)}
            <span className={`rounded-full px-1.5 text-[10px] ${filter === key ? 'bg-blue-200' : 'bg-gray-200'}`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-3">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder={t('dom_diff.search_placeholder')}
            className="w-full rounded-lg border border-gray-300 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {search && (
            <button onClick={() => { setSearch(''); setPage(0) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <div className="flex gap-3">
          <span className="text-red-500 font-medium">+{domDiff.added_elements?.length || 0}</span>
          <span className="text-red-500 font-medium">-{domDiff.removed_elements?.length || 0}</span>
          <span className="text-orange-500 font-medium">~{domDiff.attribute_changes?.length || 0}</span>
          <span className="text-blue-500 font-medium">✎{domDiff.text_changes?.length || 0}</span>
          {filtered.length !== allItems.length && (
            <span className="text-gray-400">({filtered.length} {t('dom_diff.filtered_results', { count: '' }).trim()})</span>
          )}
        </div>
        {/* Page info */}
        <span className="text-gray-400">
          {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} / {filtered.length}
        </span>
      </div>

      {/* Items */}
      {pageItems.length > 0 ? (
        <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
          {pageItems.map((item, i) => (
            <DiffItem key={`${item._cat}-${safePage * PAGE_SIZE + i}`} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-400">
          {search ? t('dom_diff.no_search_results') : t('dom_diff.no_elements_all')}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 border-t border-gray-100 pt-3">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← {t('dom_diff.prev')}
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum
              if (totalPages <= 7) {
                pageNum = i
              } else if (safePage < 4) {
                pageNum = i
              } else if (safePage > totalPages - 5) {
                pageNum = totalPages - 7 + i
              } else {
                pageNum = safePage - 3 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`h-7 min-w-[28px] rounded px-1.5 text-xs font-medium ${
                    pageNum === safePage
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {pageNum + 1}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={safePage === totalPages - 1}
            className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('dom_diff.next')} →
          </button>
        </div>
      )}
    </div>
  )
}
