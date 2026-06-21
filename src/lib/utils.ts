import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function nearestPowerOfTwo(n: number): number {
  if (n < 2) return 0
  let p = 1
  while (p * 2 <= n) p *= 2
  return p
}
