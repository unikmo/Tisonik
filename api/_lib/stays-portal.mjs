import { z } from 'zod'
import { createStay, createStaySchema } from './stays.mjs'

const writeRoles = ['tisonik_admin', 'operator_admin']
// Front desk can create stays and work the inbox; only admins can void stays or change settings.
const createRoles = [...writeRoles, 'front_desk']
const inboxRoles = [...createRoles, 'operator_analyst']

const envelope = z.object({
  action: z.enum(['create', 'void', 'status', 'settings']),
  tenantId: z.string().uuid(),
  data: z.record(z.string(), z.unknown()).default({}),
}).strict()

const voidSchema = z.object({ stayId: z.string().uuid() }).strict()
const statusSchema = z.object({ submissionId: z.string().uuid(), status: z.enum(['new', 'seen', 'resolved']) }).strict()
const settingsSchema = z.object({
  hotelName: z.string().trim().min(2).max(120).nullable().optional(),
  receptionEmail: z.string().trim().email().max(254).nullable().optional(),
  managerEmail: z.string().trim().email().max(254).nullable().optional(),
  unikmoHotelId: z.string().trim().regex(/^[A-Za-z0-9_-]{2,64}$/).nullable().optional(),
  defaultWindowDays: z.number().int().min(0).max(60),
  discoverItems: z.array(z.object({ title: z.string().trim().min(1).max(80), body: z.string().trim().max(300).default('') }).strict()).max(12),
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
  const allowed = action === 'status' ? inboxRoles : action === 'create' ? createRoles : writeRoles
  if (!role || !allowed.includes(role)) return { status: 403, body: { error: 'not_permitted' } }

  if (action === 'create') {
    const stay = createStaySchema.safeParse(data)
    if (!stay.success) return { status: 422, body: { error: 'invalid_stay', issues: stay.error.issues.map(({ path, message }) => ({ path, message })) } }
    return { status: 201, body: await createStay(database, tenantId, stay.data) }
  }
  if (action === 'void') {
    const input = voidSchema.safeParse(data)
    if (!input.success) return { status: 422, body: { error: 'invalid_request' } }
    const { error } = await database.from('hotel_stays').update({ status: 'voided' }).eq('id', input.data.stayId).eq('tenant_id', tenantId)
    if (error) throw error
    return { status: 200, body: { voided: true } }
  }
  if (action === 'status') {
    const input = statusSchema.safeParse(data)
    if (!input.success) return { status: 422, body: { error: 'invalid_request' } }
    const { error } = await database.from('hotel_stay_submissions').update({ status: input.data.status }).eq('id', input.data.submissionId).eq('tenant_id', tenantId)
    if (error) throw error
    return { status: 200, body: { updated: true } }
  }
  const input = settingsSchema.safeParse(data)
  if (!input.success) return { status: 422, body: { error: 'invalid_settings' } }
  const { error } = await database.from('hotel_stay_settings').upsert({
    tenant_id: tenantId,
    hotel_name: input.data.hotelName || null,
    reception_email: input.data.receptionEmail || null,
    manager_email: input.data.managerEmail || null,
    unikmo_hotel_id: input.data.unikmoHotelId || null,
    default_window_days: input.data.defaultWindowDays,
    discover_items: input.data.discoverItems,
  }, { onConflict: 'tenant_id' })
  if (error) throw error
  return { status: 200, body: { saved: true } }
}
