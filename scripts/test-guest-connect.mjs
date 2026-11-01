import assert from 'node:assert/strict'

process.env.STAY_CODE_PEPPER = 'p'.repeat(40)
process.env.STAY_LINK_SECRET = 'l'.repeat(40)
delete process.env.RESEND_API_KEY

const stays = await import('../api/_lib/stays.mjs')
const { connectAction } = await import('../api/_lib/stay-connect.mjs')
const { featuresFor, crewItemsFromLines, nameIsSafe } = await import('../api/_lib/stay-connect-config.mjs')

// In-memory stand-in for the Supabase query builder, with the unique rules of the guest-connect tables.
const unique = {
  stay_profiles: [['stay_id']],
  stay_affirmations: [['from_profile', 'to_profile', 'service_date']],
  stay_blocks: [['blocker_profile', 'blocked_profile']],
  crew_recognitions: [['stay_id', 'crew_id', 'service_date']],
  stay_pulses: [['stay_id', 'department', 'service_date']],
}
function fakeDatabase() {
  const tables = { hotel_stay_settings: [], hotel_stay_submissions: [], stay_profiles: [], stay_affirmations: [], stay_meetups: [], stay_blocks: [], crew_recognitions: [], stay_pulses: [] }
  let serial = 0
  return {
    tables,
    from(name) {
      const rows = tables[name]
      const filters = []
      let countOnly = false
      let patch = null
      let cap = Infinity
      const run = () => rows.filter(row => filters.every(test => test(row))).slice(0, cap)
      const builder = {
        select(_columns, options) { countOnly = options?.head === true; return builder },
        eq(key, value) { filters.push(row => row[key] === value); return builder },
        in(key, values) { filters.push(row => values.includes(row[key])); return builder },
        limit(value) { cap = value; return builder },
        async maybeSingle() { return { data: run()[0] || null, error: null } },
        insert(value) {
          const row = { id: `00000000-0000-4000-8000-${String(++serial).padStart(12, '0')}`, status: name === 'stay_affirmations' ? 'sent' : name === 'stay_meetups' ? 'proposed' : 'new', created_at: `2026-11-12T10:00:${String(serial).padStart(2, '0')}Z`, ...value }
          const clash = (unique[name] || []).some(keys => rows.some(other => keys.every(key => other[key] === row[key])))
            || (name === 'stay_meetups' && row.status === 'proposed' && rows.some(other => other.affirmation_id === row.affirmation_id && other.status === 'proposed'))
          return { select: () => ({ single: async () => {
            if (clash) return { data: null, error: { code: '23505' } }
            rows.push(row)
            return { data: { id: row.id, blocker_profile: row.blocker_profile }, error: null }
          } }) }
        },
        update(values) { patch = values; return builder },
        then(resolve) {
          if (patch) { run().forEach(row => Object.assign(row, patch)); return resolve({ error: null }) }
          resolve(countOnly ? { count: run().length, error: null } : { data: run(), error: null })
        },
      }
      return builder
    },
  }
}

const tenant = 'tenant-ship'
const database = fakeDatabase()
database.tables.hotel_stay_settings.push({ tenant_id: tenant, venue_type: 'ship', hotel_name: 'MS Test', crew_items: crewItemsFromLines([{ name: 'Rosa Diaz', role: 'Dining steward' }, { name: 'Rosa Diaz', role: 'Bar' }, { name: 'Ken Ito', role: 'Cabin steward' }]) })
database.tables.hotel_stay_settings.push({ tenant_id: 'tenant-hotel', venue_type: 'hotel', hotel_name: 'Hotel Test', crew_items: [] })

const day = new Date('2026-11-12T10:00:00Z')
const nextDay = new Date('2026-11-13T10:00:00Z')
const mkStay = (id, extra = {}) => ({ id, tenant_id: tenant, booking_ref: id, room: '8042', guest_label: id, valid_from: '2026-11-10', valid_to: '2026-11-18', window_days: 7, status: 'active', ...extra })
const ann = mkStay('ann'), bo = mkStay('bo'), cy = mkStay('cy'), late = mkStay('late', { valid_from: '2026-11-01', valid_to: '2026-11-05' })
const profile = (displayName, over = {}) => ({ displayName, avatar: 'coral', interests: ['food', 'trivia'], adult: true, discoverable: true, ...over })
const ok = result => { assert.equal(result.ok, true, JSON.stringify(result)); return result }
const no = (result, status, error) => { assert.equal(result.ok, false); assert.equal(result.status, status, JSON.stringify(result)); if (error) assert.equal(result.error, error) }

