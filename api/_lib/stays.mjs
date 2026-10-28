import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { isBlocked, limits, overLimit } from './rate-limit.mjs'

export const TOKEN_LIFETIME_SECONDS = 15 * 60
const SESSION_MAX_SECONDS = 30 * 86_400

// Approved wording (26 October). Five scored questions on a 1-10 scale plus a free-text box.
// Question 4 can be skipped when nothing went wrong.
export const RATING_QUESTIONS = [
  { id: 'check_in', text: 'How was your arrival and check-in?', low: 'Poor', high: 'Excellent' },
  { id: 'room', text: 'How comfortable and clean was your room?', low: 'Poor', high: 'Excellent' },
  { id: 'team', text: 'How warm and helpful was our team?', low: 'Poor', high: 'Excellent' },
  { id: 'recovery', text: 'If something needed fixing, how well did we put it right?', low: 'Poor', high: 'Excellent', optional: true, skipLabel: 'Nothing went wrong' },
  { id: 'recommend', text: 'How likely are you to recommend us to a friend?', low: 'Not at all likely', high: 'Extremely likely' },
]

// Hotels and ships use the same five questions and ids, so scores compare. Only the nouns change on a ship.
// Ship wording approved 28 October.
export const VENUE_TYPES = ['hotel', 'ship']
const shipWording = {
  check_in: 'How was your embarkation?',
  room: 'How comfortable and clean was your cabin?',
  team: 'How warm and helpful was our crew?',
}
export const ratingQuestionsFor = venueType => venueType === 'ship' ? RATING_QUESTIONS.map(question => ({ ...question, text: shipWording[question.id] || question.text })) : RATING_QUESTIONS
export const venueWords = venueType => venueType === 'ship'
  ? { room: 'Cabin', desk: 'guest services', stay: 'Voyage', thing: 'sailing' }
  : { room: 'Room', desk: 'reception', stay: 'Stay', thing: 'stay' }

const secretAliases = { STAY_LINK_SECRET: 'TISONIK_GUEST_SESSION_SECRET' }
const secret = name => {
  const value = process.env[name] || process.env[secretAliases[name]]
  if (!value || value.length < 32) throw new Error('STAY_SECRET_NOT_CONFIGURED')
  return value
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
    scores: z.object(Object.fromEntries(RATING_QUESTIONS.map(question => [question.id, question.optional ? z.number().int().min(1).max(10).optional() : z.number().int().min(1).max(10)]))).strict(),
    comment: text(0, 500).optional(),
  }).strict(),
}

export const submissionLimits = { thank_you: 10, private: 5, feedback: 5, rating: 1 }

const stayColumns = 'id, tenant_id, booking_ref, room, guest_label, valid_from, valid_to, window_days, status, app_sessions, card_sessions'

export function publicOrigin() {
  const origin = (process.env.TISONIK_PUBLIC_ORIGIN || process.env.STAY_BASE_URL || 'https://tisonik.com').replace(/\/+$/, '')
  if (!origin.startsWith('https://')) throw new Error('PUBLIC_ORIGIN_NOT_HTTPS')
  return origin
}

// Card codes belong to UNIKMO. UNIKMO creates them and sends them to Tisonik (see registerUnikmoCode); Tisonik never
// creates a code. It only keeps a keyed hash of each code UNIKMO sent, so it can check whether a code is still valid.
// UNIKMO's code format is not fixed here: anything of 4 to 64 letters and digits is accepted, ignoring case, spaces and hyphens.
export function normalizeCode(input) {
  const code = String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return code.length >= 4 && code.length <= 64 ? code : null
}

// Keyed hash: a leaked table cannot be brute-forced without the pepper.
export function codeDigest(tenantId, code) {
  return createHmac('sha256', secret('STAY_CODE_PEPPER')).update(`${tenantId}:${code}`).digest('hex')
}

// Unknown or mismatched codes are counted per hotel. Once a hotel has had too many in a minute, code checks stop until the window rolls over.
const failBucket = tenantId => `fail:${tenantId}`
async function refuse(database, tenantId, result) {
  await overLimit(database, failBucket(tenantId), limits.failedCodes.window, limits.failedCodes.max)
  return result
}

const dateOf = z.string().refine(value => Number.isFinite(Date.parse(value)))
const stayFields = {
  hotelId: z.string().trim().regex(/^[A-Za-z0-9_-]{2,64}$/),
  guestReference: text(1, 80),
  stayEndsAt: dateOf,
  stayStartsAt: dateOf.optional(),
  room: text(1, 20).optional(),
  firstName: text(1, 60).optional(),
}

// UNIKMO opens a guest session. With a card code, Tisonik checks it: the code must be one UNIKMO sent, for this hotel and
// this guest reference, and the stay must still be open. Without a card code (a guest the ship's app already knows) there
// is nothing to check. guestReference must be the same stable value every time for one guest, so that guest has one stay
// record and one rating however they arrive.
export const unikmoSessionSchema = z.object({
  ...stayFields,
  cardCode: text(1, 64).optional(),
  source: z.enum(['app', 'card']).optional(),
}).strict()

