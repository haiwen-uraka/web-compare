import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IconCompare, IconHistory, IconGlobe } from '../shared/Icons'

export default function Header() {
  const location = useLocation()
  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    const next = i18n.language.startsWith('zh') ? 'en' : 'zh-CN'
    i18n.changeLanguage(next)
  }

  const navLinks = [
    { to: '/', label: t('header.compare'), Icon: IconCompare },
    { to: '/history', label: t('header.history'), Icon: IconHistory },
  ]

  return (
    <header className="glass-nav sticky top-0 z-30 border-b border-apple-gray-200/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-apple-blue text-sm font-bold text-white shadow-apple-sm transition-shadow group-hover:shadow-apple">
            <IconLayersSingle />
          </div>
          <span className="text-[17px] font-semibold tracking-tight text-apple-gray-900">
            {t('app.title')}
          </span>
        </Link>
        <nav className="flex items-center gap-0.5">
          {navLinks.map(({ to, label, Icon: NavIcon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium tracking-tight transition-all duration-200 ${
                  active
                    ? 'bg-black/5 text-apple-gray-900'
                    : 'text-apple-gray-500 hover:bg-black/[0.04] hover:text-apple-gray-700'
                }`}
              >
                <NavIcon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
          <div className="ml-2 h-5 w-px bg-apple-gray-200" />
          <button
            onClick={toggleLanguage}
            aria-label={t('header.switch_lang')}
            className="ml-1 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-medium tracking-tight text-apple-gray-500 transition-colors hover:bg-black/[0.04] hover:text-apple-gray-700"
          >
            <IconGlobe className="w-4 h-4" />
            <span>{i18n.language.startsWith('zh') ? 'EN' : '中文'}</span>
          </button>
        </nav>
      </div>
    </header>
  )
}

function IconLayersSingle() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 2h10a2 2 0 0 1 2 2v12" />
    </svg>
  )
}
