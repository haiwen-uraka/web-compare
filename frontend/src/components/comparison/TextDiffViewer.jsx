import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

function DiffBlock({ block, index }) {
  const { t } = useTranslation()
  const isEqual = block.type === 'equal'
  const isDelete = block.type === 'delete'
  const isInsert = block.type === 'insert'
  const isReplace = block.type === 'replace'
  const showPreview = isEqual && block.content_a.length > 3
  const collapsed = isEqual && block.content_a.length > 3

  return (
    <div className={`border-b ${isDelete || isReplace ? 'border-red-100' : isInsert ? 'border-green-100' : 'border-gray-100'}`}>
      {/* Deleted / replaced lines from A */}
      {(isDelete || isReplace) && block.content_a.map((line, i) => (
        <div key={`del-${i}`} className="flex bg-red-50 hover:bg-red-100">
          <div className="flex w-28 shrink-0 border-r border-red-100 py-0.5 text-xs text-red-400 font-mono select-none">
            <span className="w-14 text-right px-1">{block.lines_a_start + i}</span>
            <span className="w-14 text-right px-1 text-gray-400" />
          </div>
          <pre className="flex-1 overflow-x-auto px-3 py-0.5 text-xs text-red-700"><span className="text-red-400 select-none">- </span>{line || ' '}</pre>
        </div>
      ))}
      {/* Inserted lines from B */}
      {(isInsert || isReplace) && block.content_b.map((line, i) => (
        <div key={`ins-${i}`} className="flex bg-green-50 hover:bg-green-100">
          <div className="flex w-28 shrink-0 border-r border-green-100 py-0.5 text-xs text-green-400 font-mono select-none">
            <span className="w-14 text-right px-1 text-gray-400" />
            <span className="w-14 text-right px-1">{block.lines_b_start + i}</span>
          </div>
          <pre className="flex-1 overflow-x-auto px-3 py-0.5 text-xs text-green-700"><span className="text-green-400 select-none">+ </span>{line || ' '}</pre>
        </div>
      ))}
      {/* Equal lines (collapsed when too many) */}
      {isEqual && !showPreview && block.content_a.map((line, i) => (
        <div key={`eq-${i}`} className="flex hover:bg-gray-50">
          <div className="flex w-28 shrink-0 border-r border-gray-100 py-0.5 text-xs text-gray-400 font-mono select-none">
            <span className="w-14 text-right px-1">{block.lines_a_start + i}</span>
            <span className="w-14 text-right px-1">{block.lines_b_start + i}</span>
          </div>
          <pre className="flex-1 overflow-x-auto px-3 py-0.5 text-xs text-gray-600">{line || ' '}</pre>
        </div>
      ))}
      {isEqual && showPreview && (
        <div className="flex hover:bg-gray-50">
          <div className="flex w-28 shrink-0 border-r border-gray-100 py-0.5 text-xs text-gray-400 font-mono select-none">
            <span className="w-14 text-right px-1">{block.lines_a_start + 1}–{block.lines_a_end}</span>
            <span className="w-14 text-right px-1">{block.lines_b_start + 1}–{block.lines_b_end}</span>
          </div>
          <pre className="flex-1 overflow-x-auto px-3 py-0.5 text-xs text-gray-400 italic">
            {t('text_diff.matching_lines', { count: block.content_a.length })}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function TextDiffViewer({ textDiff }) {
  const { t } = useTranslation()
  const [contextLines, setContextLines] = useState(3)
  const [showAll, setShowAll] = useState(false)

  if (!textDiff) return null

  const hasChanges = textDiff.added_lines?.length > 0 || textDiff.removed_lines?.length > 0

  const visibleBlocks = useMemo(() => {
    if (showAll) return textDiff.blocks || []
    return (textDiff.blocks || []).filter(b => {
      if (b.type !== 'equal') return true
      if (b.content_a.length <= contextLines) return true
      return false
    })
  }, [textDiff, contextLines, showAll])

  if (!hasChanges) {
    return (
      <div id="text-diff" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-semibold text-gray-900">{t('text_diff.title')}</h3>
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-700">
          <span>✓</span>
          <span className="text-sm font-medium">{t('text_diff.no_diff')}</span>
        </div>
      </div>
    )
  }

  return (
    <div id="text-diff" className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{t('text_diff.title')}</h3>
            <p className="text-xs text-gray-400">
              {t('text_diff.lines_info', { linesA: textDiff.total_lines_a, linesB: textDiff.total_lines_b })}
              {' · '}
              <span className="text-red-500">-{textDiff.removed_lines?.length || 0}</span>
              {' · '}
              <span className="text-green-500">+{textDiff.added_lines?.length || 0}</span>
              {' · '}
              <span className="text-gray-500">{textDiff.blocks?.filter(b => b.type !== 'equal').length || 0} {t('text_diff.changed_blocks')}</span>
            </p>
          </div>
          {/* Context controls */}
          <div className="flex items-center gap-2">
            <select
              value={showAll ? 'all' : String(contextLines)}
              onChange={(e) => {
                if (e.target.value === 'all') {
                  setShowAll(true)
                } else {
                  setShowAll(false)
                  setContextLines(Number(e.target.value))
                }
              }}
              className="rounded border border-gray-300 px-2 py-1 text-xs outline-none"
            >
              <option value="0">0 {t('text_diff.context_lines')}</option>
              <option value="3">3 {t('text_diff.context_lines')}</option>
              <option value="5">5 {t('text_diff.context_lines')}</option>
              <option value="10">10 {t('text_diff.context_lines')}</option>
              <option value="all">{t('text_diff.show_all')}</option>
            </select>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        {visibleBlocks.length > 0 ? (
          <div className="min-h-[100px]">
            {visibleBlocks.map((block, i) => (
              <DiffBlock key={i} block={block} index={i} />
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-gray-400">
            {t('text_diff.all_lines_match', { count: textDiff.total_lines_a })}
          </div>
        )}
      </div>
      {/* Bottom stats */}
      <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400 flex gap-4">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-6 rounded bg-red-50 border border-red-200" /> {t('text_diff.removed')}</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-6 rounded bg-green-50 border border-green-200" /> {t('text_diff.added')}</span>
      </div>
    </div>
  )
}
