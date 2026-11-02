import { z } from 'zod'
import { stayPhase } from './stays.mjs'
import { withIds } from './stay-offers.mjs'
import { AFFIRMATIONS, AVATARS, INTERESTS, LIMITS, PLACES, REASONS, departmentsFor, featuresFor, nameIsSafe, nearbyFresh } from './stay-connect-config.mjs'

const ids = list => list.map(item => item.id)
const labelOf = (list, id) => list.find(item => item.id === id)?.label || id
const dateOf = now => now.toISOString().slice(0, 10)
const refuse = (status, error) => ({ ok: false, status, error })
const done = (body = {}, notify = null) => ({ ok: true, status: 200, body, notify })

const uuid = z.string().uuid()
const schemas = {
  'profile.save': z.object({
    displayName: z.string().trim().min(1).max(24).refine(nameIsSafe),
    avatar: z.enum(AVATARS),
    interests: z.array(z.enum(ids(INTERESTS))).max(LIMITS.interestsMax).refine(list => new Set(list).size === list.length),
    adult: z.literal(true),
    discoverable: z.boolean(),
    nearby: z.boolean().default(false),
    sharePlans: z.boolean().default(false),
  }).strict(),
  'offer.join': z.object({ offerId: z.string().max(40) }).strict(),
  'offer.leave': z.object({ offerId: z.string().max(40) }).strict(),
  'live.answer': z.object({ liveId: uuid, score: z.number().int().min(1).max(10) }).strict(),
  'people.list': z.object({ interest: z.enum(ids(INTERESTS)).optional(), activity: z.string().max(40).optional(), mode: z.literal('nearby').optional() }).strict(),
  'activity.join': z.object({ activityId: z.string().max(40) }).strict(),
  'recovery.answer': z.object({ submissionId: uuid, answer: z.enum(['fixed', 'not_fixed']) }).strict(),
  'affirm.send': z.object({ to: uuid, label: z.enum(ids(AFFIRMATIONS)) }).strict(),
  'affirm.respond': z.object({ id: uuid, response: z.enum(['acknowledge', 'ignore']) }).strict(),
  'meet.propose': z.object({ affirmationId: uuid, place: z.enum(ids(PLACES)) }).strict(),
  'meet.respond': z.object({ id: uuid, response: z.enum(['accept', 'decline']) }).strict(),
  block: z.object({ profile: uuid }).strict(),
  report: z.object({ profile: uuid, reason: z.enum(['uncomfortable', 'behaviour', 'fake', 'other']) }).strict(),
  inbox: z.object({}).strict(),
  'crew.recognise': z.object({ crewId: z.string().max(40), reasons: z.array(z.enum(ids(REASONS))).min(1).max(2).refine(list => new Set(list).size === list.length) }).strict(),
  'pulse.submit': z.object({ department: z.string().max(30), score: z.number().int().min(1).max(10) }).strict(),
}

const reportReasons = { uncomfortable: 'Made me uncomfortable', behaviour: 'Behaviour felt wrong', fake: 'Looks like a fake profile', other: 'Something else' }
export const LOW_PULSE = 6

async function profileOf(database, stayId) {
  const { data, error } = await database.from('stay_profiles').select('id, stay_id, tenant_id, display_name, avatar, interests, adult_confirmed, discoverable, expires_on, nearby_on, nearby_tokens, nearby_at').eq('stay_id', stayId).maybeSingle()
  if (error) throw error
  return data
}

export const publicProfile = profile => profile ? { id: profile.id, name: profile.display_name, avatar: profile.avatar, interests: profile.interests || [], discoverable: !!profile.discoverable, nearby: !!profile.nearby_on } : null

async function blockedWith(database, me) {
  const [mine, theirs] = await Promise.all([
    database.from('stay_blocks').select('blocked_profile').eq('blocker_profile', me.id),
    database.from('stay_blocks').select('blocker_profile').eq('blocked_profile', me.id),
  ])
  if (mine.error) throw mine.error
  if (theirs.error) throw theirs.error
  return new Set([...(mine.data || []).map(row => row.blocked_profile), ...(theirs.data || []).map(row => row.blocker_profile)])
}

// A guest is only visible to another when both opted in, both confirmed they are adults, both stays are still open and neither has blocked the other.
const visibleTo = (other, me, blocked, now) =>
  other && other.id !== me.id && other.tenant_id === me.tenant_id && other.discoverable && other.adult_confirmed && other.expires_on >= dateOf(now) && !blocked.has(other.id)