// UNIKMO sends a code to Tisonik when it creates or assigns it, and revokes it when the card is lost or replaced.
// Registering a new code for a guest replaces that guest's previous one.
export const unikmoCodeSchema = z.object({
  ...stayFields,
  cardCode: text(1, 64),
  status: z.enum(['active', 'revoked']).default('active'),
}).strict()

const MAX_DAYS_AHEAD = 400

async function hotelFor(database, hotelId) {
  const { data, error } = await database.from('hotel_stay_settings').select('tenant_id, default_window_days').eq('unikmo_hotel_id', hotelId).maybeSingle()
  if (error) throw error
  return data
}

// UNIKMO is trusted for the stay's dates: it is the system that knows the booking, and its server proves itself with a
// shared secret. The stay record is created on first sight (hotel plus guest reference) and its dates updated afterwards.
// A stay the hotel voided stays voided. A stay that has already closed, or ends implausibly far ahead, is not created.
async function upsertStay(database, settings, input, { now, source = null, existing }) {
  const reference = input.guestReference.trim()
  const validTo = day(input.stayEndsAt)
  if (validTo > addDays(day(now), MAX_DAYS_AHEAD)) return null
  let stay = existing
  if (stay === undefined) {
    const { data, error } = await database.from('hotel_stays').select(stayColumns).eq('tenant_id', settings.tenant_id).eq('booking_ref', reference).maybeSingle()
    if (error) throw error
    stay = data
  }
  const bump = (current, name) => (current || 0) + (source === name ? 1 : 0)
  if (!stay) {
    if (addDays(validTo, settings.default_window_days ?? 14) < day(now)) return null
    const validFrom = input.stayStartsAt ? day(input.stayStartsAt) : day(now)
    const row = {
      tenant_id: settings.tenant_id,
      booking_ref: reference,
      room: input.room ?? null,
      guest_label: input.firstName ?? null,
      valid_from: validFrom <= validTo ? validFrom : validTo,
      valid_to: validTo,
      window_days: settings.default_window_days ?? 14,
      app_sessions: bump(0, 'app'),
      card_sessions: bump(0, 'card'),
    }
    const { data, error } = await database.from('hotel_stays').insert(row).select('id').single()
    if (!error) return { id: data.id, status: 'active', ...row }
    if (error.code !== '23505') throw error
    return upsertStay(database, settings, input, { now, source })
  }
  if (stay.status === 'voided') return stay
  const patch = {
    valid_to: validTo,
    app_sessions: bump(stay.app_sessions, 'app'),
    card_sessions: bump(stay.card_sessions, 'card'),
    ...(input.stayStartsAt ? { valid_from: day(input.stayStartsAt) <= validTo ? day(input.stayStartsAt) : validTo } : {}),
    ...(input.room ? { room: input.room } : {}),
    ...(input.firstName ? { guest_label: input.firstName } : {}),
  }
  const { error } = await database.from('hotel_stays').update(patch).eq('id', stay.id)
  if (error) throw error
  return { ...stay, ...patch }
}

export async function resolveUnikmoSession(database, input, now = new Date()) {
  const settings = await hotelFor(database, input.hotelId)
  if (!settings) return { ok: false }
  const tenantId = settings.tenant_id
  if (await overLimit(database, `hotel:${tenantId}`, limits.hotelCalls.window, limits.hotelCalls.max)) return { ok: false, limited: true }
  let existing
  if (input.cardCode !== undefined) {
    if (await isBlocked(database, failBucket(tenantId), limits.failedCodes.window, limits.failedCodes.max)) return { ok: false, limited: true }
    const code = normalizeCode(input.cardCode)
    let found = null
    if (code) {
      const { data, error } = await database.from('hotel_stays').select(stayColumns).eq('tenant_id', tenantId).eq('code_digest', codeDigest(tenantId, code)).maybeSingle()
      if (error) throw error
      found = data
    }
    if (!found || found.booking_ref !== input.guestReference.trim()) return refuse(database, tenantId, { ok: false })
    existing = found
  }
  const source = input.source || (input.cardCode !== undefined ? 'card' : 'app')
  const stay = await upsertStay(database, settings, input, { now, source, existing })
  if (!stay) return { ok: false }
  const phase = stayPhase(stay, now)
  if (phase === 'voided' || phase === 'closed') return { ok: false }
  return { ok: true, url: `${publicOrigin()}/stay/#t=${signStayToken(stay.id, now.getTime())}`, phase, source }
}

