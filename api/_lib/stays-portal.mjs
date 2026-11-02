import { z } from 'zod'
import { VENUE_TYPES, welcomeEmbedUrl } from './stays.mjs'
import { activityItemsFromLines, crewItemsFromLines } from './stay-connect-config.mjs'
import { offerItemsFromLines } from './stay-offers.mjs'

const writeRoles = ['tisonik_admin', 'operator_admin']
// Stays come from UNIKMO, so nobody creates them here. Front desk can work the inbox; only admins can void stays or change settings.
const inboxRoles = [...writeRoles, 'front_desk', 'operator_analyst']

const envelope = z.object({
  action: z.enum(['void', 'status', 'settings', 'push', 'close']),
  tenantId: z.string().uuid(),
  data: z.record(z.string(), z.unknown()).default({}),
}).strict()

const pushSchema = z.object({ title: z.string().trim().min(1).max(80), minutes: z.number().int().min(5).max(720).default(180) }).strict()
const closeSchema = z.object({ liveId: z.string().uuid() }).strict()
const voidSchema = z.object({ stayId: z.string().uuid() }).strict()
const statusSchema = z.object({ submissionId: z.string().uuid(), status: z.enum(['new', 'seen', 'resolved']) }).strict()
const settingsSchema = z.object({
  venueType: z.enum(VENUE_TYPES).default('hotel'),
  hotelName: z.string().trim().min(2).max(120).nullable().optional(),
  receptionEmail: z.string().trim().email().max(254).nullable().optional(),
  managerEmail: z.string().trim().email().max(254).nullable().optional(),
  unikmoHotelId: z.string().trim().regex(/^[A-Za-z0-9_-]{2,64}$/).nullable().optional(),
  defaultWindowDays: z.number().int().min(0).max(60),
  welcomeVideoUrl: z.string().trim().max(300).refine(value => welcomeEmbedUrl(value), 'unsupported_video').nullable().optional(),
  welcomeFromName: z.string().trim().max(80).nullable().optional(),
  welcomeFromRole: z.string().trim().max(60).nullable().optional(),
  welcomeNote: z.string().trim().max(300).nullable().optional(),
  discoverItems: z.array(z.object({ title: z.string().trim().min(1).max(80), body: z.string().trim().max(300).default(''), spots: z.number().int().min(1).max(999).optional() }).strict()).max(12),
  activities: z.array(z.object({ title: z.string().trim().min(1).max(60), when: z.string().trim().max(60).default('') }).strict()).max(20).default([]),
  crew: z.array(z.object({ name: z.string().trim().min(1).max(60), role: z.string().trim().max(60).default('') }).strict()).max(40).default([]),
}).strict()

const roleOf = async (database, userId, tenantId) => {
  const { data, error } = await database.from('memberships').select('role').eq('tenant_id', tenantId).eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.role || null
}

// Signed-in portal users act on their own hotel only. The role is read from memberships, never from the request.
export async function portalAction(database, userId, rawBody) {
  const parsed = envelope.safeParse(rawBody)
  if (!parsed.success) return { status: 422, body: { error: 'invalid_request' } }
  const { action, tenantId, data } = parsed.data
  const role = await roleOf(database, userId, tenantId)
  // The cruise director, the animation team and the front desk can ask guests to rate something now.
  const allowed = action === 'status' ? inboxRoles : (action === 'push' || action === 'close') ? [...writeRoles, 'front_desk'] : writeRoles
  if (!role || !allowed.includes(role)) return { status: 403, body: { error: 'not_permitted' } }

  if (action === 'void') {
    const input = voidSchema.safeParse(data)
    if (!input.success) return { status: 422, body: { error: 'invalid_request' } }
    const { error } = await database.from('hotel_stays').update({ status: 'voided' }).eq('id', input.data.stayId).eq('tenant_id', tenantId)
    if (error) throw error
    // A voided stay also disappears from guest-to-guest connection straight away.
    const { error: hideError } = await database.from('stay_profiles').update({ discoverable: false }).eq('stay_id', input.data.stayId).eq('tenant_id', tenantId)
    if (hideError) throw hideError
    return { status: 200, body: { voided: true } }
  }
  if (action === 'status') {
    const input = statusSchema.safeParse(data)
    if (!input.success) return { status: 422, body: { error: 'invalid_request' } }
    const { error } = await database.from('hotel_stay_submissions').update({ status: input.data.status }).eq('id', input.data.submissionId).eq('tenant_id', tenantId)
    if (error) throw error
    return { status: 200, body: { updated: true } }
  }
  if (action === 'push') {
    const input = pushSchema.safeParse(data)
    if (!input.success) return { status: 422, body: { error: 'invalid_request' } }
    const now = Date.now()
    const { error } = await database.from('stay_live_ratings').insert({ tenant_id: tenantId, title: input.data.title, opened_at: new Date(now - 1000).toISOString(), closes_at: new Date(now + input.data.minutes * 60_000).toISOString() })
    if (error) throw error
    return { status: 200, body: { pushed: true } }
  }
  if (action === 'close') {
    const input = closeSchema.safeParse(data)
    if (!input.success) return { status: 422, body: { error: 'invalid_request' } }
    const { error } = await database.from('stay_live_ratings').update({ closes_at: new Date().toISOString() }).eq('id', input.data.liveId).eq('tenant_id', tenantId)
    if (error) throw error
    return { status: 200, body: { closed: true } }
  }
  const input = settingsSchema.safeParse(data)
  if (!input.success) return { status: 422, body: { error: 'invalid_settings' } }
  const { error } = await database.from('hotel_stay_settings').upsert({
    tenant_id: tenantId,
    venue_type: input.data.venueType,
    hotel_name: input.data.hotelName || null,
    reception_email: input.data.receptionEmail || null,
    manager_email: input.data.managerEmail || null,
    unikmo_hotel_id: input.data.unikmoHotelId || null,
    default_window_days: input.data.defaultWindowDays,
    welcome_video_url: input.data.welcomeVideoUrl || null,
    welcome_from_name: input.data.welcomeFromName || null,
    welcome_from_role: input.data.welcomeFromRole || null,
    welcome_note: input.data.welcomeNote || null,
    discover_items: offerItemsFromLines(input.data.discoverItems),
    crew_items: crewItemsFromLines(input.data.crew),
    activity_items: activityItemsFromLines(input.data.activities),
  }, { onConflict: 'tenant_id' })
  if (error) throw error
  return { status: 200, body: { saved: true } }
}
