import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export function useNotification() {
  const { t } = useTranslation()
  const permissionRef = useRef(null)

  useEffect(() => {
    // Check current permission status
    if ('Notification' in window) {
      permissionRef.current = Notification.permission
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false

    const permission = await Notification.requestPermission()
    permissionRef.current = permission
    return permission === 'granted'
  }, [])

  const sendNotification = useCallback(async ({ title, body, tag, icon }) => {
    // Only send if document is hidden (user switched tabs)
    if (!document.hidden) return

    // Request permission if not already granted
    if (permissionRef.current !== 'granted') {
      const granted = await requestPermission()
      if (!granted) return
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.svg',
        tag: tag || 'web-compare',
        silent: false,
      })

      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000)
    } catch {
      // Notification constructor may fail in some environments
    }
  }, [requestPermission])

  const notifyComparisonComplete = useCallback((data) => {
    const urlA = data.url_a ? new URL(data.url_a).hostname : ''
    const urlB = data.url_b ? new URL(data.url_b).hostname : ''
    const summary = data.summary || {}
    const diffCount = (summary.dom_diff_count || 0) + (summary.text_diff_count || 0)
    const visualDiff = summary.visual_diff_percentage || 0

    let body = `${urlA} vs ${urlB}`
    if (diffCount > 0 || visualDiff > 0) {
      body += ` — ${diffCount} ${t('summary.differences')}, ${visualDiff}% ${t('summary.percent_diff')}`
    } else {
      body += ` — ${t('summary.no_changes')}`
    }

    sendNotification({
      title: t('status.complete'),
      body,
      tag: `comparison-${data.id}`,
    })
  }, [sendNotification, t])

  return {
    requestPermission,
    sendNotification,
    notifyComparisonComplete,
  }
}
