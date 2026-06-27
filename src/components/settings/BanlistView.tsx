import { useTranslation } from 'react-i18next'
import { useBanlist } from '@/hooks/useBanlist'
import { GAME_CONFIG, GameFormatConfig } from '@/lib/gameConfig'
import { GameType } from '@/types/tournament'
import { Button } from '@/components/ui/Button'

export function BanlistView() {
  const { t } = useTranslation()
  const { store, fetchBanlist, deleteBanlist, fetching, errors } = useBanlist()

  const gamesWithBanlists = (Object.keys(GAME_CONFIG) as GameType[]).filter(
    game => GAME_CONFIG[game].formats.some(f => f.hasBanlist)
  )

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString()
  }

  function BanlistRow({ game, fmt }: { game: GameType; fmt: GameFormatConfig }) {
    const key = `${game}:${fmt.id}`
    const data = store[key]
    const isLoading = fetching[key]
    const error = errors[key]

    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{GAME_CONFIG[game].icon} {GAME_CONFIG[game].name}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{fmt.name}</span>
          </div>
          {data ? (
            <div className="mt-0.5 flex gap-3 text-xs text-muted-foreground">
              <span>{t('banlist.lastUpdated')}: {formatDate(data.lastUpdated)}</span>
              <span className="text-red-600 dark:text-red-400">{data.forbidden.length} {t('banlist.forbidden')}</span>
              {data.limited.length > 0 && <span className="text-yellow-600 dark:text-yellow-400">{data.limited.length} {t('banlist.limited')}</span>}
              {data.semiLimited.length > 0 && <span className="text-blue-600 dark:text-blue-400">{data.semiLimited.length} {t('banlist.semiLimited')}</span>}
            </div>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">{t('banlist.notLoaded')}</p>
          )}
          {error && <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <div className="ml-3 flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fetchBanlist(game, fmt.id)}
            disabled={isLoading}
          >
            {isLoading ? t('banlist.loading') : data ? t('banlist.update') : t('banlist.load')}
          </Button>
          {data && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteBanlist(game, fmt.id)}
              disabled={isLoading}
            >
              {t('banlist.remove')}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 text-2xl font-bold text-foreground">{t('banlist.title')}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t('banlist.description')}</p>

      <div className="space-y-2">
        {gamesWithBanlists.map(game =>
          GAME_CONFIG[game].formats
            .filter(f => f.hasBanlist)
            .map(fmt => <BanlistRow key={`${game}:${fmt.id}`} game={game} fmt={fmt} />)
        )}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground">{t('banlist.sources')}</p>
        <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          <li>Yu-Gi-Oh!: YGOProDeck API (db.ygoprodeck.com)</li>
          <li>Pokémon TCG: pokemontcg.io API</li>
          <li>Magic: The Gathering: Scryfall API (scryfall.com)</li>
        </ul>
      </div>
    </div>
  )
}
