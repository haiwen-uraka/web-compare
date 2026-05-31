import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const LOAD_MORE_STEP = 30

const CATEGORY_CONFIG = {
  added:    { color: 'green',  icon: '+', border: '#34C759', bg: 'rgba(52,199,89,0.06)',  badge: 'bg-green-100 text-green-700' },
  removed:  { color: 'red',    icon: '−', border: '#FF3B30', bg: 'rgba(255,59,48,0.06)',  badge: 'bg-red-100 text-red-700' },
  changed:  { color: 'orange', icon: '~', border: '#FF9500', bg: 'rgba(255,149,0,0.06)',  badge: 'bg-orange-100 text-orange-700' },
  text:     { color: 'blue',   icon: '✎', border: '#007AFF', bg: 'rgba(0,122,255,0.06)',  badge: 'bg-blue-100 text-blue-700' },
}

function DiffItem({ item }) {
  const cat = CATEGORY_CONFIG[item._cat]

  return (
    <div
      className="rounded-lg px-3 py-2.5 text-sm transition-all hover:shadow-sm"
      style={{ borderLeft: `3px solid ${cat.border}`, background: cat.bg }}
    >
      {/* Header: tag + path */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center justify-center shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
          style={{ background: cat.border }}
        >
          {cat.icon}
        </span>
        <code className="shrink-0 rounded bg-gray-200/60 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-gray-700">
          {item.tag}
        </code>
        <span className="flex-1 font-mono text-[11px] text-gray-500 truncate" title={item.path}>
          {item.path}
        </span>
      </div>

      {/* Inline details — always visible, no expand/collapse needed */}
      {item.reason === 'attribute_changed' && item.details && (
        <div className="mt-1.5 ml-6 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
          <span className="font-medium text-gray-600">{item.details.attribute}</span>
          <span className="text-red-600 line-through bg-red-50/60 px-1 rounded max-w-[200px] truncate" title={item.details.old_value}>
            {item.details.old_value || '∅'}
          </span>
          <span className="text-gray-400">→</span>
          <span className="text-green-600 bg-green-50/60 px-1 rounded max-w-[200px] truncate" title={item.details.new_value}>
            {item.details.new_value || '∅'}
          </span>
        </div>
      )}

      {item.reason === 'text_changed' && item.details && (
        <div className="mt-1.5 ml-6 space-y-0.5">
          <div className="text-[11px] text-red-600 bg-red-50/60 rounded px-1.5 py-0.5 line-through break-all">
            {item.details.old_text || '∅'}
          </div>
          <div className="text-[11px] text-green-600 bg-green-50/60 rounded px-1.5 py-0.5 break-all">
            {item.details.new_text || '∅'}
          </div>
        </div>
      )}

      {item.reason === 'added' && (
        <div className="mt-1 ml-6 text-[11px] text-green-600">新增元素</div>
      )}

      {item.reason === 'removed' && (
        <div className="mt-1 ml-6 text-[11px] text-red-600">移除元素</div>
      )}
    </div>
  )
}

function CategorySection({ title, items, icon, badgeClass, count, initialShow }) {
  const [showCount, setShowCount] = useState(initialShow)
  const visibleItems = items.slice(0, showCount)
  const hasMore = items.length > showCount

  if (items.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass}`}>
          {icon} {title}
        </span>
        <span className="text-[11px] text-gray-400">{count}</span>
      </div>
      <div className="space-y-1.5">
        {visibleItems.map((item, i) => (
          <DiffItem key={i} item={item} />
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setShowCount(c => c + LOAD_MORE_STEP)}
          className="mt-2 w-full rounded-lg border border-dashed border-gray-300 py-1.5 text-[11px] font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          加载更多 ({items.length - showCount} 条)
        </button>
      )}
    </div>
  )
}

export default function DomDiffList({ domDiff }) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  if (!domDiff) return null

  const groups = useMemo(() => ({
    added:   (domDiff.added_elements || []).map(i => ({ ...i, _cat: 'added' })),
    removed: (domDiff.removed_elements || []).map(i => ({ ...i, _cat: 'removed' })),
    changed: (domDiff.attribute_changes || []).map(i => ({ ...i, _cat: 'changed' })),
    text:    (domDiff.text_changes || []).map(i => ({ ...i, _cat: 'text' })),
  }), [domDiff])

  const allItems = useMemo(() => [
    ...groups.added, ...groups.removed, ...groups.changed, ...groups.text,
  ], [groups])

  const filterSearch = (items) => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(i =>
      i.tag?.toLowerCase().includes(q) ||
      i.path?.toLowerCase().includes(q) ||
      i.details?.attribute?.toLowerCase().includes(q) ||
      i.details?.old_value?.toLowerCase().includes(q) ||
      i.details?.new_value?.toLowerCase().includes(q) ||
      i.details?.old_text?.toLowerCase().includes(q) ||
      i.details?.new_text?.toLowerCase().includes(q)
    )
  }

  const counts = {
    all: allItems.length,
    added: groups.added.length,
    removed: groups.removed.length,
    changed: groups.changed.length,
    text: groups.text.length,
  }

  const hasChanges = allItems.length > 0

  if (!hasChanges) {
    return (
      <div id="dom-diff" className="card-apple p-5">
        <h3 className="mb-2 font-semibold text-gray-900">{t('dom_diff.title')}</h3>
        <div className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-green-700">
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="4 12 9 17 20 6" /></svg>
          <span className="text-[13px] font-medium">{t('dom_diff.no_diff')}</span>
        </div>
        <p className="mt-2 text-[11px] text-gray-400">
          {t('dom_diff.matched_elements', { matched: domDiff.matching_elements, totalA: domDiff.total_elements_a, totalB: domDiff.total_elements_b })}
        </p>
      </div>
    )
  }

  const filterTabs = [
    { key: 'all', label: t('dom_diff.filter_all'), count: counts.all },
    { key: 'added', label: t('dom_diff.filter_added'), count: counts.added },
    { key: 'removed', label: t('dom_diff.filter_removed'), count: counts.removed },
    { key: 'changed', label: t('dom_diff.filter_changed'), count: counts.changed },
    { key: 'text', label: t('dom_diff.filter_text'), count: counts.text },
  ]

  return (
    <div id="dom-diff" className="card-apple p-5">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[17px] font-semibold tracking-tight text-gray-900">{t('dom_diff.title')}</h3>
        <span className="text-[11px] text-gray-400">
          {t('dom_diff.matched_elements', { matched: domDiff.matching_elements, totalA: domDiff.total_elements_a, totalB: domDiff.total_elements_b })}
        </span>
      </div>

      {/* Stats bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {[
          { key: 'added', icon: '+', color: '#34C759', label: '新增' },
          { key: 'removed', icon: '−', color: '#FF3B30', label: '移除' },
          { key: 'changed', icon: '~', color: '#FF9500', label: '属性' },
          { key: 'text', icon: '✎', color: '#007AFF', label: '文本' },
        ].map(({ key, icon, color, label }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white" style={{ background: color }}>{icon}</span>
            <span className="text-[12px] text-gray-600">{label}</span>
            <span className="text-[12px] font-bold" style={{ color }}>{counts[key]}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="mb-3 flex flex-wrap gap-1">
        {filterTabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => { setFilter(key); setSearch('') }}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
              filter === key
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {label}
            <span className={`rounded-full px-1.5 text-[10px] ${filter === key ? 'bg-blue-200' : 'bg-gray-200'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('dom_diff.search_placeholder')}
            className="w-full rounded-lg border border-gray-300 py-1.5 pl-8 pr-8 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
          )}
        </div>
      </div>

      {/* Content: grouped by category or flat filtered list */}
      <div className="max-h-[600px] overflow-y-auto space-y-4 pr-1">
        {filter === 'all' ? (
          // Grouped view
          <>
            <CategorySection
              title={t('dom_diff.filter_added')} items={filterSearch(groups.added)}
              icon="+" badgeClass={CATEGORY_CONFIG.added.badge} count={counts.added} initialShow={LOAD_MORE_STEP}
            />
            <CategorySection
              title={t('dom_diff.filter_removed')} items={filterSearch(groups.removed)}
              icon="−" badgeClass={CATEGORY_CONFIG.removed.badge} count={counts.removed} initialShow={LOAD_MORE_STEP}
            />
            <CategorySection
              title={t('dom_diff.filter_changed')} items={filterSearch(groups.changed)}
              icon="~" badgeClass={CATEGORY_CONFIG.changed.badge} count={counts.changed} initialShow={LOAD_MORE_STEP}
            />
            <CategorySection
              title={t('dom_diff.filter_text')} items={filterSearch(groups.text)}
              icon="✎" badgeClass={CATEGORY_CONFIG.text.badge} count={counts.text} initialShow={LOAD_MORE_STEP}
            />
          </>
        ) : (
          // Filtered flat view
          <div className="space-y-1.5">
            {filterSearch(groups[filter]).length > 0 ? (
              filterSearch(groups[filter]).slice(0, 50).map((item, i) => (
                <DiffItem key={i} item={item} />
              ))
            ) : (
              <div className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-400">
                {search ? t('dom_diff.no_search_results') : t('dom_diff.no_elements_all')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
