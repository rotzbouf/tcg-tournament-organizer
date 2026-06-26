import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTournamentContext } from '@/state/TournamentContext'
import { selectAllTournaments, selectStandings } from '@/state/selectors'
import { Season, PointTier } from '@/types/season'
import { Tournament } from '@/types/tournament'
import { Button } from '@/components/ui/Button'
import { GAME_CONFIG } from '@/lib/gameConfig'

interface Props {
  season: Season
  onDelete: () => void
}

interface SeasonEntry {
  name: string
  points: number
  bestRank: number
  eventsPlayed: number
}

function getPointsForRank(rank: number, tiers: PointTier[]): number {
  const tier = tiers.find(tier => rank >= tier.minRank && rank <= tier.maxRank)
  return tier?.points ?? 0
}

function computeSeasonRanking(season: Season, tournaments: Tournament[]): SeasonEntry[] {
  const linked = tournaments.filter(
    tournament => season.tournamentIds.includes(tournament.id) && tournament.status === 'completed'
  )
  const map = new Map<string, SeasonEntry>()

  for (const tournament of linked) {
    const standings = selectStandings(tournament)
    standings.forEach((s, idx) => {
      const rank = idx + 1
      const pts = getPointsForRank(rank, season.pointTiers)
      const key = s.playerName.toLowerCase()
      const existing = map.get(key)
      if (existing) {
        existing.points += pts
        existing.eventsPlayed += 1
        if (rank < existing.bestRank) existing.bestRank = rank
      } else {
        map.set(key, { name: s.playerName, points: pts, bestRank: rank, eventsPlayed: 1 })
      }
    })
  }

  return [...map.values()].sort((a, b) => b.points - a.points || a.bestRank - b.bestRank)
}

