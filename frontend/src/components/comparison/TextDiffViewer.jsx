import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useBeginnerMode } from '../../contexts/BeginnerModeContext'

// Simple word-level diff: highlight the changed part within a line
function highlightWordDiff(oldLine, newLine) {
  if (!oldLine || !newLine) return { oldHtml: oldLine, newHtml: newLine }

  // Find common prefix
  let prefixLen = 0
  const minLen = Math.min(oldLine.length, newLine.length)
  while (prefixLen < minLen && oldLine[prefixLen] === newLine[prefixLen]) prefixLen++

  // Find common suffix (not overlapping with prefix)
  let suffixLen = 0
  while (
    suffixLen < minLen - prefixLen &&
    oldLine[oldLine.length - 1 - suffixLen] === newLine[newLine.length - 1 - suffixLen]
  ) suffixLen++

  // If no difference found, return as-is
  if (prefixLen === minLen && oldLine.length === newLine.length) {
    return { oldHtml: oldLine, newHtml: newLine }
  }

  const oldPrefix = oldLine.slice(0, prefixLen)
  const oldDiff = oldLine.slice(prefixLen, oldLine.length - suffixLen || undefined)
  const oldSuffix = suffixLen > 0 ? oldLine.slice(-suffixLen) : ''

  const newPrefix = newLine.slice(0, prefixLen)
  const newDiff = newLine.slice(prefixLen, newLine.length - suffixLen || undefined)
  const newSuffix = suffixLen > 0 ? newLine.slice(-suffixLen) : ''

  return {
    oldHtml: { prefix: oldPrefix, diff: oldDiff, suffix: oldSuffix },
    newHtml: { prefix: newPrefix, diff: newDiff, suffix: newSuffix },
  }
}

function ChangedLine({ oldLine, newLine, lineA, lineB }) {
  const diff = highlightWordDiff(oldLine, newLine)
  const hasWordDiff = typeof diff.oldHtml === 'object'

  return (
    <>
      {/* Old line (removed) */}
      <div className="flex bg-red-50/70 hover:bg-red-100/70 group">
        <div className="flex w-24 shrink-0 select-none border-r border-red-100 text-[11px] font-mono">
          <span className="w-12 text-right pr-2 py-1 text-red-400">{lineA}</span>
          <span className="w-12 py-1" />
        </div>
        <pre className="flex-1 overflow-x-auto px-3 py-1 text-[12px] text-red-700">
          <span className="text-red-400 select-none mr-1">−</span>
          {hasWordDiff ? (
            <>
              <span>{diff.oldHtml.prefix}</span>
              <span className="bg-red-200/80 rounded px-0.5 font-semibold">{diff.oldHtml.diff}</span>
              <span>{diff.oldHtml.suffix}</span>
            </>
          ) : (
            oldLine || ' '
          )}
        </pre>
      </div>
      {/* New line (added) */}
      <div className="flex bg-green-50/70 hover:bg-green-100/70 group">
        <div className="flex w-24 shrink-0 select-none border-r border-green-100 text-[11px] font-mono">
          <span className="w-12 py-1" />
          <span className="w-12 text-right pr-2 py-1 text-green-400">{lineB}</span>
        </div>
        <pre className="flex-1 overflow-x-auto px-3 py-1 text-[12px] text-green-700">
          <span className="text-green-400 select-none mr-1">+</span>
          {hasWordDiff ? (
            <>
              <span>{diff.newHtml.prefix}</span>
              <span className="bg-green-200/80 rounded px-0.5 font-semibold">{diff.newHtml.diff}</span>
              <span>{diff.newHtml.suffix}</span>
            </>
          ) : (
            newLine || ' '
          )}
        </pre>
      </div>
    </>
  )
}

function DiffBlock({ block }) {
  const isDelete = block.type === 'delete'
  const isInsert = block.type === 'insert'
  const isReplace = block.type === 'replace'
  const isEqual = block.type === 'equal'

  if (isEqual) return null // Handled by context

  return (
    <div className="border-b border-gray-100">
      {/* Deleted / replaced lines from A */}
      {(isDelete || isReplace) && block.content_a.map((line, i) => {
        if (isReplace && block.content_b[i] !== undefined) {
          // Word-level diff for replace blocks
          return (
            <ChangedLine
              key={`rep-${i}`}
              oldLine={line}
              newLine={block.content_b[i]}
              lineA={block.lines_a_start + i}
              lineB={block.lines_b_start + i}
            />
          )
        }
        // Pure delete
        return (
          <div key={`del-${i}`} className="flex bg-red-50/70 hover:bg-red-100/70">
            <div className="flex w-24 shrink-0 select-none border-r border-red-100 text-[11px] font-mono">
              <span className="w-12 text-right pr-2 py-1 text-red-400">{block.lines_a_start + i}</span>
              <span className="w-12 py-1" />
            </div>
            <pre className="flex-1 overflow-x-auto px-3 py-1 text-[12px] text-red-700">
              <span className="text-red-400 select-none mr-1">−</span>{line || ' '}
            </pre>
          </div>
        )
      })}
      {/* Pure insert lines from B (no matching A line) */}
      {isInsert && block.content_b.map((line, i) => (
        <div key={`ins-${i}`} className="flex bg-green-50/70 hover:bg-green-100/70">
          <div className="flex w-24 shrink-0 select-none border-r border-green-100 text-[11px] font-mono">
            <span className="w-12 py-1" />
            <span className="w-12 text-right pr-2 py-1 text-green-400">{block.lines_b_start + i}</span>
          </div>
          <pre className="flex-1 overflow-x-auto px-3 py-1 text-[12px] text-green-700">
            <span className="text-green-400 select-none mr-1">+</span>{line || ' '}
          </pre>
        </div>
      ))}
    </div>
  )
}

