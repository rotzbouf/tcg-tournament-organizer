import i18n from '@/i18n'
import { Tournament } from '@/types/tournament'
import { Round } from '@/types/round'
import { Player } from '@/types/player'
import { Standing } from '@/types/standing'

interface DiscordEmbed {
  title: string
  description: string
  color: number
  timestamp?: string
}

interface DiscordWebhookPayload {
  embeds: DiscordEmbed[]
}

export async function sendDiscordMessage(webhookUrl: string, payload: DiscordWebhookPayload): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return response.ok
  } catch {
    return false
  }
}

export function formatPairingsMessage(tournament: Tournament, round: Round, players: Player[]): DiscordWebhookPayload {
  const getName = (id: string) => players.find(p => p.id === id)?.name ?? '?'
  const t = i18n.t.bind(i18n)

  const phaseLabel = round.phase === 'winners_bracket' ? ' (Winners)' :
    round.phase === 'losers_bracket' ? ' (Losers)' :
    round.phase === 'grand_final' ? ' (Grand Final)' :
    round.phase === 'top_cut' ? ' (Top Cut)' : ''

  const lines = round.matches.map(m => {
    if (m.isBye) return `${t('discord.table')} - | ${getName(m.player1Id)} — ${t('discord.bye')}`
    return `${t('discord.table')} ${m.tableNumber} | ${getName(m.player1Id)} vs ${getName(m.player2Id!)}`
  })

  return {
    embeds: [{
      title: `${tournament.name} — ${t('discord.round')} ${round.roundNumber}${phaseLabel}`,
      description: lines.join('\n'),
      color: 0x3b82f6,
      timestamp: new Date().toISOString(),
    }],
  }
}

export function formatStandingsMessage(tournament: Tournament, standings: Standing[]): DiscordWebhookPayload {
  const t = i18n.t.bind(i18n)
  const top = standings.slice(0, 16)
  const lines = top.map(s =>
    `${s.rank}. ${s.playerName} — ${s.matchPoints} ${t('discord.points')} (${s.wins}${t('discord.w')}-${s.losses}${t('discord.l')}-${s.draws}${t('discord.d')})`
  )

  return {
    embeds: [{
      title: `${tournament.name} — ${t('discord.standings')}`,
      description: lines.join('\n'),
      color: 0x10b981,
      timestamp: new Date().toISOString(),
    }],
  }
}

export function formatCompletionMessage(tournament: Tournament, standings: Standing[]): DiscordWebhookPayload {
  const t = i18n.t.bind(i18n)
  const top = standings.slice(0, 8)
  const lines = top.map(s =>
    `**${s.rank}.** ${s.playerName} — ${s.matchPoints} ${t('discord.points')}`
  )

  return {
    embeds: [{
      title: `${tournament.name} — ${t('discord.finalResult')}`,
      description: lines.join('\n'),
      color: 0xf59e0b,
      timestamp: new Date().toISOString(),
    }],
  }
}
