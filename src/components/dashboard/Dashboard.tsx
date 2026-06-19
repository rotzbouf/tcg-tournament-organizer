import { useTranslation } from 'react-i18next'

export function Dashboard() {
  const { t } = useTranslation()

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('dashboard.title')}</h2>
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <p className="text-lg text-gray-500">{t('dashboard.empty')}</p>
        <p className="mt-1 text-sm text-gray-400">{t('dashboard.createFirst')}</p>
      </div>
    </div>
  )
}
