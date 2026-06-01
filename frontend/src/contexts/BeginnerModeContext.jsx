import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const BEGINNER_MODE_KEY = 'web-compare-beginner-mode'

const BeginnerModeContext = createContext(null)

export function BeginnerModeProvider({ children }) {
  const [isBeginner, setIsBeginner] = useState(() => {
    try {
      const stored = localStorage.getItem(BEGINNER_MODE_KEY)
      return stored === null ? true : stored === 'true'
    } catch {
      return true
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(BEGINNER_MODE_KEY, String(isBeginner))
    } catch {
      // localStorage may be unavailable
    }
  }, [isBeginner])

  const toggleBeginnerMode = useCallback(() => {
    setIsBeginner(prev => !prev)
  }, [])

  return (
    <BeginnerModeContext.Provider value={{ isBeginner, toggleBeginnerMode }}>
      {children}
    </BeginnerModeContext.Provider>
  )
}

export function useBeginnerMode() {
  const context = useContext(BeginnerModeContext)
  if (!context) {
    throw new Error('useBeginnerMode must be used within a BeginnerModeProvider')
  }
  return context
}
