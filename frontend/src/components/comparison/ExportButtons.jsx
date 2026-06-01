import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconDownload, IconCopy, IconCheck } from '../shared/Icons'
import { useToast } from '../../contexts/ToastContext'

export default function ExportButtons({ data, taskId }) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [exporting, setExporting] = useState(null)
  const [copied, setCopied] = useState(false)

  // Export as JSON
  const handleExportJSON = async () => {
    setExporting('json')
    try {
      const jsonData = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comparison-${taskId}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast({
        message: t('export.json_success'),
        type: 'success',
        duration: 3000,
      })
    } catch {
      showToast({
        message: t('export.json_failed'),
        type: 'error',
        duration: 3000,
      })
    } finally {
      setExporting(null)
    }
  }

  // Export as HTML report
  const handleExportHTML = async () => {
    setExporting('html')
    try {
      const htmlContent = generateHTMLReport(data, t)
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comparison-${taskId}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast({
        message: t('export.html_success'),
        type: 'success',
        duration: 3000,
      })
    } catch {
      showToast({
        message: t('export.html_failed'),
        type: 'error',
        duration: 3000,
      })
    } finally {
      setExporting(null)
    }
  }

  // Copy share link
  const handleCopyLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/compare/${taskId}`
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      showToast({
        message: t('export.link_copied'),
        type: 'success',
        duration: 3000,
      })
    } catch {
      showToast({
        message: t('export.link_copy_failed'),
        type: 'error',
        duration: 3000,
      })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExportJSON}
        disabled={exporting === 'json'}
        className="btn-apple btn-apple-secondary text-[12px] disabled:opacity-50"
      >
        <IconDownload className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t('export.json')}</span>
      </button>

      <button
        onClick={handleExportHTML}
        disabled={exporting === 'html'}
        className="btn-apple btn-apple-secondary text-[12px] disabled:opacity-50"
      >
        <IconDownload className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t('export.html')}</span>
      </button>

      <button
        onClick={handleCopyLink}
        className="btn-apple btn-apple-secondary text-[12px]"
      >
        {copied ? (
          <IconCheck className="w-3.5 h-3.5 text-apple-green" />
        ) : (
          <IconCopy className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">{copied ? t('export.copied') : t('export.share_link')}</span>
      </button>
    </div>
  )
}

// Generate HTML report
function generateHTMLReport(data, t) {
  const now = new Date().toLocaleString()
  const summary = data.summary || {}
  const domDiff = data.dom_diff || {}
  const textDiff = data.text_diff || {}

  const domChanges = (domDiff.added_elements?.length || 0) +
                     (domDiff.removed_elements?.length || 0) +
                     (domDiff.attribute_changes?.length || 0) +
                     (domDiff.text_changes?.length || 0)

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t('export.report_title')} - ${now}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f7; }
    .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    h1 { font-size: 24px; color: #1d1d1f; margin-bottom: 8px; }
    h2 { font-size: 18px; color: #1d1d1f; margin-bottom: 16px; }
    .meta { color: #86868b; font-size: 14px; margin-bottom: 24px; }
    .url { color: #007AFF; text-decoration: none; word-break: break-all; }
    .url:hover { text-decoration: underline; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat { text-align: center; padding: 16px; background: #f5f5f7; border-radius: 8px; }
    .stat-value { font-size: 32px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #86868b; margin-top: 4px; }
    .diff-item { padding: 12px; border-left: 3px solid #e5e5ea; margin-bottom: 8px; background: #fafafa; border-radius: 0 8px 8px 0; }
    .diff-added { border-color: #34C759; background: rgba(52,199,89,0.05); }
    .diff-removed { border-color: #FF3B30; background: rgba(255,59,48,0.05); }
    .diff-changed { border-color: #FF9500; background: rgba(255,149,0,0.05); }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .tag-added { background: #34C759; color: white; }
    .tag-removed { background: #FF3B30; color: white; }
    .tag-changed { background: #FF9500; color: white; }
    code { font-family: 'SF Mono', Monaco, monospace; font-size: 12px; background: #f5f5f7; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${t('export.report_title')}</h1>
    <div class="meta">${now}</div>
    <p><strong>${t('history.url_a')}:</strong> <a href="${data.url_a}" class="url">${data.url_a}</a></p>
    <p><strong>${t('history.url_b')}:</strong> <a href="${data.url_b}" class="url">${data.url_b}</a></p>
  </div>

  <div class="card">
    <h2>${t('results.nav_summary')}</h2>
    <div class="stats">
      <div class="stat">
        <div class="stat-value" style="color: #007AFF">${summary.dom_diff_count || 0}</div>
        <div class="stat-label">${t('summary.dom_structure')}</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: #FF9500">${summary.visual_diff_percentage || 0}%</div>
        <div class="stat-label">${t('summary.visual')}</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: #5856D6">${summary.text_diff_count || 0}</div>
        <div class="stat-label">${t('summary.text_content')}</div>
      </div>
    </div>
  </div>

  ${domChanges > 0 ? `
  <div class="card">
    <h2>${t('dom_diff.title')}</h2>
    ${(domDiff.added_elements || []).map(el => `
      <div class="diff-item diff-added">
        <span class="tag tag-added">+</span>
        <code>${el.tag}</code>
        <span style="color: #86868b; font-size: 12px; margin-left: 8px;">${el.path}</span>
      </div>
    `).join('')}
    ${(domDiff.removed_elements || []).map(el => `
      <div class="diff-item diff-removed">
        <span class="tag tag-removed">−</span>
        <code>${el.tag}</code>
        <span style="color: #86868b; font-size: 12px; margin-left: 8px;">${el.path}</span>
      </div>
    `).join('')}
    ${(domDiff.attribute_changes || []).map(el => `
      <div class="diff-item diff-changed">
        <span class="tag tag-changed">~</span>
        <code>${el.tag}</code>
        <span style="color: #86868b; font-size: 12px; margin-left: 8px;">${el.details?.attribute}: ${el.details?.old_value} → ${el.details?.new_value}</span>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="card" style="color: #86868b; text-align: center;">
    ${t('export.generated_by')}
  </div>
</body>
</html>`
}