// Context block: shows N equal lines as collapsed/expandable
function ContextBlock({ block, contextLines, onExpand }) {
  const { t } = useTranslation()
  const lines = block.content_a || []
  const totalLines = lines.length

  if (totalLines <= contextLines * 2 + 3) {
    // Show all lines if not too many
    return (
      <div className="border-b border-gray-100">
        {lines.map((line, i) => (
          <div key={i} className="flex hover:bg-gray-50/50">
            <div className="flex w-24 shrink-0 select-none border-r border-gray-100 text-[11px] font-mono text-gray-400">
              <span className="w-12 text-right pr-2 py-1">{block.lines_a_start + i}</span>
              <span className="w-12 text-right pr-2 py-1">{block.lines_b_start + i}</span>
            </div>
            <pre className="flex-1 overflow-x-auto px-3 py-1 text-[12px] text-gray-600">{line || ' '}</pre>
          </div>
        ))}
      </div>
    )
  }

  // Show first N + last N lines with a collapsible middle
  const headLines = lines.slice(0, contextLines)
  const tailLines = lines.slice(-contextLines)
  const hiddenCount = totalLines - contextLines * 2

  return (
    <div className="border-b border-gray-100">
      {headLines.map((line, i) => (
        <div key={`h-${i}`} className="flex hover:bg-gray-50/50">
          <div className="flex w-24 shrink-0 select-none border-r border-gray-100 text-[11px] font-mono text-gray-400">
            <span className="w-12 text-right pr-2 py-1">{block.lines_a_start + i}</span>
            <span className="w-12 text-right pr-2 py-1">{block.lines_b_start + i}</span>
          </div>
          <pre className="flex-1 overflow-x-auto px-3 py-1 text-[12px] text-gray-600">{line || ' '}</pre>
        </div>
      ))}
      <button
        onClick={onExpand}
        className="flex w-full items-center gap-2 bg-gray-50 px-3 py-1.5 text-[11px] text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors border-y border-gray-100"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
        {t('text_diff.expand_lines', { count: hiddenCount })}
      </button>
      {tailLines.map((line, i) => {
        const lineIdx = totalLines - contextLines + i
        return (
          <div key={`t-${i}`} className="flex hover:bg-gray-50/50">
            <div className="flex w-24 shrink-0 select-none border-r border-gray-100 text-[11px] font-mono text-gray-400">
              <span className="w-12 text-right pr-2 py-1">{block.lines_a_start + lineIdx}</span>
              <span className="w-12 text-right pr-2 py-1">{block.lines_b_start + lineIdx}</span>
            </div>
            <pre className="flex-1 overflow-x-auto px-3 py-1 text-[12px] text-gray-600">{line || ' '}</pre>
          </div>
        )
      })}
    </div>
  )
}

export default function TextDiffViewer({ textDiff }) {
  const { t } = useTranslation()
  const { isBeginner } = useBeginnerMode()
  const [contextLines, setContextLines] = useState(3)
  const [expandedBlocks, setExpandedBlocks] = useState(new Set())

  if (!textDiff) return null

  const hasChanges = textDiff.added_lines?.length > 0 || textDiff.removed_lines?.length > 0
  const blocks = textDiff.blocks || []
  const changedBlocks = blocks.filter(b => b.type !== 'equal')

  const expandBlock = (idx) => {
    setExpandedBlocks(prev => new Set([...prev, idx]))
  }

  if (!hasChanges) {
    return (
      <div id="text-diff" className="card-apple p-5">
        <h3 className="mb-2 font-semibold text-gray-900">{t('text_diff.title')}</h3>
        <div className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-green-700">
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="4 12 9 17 20 6" /></svg>
          <span className="text-[13px] font-medium">{t('text_diff.no_diff')}</span>
        </div>
      </div>
    )
  }

  return (
    <div id="text-diff" className="card-apple overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 px-5 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-semibold tracking-tight text-gray-900">
              {isBeginner ? t('beginner_mode.text_diff_title') : t('text_diff.title')}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {t('text_diff.lines_info', { linesA: textDiff.total_lines_a, linesB: textDiff.total_lines_b })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
                −{textDiff.removed_lines?.length || 0}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-600">
                +{textDiff.added_lines?.length || 0}
              </span>
              <span className="text-[11px] text-gray-400">
                {changedBlocks.length} {t('text_diff.changed_blocks')}
              </span>
            </div>
            {/* Context control — inline buttons */}
            <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
              {[0, 3, 5, 10].map(n => (
                <button
                  key={n}
                  onClick={() => { setContextLines(n); setExpandedBlocks(new Set()) }}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    contextLines === n
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {n}{t('text_diff.context_lines')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Beginner hint banner */}
      {isBeginner && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl bg-apple-blue-light/50 border border-apple-blue-light/60 px-3.5 py-2.5 text-[11px] text-apple-gray-600 leading-relaxed">
          <span className="shrink-0 mt-0.5">💡</span>
          <span>{t('beginner_mode.hint_text_banner')}</span>
        </div>
      )}

      {/* Diff content */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        {blocks.map((block, i) => {
          if (block.type === 'equal') {
            return (
              <ContextBlock
                key={i}
                block={block}
                contextLines={contextLines}
                onExpand={() => expandBlock(i)}
              />
            )
          }
          return <DiffBlock key={i} block={block} />
        })}
      </div>

      {/* Legend */}
      <div className="border-t border-gray-100 px-5 py-2 flex gap-4 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-red-50 border border-red-200" />
          {t('text_diff.removed')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-green-50 border border-green-200" />
          {t('text_diff.added')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded bg-red-300" />
          <span className="inline-block h-2 w-2 rounded bg-green-300" />
          {t('text_diff.word_highlight')}
        </span>
      </div>
    </div>
  )
}
