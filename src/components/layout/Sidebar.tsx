import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const { t, i18n } = useTranslation()
  const location = useLocation()

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'de' ? 'en' : 'de')
  }

  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <h1 className="text-lg font-bold text-gray-900">{t('app.title')}</h1>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        <Link
          to="/"
          className={cn(
            'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            location.pathname === '/'
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          )}
        >
          {t('nav.dashboard')}
        </Link>
      </nav>

      <div className="border-t border-gray-200 p-3 space-y-2">
        <button
          onClick={toggleLanguage}
          className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          {t('nav.language')}: {i18n.language.toUpperCase()}
        </button>
      </div>
    </aside>
  )
}