// Features: guest-to-guest is for ships. Hotels keep recognition and the pulse.
assert.deepEqual(featuresFor('ship'), { people: true, recognition: true, pulse: true })
assert.deepEqual(featuresFor('hotel'), { people: false, recognition: true, pulse: true })
assert.equal(nameIsSafe('Sam'), true)
for (const bad of ['call 0771234', 'sam@x.com', 'www.x', 'https://x']) assert.equal(nameIsSafe(bad), false, bad)
assert.deepEqual(crewItemsFromLines([{ name: 'Rosa Diaz' }, { name: 'Rosa Diaz' }]).map(item => item.id), ['rosa-diaz', 'rosa-diaz-2'])

// The session tells the page which features are open.
const session = await stays.guestSession(database, ann, day)
assert.equal(session.features.people, true)
assert.equal(session.connect.crew.length, 3)
assert.equal(session.connect.affirmations.length, 6)
assert.equal(session.connect.departments[0].id, 'dining')
assert.equal(session.profile, null)
const hotelSession = await stays.guestSession(database, mkStay('h1', { tenant_id: 'tenant-hotel' }), day)
assert.equal(hotelSession.features.people, false)
assert.equal(hotelSession.features.recognition, true)

// Profiles need the adult tick, safe names and known avatars and interests.
no(await connectAction(database, ann, 'profile.save', { ...profile('Ann'), adult: false }, day), 422)
no(await connectAction(database, ann, 'profile.save', profile('Ann 0771234'), day), 422)
no(await connectAction(database, ann, 'profile.save', profile('Ann', { avatar: 'hacker' }), day), 422)
no(await connectAction(database, ann, 'profile.save', profile('Ann', { interests: ['gambling'] }), day), 422)
no(await connectAction(database, ann, 'people.list', {}, day), 409, 'profile_required')
no(await connectAction(database, mkStay('h1', { tenant_id: 'tenant-hotel' }), 'profile.save', profile('Hal'), day), 409, 'not_open_for_this_stay')
no(await connectAction(database, late, 'profile.save', profile('Late'), day), 409, 'not_open_for_this_stay')
const annProfile = ok(await connectAction(database, ann, 'profile.save', profile('Ann'), day)).body.profile
const boProfile = ok(await connectAction(database, bo, 'profile.save', profile('Bo', { interests: ['food', 'music'] }), day)).body.profile
const cyProfile = ok(await connectAction(database, cy, 'profile.save', profile('Cy', { interests: ['nature'] }), day)).body.profile
assert.equal(database.tables.stay_profiles.length, 3)
assert.equal(database.tables.stay_profiles.find(row => row.stay_id === 'ann').expires_on, '2026-11-18')

// Discovery shows only opted-in guests, best shared interests first, never the guest's own card, stay or room.
const people = ok(await connectAction(database, ann, 'people.list', {}, day)).body.people
assert.deepEqual(people.map(person => person.name), ['Bo', 'Cy'])
assert.deepEqual(people[0].shared, ['food'])
assert.ok(!JSON.stringify(people).includes('8042') && !JSON.stringify(people).includes('stay_id'))
assert.deepEqual(ok(await connectAction(database, ann, 'people.list', { interest: 'nature' }, day)).body.people.map(person => person.name), ['Cy'])
ok(await connectAction(database, cy, 'profile.save', profile('Cy', { interests: ['nature'], discoverable: false }), day))
assert.deepEqual(ok(await connectAction(database, ann, 'people.list', {}, day)).body.people.map(person => person.name), ['Bo'])
ok(await connectAction(database, cy, 'profile.save', profile('Cy', { interests: ['nature'] }), day))
// After checkout the guest can no longer browse people. A guest whose own stay ended is hidden from the others.
no(await connectAction(database, ann, 'people.list', {}, new Date('2026-11-19T10:00:00Z')), 409, 'not_open_for_this_stay')
const stale = mkStay('stale', { valid_to: '2026-11-12' })
ok(await connectAction(database, stale, 'profile.save', profile('Stu'), day))
assert.ok(!ok(await connectAction(database, ann, 'people.list', {}, nextDay)).body.people.some(person => person.name === 'Stu'), 'a stay that ended yesterday is not listed')

