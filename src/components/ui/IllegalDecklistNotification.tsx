import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { useTournamentContext } from '@/state/useTournamentContext'
import { useBanlist } from '@/hooks/useBanlist'
import { validateDecklist, ValidationError } from '@/lib/decklistValidator'
import { LegalityError } from '@/lib/legalityChecker'
import { DecklistEntry } from '@/types/player'

interface IllegalDeck {
  tournamentId: string
  playerId: string
  playerName: string
  tournamentName: string
  errors: ValidationError[]
  legalityErrors: LegalityError[]
  at: number
}

interface SubmittedPayload {
  tournamentId: string
  playerId: string
  playerName: string
  entries: DecklistEntry[]
}

// Watches decklists submitted from player phones after the tournament starts and
// raises a banner for the TO when one is illegal. Detection is automatic; any
// follow-up (penalty, asking the player to fix it) stays a manual TO decision.
export function IllegalDecklistNotification() {
  const { t } = useTranslation()
  const { state } = useTournamentContext()
  const { getBanlist } = useBanlist()
  const [illegal, setIllegal] = useState<IllegalDeck[]>([])

  // The IPC listener is registered once (preload has no removal path, so
  // re-registering would leak). Refs keep the current tournaments/banlist
  // reachable inside that stable callback without stale closures.
  const stateRef = useRef(state)
  const getBanlistRef = useRef(getBanlist)
  useEffect(() => {
    stateRef.current = state
    getBanlistRef.current = getBanlist
  })

  const dismiss = useCallback((playerId: string) => {
    setIllegal(prev => prev.filter(d => d.playerId !== playerId))
  }, [])

  useEffect(() => {
    if (!window.electronAPI?.onDecklistSubmitted) return
    window.electronAPI.onDecklistSubmitted((raw) => {
      try {
        const data = JSON.parse(raw) as SubmittedPayload
        const tournament = stateRef.current.tournaments[data.tournamentId]
        if (!tournament) return
        const banlist = tournament.gameFormat ? getBanlistRef.current(tournament.game, tournament.gameFormat) : null
        const result = validateDecklist(data.entries, tournament.game, tournament.gameFormat, banlist)
        setIllegal(prev => {
          // A legal (re)submission clears any earlier warning for that player.
          const others = prev.filter(d => d.playerId !== data.playerId)
          if (result.valid) return others
          return [...others, {
            tournamentId: data.tournamentId,
            playerId: data.playerId,
            playerName: data.playerName,
            tournamentName: tournament.name,
            errors: result.errors,
            legalityErrors: result.legalityErrors,
            at: Date.now(),
          }]
        })
      } catch { /* ignore */ }
    })
  }, [])

  if (illegal.length === 0) return null

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-3">
      {illegal.map(deck => (
        <div
          key={deck.playerId}
          className="w-full max-w-md rounded-lg border-2 border-amber-400 bg-amber-50 p-4 shadow-xl dark:border-amber-600 dark:bg-amber-950"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                ⚠ {t('illegalDecklist.title')}
              </p>
              <p className="mt-0.5 text-sm text-foreground">
                <span className="font-semibold">{deck.playerName}</span> — {deck.tournamentName}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => dismiss(deck.playerId)}>
              {t('illegalDecklist.dismiss')}
            </Button>
          </div>
          <div className="mt-2 space-y-0.5">
            {deck.errors.map((err, i) => (
              <p key={i} className="text-xs text-red-700 dark:text-red-400">
                {err.type === 'too_few_cards' && t('decklist.validation.tooFewCards', { count: err.message })}
                {err.type === 'too_many_cards' && t('decklist.validation.tooManyCards', { count: err.message })}
                {err.type === 'too_many_copies' && t('decklist.validation.tooManyCopies', { card: err.cardName, count: err.message })}
                {err.type === 'too_many_side_cards' && t('decklist.validation.tooManySideCards', { count: err.message })}
              </p>
            ))}
            {deck.legalityErrors.map((err, i) => (
              <p key={`leg-${i}`} className="text-xs text-orange-700 dark:text-orange-400">
                {err.type === 'forbidden' && t('decklist.validation.forbidden', { card: err.cardName })}
                {err.type === 'limited_exceeded' && t('decklist.validation.limitedExceeded', { card: err.cardName, count: err.quantity })}
                {err.type === 'semi_limited_exceeded' && t('decklist.validation.semiLimitedExceeded', { card: err.cardName, count: err.quantity })}
                {err.type === 'out_of_rotation' && t('decklist.validation.outOfRotation', { card: err.cardName, set: err.setCode ? ` (${err.setCode})` : '' })}
              </p>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t('illegalDecklist.hint')}</p>
        </div>
      ))}
    </div>
  )
}
