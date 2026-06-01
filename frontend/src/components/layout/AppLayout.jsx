import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import HelpDrawer from '../help/HelpDrawer'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

export default function AppLayout() {
  const [showHelp, setShowHelp] = useState(false)

  useKeyboardShortcuts({
    onShowHelp: () => setShowHelp(true),
  })

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#1D1D1F]">
      <Header onShowHelp={() => setShowHelp(true)} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <HelpDrawer isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}
