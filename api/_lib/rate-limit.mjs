import { createHash } from 'node:crypto'

// Hashes the caller's address so no raw IP is stored. Vercel sets x-real-ip / x-forwarded-for.
export function clientKey(request) {
  const forwarded = String(request.headers?.['x-forwarded-for'] || '').split(',')[0].trim()
  const address = String(request.headers?.['x-real-ip'] || forwarded || 'unknown')
  return createHash('sha256').update(`stay-client:${address}`).digest('hex').slice(0, 32)
}

// Counts a hit; true means the caller is now over the limit. A broken limiter never blocks a guest.
export async function overLimit(database, bucket, windowSeconds, limit) {
  try {
    const { data, error } = await database.rpc('stay_rate_limit_hit', { p_bucket: bucket, p_window_seconds: windowSeconds, p_limit: limit })
    if (error) throw error
    return data === false
  } catch (error) {
    console.error('stay-rate-limit-unavailable', error?.message || error)
    return false
  }
}

// Limits used by the stay endpoints (per minute unless noted).
export const limits = {
  guestSession: { window: 60, max: 60 },
  guestExchange: { window: 60, max: 20 },
  guestSubmit: { window: 60, max: 20 },
  hotelCalls: { window: 60, max: 240 },
}
