import { useState, useMemo, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useBeginnerMode } from '../../contexts/BeginnerModeContext'
import { IconChevronDown, IconChevronRight, IconTarget } from '../shared/Icons'

// Diff type configuration
const DIFF_CONFIG = {
  added: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-800',
    icon: '+',
    iconBg: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  removed: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    icon: '−',
    iconBg: 'bg-red-500',
    badge: 'bg-red-100 text-red-700',
  },
  attribute_changed: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    icon: '~',
    iconBg: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700',
  },
  text_changed: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-800',
    icon: '✎',
    iconBg: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700',
  },
}

// Parse element path to extract tag, id, classes
function parseElementPath(pathStr) {
  if (!pathStr) return { tag: 'div', id: null, classes: [] }
  const parts = pathStr.split(' > ')
  const lastPart = parts[parts.length - 1] || ''
  const tagMatch = lastPart.match(/^(\w[\w-]*)/i)
  const tag = tagMatch ? tagMatch[1].toLowerCase() : 'div'
  const idMatch = lastPart.match(/#([\w-]+)/)
  const id = idMatch ? idMatch[1] : null
  const classMatches = lastPart.matchAll(/\.([\w-]+)/g)
  const classes = Array.from(classMatches).map(m => m[1])
  return { tag, id, classes }
}

// Format element display name
function formatElementName(pathStr) {
  const { tag, id, classes } = parseElementPath(pathStr)
  let name = tag
  if (id) name += `#${id}`
  if (classes.length > 0) name += `.${classes.slice(0, 2).join('.')}`
  if (classes.length > 2) name += '.'
  return name
}

// Build tree structure from diff elements
function buildTreeFromElements(elements) {
  if (!elements || elements.length === 0) return []

  const root = { children: [], path: '', tag: 'body', diffType: null, details: null, depth: 0 }
  const nodeMap = new Map()
  nodeMap.set('', root)

  elements.forEach(el => {
    const parts = el.path.split(' > ')
    let currentPath = ''

    parts.forEach((part, i) => {
      const parentPath = currentPath
      currentPath = currentPath ? `${currentPath} > ${part}` : part

      if (!nodeMap.has(currentPath)) {
        const newNode = {
          path: currentPath,
          tag: part.match(/^(\w[\w-]*)/i)?.[1]?.toLowerCase() || 'div',
          diffType: i === parts.length - 1 ? el.reason : null,
          details: i === parts.length - 1 ? el.details : null,
          originalTag: i === parts.length - 1 ? el.tag : null,
          children: [],
          depth: i + 1,
          fullPath: currentPath,
        }
        nodeMap.set(currentPath, newNode)

        const parent = nodeMap.get(parentPath)
        if (parent) {
          parent.children.push(newNode)
        }
      } else if (i === parts.length - 1) {
        const node = nodeMap.get(currentPath)
        node.diffType = el.reason
        node.details = el.details
        node.originalTag = el.tag
      }
    })
  })

  return root.children
}

// Check if a node or any of its descendants match the filter
function nodeMatchesFilter(node, filterReason) {
  if (!filterReason) return true
  if (node.diffType === filterReason) return true
  if (node.children) {
    return node.children.some(child => nodeMatchesFilter(child, filterReason))
  }
  return false
}

// Check if a node or any of its descendants match the search
function nodeMatchesSearch(node, searchQuery) {
  if (!searchQuery) return true
  const q = searchQuery.toLowerCase()
  if (
    node.tag?.toLowerCase().includes(q) ||
    node.path?.toLowerCase().includes(q) ||
    node.details?.attribute?.toLowerCase().includes(q) ||
    node.details?.old_value?.toLowerCase().includes(q) ||
    node.details?.new_value?.toLowerCase().includes(q) ||
    node.details?.old_text?.toLowerCase().includes(q) ||
    node.details?.new_text?.toLowerCase().includes(q)
  ) {
    return true
  }
  if (node.children) {
    return node.children.some(child => nodeMatchesSearch(child, searchQuery))
  }
  return false
}

// Filter tree nodes based on filter and search
function filterTree(nodes, filterReason, searchQuery) {
  if (!filterReason && !searchQuery) return nodes

  return nodes.filter(node => {
    const matchesFilter = nodeMatchesFilter(node, filterReason)
    const matchesSearch = nodeMatchesSearch(node, searchQuery)
    return matchesFilter && matchesSearch
  }).map(node => {
    if (!node.children || node.children.length === 0) return node
    const filteredChildren = filterTree(node.children, filterReason, searchQuery)
    return { ...node, children: filteredChildren }
  })
}

// Single tree node component
function TreeNode({ node, depth = 0, searchQuery, expandedNodes, toggleExpand }) {
  const { t } = useTranslation()
  const { isBeginner } = useBeginnerMode()

  const hasDiff = !!node.diffType
  const diffConfig = hasDiff ? DIFF_CONFIG[node.diffType] : null
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedNodes.has(node.path)

  const matchesSearch = searchQuery && (
    node.tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.path?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.details?.old_value?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.details?.new_value?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.details?.old_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.details?.new_text?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Auto-expand if matches search
  useEffect(() => {
    if (matchesSearch && !isExpanded) {
      toggleExpand(node.path)
    }
  }, [matchesSearch, isExpanded, node.path, toggleExpand])

  // Get human-readable label for diff type
  const getDiffLabel = () => {
    if (!hasDiff) return ''
    if (isBeginner) {
      const map = {
        added: t('beginner_mode.added_elements'),
        removed: t('beginner_mode.removed_elements'),
        attribute_changed: t('beginner_mode.attribute_changes'),
        text_changed: t('beginner_mode.text_changes'),
      }
      return map[node.diffType] || ''
    }
    const map = {
      added: t('dom_diff.added'),
      removed: t('dom_diff.removed'),
      attribute_changed: t('dom_diff.attribute_changes'),
      text_changed: t('dom_diff.text_changes'),
    }
    return map[node.diffType] || ''
  }

  // Format attribute change details
  const renderAttributeChange = () => {
    if (node.diffType !== 'attribute_changed' || !node.details) return null
    const attr = node.details.attribute || ''
    const oldVal = node.details.old_value || '∅'
    const newVal = node.details.new_value || '∅'

    return (
      <div className="mt-1.5 ml-6 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="font-mono font-medium text-apple-gray-600 bg-apple-gray-100 px-1.5 py-0.5 rounded">
          {attr}
        </span>
        <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded line-through max-w-[200px] truncate" title={oldVal}>
          {oldVal}
        </span>
        <span className="text-apple-gray-400">→</span>
        <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded max-w-[200px] truncate" title={newVal}>
          {newVal}
        </span>
      </div>
    )
  }

  // Format text change details with word-level diff
  const renderTextChange = () => {
    if (node.diffType !== 'text_changed' || !node.details) return null
    const oldText = node.details.old_text || '∅'
    const newText = node.details.new_text || '∅'

    let prefixLen = 0
    const minLen = Math.min(oldText.length, newText.length)
    while (prefixLen < minLen && oldText[prefixLen] === newText[prefixLen]) prefixLen++

    let suffixLen = 0
    while (suffixLen < minLen - prefixLen && oldText[oldText.length - 1 - suffixLen] === newText[newText.length - 1 - suffixLen]) suffixLen++

    const oldPrefix = oldText.slice(0, prefixLen)
    const oldDiff = oldText.slice(prefixLen, oldText.length - suffixLen || undefined)
    const oldSuffix = suffixLen > 0 ? oldText.slice(-suffixLen) : ''

    const newPrefix = newText.slice(0, prefixLen)
    const newDiff = newText.slice(prefixLen, newText.length - suffixLen || undefined)
    const newSuffix = suffixLen > 0 ? newText.slice(-suffixLen) : ''

    return (
      <div className="mt-1.5 ml-6 space-y-1 text-[11px]">
        <div className="flex items-start gap-1.5">
          <span className="text-apple-gray-400 shrink-0 mt-0.5">A:</span>
          <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded break-all">
            {prefixLen > 0 && <span className="text-apple-gray-500">{oldPrefix}</span>}
            {oldDiff && <span className="bg-red-200 font-medium">{oldDiff}</span>}
            {oldSuffix && <span className="text-apple-gray-500">{oldSuffix}</span>}
          </span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="text-apple-gray-400 shrink-0 mt-0.5">B:</span>
          <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded break-all">
            {prefixLen > 0 && <span className="text-apple-gray-500">{newPrefix}</span>}
            {newDiff && <span className="bg-green-200 font-medium">{newDiff}</span>}
            {newSuffix && <span className="text-apple-gray-500">{newSuffix}</span>}
          </span>
        </div>
      </div>
    )
  }

  // Render added/removed details
  const renderAddedRemoved = () => {
    if (node.diffType !== 'added' && node.diffType !== 'removed') return null
    return (
      <div className="mt-1 ml-6 text-[11px]">
        <span className={`${diffConfig.text} font-medium`}>{getDiffLabel()}</span>
      </div>
    )
  }

  const elementName = formatElementName(node.path)

  return (
    <div>
      <div
        className={`group flex items-start gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-150 ${
          hasDiff
            ? `${diffConfig.bg} ${diffConfig.border} border shadow-sm`
            : 'hover:bg-apple-gray-50'
        } ${matchesSearch ? 'ring-2 ring-apple-blue/40' : ''}`}
        style={{ marginLeft: `${depth * 20}px` }}
        onClick={() => {
          if (hasChildren) toggleExpand(node.path)
        }}
      >
        {/* Expand/collapse icon */}
        {hasChildren ? (
          <span className="w-4 h-4 shrink-0 mt-0.5 text-apple-gray-400">
            {isExpanded ? (
              <IconChevronDown className="w-3.5 h-3.5" />
            ) : (
              <IconChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        ) : (
          <span className="w-4 h-4 shrink-0" />
        )}

        {/* Diff type badge */}
        {hasDiff && (
          <span className={`flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold text-white shrink-0 ${diffConfig.iconBg} shadow-sm`}>
            {diffConfig.icon}
          </span>
        )}

        {/* Element content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <code className={`text-[12px] font-semibold font-mono ${hasDiff ? diffConfig.text : 'text-apple-gray-800'}`}>
              &lt;{node.originalTag || elementName}&gt;
            </code>
            {hasDiff && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${diffConfig.badge}`}>
                {getDiffLabel()}
              </span>
            )}
          </div>
          <div className={`text-[10px] text-apple-gray-400 font-mono mt-0.5 truncate ${matchesSearch ? 'text-apple-blue' : ''}`}>
            {node.path}
          </div>
          {renderAttributeChange()}
          {renderTextChange()}
          {renderAddedRemoved()}
        </div>

        {/* Locate button */}
        {hasDiff && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                const el = document.getElementById(`diff-${node.path}`)
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
              className="p-1 rounded hover:bg-white/80 text-apple-gray-400 hover:text-apple-blue transition-colors"
              title={t('dom_diff.locate_element')}
            >
              <IconTarget className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="relative">
          <div
            className="absolute top-0 bottom-0 w-px bg-apple-gray-200"
            style={{ left: `${depth * 20 + 10}px` }}
          />
          {node.children.map((child, i) => (
            <TreeNode
              key={child.path || i}
              node={child}
              depth={depth + 1}
              searchQuery={searchQuery}
              expandedNodes={expandedNodes}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Main component
export default function DomDiffTree({ domDiff, searchQuery = '', filterReason = null }) {
  const { t } = useTranslation()
  const { isBeginner } = useBeginnerMode()
  const [expandedNodes, setExpandedNodes] = useState(new Set())

  // Build tree from DOM diff
  const tree = useMemo(() => {
    if (!domDiff) return []

    const allDiffs = [
      ...(domDiff.added_elements || []),
      ...(domDiff.removed_elements || []),
      ...(domDiff.attribute_changes || []),
      ...(domDiff.text_changes || []),
    ]

    return buildTreeFromElements(allDiffs)
  }, [domDiff])

  // Filter tree based on filter and search
  const filteredTree = useMemo(() => {
    return filterTree(tree, filterReason, searchQuery)
  }, [tree, filterReason, searchQuery])

  // Initialize expanded nodes (expand first 2 levels)
  useEffect(() => {
    const initialExpanded = new Set()
    const expandNode = (node, depth) => {
      if (depth < 2 && node.children?.length > 0) {
        initialExpanded.add(node.path)
        node.children.forEach(child => expandNode(child, depth + 1))
      }
    }
    filteredTree.forEach(node => expandNode(node, 0))
    setExpandedNodes(initialExpanded)
  }, [filteredTree])

  // Listen for expand/collapse all events from parent
  useEffect(() => {
    const handleExpandAll = () => {
      const allPaths = new Set()
      const collectPaths = (nodes) => {
        nodes.forEach(node => {
          if (node.children?.length > 0) {
            allPaths.add(node.path)
            collectPaths(node.children)
          }
        })
      }
      collectPaths(filteredTree)
      setExpandedNodes(allPaths)
    }

    const handleCollapseAll = () => {
      setExpandedNodes(new Set())
    }

    window.addEventListener('dom-tree-expand-all', handleExpandAll)
    window.addEventListener('dom-tree-collapse-all', handleCollapseAll)

    return () => {
      window.removeEventListener('dom-tree-expand-all', handleExpandAll)
      window.removeEventListener('dom-tree-collapse-all', handleCollapseAll)
    }
  }, [filteredTree])

  // Toggle node expansion
  const toggleExpand = useCallback((path) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  if (!domDiff) return null

  const hasChanges = filteredTree.length > 0

  if (!hasChanges) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-emerald-700">
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="4 12 9 17 20 6" /></svg>
        <span className="text-[13px] font-medium">
          {searchQuery ? t('dom_diff.no_search_results') : t('dom_diff.no_elements_all')}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Tree */}
      <div className="max-h-[600px] overflow-y-auto rounded-xl border border-apple-gray-200 bg-white">
        <div className="p-2">
          {filteredTree.map((node, i) => (
            <TreeNode
              key={node.path || i}
              node={node}
              searchQuery={searchQuery}
              expandedNodes={expandedNodes}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[11px] text-apple-gray-500 px-1">
        {Object.entries(DIFF_CONFIG).map(([key, config]) => {
          let label
          if (isBeginner) {
            const map = {
              added: t('beginner_mode.added_elements'),
              removed: t('beginner_mode.removed_elements'),
              attribute_changed: t('beginner_mode.attribute_changes'),
              text_changed: t('beginner_mode.text_changes'),
            }
            label = map[key]
          } else {
            const map = {
              added: t('dom_diff.filter_added'),
              removed: t('dom_diff.filter_removed'),
              attribute_changed: t('dom_diff.filter_changed'),
              text_changed: t('dom_diff.filter_text'),
            }
            label = map[key]
          }

          return (
            <span key={key} className="flex items-center gap-1.5">
              <span className={`flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold text-white ${config.iconBg}`}>
                {config.icon}
              </span>
              <span>{label}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
