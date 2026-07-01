import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useTournamentContext } from '@/state/TournamentContext'
import { Player } from '@/types/player'
import { GameType } from '@/types/tournament'
import { parseDecklistText, formatDecklistText, getDecklistStats } from '@/lib/decklistParser'
import { validateDecklist } from '@/lib/decklistValidator'
import { GAME_CONFIG } from '@/lib/gameConfig'
import { useBanlist } from '@/hooks/useBanlist'

interface DecklistDialogProps {
  open: boolean
  onClose: () => void
  tournamentId: string
  player: Player
  readonly?: boolean
  game?: GameType
  gameFormat?: string | null
}

export function DecklistDialog({ open, onClose, tournamentId, player, readonly, game, gameFormat }: DecklistDialogProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()
  const { getBanlist } = useBanlist()
  const [text, setText] = useState(player.decklist ? formatDecklistText(player.decklist) : '')

  const entries = parseDecklistText(text)
  const stats = getDecklistStats(entries)
  const mainCards = entries.reduce((sum, e) => sum + (e.sideboard ? 0 : e.quantity), 0)
  const sideCards = stats.totalCards - mainCards
  const banlist = (game && gameFormat) ? getBanlist(game, gameFormat) : null
  const validation = game ? validateDecklist(entries, game, gameFormat, banlist) : null
  const gameConfig = game ? GAME_CONFIG[game] : null
  const formatConfig = (gameConfig && gameFormat) ? gameConfig.formats.find(f => f.id === gameFormat) : null
  const deckRules = (formatConfig?.deckRulesOverride && gameConfig?.deckRules)
    ? { ...gameConfig.deckRules, ...formatConfig.deckRulesOverride }
    : gameConfig?.deckRules ?? null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    dispatch({
      type: 'UPDATE_PLAYER',
      payload: {
        tournamentId,
        playerId: player.id,
        decklist: entries.length > 0 ? entries : null,
      },
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={`${t('decklist.title')} — ${player.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="decklist-text" className="mb-1 block text-sm font-medium text-secondary-foreground">
            {t('decklist.paste')}
          </label>
          <textarea
            id="decklist-text"
            className="w-full rounded-lg border border-input bg-card text-foreground px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={10}
            value={text}
            onChange={e => setText(e.target.value)}
            readOnly={readonly}
            autoFocus
          />
          {entries.length > 0 && (
            <div className="mt-1 space-y-1">
              <p className="text-xs text-muted-foreground">
                {t('decklist.totalCards')}: {mainCards}
                {deckRules && deckRules.mainMax > 0 && `/${deckRules.mainMax}`}
                {deckRules && deckRules.mainMax < 0 && ` (min ${deckRules.mainMin})`}
                {sideCards > 0 && ` (+${sideCards} SB)`}
                {' — '}{t('decklist.uniqueCards')}: {stats.uniqueCards}
              </p>
              {validation && (!validation.valid || validation.legalityErrors.length > 0) && (
                <div className="space-y-0.5">
                  {validation.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400">
                      {err.type === 'too_few_cards' && t('decklist.validation.tooFewCards', { count: err.message })}
                      {err.type === 'too_many_cards' && t('decklist.validation.tooManyCards', { count: err.message })}
                      {err.type === 'too_many_copies' && t('decklist.validation.tooManyCopies', { card: err.cardName, count: err.message })}
                      {err.type === 'too_many_side_cards' && t('decklist.validation.tooManySideCards', { count: err.message })}
                    </p>
                  ))}
                  {validation.legalityErrors.map((err, i) => (
                    <p key={`leg-${i}`} className="text-xs text-orange-600 dark:text-orange-400">
                      {err.type === 'forbidden' && t('decklist.validation.forbidden', { card: err.cardName })}
                      {err.type === 'limited_exceeded' && t('decklist.validation.limitedExceeded', { card: err.cardName, count: err.quantity })}
                      {err.type === 'semi_limited_exceeded' && t('decklist.validation.semiLimitedExceeded', { card: err.cardName, count: err.quantity })}
                      {err.type === 'out_of_rotation' && t('decklist.validation.outOfRotation', { card: err.cardName, set: err.setCode ? ` (${err.setCode})` : '' })}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {readonly ? t('common.close') : t('common.cancel')}
          </Button>
          {!readonly && (
            <Button type="submit">
              {t('common.save')}
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  )
}