// Compliments: preset labels only, one per pair per day, ten a day, and not to a guest who is not visible.
no(await connectAction(database, ann, 'affirm.send', { to: boProfile.id, label: 'You are ugly' }, day), 422)
no(await connectAction(database, ann, 'affirm.send', { to: annProfile.id, label: 'kind' }, day), 404, 'not_available')
no(await connectAction(database, ann, 'affirm.send', { to: '99999999-9999-4999-8999-999999999999', label: 'kind' }, day), 404, 'not_available')
ok(await connectAction(database, ann, 'affirm.send', { to: boProfile.id, label: 'laugh' }, day))
no(await connectAction(database, ann, 'affirm.send', { to: boProfile.id, label: 'kind' }, day), 429, 'already_sent_today')
ok(await connectAction(database, ann, 'affirm.send', { to: boProfile.id, label: 'kind' }, nextDay))

// Bo sees it, can ignore or acknowledge. Ann is never told about an ignore.
const boInbox = ok(await connectAction(database, bo, 'inbox', {}, day)).body.items.filter(item => item.label === 'You made us laugh')
assert.equal(boInbox.length, 1)
assert.equal(boInbox[0].label, 'You made us laugh')
assert.equal(boInbox[0].other.name, 'Ann')
no(await connectAction(database, ann, 'affirm.respond', { id: boInbox[0].id, response: 'acknowledge' }, day), 404, 'not_found')
// No meetup before the recipient has answered.
no(await connectAction(database, ann, 'meet.propose', { affirmationId: boInbox[0].id, place: 'bar' }, day), 409, 'not_acknowledged')
ok(await connectAction(database, bo, 'affirm.respond', { id: boInbox[0].id, response: 'acknowledge' }, day))
no(await connectAction(database, bo, 'affirm.respond', { id: boInbox[0].id, response: 'ignore' }, day), 409, 'already_answered')

// Meetups: public places only, one open proposal, answered by the other guest.
no(await connectAction(database, ann, 'meet.propose', { affirmationId: boInbox[0].id, place: 'my cabin' }, day), 422)
no(await connectAction(database, cy, 'meet.propose', { affirmationId: boInbox[0].id, place: 'bar' }, day), 404, 'not_found')
ok(await connectAction(database, ann, 'meet.propose', { affirmationId: boInbox[0].id, place: 'bar' }, day))
no(await connectAction(database, bo, 'meet.propose', { affirmationId: boInbox[0].id, place: 'coffee' }, day), 409, 'proposal_open')
const proposed = ok(await connectAction(database, bo, 'inbox', {}, day)).body.items.find(item => item.id === boInbox[0].id)
assert.equal(proposed.meetup.place, 'A drink at the bar')
assert.equal(proposed.meetup.byMe, false)
no(await connectAction(database, ann, 'meet.respond', { id: proposed.meetup.id, response: 'accept' }, day), 404, 'not_found')
ok(await connectAction(database, bo, 'meet.respond', { id: proposed.meetup.id, response: 'accept' }, day))
assert.equal(ok(await connectAction(database, ann, 'inbox', {}, day)).body.items.find(item => item.id === boInbox[0].id).meetup.status, 'accepted')

// An ignored compliment looks like "sent" to the sender and does not show for the recipient.
ok(await connectAction(database, ann, 'affirm.send', { to: cyProfile.id, label: 'energy' }, day))
const cyInbox = ok(await connectAction(database, cy, 'inbox', {}, day)).body.items
ok(await connectAction(database, cy, 'affirm.respond', { id: cyInbox[0].id, response: 'ignore' }, day))
assert.equal(ok(await connectAction(database, cy, 'inbox', {}, day)).body.items.length, 0)
assert.equal(ok(await connectAction(database, ann, 'inbox', {}, day)).body.items.find(item => item.label === 'Great energy').status, 'sent')

