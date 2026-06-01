import { useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export function useKeyboardShortcuts({ onShowHelp }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleKeyDown = useCallback((e) => {
    // Don't trigger shortcuts when typing in input fields
    const tag = e.target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return
    }

    // Global shortcuts
    switch (e.key) {
      case '?':
        e.preventDefault()
        if (onShowHelp) onShowHelp()
        break

      case 'k':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          // Focus search box on history page
          if (location.pathname === '/history') {
            const searchInput = document.querySelector('input[type="text"]')
            if (searchInput) searchInput.focus()
          }
        }
        break

      case 'Enter':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          // Submit comparison form on home page
          if (location.pathname === '/') {
            const submitButton = document.querySelector('button[type="submit"]')
            if (submitButton) submitButton.click()
          }
        }
        break

      case '1':
        if (location.pathname.startsWith('/compare/')) {
          e.preventDefault()
          scrollToSection('summary')
        }
        break

      case '2':
        if (location.pathname.startsWith('/compare/')) {
          e.preventDefault()
          scrollToSection('screenshots')
        }
        break

      case '3':
        if (location.pathname.startsWith('/compare/')) {
          e.preventDefault()
          scrollToSection('visual-diff')
        }
        break

      case '4':
        if (location.pathname.startsWith('/compare/')) {
          e.preventDefault()
          scrollToSection('dom-diff')
        }
        break

      case '5':
        if (location.pathname.startsWith('/compare/')) {
          e.preventDefault()
          scrollToSection('text-diff')
        }
        break

      case 'Escape':
        // Reset zoom or close modals
        const event = new CustomEvent('keyboard-escape')
        window.dispatchEvent(event)
        break

      default:
        break
    }
  }, [location.pathname, onShowHelp])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

function scrollToSection(sectionId) {
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
