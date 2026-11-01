import { z } from 'zod'
import { limits, overLimit } from './rate-limit.mjs'

const token = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/)

// Sent by the cruise line's app, through UNIKMO's server, whenever a guest who turned Nearby on opens the screen.
// token: the rotating pseudonymous id this guest's phone is broadcasting. seen: the ids it can currently hear.
export const nearbySchema = z.object({
  hotelId: z.string().trim().regex(/^[A-Za-z0-9_-]{2,64}$/),
  guestReference: z.string().trim().min(1).max(80),
  token,
  seen: z.array(token).max(200),
}).strict()

export async function registerNearby(database, input, now = new Date()) {
  const { data: settings, error } = await database.from('hotel_stay_settings').select('tenant_id').eq('unikmo_hotel_id', input.hotelId).maybeSingle()
  if (error) throw error
  if (!settings) return { ok: false }
  if (await overLimit(database, `hotel:${settings.tenant_id}`, limits.hotelCalls.window, limits.hotelCalls.max)) return { ok: false, limited: true }
  const { data: stay, error: stayError } = await database.from('hotel_stays').select('id, status').eq('tenant_id', settings.tenant_id).eq('booking_ref', input.guestReference).maybeSingle()
  if (stayError) throw stayError
  if (!stay || stay.status === 'voided') return { ok: false }
  const { data: profile, error: profileError } = await database.from('stay_profiles').select('id, nearby_on, discoverable').eq('stay_id', stay.id).maybeSingle()
  if (profileError) throw profileError
  // Only a guest who opted in to Nearby is recorded. Anyone else is ignored without saying so.
  if (!profile || !profile.nearby_on || !profile.discoverable) return { ok: false }
  const { error: updateError } = await database.from('stay_profiles').update({ proximity_token: input.token, nearby_tokens: [...new Set(input.seen)].filter(value => value !== input.token), nearby_at: now.toISOString() }).eq('id', profile.id)
  if (updateError) {
    if (updateError.code === '23505') return { ok: false, conflict: true }
    throw updateError
  }
  return { ok: true }
}
