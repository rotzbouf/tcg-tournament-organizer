import { DecklistEntry } from '@/types/player'

export function parseDecklistText(text: string): DecklistEntry[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(parseLine)
}

function parseLine(line: string): DecklistEntry {
  const match = line.match(/^(\d+)\s*[xX]?\s+(.+)$/)
  if (match) {
    return { quantity: parseInt(match[1], 10), cardName: match[2].trim() }
  }
  return { quantity: 1, cardName: line }
}

export function formatDecklistText(entries: DecklistEntry[]): string {
  return entries.map(e => `${e.quantity}x ${e.cardName}`).join('\n')
}

export function getDecklistStats(entries: DecklistEntry[]): { totalCards: number; uniqueCards: number } {
  return {
    totalCards: entries.reduce((sum, e) => sum + e.quantity, 0),
    uniqueCards: entries.length,
  }
}
