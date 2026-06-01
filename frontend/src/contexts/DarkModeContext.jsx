import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const DARK_MODE_KEY = 'web-compare-dark-mode'

const DarkModeContext = createContext(null)

export function DarkModeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem(DARK_MODE_KEY)
      if (stored !== null) return stored === 'true'
      // Follow system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(DARK_MODE_KEY, String(isDark))
    } catch {
      // localStorage may be unavailable
    }

    // Toggle dark class on html element
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => {
      // Only follow system if user hasn't set a preference
      const stored = localStorage.getItem(DARK_MODE_KEY)
      if (stored === null) {
        setIsDark(e.matches)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggleDarkMode = useCallback(() => {
    setIsDark(prev => !prev)
  }, [])

  return (
    <DarkModeContext.Provider value={{ isDark, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export function useDarkMode() {
  const context = useContext(DarkModeContext)
  if (!context) {
    throw new Error('useDarkMode must be used within a DarkModeProvider')
  }
  return context
}
