import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { isBlocked, limits, overLimit } from './rate-limit.mjs'

// 31 characters, no 0/O/1/I/L. Eight characters is about 850 billion combinations.
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const codePattern = /^[2-9A-HJKMNP-Z]{8}$/

export const TOKEN_LIFETIME_SECONDS = 15 * 60
const SESSION_MAX_SECONDS = 30 * 86_400

// Draft wording. Five scored questions (1-10, same scale as the resort rating) plus a free-text box.
export const RATING_QUESTIONS = [
  { id: 'check_in', text: 'How was your welcome and check-in?' },
  { id: 'room', text: 'How comfortable and clean was your room?' },
  { id: 'food_drink', text: 'How were the food and drink?' },
  { id: 'staff', text: 'How helpful and warm was our team?' },
  { id: 'recommend', text: 'How likely are you to recommend us?' },
]

const secretAliases = { STAY_LINK_SECRET: 'TISONIK_GUEST_SESSION_SECRET' }
const secret = name => {
  const value = process.env[name] || process.env[secretAliases[name]]
  if (!value || value.length < 32) throw new Error('STAY_SECRET_NOT_CONFIGURED')
  return value
}

export function generateStayCode() {
  let code = ''
  for (let index = 0; index < 8; index += 1) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return code
}

export const displayCode = code => `${code.slice(0, 4)}-${code.slice(4)}`

export function normalizeCode(input) {
  const code = String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return codePattern.test(code) ? code : null
}

// Keyed hash: a leaked table cannot be brute-forced without the pepper.
export function codeDigest(tenantId, code) {
  return createHmac('sha256', secret('STAY_CODE_PEPPER')).update(`${tenantId}:${code}`).digest('hex')
}

const b64 = value => Buffer.from(value).toString('base64url')

const seal = body => createHmac('sha256', secret('STAY_LINK_SECRET')).update(body).digest('base64url')

// A link is short-lived and only good for exchanging into a cookie session.
export function signStayToken(stayId, now = Date.now()) {
  const body = b64(JSON.stringify({ s: stayId, p: 'link', e: Math.floor(now / 1000) + TOKEN_LIFETIME_SECONDS }))
  return `${body}.${seal(body)}`
}

// A session lasts until the stay's after-checkout window closes (plus a day), never more than 30 days.
export function signSessionToken(stay, now = Date.now()) {
  const windowEnd = Date.parse(`${addDays(stay.valid_to, stay.window_days + 1)}T00:00:00Z`)
  const expires = Math.min(windowEnd, now + SESSION_MAX_SECONDS * 1000)
  if (expires <= now) return null
  const body = b64(JSON.stringify({ s: stay.id, p: 'session', e: Math.floor(expires / 1000) }))
  return { token: `${body}.${seal(body)}`, maxAge: Math.floor((expires - now) / 1000) }
}

export const SESSION_COOKIE = 'tsk_stay'
export const sessionCookie = (value, maxAge) => `${SESSION_COOKIE}=${value}; Max-Age=${maxAge}; Path=/api/v1/stays; HttpOnly; Secure; SameSite=Strict`

export function readCookie(request, name) {
  const match = String(request.headers?.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))
  return match ? match.slice(name.length + 1) : null
}

export function verifyStayToken(token, now = Date.now(), purpose = null) {
  if (typeof token !== 'string' || token.length > 400) return null
  const [body, mac, extra] = token.split('.')
  if (!body || !mac || extra !== undefined) return null
  const a = Buffer.from(mac)
  const b = Buffer.from(seal(body))
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const { s, e, p } = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (typeof s !== 'string' || typeof e !== 'number' || e * 1000 < now) return null
    if (purpose && p !== purpose) return null
    return { stayId: s, purpose: p }
  } catch {
    return null
  }
}

const day = value => (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10)
const addDays = (date, days) => day(new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000))

// Dates are compared as calendar dates. Hotel time zones are not modelled yet,
// so the day can roll over up to a few hours early or late for the hotel.
export function stayPhase(stay, now = new Date()) {
  if (stay.status === 'voided') return 'voided'
  const today = day(now)
  if (today < stay.valid_from) return 'before'
  if (today <= stay.valid_to) return 'during'
  if (today <= addDays(stay.valid_to, stay.window_days)) return 'after_checkout'
  return 'closed'
}

export function tilesFor(stay, now = new Date()) {
  const phase = stayPhase(stay, now)
  const live = phase === 'during'
  const after = phase === 'after_checkout'
  const lastDay = live && day(now) === stay.valid_to
  return {
    phase,
    thankYou: live || after,
    private: live,
    feedback: after,
    rating: lastDay || after,
    discover: phase !== 'voided',
    keepsake: phase !== 'voided',
  }
}

const text = (min, max) => z.string().trim().min(min).max(max)

