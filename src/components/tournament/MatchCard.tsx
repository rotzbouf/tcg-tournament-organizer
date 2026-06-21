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
    dispatch({
      type: 'SUBMIT_MATCH_RESULT',
      payload: { tournamentId, matchId: match.id, result },
    })
  }

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
        <div className="mt-3 flex gap-2">
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
      )}
    </Card>
  )
}