// Blocking hides both ways and ends proposals. Reporting blocks and tells the desk.
ok(await connectAction(database, cy, 'block', { profile: annProfile.id }, day))
assert.ok(!ok(await connectAction(database, ann, 'people.list', {}, day)).body.people.some(person => person.name === 'Cy'), 'blocker is hidden from the blocked guest')
assert.ok(!ok(await connectAction(database, cy, 'people.list', {}, day)).body.people.some(person => person.name === 'Ann'))
no(await connectAction(database, ann, 'affirm.send', { to: cyProfile.id, label: 'kind' }, nextDay), 404, 'not_available')
ok(await connectAction(database, ann, 'block', { profile: cyProfile.id }, day))
const report = ok(await connectAction(database, bo, 'report', { profile: annProfile.id, reason: 'behaviour' }, day))
assert.equal(report.notify.kind, 'report')
assert.equal(database.tables.hotel_stay_submissions.at(-1).kind, 'report')
assert.ok(!ok(await connectAction(database, bo, 'people.list', {}, day)).body.people.some(person => person.name === 'Ann'))
// A guest from another sailing cannot be reached.
const other = mkStay('elsewhere', { tenant_id: 'other-ship' })
database.tables.hotel_stay_settings.push({ tenant_id: 'other-ship', venue_type: 'ship', crew_items: [] })
ok(await connectAction(database, other, 'profile.save', profile('Zed'), day))
no(await connectAction(database, bo, 'affirm.send', { to: database.tables.stay_profiles.find(row => row.stay_id === 'elsewhere').id, label: 'kind' }, day), 404, 'not_available')

// Daily compliment cap.
for (let i = 0; i < 12; i += 1) database.tables.stay_profiles.push({ id: `00000000-0000-4000-8000-9${String(i).padStart(11, '0')}`, stay_id: `x${i}`, tenant_id: tenant, display_name: `G${i}`, avatar: 'sky', interests: [], adult_confirmed: true, discoverable: true, expires_on: '2026-11-18' })
let capped = 0
for (let i = 0; i < 12; i += 1) {
  const result = await connectAction(database, bo, 'affirm.send', { to: `00000000-0000-4000-8000-9${String(i).padStart(11, '0')}`, label: 'kind' }, nextDay)
  if (!result.ok && result.error === 'daily_limit') capped += 1
}
assert.ok(capped >= 2, 'ten a day, then refused')

// Crew recognition: only crew the venue listed, one or two preset reasons, once per crew member per day. Works for hotels too.
const crewIds = database.tables.hotel_stay_settings[0].crew_items.map(item => item.id)
assert.deepEqual(crewIds, ['rosa-diaz', 'rosa-diaz-2', 'ken-ito'])
no(await connectAction(database, ann, 'crew.recognise', { crewId: 'nobody', reasons: ['welcome'] }, day), 404, 'not_found')
no(await connectAction(database, ann, 'crew.recognise', { crewId: 'ken-ito', reasons: [] }, day), 422)
no(await connectAction(database, ann, 'crew.recognise', { crewId: 'ken-ito', reasons: ['welcome', 'beyond', 'solved'] }, day), 422)
no(await connectAction(database, ann, 'crew.recognise', { crewId: 'ken-ito', reasons: ['made up'] }, day), 422)
const recognised = ok(await connectAction(database, ann, 'crew.recognise', { crewId: 'ken-ito', reasons: ['welcome', 'beyond'] }, day))
assert.equal(recognised.notify.kind, 'recognition')
assert.deepEqual(recognised.notify.payload.reasons, ['Made us feel welcome', 'Went above and beyond'])
no(await connectAction(database, ann, 'crew.recognise', { crewId: 'ken-ito', reasons: ['solved'] }, day), 429, 'already_recognised_today')
ok(await connectAction(database, ann, 'crew.recognise', { crewId: 'ken-ito', reasons: ['solved'] }, nextDay))
ok(await connectAction(database, ann, 'crew.recognise', { crewId: 'rosa-diaz', reasons: ['exceptional'] }, day))
// After checkout it still works for a while; before arrival it does not.
ok(await connectAction(database, ann, 'crew.recognise', { crewId: 'rosa-diaz-2', reasons: ['family'] }, new Date('2026-11-20T10:00:00Z')))
no(await connectAction(database, mkStay('soon', { valid_from: '2026-12-01', valid_to: '2026-12-08' }), 'crew.recognise', { crewId: 'ken-ito', reasons: ['welcome'] }, day), 409, 'not_open_for_this_stay')
const hotelStay = mkStay('h2', { tenant_id: 'tenant-hotel' })
database.tables.hotel_stay_settings[1].crew_items = crewItemsFromLines([{ name: 'Mia Park', role: 'Concierge' }])
ok(await connectAction(database, hotelStay, 'crew.recognise', { crewId: 'mia-park', reasons: ['welcome'] }, day))
const guestToGuest = { 'people.list': {}, inbox: {}, block: { profile: boProfile.id }, report: { profile: boProfile.id, reason: 'other' }, 'affirm.send': { to: boProfile.id, label: 'kind' }, 'profile.save': profile('Hal') }
for (const [action, data] of Object.entries(guestToGuest)) no(await connectAction(database, hotelStay, action, data, day), 409, 'not_open_for_this_stay')