export const submissionSchemas = {
  thank_you: z.object({ recipient: text(1, 80).optional(), message: text(3, 500) }).strict(),
  private: z.object({ message: text(5, 2000) }).strict(),
  feedback: z.object({ message: text(5, 2000) }).strict(),
  rating: z.object({
    scores: z.object(Object.fromEntries(RATING_QUESTIONS.map(question => [question.id, z.number().int().min(1).max(10)]))).strict(),
    comment: text(0, 500).optional(),
  }).strict(),
}

export const submissionLimits = { thank_you: 10, private: 5, feedback: 5, rating: 1 }

const stayColumns = 'id, tenant_id, booking_ref, room, guest_label, valid_from, valid_to, window_days, status'

// Wrong codes are counted per hotel. Once a hotel has had too many in a minute, lookups stop until the window rolls over.
const failBucket = tenantId => `fail:${tenantId}`
async function refuse(database, tenantId, result) {
  await overLimit(database, failBucket(tenantId), limits.failedCodes.window, limits.failedCodes.max)
  return result
}

export async function resolveStay(database, tenantId, rawCode, now = new Date()) {
  if (await isBlocked(database, failBucket(tenantId), limits.failedCodes.window, limits.failedCodes.max)) return { valid: false, reason: 'rate_limited', limited: true }
  const code = normalizeCode(rawCode)
  if (!code) return refuse(database, tenantId, { valid: false, reason: 'unknown' })
  const { data: stay, error } = await database.from('hotel_stays').select(stayColumns).eq('tenant_id', tenantId).eq('code_digest', codeDigest(tenantId, code)).maybeSingle()
  if (error) throw error
  if (!stay) return refuse(database, tenantId, { valid: false, reason: 'unknown' })
  const phase = stayPhase(stay, now)
  if (phase === 'voided') return { valid: false, reason: 'voided' }
  return {
    valid: true,
    validFrom: stay.valid_from,
    validTo: stay.valid_to,
    phase,
    stayRef: stay.id,
    stayUrl: `${publicOrigin()}/stay/#t=${signStayToken(stay.id, now.getTime())}`,
  }
}

export function publicOrigin() {
  const origin = (process.env.TISONIK_PUBLIC_ORIGIN || process.env.STAY_BASE_URL || 'https://tisonik.com').replace(/\/+$/, '')
  if (!origin.startsWith('https://')) throw new Error('PUBLIC_ORIGIN_NOT_HTTPS')
  return origin
}

export const unikmoSessionSchema = z.object({
  hotelId: z.string().trim().regex(/^[A-Za-z0-9_-]{2,64}$/),
  cardCode: z.string().trim().regex(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/),
  guestReference: text(1, 80),
  stayEndsAt: z.string().refine(value => Number.isFinite(Date.parse(value))),
}).strict()

// UNIKMO sends hotelId, cardCode, guestReference and stayEndsAt. Tisonik's own stay record is the authority:
// the hotel must be mapped, the code must exist for that hotel, and the reference must match its booking.
// stayEndsAt is not trusted to extend or shorten anything.
export async function resolveUnikmoSession(database, input, now = new Date()) {
  const { data: settings, error } = await database.from('hotel_stay_settings').select('tenant_id').eq('unikmo_hotel_id', input.hotelId).maybeSingle()
  if (error) throw error
  if (!settings) return { ok: false }
  if (await isBlocked(database, failBucket(settings.tenant_id), limits.failedCodes.window, limits.failedCodes.max)) return { ok: false, limited: true }
  if (await overLimit(database, `hotel:${settings.tenant_id}`, limits.hotelCalls.window, limits.hotelCalls.max)) return { ok: false, limited: true }
  const code = normalizeCode(input.cardCode)
  if (!code) return refuse(database, settings.tenant_id, { ok: false })
  const { data: stay, error: stayError } = await database.from('hotel_stays').select(stayColumns).eq('tenant_id', settings.tenant_id).eq('code_digest', codeDigest(settings.tenant_id, code)).maybeSingle()
  if (stayError) throw stayError
  if (!stay || stay.booking_ref.trim().toLowerCase() !== input.guestReference.trim().toLowerCase()) return refuse(database, settings.tenant_id, { ok: false })
  const phase = stayPhase(stay, now)
  if (phase === 'voided') return { ok: false }
  return { ok: true, url: `${publicOrigin()}/stay/#t=${signStayToken(stay.id, now.getTime())}`, phase }
}

export async function createStay(database, tenantId, input, now = new Date()) {
  const { data: settings } = await database.from('hotel_stay_settings').select('default_window_days').eq('tenant_id', tenantId).maybeSingle()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateStayCode()
    const { data, error } = await database.from('hotel_stays').insert({
      tenant_id: tenantId,
      booking_ref: input.bookingRef,
      code_digest: codeDigest(tenantId, code),
      room: input.room ?? null,
      guest_label: input.guestLabel ?? null,
      valid_from: input.validFrom,
      valid_to: input.validTo,
      window_days: input.windowDays ?? settings?.default_window_days ?? 14,
    }).select('id').single()
    if (!error) return { stayId: data.id, code, displayCode: displayCode(code) }
    if (error.code !== '23505') throw error
  }
  throw new Error('CODE_GENERATION_FAILED')
}

