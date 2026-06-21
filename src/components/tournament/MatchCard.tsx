import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Match, MatchResult } from '@/types/round'
import { Player } from '@/types/player'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useTournamentContext } from '@/state/TournamentContext'
import { cn } from '@/lib/utils'

interface MatchCardProps {
  match: Match
  players: Player[]
  tournamentId: string
  readonly?: boolean
  hideDrawOption?: boolean
}

export function MatchCard({ match, players, tournamentId, readonly, hideDrawOption }: MatchCardProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()
  const [p1Games, setP1Games] = useState<string>(match.player1Games?.toString() ?? '')
  const [p2Games, setP2Games] = useState<string>(match.player2Games?.toString() ?? '')

  const player1 = players.find(p => p.id === match.player1Id)
  const player2 = match.player2Id ? players.find(p => p.id === match.player2Id) : null

  if (match.isBye) {
    return (
      <Card className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{player1?.name}</span>
          <Badge variant="info">{t('rounds.bye')}</Badge>
        </div>
        <Badge variant="success">3 pts</Badge>
      </Card>
    )
  }

  const submitResult = (result: MatchResult) => {
    const payload: { tournamentId: string; matchId: string; result: MatchResult; player1Games?: number; player2Games?: number } = {
      tournamentId, matchId: match.id, result,
    }
    if (p1Games !== '' && p2Games !== '') {
      payload.player1Games = parseInt(p1Games, 10)
      payload.player2Games = parseInt(p2Games, 10)
    }
    dispatch({ type: 'SUBMIT_MATCH_RESULT', payload })
  }

  const hasGameScores = match.player1Games !== undefined && match.player2Games !== undefined

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {match.tableNumber > 0 && (
              <span className="text-xs font-semibold text-gray-400">{t('match.table', { number: match.tableNumber })}</span>
            )}
            <span
              className={cn(
                'font-medium',
                match.result === 'player1_win' ? 'text-green-700' : 'text-gray-900'
              )}
            >
              {player1?.name}
            </span>
            {hasGameScores && (
              <span className="text-xs font-semibold text-gray-500">{match.player1Games}-{match.player2Games}</span>
            )}
            <span className="text-sm text-gray-400">{t('match.vs')}</span>
            <span
              className={cn(
                'font-medium',
                match.result === 'player2_win' ? 'text-green-700' : 'text-gray-900'
              )}
            >
              {player2?.name}
            </span>
          </div>
        </div>

        {match.result === 'pending' && (
          <Badge variant="default">{t('match.pending')}</Badge>
        )}
        {match.result === 'draw' && (
          <Badge variant="warning">{t('match.draw')}</Badge>
        )}
        {match.result === 'player1_win' && (
          <Badge variant="success">{t('match.player1Win', { name: player1?.name })}</Badge>
        )}
        {match.result === 'player2_win' && (
          <Badge variant="success">{t('match.player2Win', { name: player2?.name })}</Badge>
        )}
      </div>

      {!readonly && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">{t('match.games')}:</label>
            <input
              type="number"
              min={0}
              max={9}
              value={p1Games}
              onChange={e => setP1Games(e.target.value)}
              className="w-10 rounded border border-gray-200 px-1.5 py-0.5 text-center text-xs focus:border-blue-500 focus:outline-none"
              placeholder="0"
            />
            <span className="text-xs text-gray-400">-</span>
            <input
              type="number"
              min={0}
              max={9}
              value={p2Games}
              onChange={e => setP2Games(e.target.value)}
              className="w-10 rounded border border-gray-200 px-1.5 py-0.5 text-center text-xs focus:border-blue-500 focus:outline-none"
              placeholder="0"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={match.result === 'player1_win' ? 'primary' : 'secondary'}
              onClick={() => submitResult('player1_win')}
            >
              {player1?.name}
            </Button>
            {!hideDrawOption && (
              <Button
                size="sm"
                variant={match.result === 'draw' ? 'primary' : 'secondary'}
                onClick={() => submitResult('draw')}
              >
                {t('match.draw')}
              </Button>
            )}
            <Button
              size="sm"
              variant={match.result === 'player2_win' ? 'primary' : 'secondary'}
              onClick={() => submitResult('player2_win')}
            >
              {player2?.name}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