export function SeasonDetail({ season, onDelete }: Props) {
  const { t } = useTranslation()
  const { state, dispatch } = useTournamentContext()
  const allTournaments = selectAllTournaments(state)
  const [editingTiers, setEditingTiers] = useState(false)
  const [tiers, setTiers] = useState<PointTier[]>(season.pointTiers)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const linked = allTournaments.filter(tournament => season.tournamentIds.includes(tournament.id))
  const available = allTournaments.filter(
    tournament =>
      tournament.game === season.game &&
      tournament.status === 'completed' &&
      !season.tournamentIds.includes(tournament.id)
  )
  const ranking = computeSeasonRanking(season, allTournaments)
  const gameConfig = GAME_CONFIG[season.game]

  const addTournament = (id: string) =>
    dispatch({ type: 'ADD_TOURNAMENT_TO_SEASON', payload: { seasonId: season.id, tournamentId: id } })

  const removeTournament = (id: string) =>
    dispatch({ type: 'REMOVE_TOURNAMENT_FROM_SEASON', payload: { seasonId: season.id, tournamentId: id } })

  const updateTier = (i: number, field: keyof PointTier, value: number) =>
    setTiers(prev => prev.map((tier, idx) => (idx === i ? { ...tier, [field]: value } : tier)))

  const addTier = () => {
    const last = tiers[tiers.length - 1]
    const nextMin = last ? last.maxRank + 1 : 1
    setTiers(prev => [...prev, { minRank: nextMin, maxRank: nextMin, points: 1 }])
  }

  const saveTiers = () => {
    dispatch({ type: 'UPDATE_SEASON', payload: { seasonId: season.id, pointTiers: tiers } })
    setEditingTiers(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{season.name}</h2>
          <p className="text-sm text-muted-foreground">
            {gameConfig.icon} {gameConfig.name}
          </p>
        </div>
        {!confirmDelete ? (
          <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(true)}>
            {t('season.delete')}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600">{t('season.deleteConfirm')}</span>
            <Button size="sm" onClick={onDelete}>{t('common.confirm')}</Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</Button>
          </div>
        )}
      </div>

      {/* Point structure */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">{t('season.pointStructure')}</h3>
          {!editingTiers ? (
            <button
              onClick={() => { setTiers(season.pointTiers); setEditingTiers(true) }}
              className="text-xs text-blue-600 hover:underline"
            >
              {t('season.editTiers')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={saveTiers} className="text-xs text-green-600 hover:underline">{t('common.save')}</button>
              <button onClick={() => setEditingTiers(false)} className="text-xs text-muted-foreground hover:underline">{t('common.cancel')}</button>
            </div>
          )}
        </div>
        {editingTiers ? (
          <div className="space-y-1.5">
            {tiers.map((tier, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-8 text-right text-muted-foreground">#</span>
                <input
                  type="number" min={1} value={tier.minRank}
                  onChange={e => updateTier(i, 'minRank', Number(e.target.value))}
                  className="w-14 rounded border border-input bg-background px-2 py-1 text-center text-foreground focus:outline-none"
                />
                <span className="text-muted-foreground">–</span>
                <input
                  type="number" min={tier.minRank} value={tier.maxRank}
                  onChange={e => updateTier(i, 'maxRank', Number(e.target.value))}
                  className="w-14 rounded border border-input bg-background px-2 py-1 text-center text-foreground focus:outline-none"
                />
                <span className="flex-1 text-muted-foreground">=</span>
                <input
                  type="number" min={0} value={tier.points}
                  onChange={e => updateTier(i, 'points', Number(e.target.value))}
                  className="w-14 rounded border border-input bg-background px-2 py-1 text-center text-foreground focus:outline-none"
                />
                <span className="text-muted-foreground">{t('season.pointsLabel')}</span>
                <button
                  onClick={() => setTiers(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground hover:text-red-500"
                >×</button>
              </div>
            ))}
            <button onClick={addTier} className="mt-1 text-xs text-blue-600 hover:underline">
              + {t('season.addTier')}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {season.pointTiers.map((tier, i) => (
              <span key={i} className="rounded bg-muted px-2 py-1 text-xs text-foreground">
                #{tier.minRank}{tier.minRank !== tier.maxRank ? `–${tier.maxRank}` : ''}: {tier.points} {t('season.pointsLabel')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tournaments */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">{t('season.tournaments')}</h3>
        {linked.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('season.noCompleted')}</p>
        ) : (
          <div className="space-y-1">
            {linked.map(tournament => (
              <div key={tournament.id} className="flex items-center justify-between rounded px-2 py-1 hover:bg-muted">
                <span className="text-sm text-foreground">{tournament.name}</span>
                <button
                  onClick={() => removeTournament(tournament.id)}
                  className="text-xs text-muted-foreground hover:text-red-500"
                >×</button>
              </div>
            ))}
          </div>
        )}
        {available.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-1 text-xs text-muted-foreground">{t('season.addTournament')}</p>
            <div className="space-y-1">
              {available.map(tournament => (
                <button
                  key={tournament.id}
                  onClick={() => addTournament(tournament.id)}
                  className="flex w-full items-center justify-between rounded px-2 py-1 text-sm text-secondary-foreground hover:bg-muted hover:text-foreground"
                >
                  <span>{tournament.name}</span>
                  <span className="text-xs text-muted-foreground">+</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ranking */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">{t('season.ranking')}</h3>
        {ranking.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('season.noRanking')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3">#</th>
                <th className="pb-2 pr-3">{t('standings.player')}</th>
                <th className="pb-2 pr-3 text-right">{t('season.points')}</th>
                <th className="pb-2 pr-3 text-right">{t('season.bestFinish')}</th>
                <th className="pb-2 text-right">{t('season.tournamentsPlayed')}</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((entry, idx) => (
                <tr key={entry.name} className="border-b border-border/40 hover:bg-muted/50">
                  <td className="py-1.5 pr-3 text-muted-foreground">{idx + 1}</td>
                  <td className="py-1.5 pr-3 font-medium text-foreground">{entry.name}</td>
                  <td className="py-1.5 pr-3 text-right font-bold text-foreground">{entry.points}</td>
                  <td className="py-1.5 pr-3 text-right text-muted-foreground">#{entry.bestRank}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{entry.eventsPlayed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
