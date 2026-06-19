import { useTranslation } from 'react-i18next'
import { Standing } from '@/types/standing'

interface StandingsTableProps {
  standings: Standing[]
}

export function StandingsTable({ standings }: StandingsTableProps) {
  const { t } = useTranslation()

  if (standings.length === 0) return null

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-3 py-2 text-left font-medium text-gray-600">{t('standings.rank')}</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">{t('standings.player')}</th>
            <th className="px-3 py-2 text-center font-medium text-gray-600">{t('standings.points')}</th>
            <th className="px-3 py-2 text-center font-medium text-gray-600">{t('standings.wins')}</th>
            <th className="px-3 py-2 text-center font-medium text-gray-600">{t('standings.losses')}</th>
            <th className="px-3 py-2 text-center font-medium text-gray-600">{t('standings.draws')}</th>
            <th className="px-3 py-2 text-center font-medium text-gray-600">{t('standings.buchholz')}</th>
            <th className="px-3 py-2 text-center font-medium text-gray-600">{t('standings.medianBuchholz')}</th>
            <th className="px-3 py-2 text-center font-medium text-gray-600">{t('standings.sonnebornBerger')}</th>
          </tr>
        </thead>
        <tbody>
          {standings.map(standing => (
            <tr key={standing.playerId} className="border-b border-gray-100 last:border-0">
              <td className="px-3 py-2 font-medium text-gray-900">{standing.rank}</td>
              <td className="px-3 py-2 text-gray-900">{standing.playerName}</td>
              <td className="px-3 py-2 text-center font-semibold text-gray-900">{standing.matchPoints}</td>
              <td className="px-3 py-2 text-center text-green-600">{standing.wins}</td>
              <td className="px-3 py-2 text-center text-red-600">{standing.losses}</td>
              <td className="px-3 py-2 text-center text-yellow-600">{standing.draws}</td>
              <td className="px-3 py-2 text-center text-gray-500">{standing.buchholz}</td>
              <td className="px-3 py-2 text-center text-gray-500">{standing.medianBuchholz}</td>
              <td className="px-3 py-2 text-center text-gray-500">{standing.sonnebornBerger}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