// Daily pulse: the venue's own departments, 1 to 10, once per department per day. Low scores alert the desk, high ones invite recognition.
no(await connectAction(database, ann, 'pulse.submit', { department: 'spa_pool', score: 8 }, day), 422)
no(await connectAction(database, ann, 'pulse.submit', { department: 'dining', score: 11 }, day), 422)
no(await connectAction(database, ann, 'pulse.submit', { department: 'dining', score: 0 }, day), 422)
const high = ok(await connectAction(database, ann, 'pulse.submit', { department: 'dining', score: 9 }, day))
assert.equal(high.body.low, false)
assert.equal(high.body.askRecognition, true)
assert.equal(high.notify, null)
no(await connectAction(database, ann, 'pulse.submit', { department: 'dining', score: 4 }, day), 429, 'already_scored_today')
const low = ok(await connectAction(database, ann, 'pulse.submit', { department: 'stateroom', score: 4 }, day))
assert.equal(low.body.low, true)
assert.equal(low.notify.kind, 'pulse')
ok(await connectAction(database, ann, 'pulse.submit', { department: 'dining', score: 7 }, nextDay))
ok(await connectAction(database, hotelStay, 'pulse.submit', { department: 'spa_pool', score: 8 }, day))
no(await connectAction(database, ann, 'pulse.submit', { department: 'dining', score: 7 }, new Date('2026-11-20T10:00:00Z')), 409, 'not_open_for_this_stay')

// Desk email: a low pulse is flagged, a high one is not sent, reports and recognition are labelled.
process.env.RESEND_API_KEY = 're_test'
process.env.TISONIK_ENQUIRY_FROM = 'Tisonik <noreply@tisonik.test>'
const mails = []
globalThis.fetch = async (_url, init) => { mails.push(JSON.parse(init.body)); return { ok: true } }
database.tables.hotel_stay_settings[0].reception_email = 'desk@ship.test'
assert.equal((await stays.notifyHotel(database, ann, 'pulse', { department: 'Stateroom', score: 4 }, 'r1')).sent, true)
assert.match(mails.at(-1).subject, /LOW SCORE/)
assert.match(mails.at(-1).text, /Department: Stateroom/)
assert.equal((await stays.notifyHotel(database, ann, 'pulse', { department: 'Dining', score: 9 }, 'r2')).sent, false)
await stays.notifyHotel(database, ann, 'recognition', { crewName: 'Ken Ito', crewRole: 'Cabin steward', reasons: ['Solved a problem'] }, 'r3')
assert.match(mails.at(-1).text, /Crew member: Ken Ito \(Cabin steward\)/)
await stays.notifyHotel(database, ann, 'report', { about: 'Ann', message: 'Behaviour felt wrong' }, 'r4')
assert.match(mails.at(-1).subject, /reported another guest/)
assert.ok(!mails.at(-1).text.includes('undefined'))

console.log('guest connect checks passed')
