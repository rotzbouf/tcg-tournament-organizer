import { useTranslation } from 'react-i18next'
import { Standing } from '@/types/standing'
import { GameType } from '@/types/tournament'
import { GAME_CONFIG } from '@/lib/gameConfig'

interface StandingsTableProps {
  standings: Standing[]
  game?: GameType
}

function pct(n: number): string {
  return (n * 100).toFixed(2) + '%'
}

export function StandingsTable({ standings, game }: StandingsTableProps) {
  const { t } = useTranslation()

  if (standings.length === 0) return null

  const config = game ? GAME_CONFIG[game].tiebreakers : null
  const isTcg = config?.system === 'tcg'

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-background">
            <th className="px-3 py-2 text-left font-medium text-secondary-foreground">{t('standings.rank')}</th>
            <th className="px-3 py-2 text-left font-medium text-secondary-foreground">{t('standings.player')}</th>
            <th className="px-3 py-2 text-center font-medium text-secondary-foreground">{t('standings.points')}</th>
            <th className="px-3 py-2 text-center font-medium text-secondary-foreground">{t('standings.wins')}</th>
            <th className="px-3 py-2 text-center font-medium text-secondary-foreground">{t('standings.losses')}</th>
            <th className="px-3 py-2 text-center font-medium text-secondary-foreground">{t('standings.draws')}</th>
            {isTcg ? (
              <>
                <th className="px-3 py-2 text-center font-medium text-secondary-foreground">{t('standings.opponentMatchWinPct')}</th>
                {config.useGameWinPct && (
                  <>
                    <th className="px-3 py-2 text-center font-medium text-secondary-foreground">{t('standings.gameWinPct')}</th>
                    <th className="px-3 py-2 text-center font-medium text-secondary-foreground">{t('standings.opponentGameWinPct')}</th>
                  </>
                )}
              </>
            ) : (
              <>
                <th className="px-3 py-2 text-center font-medium text-secondary-foreground">{t('standings.buchholz')}</th>
                <th className="px-3 py-2 text-center font-medium text-secondary-foreground">{t('standings.medianBuchholz')}</th>
                <th className="px-3 py-2 text-center font-medium text-secondary-foreground">{t('standings.sonnebornBerger')}</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {standings.map(standing => (
            <tr key={standing.playerId} className={`border-b border-muted last:border-0${standing.dropped ? ' opacity-50' : ''}`}>
              <td className="px-3 py-2 font-medium text-foreground">{standing.rank}</td>
              <td className="px-3 py-2 text-foreground">
                {standing.dropped ? <span className="line-through">{standing.playerName}</span> : standing.playerName}
                {standing.dropped && <span className="ml-2 text-xs text-red-500">{t('players.dropped')}</span>}
              </td>
              <td className="px-3 py-2 text-center font-semibold text-foreground">{standing.matchPoints}</td>
              <td className="px-3 py-2 text-center text-green-600">{standing.wins}</td>
              <td className="px-3 py-2 text-center text-red-600">{standing.losses}</td>
              <td className="px-3 py-2 text-center text-yellow-600">{standing.draws}</td>
              {isTcg ? (
                <>
                  <td className="px-3 py-2 text-center text-muted-foreground">{pct(standing.opponentMatchWinPct)}</td>
                  {config.useGameWinPct && (
                    <>
                      <td className="px-3 py-2 text-center text-muted-foreground">{pct(standing.gameWinPct)}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground">{pct(standing.opponentGameWinPct)}</td>
                    </>
                  )}
                </>
              ) : (
                <>
                  <td className="px-3 py-2 text-center text-muted-foreground">{standing.buchholz}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{standing.medianBuchholz}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{standing.sonnebornBerger}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
