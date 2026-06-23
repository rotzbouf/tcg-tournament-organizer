import { DecklistEntry } from '@/types/player'

const SECTION_HEADER = /^(?:Pok[eé]mon|Trainer|Energy|Monster|Spell|Trap|Extra Deck|Side Deck|Deck|Sideboard|Commander|#main|#extra|!side|Main Deck|Extra|Side)\b/i
const POKEMON_SECTION = /^Pok[eé]mon\b/i

const PTCGL_LINE = /^\*\s*(\d+)\s+(.+?)\s+([A-Z][A-Z0-9]{1,4}\s+\d+)\s*$/
const MTGA_LINE = /^(\d+)\s*[xX]?\s+(.+?)\s+(\([A-Z0-9]{2,5}\)\s+\d+)\s*$/
const SET_SUFFIX_LINE = /^(\d+)\s*[xX]?\s+(.+?)\s+([A-Z][A-Z0-9]{1,4}\s+\d+)\s*$/
const BASIC_LINE = /^(\d+)\s*[xX]?\s+(.+)$/

export function parseDecklistText(text: string): DecklistEntry[] {
  const lines = text.split('\n').map(line => line.trim())
  const entries: DecklistEntry[] = []
  let keepSetInfo = false

  for (const line of lines) {
    if (!line) continue
    if (isSectionHeader(line)) {
      keepSetInfo = POKEMON_SECTION.test(line)
      continue
    }
    entries.push(parseLine(line, keepSetInfo))
  }

  return entries
}

function isSectionHeader(line: string): boolean {
  if (SECTION_HEADER.test(line)) return true
  if (/^[A-Za-zÀ-ÿ ]+:\s*\d*$/.test(line)) return true
  return false
}

function parseLine(line: string, keepSetInfo: boolean): DecklistEntry {
  let match: RegExpMatchArray | null

  match = line.match(PTCGL_LINE)
  if (match) {
    const name = keepSetInfo ? `${match[2].trim()} ${match[3]}` : match[2].trim()
    return { quantity: parseInt(match[1], 10), cardName: name }
  }

  match = line.match(MTGA_LINE)
  if (match) {
    const name = keepSetInfo ? `${match[2].trim()} ${match[3]}` : match[2].trim()
    return { quantity: parseInt(match[1], 10), cardName: name }
  }

  match = line.match(SET_SUFFIX_LINE)
  if (match) {
    const name = keepSetInfo ? `${match[2].trim()} ${match[3]}` : match[2].trim()
    return { quantity: parseInt(match[1], 10), cardName: name }
  }

  match = line.match(BASIC_LINE)
  if (match) return { quantity: parseInt(match[1], 10), cardName: match[2].trim() }

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