export const createStaySchema = z.object({
  bookingRef: text(1, 80),
  validFrom: z.string().date(),
  validTo: z.string().date(),
  room: text(1, 20).optional(),
  guestLabel: text(1, 60).optional(),
  windowDays: z.number().int().min(0).max(60).optional(),
}).strict().refine(value => value.validTo >= value.validFrom, { message: 'invalid_stay_dates' })

// The cookie session is preferred; a link token in the body is only a fallback for browsers that refuse cookies.
export async function loadStay(database, token, now = new Date(), purpose = null) {
  const verified = verifyStayToken(token, now.getTime(), purpose)
  if (!verified) return null
  const { data, error } = await database.from('hotel_stays').select(stayColumns).eq('id', verified.stayId).maybeSingle()
  if (error) throw error
  return data || null
}

export const guestToken = (request, body) => readCookie(request, SESSION_COOKIE) || (typeof body?.token === 'string' ? body.token : null)

// Swaps a link for a cookie session. Returns null if the link is bad or the stay can no longer open.
export async function exchangeLink(database, linkToken, now = new Date()) {
  const stay = await loadStay(database, linkToken, now, 'link')
  if (!stay || stayPhase(stay, now) === 'voided') return null
  return signSessionToken(stay, now.getTime())
}

export async function guestSession(database, stay, now = new Date()) {
  const { data: settings } = await database.from('hotel_stay_settings').select('hotel_name, discover_items').eq('tenant_id', stay.tenant_id).maybeSingle()
  const tiles = tilesFor(stay, now)
  const { count } = await database.from('hotel_stay_submissions').select('id', { count: 'exact', head: true }).eq('stay_id', stay.id).eq('kind', 'rating')
  return {
    hotelName: settings?.hotel_name || null,
    firstName: stay.guest_label || null,
    tiles: { ...tiles, rating: tiles.rating && !count },
    discover: tiles.discover ? settings?.discover_items || [] : [],
    questions: RATING_QUESTIONS,
  }
}

export async function submitToStay(database, stay, kind, payload, now = new Date()) {
  const schema = submissionSchemas[kind]
  if (!schema) return { ok: false, status: 422, error: 'unknown_kind' }
  const tiles = tilesFor(stay, now)
  const open = { thank_you: tiles.thankYou, private: tiles.private, feedback: tiles.feedback, rating: tiles.rating }[kind]
  if (!open) return { ok: false, status: 409, error: 'not_open_for_this_stay' }
  const parsed = schema.safeParse(payload)
  if (!parsed.success) return { ok: false, status: 422, error: 'invalid_submission' }
  const { count, error: countError } = await database.from('hotel_stay_submissions').select('id', { count: 'exact', head: true }).eq('stay_id', stay.id).eq('kind', kind)
  if (countError) throw countError
  if ((count || 0) >= submissionLimits[kind]) return { ok: false, status: 429, error: 'limit_reached' }
  const { data, error } = await database.from('hotel_stay_submissions').insert({ stay_id: stay.id, tenant_id: stay.tenant_id, kind, payload: parsed.data }).select('id').single()
  if (error) {
    if (error.code === '23505') return { ok: false, status: 429, error: 'limit_reached' }
    throw error
  }
  return { ok: true, status: 201, submissionId: data.id, parsed: parsed.data }
}

const clean = value => String(value || '').replace(/[\r\n]+/g, ' ').trim()

// Best-effort email to the hotel for guest-relations messages. Never fails the guest's request.
export async function notifyHotel(database, stay, kind, payload, submissionId) {
  if (!['private', 'feedback', 'thank_you'].includes(kind)) return { sent: false }
  if (!process.env.RESEND_API_KEY || !process.env.TISONIK_ENQUIRY_FROM) return { sent: false }
  try {
    const { data: settings } = await database.from('hotel_stay_settings').select('notify_email, hotel_name').eq('tenant_id', stay.tenant_id).maybeSingle()
    if (!settings?.notify_email) return { sent: false }
    const label = { private: 'Private message from a guest', feedback: 'Post-stay feedback', thank_you: 'A guest says thank you' }[kind]
    const lines = [
      label,
      '',
      `Booking: ${stay.booking_ref}`,
      `Room: ${stay.room || 'not recorded'}`,
      `Guest: ${stay.guest_label || 'not recorded'}`,
      `Stay: ${stay.valid_from} to ${stay.valid_to}`,
      ...(payload.recipient ? [`About: ${payload.recipient}`] : []),
      '',
      payload.message,
      '',
      `Reference: ${submissionId}`,
    ]
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.TISONIK_ENQUIRY_FROM, to: [settings.notify_email], subject: clean(`${label} - booking ${stay.booking_ref}`), text: lines.join('\n') }),
    })
    return { sent: response.ok }
  } catch {
    return { sent: false }
  }
}
