// Diacritic-insensitive substring search, so "jose" finds "José" — at a
// 1000-player event the TO can't know how a name was registered.
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function matchesSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = normalizeForSearch(query)
  if (!q) return true
  return fields.some(f => f != null && normalizeForSearch(f).includes(q))
}