async function profilesByIds(database, list) {
  if (!list.length) return new Map()
  const { data, error } = await database.from('stay_profiles').select('id, tenant_id, display_name, avatar, interests, adult_confirmed, discoverable, expires_on').in('id', list)
  if (error) throw error
  return new Map((data || []).map(row => [row.id, row]))
}

async function listPeople(database, me, input, now, settings) {
  const blocked = await blockedWith(database, me)
  const { data, error } = await database.from('stay_profiles').select('id, stay_id, tenant_id, display_name, avatar, interests, adult_confirmed, discoverable, expires_on, nearby_on, proximity_token, nearby_at').eq('tenant_id', me.tenant_id).eq('discoverable', true).limit(500)
  if (error) throw error
  const { data: sent } = await database.from('stay_affirmations').select('to_profile').eq('from_profile', me.id).eq('service_date', dateOf(now))
  const sentTo = new Set((sent || []).map(row => row.to_profile))
  const mine = new Set(me.interests || [])
  let allowed = null
  if (input.mode === 'nearby') {
    // Both guests opted in to Nearby, and the ship's app has recently said they can hear each other.
    if (!me.nearby_on || !nearbyFresh(me.nearby_at, now)) return done({ people: [], nearbyReady: false })
    const heard = new Set(me.nearby_tokens || [])
    allowed = other => other.nearby_on && nearbyFresh(other.nearby_at, now) && heard.has(other.proximity_token)
  } else if (input.activity) {
    // Guests who took part in the same listed activity as you, today or in the last two days.
    if (!(settings?.activity_items || []).some(item => item.id === input.activity)) return refuse(422, 'invalid_request')
    const cutoff = dateOf(new Date(now.getTime() - LIMITS.activityLookbackDays * 86_400_000))
    const { data: joins, error: joinError } = await database.from('stay_activity_joins').select('stay_id, service_date').eq('tenant_id', me.tenant_id).eq('activity_id', input.activity)
    if (joinError) throw joinError
    const recent = (joins || []).filter(row => row.service_date >= cutoff)
    const together = new Set(recent.map(row => row.stay_id))
    if (!together.has(me.stay_id)) return done({ people: [], joined: false })
    allowed = other => together.has(other.stay_id)
  }
  const people = (data || [])
    .filter(other => visibleTo(other, me, blocked, now) && (!input.interest || (other.interests || []).includes(input.interest)) && (!allowed || allowed(other)))
    .map(other => {
      const shared = (other.interests || []).filter(interest => mine.has(interest))
      return { id: other.id, name: other.display_name, avatar: other.avatar, interests: other.interests || [], shared, sentToday: sentTo.has(other.id) }
    })
    .sort((a, b) => b.shared.length - a.shared.length || a.name.localeCompare(b.name))
    .slice(0, 40)
  return done(input.mode === 'nearby' ? { people, nearbyReady: true } : { people })
}

async function joinActivity(database, stay, me, settings, input, now) {
  const activity = (settings?.activity_items || []).find(item => item.id === input.activityId)
  if (!activity) return refuse(404, 'not_found')
  const { error } = await database.from('stay_activity_joins').insert({ stay_id: stay.id, tenant_id: stay.tenant_id, activity_id: activity.id, service_date: dateOf(now) }).select('stay_id').single()
  if (error && error.code !== '23505') throw error
  return done({ joined: true })
}

// "Did we fix it?" Only the guest's own private message, only after the desk marked it resolved, only once.
async function answerRecovery(database, stay, input, now) {
  const { data: row, error } = await database.from('hotel_stay_submissions').select('id, stay_id, kind, status, recheck, payload').eq('id', input.submissionId).maybeSingle()
  if (error) throw error
  if (!row || row.stay_id !== stay.id || row.kind !== 'private' || row.status !== 'resolved') return refuse(404, 'not_found')
  if (row.recheck) return refuse(409, 'already_answered')
  const fixed = input.answer === 'fixed'
  const { error: updateError } = await database.from('hotel_stay_submissions').update({ recheck: input.answer, rechecked_at: now.toISOString(), ...(fixed ? {} : { status: 'new' }) }).eq('id', row.id)
  if (updateError) throw updateError
  return done({ answered: true, reopened: !fixed }, fixed ? null : { kind: 'recheck', payload: { message: String(row.payload?.message || '').slice(0, 300) }, id: row.id })
}

