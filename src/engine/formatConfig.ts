import { TournamentFormat } from '@/types/tournament'

interface FormatConfig {
  totalRounds: number
  needsByes: boolean
}

export function getFormatConfig(format: TournamentFormat, playerCount: number): FormatConfig {
  switch (format) {
    case 'swiss':
    case 'swiss_topcut':
      return {
        totalRounds: playerCount <= 1 ? 0 : Math.ceil(Math.log2(playerCount)),
        needsByes: true,
      }
    case 'round_robin':
      return {
        totalRounds: playerCount <= 1 ? 0 : playerCount % 2 === 0 ? playerCount - 1 : playerCount,
        needsByes: false,
      }
    case 'double_elimination':
      return {
        totalRounds: playerCount <= 1 ? 0 : Math.ceil(Math.log2(playerCount)) * 2 + 1,
        needsByes: false,
      }
  }
}
