export type AgeDivision = 'junior' | 'senior' | 'masters'

export function getSeasonYear(date: Date): number {
  return date.getMonth() < 8 ? date.getFullYear() - 1 : date.getFullYear()
}

export function getAgeDivision(dateOfBirth: string, tournamentDate: Date): AgeDivision {
  const birthYear = new Date(dateOfBirth).getFullYear()
  const season = getSeasonYear(tournamentDate)
  if (birthYear >= season - 11) return 'junior'
  if (birthYear >= season - 15) return 'senior'
  return 'masters'
}

export function getPlayerDivision(dateOfBirth: string | null, tournamentCreatedAt: string): AgeDivision {
  if (!dateOfBirth) return 'masters'
  return getAgeDivision(dateOfBirth, new Date(tournamentCreatedAt))
}

export const DIVISION_LABELS: Record<AgeDivision, { de: string; en: string }> = {
  junior: { de: 'Junior', en: 'Junior' },
  senior: { de: 'Senior', en: 'Senior' },
  masters: { de: 'Masters', en: 'Masters' },
}

export const DIVISION_ORDER: AgeDivision[] = ['junior', 'senior', 'masters']