// UNIKMO tells Tisonik about a code it created. Tisonik creates the stay record if it has not seen the guest, stores only
// a keyed hash of the code, and from then on can check the code. A code already held by another guest is refused.
export async function registerUnikmoCode(database, input, now = new Date()) {
  const settings = await hotelFor(database, input.hotelId)
  if (!settings) return { ok: false }
  const tenantId = settings.tenant_id
  if (await overLimit(database, `hotel:${tenantId}`, limits.hotelCalls.window, limits.hotelCalls.max)) return { ok: false, limited: true }
  const code = normalizeCode(input.cardCode)
  if (!code) return { ok: false }
  const digest = codeDigest(tenantId, code)
  if (input.status === 'revoked') {
    const { error } = await database.from('hotel_stays').update({ code_digest: null }).eq('tenant_id', tenantId).eq('code_digest', digest)
    if (error) throw error
    return { ok: true, revoked: true }
  }
  const stay = await upsertStay(database, settings, input, { now })
  if (!stay || stay.status === 'voided') return { ok: false }
  const { error } = await database.from('hotel_stays').update({ code_digest: digest }).eq('id', stay.id)
  if (error) {
    if (error.code === '23505') return { ok: false, conflict: true }
    throw error
  }
  return { ok: true, phase: stayPhase(stay, now) }
}

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
  const { data: settings } = await database.from('hotel_stay_settings').select('hotel_name, discover_items, venue_type').eq('tenant_id', stay.tenant_id).maybeSingle()
  const tiles = tilesFor(stay, now)
  const { count } = await database.from('hotel_stay_submissions').select('id', { count: 'exact', head: true }).eq('stay_id', stay.id).eq('kind', 'rating')
  return {
    hotelName: settings?.hotel_name || null,
    venueType: settings?.venue_type || 'hotel',
    firstName: stay.guest_label || null,
    tiles: { ...tiles, rating: tiles.rating && !count },
    discover: tiles.discover ? settings?.discover_items || [] : [],
    questions: ratingQuestionsFor(settings?.venue_type),
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

export const LOW_SCORE = 6

// Reception (guest services on a ship) receives everything: private messages, feedback, thank-yous and ratings. The hotel director (on a ship, the hotel director too; or whoever
// the hotel names) receives ratings only. If reception has no address, the manager's covers for it so nothing is lost.
// Best-effort: an email failure never fails the guest's request.
export async function notifyHotel(database, stay, kind, payload, submissionId) {
  if (!['private', 'feedback', 'thank_you', 'rating'].includes(kind)) return { sent: false }
  if (!process.env.RESEND_API_KEY || !process.env.TISONIK_ENQUIRY_FROM) return { sent: false }
  try {
    const { data: settings } = await database.from('hotel_stay_settings').select('reception_email, manager_email, hotel_name, venue_type').eq('tenant_id', stay.tenant_id).maybeSingle()
    const wanted = kind === 'rating' ? [settings?.reception_email, settings?.manager_email] : [settings?.reception_email || settings?.manager_email]
    const to = [...new Set(wanted.filter(Boolean).map(address => address.trim().toLowerCase()))]
    if (!to.length) return { sent: false }
    const questions = ratingQuestionsFor(settings?.venue_type)
    const words = venueWords(settings?.venue_type)
    const scores = kind === 'rating' ? questions.filter(question => payload.scores[question.id] !== undefined).map(question => ({ question, value: payload.scores[question.id] })) : []
    const low = scores.filter(item => item.value <= LOW_SCORE)
    const average = scores.length ? scores.reduce((sum, item) => sum + item.value, 0) / scores.length : null
    const label = { private: 'Private message from a guest', feedback: 'Post-stay feedback', thank_you: 'A guest says thank you', rating: 'Stay rating' }[kind]
    const subject = clean(`${low.length ? 'LOW SCORE - ' : ''}${label} - booking ${stay.booking_ref}${average !== null ? ` - average ${average.toFixed(1)}` : ''}`)
    const lines = [
      label,
      '',
      `Booking: ${stay.booking_ref}`,
      `${words.room}: ${stay.room || 'not recorded'}`,
      `Guest: ${stay.guest_label || 'not recorded'}`,
      `${words.stay}: ${stay.valid_from} to ${stay.valid_to}`,
      ...(payload.recipient ? [`About: ${payload.recipient}`] : []),
      ...(scores.length ? ['', ...scores.map(item => `${item.value <= LOW_SCORE ? '!! ' : '   '}${item.value}/10  ${item.question.text}`), ...questions.filter(question => question.optional && payload.scores[question.id] === undefined).map(question => `   skipped  ${question.text}`)] : []),
      ...(low.length ? ['', 'Scores of 6 or below are marked !! and need a call from the manager today.'] : []),
      ...(payload.message || payload.comment ? ['', payload.message || payload.comment] : []),
      '',
      `Reference: ${submissionId}`,
    ]
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.TISONIK_ENQUIRY_FROM, to, subject, text: lines.join('\n') }),
    })
    return { sent: response.ok, recipients: to.length }
  } catch {
    return { sent: false }
  }
}