async function inbox(database, me, now) {
  const [incoming, outgoing] = await Promise.all([
    database.from('stay_affirmations').select('id, from_profile, to_profile, label, status, service_date, created_at').eq('to_profile', me.id).limit(100),
    database.from('stay_affirmations').select('id, from_profile, to_profile, label, status, service_date, created_at').eq('from_profile', me.id).limit(100),
  ])
  if (incoming.error) throw incoming.error
  if (outgoing.error) throw outgoing.error
  const rows = [...(incoming.data || []).filter(row => row.status !== 'ignored').map(row => ({ ...row, direction: 'in' })), ...(outgoing.data || []).map(row => ({ ...row, direction: 'out' }))]
  const blocked = await blockedWith(database, me)
  const others = await profilesByIds(database, [...new Set(rows.map(row => (row.direction === 'in' ? row.from_profile : row.to_profile)))])
  const { data: meetups, error } = rows.length ? await database.from('stay_meetups').select('id, affirmation_id, proposed_by, place, status').in('affirmation_id', rows.map(row => row.id)) : { data: [] }
  if (error) throw error
  const items = rows
    .map(row => {
      const otherId = row.direction === 'in' ? row.from_profile : row.to_profile
      const other = others.get(otherId)
      if (!other || blocked.has(otherId)) return null
      const meetup = (meetups || []).filter(entry => entry.affirmation_id === row.id).sort((a, b) => (a.status === 'proposed' ? -1 : 1) - (b.status === 'proposed' ? -1 : 1))[0]
      return {
        id: row.id,
        direction: row.direction,
        label: labelOf(AFFIRMATIONS, row.label),
        status: row.direction === 'out' && row.status === 'ignored' ? 'sent' : row.status,
        date: row.service_date,
        at: row.created_at || '',
        other: { id: otherId, name: other.display_name, avatar: other.avatar },
        meetup: meetup ? { id: meetup.id, place: labelOf(PLACES, meetup.place), status: meetup.status, byMe: meetup.proposed_by === me.id } : null,
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
  return done({ items })
}

async function sendAffirmation(database, me, input, now) {
  const blocked = await blockedWith(database, me)
  const [other] = [...(await profilesByIds(database, [input.to])).values()]
  if (!visibleTo(other, me, blocked, now)) return refuse(404, 'not_available')
  const { data: today } = await database.from('stay_affirmations').select('id').eq('from_profile', me.id).eq('service_date', dateOf(now))
  if ((today || []).length >= LIMITS.affirmationsPerDay) return refuse(429, 'daily_limit')
  const { error } = await database.from('stay_affirmations').insert({ tenant_id: me.tenant_id, from_profile: me.id, to_profile: other.id, label: input.label, service_date: dateOf(now) }).select('id').single()
  if (error) return error.code === '23505' ? refuse(429, 'already_sent_today') : (() => { throw error })()
  return done({ sent: true })
}

async function loadAffirmation(database, id) {
  const { data, error } = await database.from('stay_affirmations').select('id, from_profile, to_profile, status').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

async function respondAffirmation(database, me, input) {
  const row = await loadAffirmation(database, input.id)
  if (!row || row.to_profile !== me.id) return refuse(404, 'not_found')
  if (row.status !== 'sent') return refuse(409, 'already_answered')
  const { error } = await database.from('stay_affirmations').update({ status: input.response === 'acknowledge' ? 'acknowledged' : 'ignored' }).eq('id', row.id)
  if (error) throw error
  return done({ answered: true })
}

// A meetup can be proposed only after the recipient has acknowledged the compliment, by either of the two guests, once at a time.
async function proposeMeetup(database, me, input) {
  const row = await loadAffirmation(database, input.affirmationId)
  if (!row || (row.from_profile !== me.id && row.to_profile !== me.id)) return refuse(404, 'not_found')
  if (row.status !== 'acknowledged') return refuse(409, 'not_acknowledged')
  const blocked = await blockedWith(database, me)
  if (blocked.has(row.from_profile === me.id ? row.to_profile : row.from_profile)) return refuse(404, 'not_found')
  const { data: open } = await database.from('stay_meetups').select('id, status').eq('affirmation_id', row.id).eq('status', 'proposed')
  if ((open || []).length) return refuse(409, 'proposal_open')
  const { error } = await database.from('stay_meetups').insert({ tenant_id: me.tenant_id, affirmation_id: row.id, proposed_by: me.id, place: input.place }).select('id').single()
  if (error) return error.code === '23505' ? refuse(409, 'proposal_open') : (() => { throw error })()
  return done({ proposed: true })
}

async function respondMeetup(database, me, input) {
  const { data: meetup, error } = await database.from('stay_meetups').select('id, affirmation_id, proposed_by, status').eq('id', input.id).maybeSingle()
  if (error) throw error
  if (!meetup) return refuse(404, 'not_found')
  const row = await loadAffirmation(database, meetup.affirmation_id)
  if (!row || (row.from_profile !== me.id && row.to_profile !== me.id) || meetup.proposed_by === me.id) return refuse(404, 'not_found')
  if (meetup.status !== 'proposed') return refuse(409, 'already_answered')
  const { error: updateError } = await database.from('stay_meetups').update({ status: input.response === 'accept' ? 'accepted' : 'declined' }).eq('id', meetup.id)
  if (updateError) throw updateError
  return done({ answered: true })
}

async function blockProfile(database, me, targetId) {
  const [other] = [...(await profilesByIds(database, [targetId])).values()]
  if (!other || other.id === me.id || other.tenant_id !== me.tenant_id) return refuse(404, 'not_found')
  const { error } = await database.from('stay_blocks').insert({ blocker_profile: me.id, blocked_profile: other.id }).select('blocker_profile').single()
  if (error && error.code !== '23505') throw error
  return { other }
}

async function reportProfile(database, stay, me, input) {
  const { count } = await database.from('hotel_stay_submissions').select('id', { count: 'exact', head: true }).eq('stay_id', stay.id).eq('kind', 'report')
  if ((count || 0) >= LIMITS.reportsPerStay) return refuse(429, 'limit_reached')
  const blocked = await blockProfile(database, me, input.profile)
  if (blocked.ok === false) return blocked
  const payload = { about: blocked.other.display_name, message: reportReasons[input.reason] }
  const { data, error } = await database.from('hotel_stay_submissions').insert({ stay_id: stay.id, tenant_id: stay.tenant_id, kind: 'report', payload }).select('id').single()
  if (error) throw error
  return done({ reported: true }, { kind: 'report', payload, id: data.id })
}

async function recogniseCrew(database, stay, settings, input, now) {
  const crew = (settings?.crew_items || []).find(item => item.id === input.crewId)
  if (!crew) return refuse(404, 'not_found')
  const { data, error } = await database.from('crew_recognitions').insert({ tenant_id: stay.tenant_id, stay_id: stay.id, crew_id: crew.id, reasons: input.reasons, service_date: dateOf(now) }).select('id').single()
  if (error) return error.code === '23505' ? refuse(429, 'already_recognised_today') : (() => { throw error })()
  return done({ recognised: true }, { kind: 'recognition', payload: { crewName: crew.name, crewRole: crew.role || null, reasons: input.reasons.map(id => labelOf(REASONS, id)) }, id: data.id })
}

// Hold a place on an offer. The venue still takes payment and confirms. Places are counted here, so two guests tapping at
// the same instant can both get the last place; the desk is told each time and can say no.
async function joinOffer(database, stay, settings, input) {
  const item = withIds(settings?.discover_items || []).find(entry => entry.id === input.offerId)
  if (!item) return refuse(404, 'not_found')
  const { data: mine } = await database.from('stay_offer_rsvps').select('stay_id').eq('stay_id', stay.id).eq('offer_id', item.id).maybeSingle()
  if (mine) return done({ joined: true })
  let left = null
  if (item.spots) {
    const { count } = await database.from('stay_offer_rsvps').select('stay_id', { count: 'exact', head: true }).eq('tenant_id', stay.tenant_id).eq('offer_id', item.id)
    if ((count || 0) >= item.spots) return refuse(409, 'full')
    left = item.spots - (count || 0) - 1
  }
  const { error } = await database.from('stay_offer_rsvps').insert({ stay_id: stay.id, tenant_id: stay.tenant_id, offer_id: item.id }).select('stay_id').single()
  if (error && error.code !== '23505') throw error
  return done({ joined: true, left }, { kind: 'offer', payload: { offer: item.title, left }, id: item.id })
}

async function leaveOffer(database, stay, input) {
  const { error } = await database.from('stay_offer_rsvps').delete().eq('stay_id', stay.id).eq('offer_id', input.offerId)
  if (error) throw error
  return done({ left: true })
}

// A guest rates something staff asked about. One answer each, only while it is open.
async function answerLive(database, stay, input, now) {
  const { data: row, error } = await database.from('stay_live_ratings').select('id, tenant_id, opened_at, closes_at').eq('id', input.liveId).maybeSingle()
  if (error) throw error
  if (!row || row.tenant_id !== stay.tenant_id) return refuse(404, 'not_found')
  if (Date.parse(row.opened_at) > now.getTime() || Date.parse(row.closes_at) <= now.getTime()) return refuse(409, 'closed')
  const { error: insertError } = await database.from('stay_live_answers').insert({ live_id: row.id, stay_id: stay.id, tenant_id: stay.tenant_id, score: input.score }).select('live_id').single()
  if (insertError) return insertError.code === '23505' ? refuse(409, 'already_answered') : (() => { throw insertError })()
  return done({ saved: true })
}

async function submitPulse(database, stay, venueType, input, now) {
  const department = departmentsFor(venueType).find(item => item.id === input.department)
  if (!department) return refuse(422, 'invalid_submission')
  const { data, error } = await database.from('stay_pulses').insert({ tenant_id: stay.tenant_id, stay_id: stay.id, department: department.id, score: input.score, service_date: dateOf(now) }).select('id').single()
  if (error) return error.code === '23505' ? refuse(429, 'already_scored_today') : (() => { throw error })()
  const low = input.score <= LOW_PULSE
  return done({ saved: true, low, askRecognition: input.score >= 9 }, low ? { kind: 'pulse', payload: { department: department.label, score: input.score }, id: data.id } : null)
}

export async function connectAction(database, stay, action, data, now = new Date()) {
  const schema = schemas[action]
  if (!schema) return refuse(422, 'unknown_action')
  const parsed = schema.safeParse(data ?? {})
  if (!parsed.success) return refuse(422, 'invalid_request')
  const input = parsed.data
  const { data: settings, error } = await database.from('hotel_stay_settings').select('venue_type, crew_items, activity_items, discover_items').eq('tenant_id', stay.tenant_id).maybeSingle()
  if (error) throw error
  const venueType = settings?.venue_type || 'hotel'
  const features = featuresFor(venueType)
  const phase = stayPhase(stay, now)
  const live = phase === 'during'

  if (action === 'crew.recognise') {
    if (!features.recognition || !(live || phase === 'after_checkout')) return refuse(409, 'not_open_for_this_stay')
    return recogniseCrew(database, stay, settings, input, now)
  }
  if (action === 'pulse.submit') {
    if (!features.pulse || !live) return refuse(409, 'not_open_for_this_stay')
    return submitPulse(database, stay, venueType, input, now)
  }

  if (action === 'offer.join' || action === 'offer.leave' || action === 'live.answer') {
    if (!live) return refuse(409, 'not_open_for_this_stay')
    if (action === 'offer.join') return joinOffer(database, stay, settings, input)
    if (action === 'offer.leave') return leaveOffer(database, stay, input)
    return answerLive(database, stay, input, now)
  }
  if (action === 'recovery.answer') {
    if (!live) return refuse(409, 'not_open_for_this_stay')
    return answerRecovery(database, stay, input, now)
  }

  // Everything below is guest-to-guest and exists only where the venue has it switched on, while the stay is open.
  if (!features.people || !live) return refuse(409, 'not_open_for_this_stay')
  const existing = await profileOf(database, stay.id)
  if (action === 'profile.save') {
    const row = { tenant_id: stay.tenant_id, display_name: input.displayName, avatar: input.avatar, interests: input.interests, adult_confirmed: true, discoverable: input.discoverable, nearby_on: input.nearby && input.discoverable, share_plans: input.sharePlans && input.discoverable, expires_on: stay.valid_to, updated_at: now.toISOString() }
    if (existing) {
      const { error: updateError } = await database.from('stay_profiles').update(row).eq('id', existing.id)
      if (updateError) throw updateError
    } else {
      const { error: insertError } = await database.from('stay_profiles').insert({ stay_id: stay.id, ...row }).select('id').single()
      if (insertError) throw insertError
    }
    return done({ profile: publicProfile(await profileOf(database, stay.id)) })
  }
  const me = existing
  if (!me || !me.adult_confirmed || !me.discoverable) return refuse(409, 'profile_required')
  if (action === 'people.list') return listPeople(database, me, input, now, settings)
  if (action === 'activity.join') return joinActivity(database, stay, me, settings, input, now)
  if (action === 'inbox') return inbox(database, me, now)
  if (action === 'affirm.send') return sendAffirmation(database, me, input, now)
  if (action === 'affirm.respond') return respondAffirmation(database, me, input)
  if (action === 'meet.propose') return proposeMeetup(database, me, input)
  if (action === 'meet.respond') return respondMeetup(database, me, input)
  if (action === 'block') {
    const result = await blockProfile(database, me, input.profile)
    return result.ok === false ? result : done({ blocked: true })
  }
  return reportProfile(database, stay, me, input)
}

export { profileOf }
