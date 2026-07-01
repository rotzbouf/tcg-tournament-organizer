import { DecklistEntry } from '@/types/player'

const SECTION_WITH_COLON = /^(?:Pok[eé]mon|Trainer|Energy|Monster|Spell|Trap|Extra Deck|Side Deck|Main Deck|Extra|Side)\s*:\s*\d*$/i
const SECTION_STANDALONE = /^(?:Deck|Sideboard|Commander|#main|#extra|!side)$/i
const POKEMON_SECTION = /^Pok[eé]mon\s*:/i
const TRAINER_SECTION = /^(?:Trainer|Item|Supporter|Stadium)\s*:/i
const ENERGY_SECTION = /^Energy\s*:/i

// Headers that switch the following lines into / out of the sideboard.
const SIDEBOARD_HEADER = /^(?:Side Deck|Side|Sideboard|!side)\s*:?\s*\d*$/i
const MAINBOARD_HEADER = /^(?:Deck|Main Deck|#main)\s*:?\s*\d*$/i

const PTCGL_LINE = /^\*\s*(\d+)\s+(.+?)\s+([A-Z][A-Z0-9]{1,4}\s+\d+)\s*$/
const MTGA_LINE = /^(\d+)\s*[xX]?\s+(.+?)\s+(\([A-Z0-9]{2,5}\)\s+\d+)\s*$/
const SET_SUFFIX_LINE = /^(\d+)\s*[xX]?\s+(.+?)\s+([A-Z][A-Z0-9]{1,4}\s+\d+)\s*$/
const BASIC_LINE = /^(\d+)\s*[xX]?\s+(.+)$/

export function parseDecklistText(text: string): DecklistEntry[] {
  const lines = text.split('\n').map(line => line.trim())
  const entries: DecklistEntry[] = []
  let section: DecklistEntry['section']
  let sideboard = false

  for (const line of lines) {
    if (!line) continue
    if (isSectionHeader(line)) {
      if (SIDEBOARD_HEADER.test(line)) sideboard = true
      else if (MAINBOARD_HEADER.test(line)) sideboard = false
      if (POKEMON_SECTION.test(line)) section = 'pokemon'
      else if (TRAINER_SECTION.test(line)) section = 'trainer'
      else if (ENERGY_SECTION.test(line)) section = 'energy'
      else section = undefined
      continue
    }
    const entry = parseLine(line)
    if (section) entry.section = section
    if (sideboard) entry.sideboard = true
    entries.push(entry)
  }

  return entries
}

function isSectionHeader(line: string): boolean {
  return SECTION_WITH_COLON.test(line) || SECTION_STANDALONE.test(line)
}

function parseLine(line: string): DecklistEntry {
  let match: RegExpMatchArray | null

  match = line.match(PTCGL_LINE)
  if (match) {
    const parts = match[3].trim().split(/\s+/)
    return { quantity: parseInt(match[1], 10), cardName: match[2].trim(), setCode: parts[0] }
  }

  match = line.match(MTGA_LINE)
  if (match) {
    const setCodeMatch = match[3].match(/\(([A-Z0-9]{2,5})\)/)
    return { quantity: parseInt(match[1], 10), cardName: match[2].trim(), setCode: setCodeMatch?.[1] }
  }

  match = line.match(SET_SUFFIX_LINE)
  if (match) {
    const parts = match[3].trim().split(/\s+/)
    return { quantity: parseInt(match[1], 10), cardName: match[2].trim(), setCode: parts[0] }
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
