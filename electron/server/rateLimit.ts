// Per-IP rate limit for all POST endpoints. Every write on the LAN API either
// mutates state or raises a banner on the TO screen (judge call, match
// report), so a misbehaving device must not be able to fire them in a loop.
// Legitimate traffic is tiny: a player registers once, submits a decklist a
// few times and reports one result per round.
const WINDOW_MS = 60_000
const MAX_POSTS_PER_WINDOW = 30
const MAX_TRACKED_IPS = 2000

interface Bucket {
  windowStart: number
  count: number
}

const buckets = new Map<string, Bucket>()

export function allowPost(ip: string, now = Date.now()): boolean {
  let bucket = buckets.get(ip)
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    bucket = { windowStart: now, count: 0 }
    // Delete before set so re-insertion refreshes the Map's insertion order —
    // eviction below then drops the least recently *started* windows first.
    buckets.delete(ip)
    buckets.set(ip, bucket)
    if (buckets.size > MAX_TRACKED_IPS) {
      for (const [key, b] of buckets) {
        if (buckets.size <= MAX_TRACKED_IPS) break
        if (key !== ip && now - b.windowStart >= WINDOW_MS) buckets.delete(key)
      }
      while (buckets.size > MAX_TRACKED_IPS) {
        const oldest = buckets.keys().next().value
        if (oldest === undefined || oldest === ip) break
        buckets.delete(oldest)
      }
    }
  }
  bucket.count++
  return bucket.count <= MAX_POSTS_PER_WINDOW
}

// Test helper — the limiter is module state shared across a test file.
export function resetRateLimits(): void {
  buckets.clear()
}
