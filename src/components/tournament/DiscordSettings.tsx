import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useTournamentContext } from '@/state/TournamentContext'
import { sendDiscordMessage } from '@/lib/discord'

interface DiscordSettingsProps {
  tournamentId: string
  webhookUrl: string | null
}

export function DiscordSettings({ tournamentId, webhookUrl }: DiscordSettingsProps) {
  const { t } = useTranslation()
  const { dispatch } = useTournamentContext()
  const [url, setUrl] = useState(webhookUrl ?? '')
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSave = () => {
    dispatch({
      type: 'UPDATE_TOURNAMENT',
      payload: { tournamentId, discordWebhookUrl: url.trim() || null },
    })
  }

  const handleTest = async () => {
    if (!url.trim()) return
    const ok = await sendDiscordMessage(url.trim(), {
      embeds: [{ title: 'TCG Tournament Organizer', description: t('discord.testMessage'), color: 0x3b82f6 }],
    })
    setTestStatus(ok ? 'success' : 'error')
    setTimeout(() => setTestStatus('idle'), 3000)
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-secondary-foreground">Discord Webhook</h3>
      <Input
        id="discord-webhook-url"
        placeholder={t('discord.webhookUrl')}
        value={url}
        onChange={e => setUrl(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave}>{t('common.save')}</Button>
        <Button size="sm" variant="secondary" onClick={handleTest} disabled={!url.trim()}>
          {t('discord.test')}
        </Button>
        {testStatus === 'success' && <span className="text-xs text-green-600">{t('discord.testSuccess')}</span>}
        {testStatus === 'error' && <span className="text-xs text-red-600">{t('discord.testFailed')}</span>}
      </div>
    </div>
  )
}
