import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Player } from '@/types/player'
import { GameType } from '@/types/tournament'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useTournamentContext } from '@/state/TournamentContext'
import { getPlayerDivision, DIVISION_LABELS } from '@/lib/ageDivision'
import { AddPlayerForm } from './AddPlayerForm'
import { BulkImportDialog } from './BulkImportDialog'
import { DecklistDialog } from './DecklistDialog'
import { cn } from '@/lib/utils'

interface PlayerListProps {
  tournamentId: string
  players: Player[]
  editable: boolean
  inProgress?: boolean
  game?: GameType
  gameFormat?: string | null
  ageDivisionsEnabled?: boolean
  createdAt?: string
}

export function PlayerList({ tournamentId, players, editable, inProgress, game, gameFormat, ageDivisionsEnabled, createdAt }: PlayerListProps) {
  const { t, i18n } = useTranslation()
  const { dispatch } = useTournamentContext()
  const [dropPlayerId, setDropPlayerId] = useState<string | null>(null)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [decklistPlayerId, setDecklistPlayerId] = useState<string | null>(null)

  const activePlayers = players.filter(p => p.droppedInRound === null)
  const dropPlayer = players.find(p => p.id === dropPlayerId)

  const handleConfirmDrop = () => {
    if (dropPlayerId) {
      dispatch({ type: 'DROP_PLAYER', payload: { tournamentId, playerId: dropPlayerId } })
      setDropPlayerId(null)
    }
  }

  return (
    <div className="space-y-4">
      {editable && (
        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <AddPlayerForm tournamentId={tournamentId} game={game} existingPlayers={players} />
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowBulkImport(true)}>
              {t('players.bulkImport')}
            </Button>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {inProgress
          ? t('players.activeCount', { active: activePlayers.length, total: players.length })
          : t('players.count', { count: players.length })}
      </p>

      <div className="divide-y divide-muted rounded-lg border border-border">
        {players.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">{t('dashboard.empty')}</p>
        ) : (
          players.map((player, index) => (
            <div
              key={player.id}
              className={cn(
                'flex items-center justify-between px-4 py-2.5',
                player.droppedInRound !== null && 'opacity-50'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-right text-sm text-muted-foreground">{index + 1}</span>
                <span className={cn(
                  'text-sm font-medium',
                  player.droppedInRound !== null ? 'text-muted-foreground line-through' : 'text-foreground'
                )}>
                  {player.name}
                </span>
                {ageDivisionsEnabled && createdAt && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {DIVISION_LABELS[getPlayerDivision(player.dateOfBirth, createdAt)][i18n.language === 'de' ? 'de' : 'en']}
                  </span>
                )}
                {player.playerId && (
                  <span className="text-xs text-blue-400">[{player.playerId}]</span>
                )}
                {player.dateOfBirth && (
                  <span className="text-xs text-muted-foreground">{player.dateOfBirth}</span>
                )}
                {player.deckName && (
                  <span className="text-xs text-muted-foreground">({player.deckName})</span>
                )}
                {player.droppedInRound !== null && (
                  <span className="text-xs text-red-500">
                    {t('players.droppedInRound', { round: player.droppedInRound })}
                  </span>
                )}
              </div>
              {editable && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t('players.deckName')}
                    value={player.deckName ?? ''}
                    onChange={e => dispatch({
                      type: 'UPDATE_PLAYER',
                      payload: { tournamentId, playerId: player.id, deckName: e.target.value || null },
                    })}
                    className="w-28 rounded border border-border bg-card px-2 py-1 text-xs text-secondary-foreground focus:border-blue-500 focus:outline-none"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDecklistPlayerId(player.id)}
                  >
                    {t('decklist.title')}{player.decklist ? ` (${player.decklist.reduce((s, e) => s + e.quantity, 0)})` : ''}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      dispatch({
                        type: 'REMOVE_PLAYER',
                        payload: { tournamentId, playerId: player.id },
                      })
                    }
                  >
                    {t('players.remove')}
                  </Button>
                </div>
              )}
              {inProgress && player.droppedInRound === null && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setDropPlayerId(player.id)}
                >
                  {t('players.drop')}
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {decklistPlayerId && (
        <DecklistDialog
          open={true}
          onClose={() => setDecklistPlayerId(null)}
          tournamentId={tournamentId}
          player={players.find(p => p.id === decklistPlayerId)!}
          readonly={!editable}
          game={game}
          gameFormat={gameFormat}
        />
      )}

      <BulkImportDialog
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        tournamentId={tournamentId}
      />

      <ConfirmDialog
        open={dropPlayerId !== null}
        onClose={() => setDropPlayerId(null)}
        onConfirm={handleConfirmDrop}
        title={t('confirm.dropPlayer')}
        message={t('confirm.dropPlayerMessage', { name: dropPlayer?.name })}
      />
    </div>
  )
}
