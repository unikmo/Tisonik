import assert from 'node:assert/strict'

process.env.STAY_LINK_SECRET = 'l'.repeat(40)
delete process.env.RESEND_API_KEY

const stays = await import('../api/_lib/stays.mjs')

// Minimal in-memory stand-in for the Supabase query builder used by the stay layer.
function fakeDatabase() {
  const tables = { hotel_stays: [], hotel_stay_submissions: [], hotel_stay_settings: [], memberships: [] }
  let serial = 0
  return {
    tables,
    rate: new Map(),
    async rpc(_name, args) {
      const key = args.p_bucket
      const hits = this.rate.get(key) || 0
      this.rate.set(key, hits + 1)
      return { data: hits + 1 <= args.p_limit, error: null }
    },
    from(name) {
      const rows = tables[name]
      const filters = []
      let countOnly = false
      let patch = null
      const run = () => rows.filter(row => filters.every(([key, value]) => row[key] === value))
      const builder = {
        select(_columns, options) { countOnly = options?.head === true; return builder },
        eq(key, value) { filters.push([key, value]); return builder },
        async maybeSingle() { return { data: run()[0] || null, error: null } },
        insert(value) {
          const duplicate = name === 'hotel_stays' && rows.some(row => row.tenant_id === value.tenant_id && row.booking_ref === value.booking_ref)
          const duplicateRating = name === 'hotel_stay_submissions' && value.kind === 'rating' && rows.some(row => row.stay_id === value.stay_id && row.kind === 'rating')
          const row = { id: `00000000-0000-4000-8000-${String(++serial).padStart(12, '0')}`, status: name === 'hotel_stays' ? 'active' : 'new', ...value }
          return { select: () => ({ single: async () => {
            if (duplicate || duplicateRating) return { data: null, error: { code: '23505' } }
            rows.push(row)
            return { data: { id: row.id }, error: null }
          } }) }
        },
        update(values) { patch = values; return builder },
        async upsert(value, options) {
          const index = rows.findIndex(row => row[options.onConflict] === value[options.onConflict])
          if (index >= 0) rows[index] = { ...rows[index], ...value }
          else rows.push(value)
          return { error: null }
        },
        then(resolve) {
          if (patch) { run().forEach(row => Object.assign(row, patch)); return resolve({ error: null }) }
          resolve(countOnly ? { count: run().length, error: null } : { data: run(), error: null })
        },
      }
      return builder
    },
  }
}

const tenant = 'tenant-1'
const database = fakeDatabase()
database.tables.hotel_stay_settings.push({ tenant_id: tenant, venue_type: 'hotel', unikmo_hotel_id: 'HOTEL-001', hotel_name: 'Hotel Test', reception_email: 'Reception@Hotel.example', manager_email: 'director@hotel.example', default_window_days: 14, discover_items: [{ title: 'Spa', body: 'Book at reception' }] })

// UNIKMO session contract. UNIKMO owns the card code; Tisonik never issues, stores or checks one.
const during = new Date('2026-11-12T10:00:00Z')
const unikmoBody = { hotelId: 'HOTEL-001', guestReference: 'BK-1001', stayStartsAt: '2026-11-10T14:00:00.000Z', stayEndsAt: '2026-11-14T11:00:00.000Z', cardCode: 'UNIKMO-OWN-FORMAT-123', room: '204', firstName: 'Sam' }
const parse = value => stays.unikmoSessionSchema.safeParse(value).success
assert.equal(parse(unikmoBody), true)
assert.equal(parse({ hotelId: 'HOTEL-001', guestReference: 'BK-1', stayEndsAt: '2026-11-14T11:00:00.000Z' }), true, 'the app path sends no card code')
assert.equal(parse({ ...unikmoBody, extra: 1 }), false, 'unknown fields are rejected')
assert.equal(parse({ ...unikmoBody, stayEndsAt: 'not a date' }), false)
assert.equal(parse({ hotelId: 'HOTEL-001', guestReference: 'BK-1' }), false, 'the end date is required')
assert.equal(parse({ ...unikmoBody, source: 'phone' }), false)

const first = await stays.resolveUnikmoSession(database, unikmoBody, during)
assert.equal(first.ok, true)
assert.equal(first.source, 'card', 'a call with a card code is a card session')
assert.match(first.url, /^https:\/\/tisonik\.com\/stay\/#t=[\w-]+\.[\w-]+$/)
assert.equal(database.tables.hotel_stays.length, 1, 'the stay is created on the first call')
const stay = database.tables.hotel_stays[0]
assert.deepEqual([stay.booking_ref, stay.room, stay.guest_label, stay.valid_from, stay.valid_to, stay.window_days], ['BK-1001', '204', 'Sam', '2026-11-10', '2026-11-14', 14])
assert.ok(!JSON.stringify(stay).includes('UNIKMO-OWN-FORMAT'), 'the card code is never stored')
assert.ok(!Buffer.from(first.url.split('#t=')[1].split('.')[0], 'base64url').toString().includes('1001'), 'link carries no guest reference')

const appCall = await stays.resolveUnikmoSession(database, { hotelId: 'HOTEL-001', guestReference: 'BK-1001', stayEndsAt: '2026-11-14T11:00:00.000Z' }, during)
assert.equal(appCall.source, 'app', 'a call without a card code is an app session')
assert.equal(database.tables.hotel_stays.length, 1, 'the same guest reference is the same stay, however they arrive')
assert.deepEqual([stay.app_sessions, stay.card_sessions], [1, 1])
assert.equal(stay.room, '204', 'details UNIKMO leaves out are kept')
assert.equal((await stays.resolveUnikmoSession(database, { ...unikmoBody, source: 'app' }, during)).source, 'app', 'an explicit source wins')

assert.equal(stays.unikmoSessionSchema.parse(unikmoBody).hotelId, 'HOTEL-001')
await stays.resolveUnikmoSession(database, { hotelId: 'HOTEL-001', guestReference: 'BK-EXT', stayEndsAt: '2026-11-14T11:00:00.000Z' }, during)
await stays.resolveUnikmoSession(database, { hotelId: 'HOTEL-001', guestReference: 'BK-EXT', stayEndsAt: '2026-11-16T11:00:00.000Z' }, during)
assert.equal(database.tables.hotel_stays.find(row => row.booking_ref === 'BK-EXT').valid_to, '2026-11-16', 'UNIKMO can extend a stay')
const count = database.tables.hotel_stays.length

assert.equal((await stays.resolveUnikmoSession(database, { ...unikmoBody, hotelId: 'HOTEL-999' }, during)).ok, false, 'unmapped hotel')
assert.equal((await stays.resolveUnikmoSession(database, { ...unikmoBody, guestReference: 'BK-FAR', stayEndsAt: '2031-01-01T00:00:00.000Z' }, during)).ok, false, 'an end date years away is refused')
assert.equal((await stays.resolveUnikmoSession(database, { ...unikmoBody, guestReference: 'BK-OLD', stayEndsAt: '2026-01-01T00:00:00.000Z' }, during)).ok, false, 'a stay that closed long ago is refused')
assert.equal(database.tables.hotel_stays.length, count, 'refused calls create nothing')
assert.equal((await stays.resolveUnikmoSession(database, unikmoBody, new Date('2026-11-20T12:00:00Z'))).ok, true, 'still opens inside the after-checkout window')
assert.equal((await stays.resolveUnikmoSession(database, unikmoBody, new Date('2026-12-30T12:00:00Z'))).ok, false, 'closed once the window has passed')
process.env.TISONIK_PUBLIC_ORIGIN = 'http://insecure.example'
await assert.rejects(() => stays.resolveUnikmoSession(database, unikmoBody, during), /PUBLIC_ORIGIN_NOT_HTTPS/)
delete process.env.TISONIK_PUBLIC_ORIGIN

const { default: unikmoHandler } = await import('../api/integrations/unikmo/session.mjs')
const call = async (headers, secret) => {
  if (secret) process.env.UNIKMO_API_SECRET = secret; else delete process.env.UNIKMO_API_SECRET
  const out = {}
  const response = { setHeader() {}, end(body) { out.body = body }, set statusCode(value) { out.status = value } }
  await unikmoHandler({ method: 'POST', headers, async *[Symbol.asyncIterator]() { yield Buffer.from('{}') } }, response)
  return out.status
}
assert.equal(await call({}, null), 503, 'not configured')
assert.equal(await call({}, 's'.repeat(40)), 401, 'missing token')
assert.equal(await call({ authorization: 'Bearer ' + 'x'.repeat(40) }, 's'.repeat(40)), 401, 'wrong token')
assert.equal(await call({ authorization: 'Bearer ' + 's'.repeat(40) }, 's'.repeat(40)), 400, 'right token, empty body')

// Tokens
const token = first.url.split('#t=')[1]
assert.ok(stays.verifyStayToken(token, during.getTime()))
assert.equal(stays.verifyStayToken(token + 'x', during.getTime()), null)
assert.equal(stays.verifyStayToken(token, during.getTime() + 16 * 60_000), null, 'a link expires after 15 minutes')
assert.equal(stays.verifyStayToken(token, during.getTime(), 'session'), null, 'a link is not a session')

// Link -> cookie session exchange
const exchanged = await stays.exchangeLink(database, token, during)
assert.ok(exchanged, 'a fresh link can be exchanged')
assert.ok(stays.verifyStayToken(exchanged.token, during.getTime(), 'session'))
assert.equal(stays.verifyStayToken(exchanged.token, during.getTime(), 'link'), null, 'a session cannot be exchanged again')
assert.equal(await stays.exchangeLink(database, exchanged.token, during), null, 'only links can be exchanged')
assert.equal(await stays.exchangeLink(database, token, new Date(during.getTime() + 16 * 60_000)), null, 'an old link cannot be exchanged')
// Valid to 14 Nov + 14 day window + 1 day = ends 29 Nov 00:00 UTC
assert.equal(exchanged.maxAge, Math.floor((Date.parse('2026-11-29T00:00:00Z') - during.getTime()) / 1000), 'session lasts to the end of the after-checkout window')
assert.ok(stays.verifyStayToken(exchanged.token, Date.parse('2026-11-28T12:00:00Z')), 'still valid after checkout, inside the window')
assert.equal(stays.verifyStayToken(exchanged.token, Date.parse('2026-11-29T01:00:00Z')), null, 'dead once the window closes')
assert.equal(stays.signSessionToken(stay, Date.parse('2026-12-30T00:00:00Z')), null, 'no session for a closed stay')
const cookie = stays.sessionCookie(exchanged.token, exchanged.maxAge)
assert.match(cookie, /HttpOnly; Secure; SameSite=Strict$/)
assert.equal(stays.readCookie({ headers: { cookie: 'a=1; tsk_stay=' + exchanged.token + '; b=2' } }, 'tsk_stay'), exchanged.token)
assert.equal(stays.guestToken({ headers: { cookie: 'tsk_stay=COOKIE' } }, { token: 'BODY' }), 'COOKIE', 'cookie wins over body token')
assert.equal(stays.guestToken({ headers: {} }, { token: 'BODY' }), 'BODY')
const countersBefore = [stay.app_sessions, stay.card_sessions]
stay.status = 'voided'
assert.equal(await stays.exchangeLink(database, token, during), null, 'a voided stay cannot be exchanged')
assert.equal((await stays.resolveUnikmoSession(database, unikmoBody, during)).ok, false, 'a voided stay stays voided, even when UNIKMO calls again')
assert.equal(stay.status, 'voided')
assert.deepEqual([stay.app_sessions, stay.card_sessions], countersBefore, 'counters do not move for a voided stay')
stay.status = 'active'

// Phases and tiles
const tilesAt = date => stays.tilesFor(stay, new Date(date))
assert.equal(tilesAt('2026-11-09T12:00:00Z').phase, 'before')
assert.deepEqual([tilesAt('2026-11-09T12:00:00Z').thankYou, tilesAt('2026-11-09T12:00:00Z').private], [false, false])
assert.deepEqual([tilesAt('2026-11-12T12:00:00Z').thankYou, tilesAt('2026-11-12T12:00:00Z').private, tilesAt('2026-11-12T12:00:00Z').rating], [true, true, false])
assert.equal(tilesAt('2026-11-14T12:00:00Z').rating, true, 'rating opens on the last day')
const after = tilesAt('2026-11-20T12:00:00Z')
assert.deepEqual([after.phase, after.private, after.feedback, after.rating, after.thankYou], ['after_checkout', false, true, true, true])
const closed = tilesAt('2026-12-01T12:00:00Z')
assert.deepEqual([closed.phase, closed.thankYou, closed.rating, closed.feedback, closed.keepsake], ['closed', false, false, false, true])

// Submissions
const lastDay = new Date('2026-11-14T12:00:00Z')
const scores = { check_in: 9, room: 8, team: 10, recovery: 7, recommend: 9 }
assert.equal((await stays.submitToStay(database, stay, 'private', { message: 'The air conditioning is loud.' }, lastDay)).ok, true)
assert.equal((await stays.submitToStay(database, stay, 'feedback', { message: 'Too late for this.' }, lastDay)).status, 409, 'feedback is closed during the stay')
assert.equal((await stays.submitToStay(database, stay, 'rating', { scores: { ...scores, room: 11 } }, lastDay)).status, 422)
assert.equal((await stays.submitToStay(database, stay, 'rating', { scores: { check_in: 9 } }, lastDay)).status, 422, 'the required questions must all be answered')
assert.equal((await stays.submitToStay(database, stay, 'rating', { scores: { ...scores, recovery: 11 } }, lastDay)).status, 422)
const { recovery: _skipped, ...withoutRecovery } = scores
assert.equal(stays.submissionSchemas.rating.safeParse({ scores: withoutRecovery }).success, true, 'question 4 can be skipped')
const { room: _room, ...withoutRoom } = scores
assert.equal(stays.submissionSchemas.rating.safeParse({ scores: withoutRoom }).success, false, 'question 2 cannot')
assert.equal((await stays.submitToStay(database, stay, 'rating', { scores, comment: 'Lovely stay.' }, lastDay)).ok, true)
assert.equal((await stays.submitToStay(database, stay, 'rating', { scores }, lastDay)).status, 429, 'one rating per stay')
assert.equal((await stays.submitToStay(database, stay, 'thank_you', { recipient: 'Maria at the front desk', message: 'Made us feel special.' }, lastDay)).ok, true)
assert.equal((await stays.submitToStay(database, stay, 'nope', {}, lastDay)).status, 422)
const lateNote = await stays.submitToStay(database, stay, 'private', { message: 'After checkout.' }, new Date('2026-11-20T12:00:00Z'))
assert.equal(lateNote.status, 409, 'private messages close at checkout')
assert.equal((await stays.submitToStay(database, stay, 'feedback', { message: 'Thanks for a good stay.' }, new Date('2026-11-20T12:00:00Z'))).ok, true)
assert.equal((await stays.submitToStay(database, stay, 'thank_you', { message: 'Too late.' }, new Date('2026-12-01T12:00:00Z'))).status, 409, 'closed after the window')

// Guest page data
const session = await stays.guestSession(database, stay, lastDay)
assert.equal(session.hotelName, 'Hotel Test')
assert.equal(session.venueType, 'hotel')
assert.equal(session.tiles.rating, false, 'rating is hidden once submitted')
assert.equal(session.questions.length, 5)
assert.equal(session.questions[1].text, 'How comfortable and clean was your room?')
assert.equal(session.questions.filter(question => question.optional).length, 1, 'only one question is skippable')
assert.equal(session.discover.length, 1)

// Portal actions (signed-in staff)
const { portalAction } = await import('../api/_lib/stays-portal.mjs')
const tenantUuid = '11111111-1111-4111-8111-111111111111'
const otherUuid = '22222222-2222-4222-8222-222222222222'
database.tables.memberships.push(
  { tenant_id: tenantUuid, user_id: 'admin', role: 'operator_admin' },
  { tenant_id: tenantUuid, user_id: 'analyst', role: 'operator_analyst' },
  { tenant_id: tenantUuid, user_id: 'viewer', role: 'operator_viewer' },
  { tenant_id: tenantUuid, user_id: 'desk', role: 'front_desk' },
)
const createStay = { action: 'create', tenantId: tenantUuid, data: { bookingRef: 'BK-2002', validFrom: '2026-12-01', validTo: '2026-12-03' } }
assert.equal((await portalAction(database, 'admin', createStay)).status, 422, 'nobody creates stays in the portal: they come from UNIKMO')
assert.equal((await portalAction(database, 'viewer', { action: 'status', tenantId: tenantUuid, data: { submissionId: '33333333-3333-4333-8333-333333333333', status: 'seen' } })).status, 403)
assert.equal((await portalAction(database, 'admin', { action: 'status', tenantId: otherUuid, data: { submissionId: '33333333-3333-4333-8333-333333333333', status: 'seen' } })).status, 403, 'no access to another hotel')
assert.equal((await portalAction(database, 'stranger', { action: 'status', tenantId: tenantUuid, data: { submissionId: '33333333-3333-4333-8333-333333333333', status: 'seen' } })).status, 403)

const inboxRow = database.tables.hotel_stay_submissions[0]
const marked = await portalAction(database, 'analyst', { action: 'status', tenantId: tenantUuid, data: { submissionId: inboxRow.id, status: 'resolved' } })
assert.equal(marked.status, 200)
assert.equal(database.tables.hotel_stay_submissions.find(row => row.id === inboxRow.id).status, 'new', 'ids from the stub tenant do not match this hotel, so nothing changes')
inboxRow.tenant_id = tenantUuid
await portalAction(database, 'analyst', { action: 'status', tenantId: tenantUuid, data: { submissionId: inboxRow.id, status: 'resolved' } })
assert.equal(inboxRow.status, 'resolved')
assert.equal((await portalAction(database, 'desk', { action: 'status', tenantId: tenantUuid, data: { submissionId: inboxRow.id, status: 'seen' } })).status, 200, 'front desk can work the inbox')

const shipSettings = { action: 'settings', tenantId: tenantUuid, data: { venueType: 'ship', hotelName: 'MS Test', unikmoHotelId: 'SHIP-001', receptionEmail: 'desk@ship.example', managerEmail: 'hoteldirector@ship.example', defaultWindowDays: 10, discoverItems: [{ title: 'Spa', body: 'Deck 12' }] } }
assert.equal((await portalAction(database, 'admin', shipSettings)).status, 200)
const shipRow = database.tables.hotel_stay_settings.find(row => row.tenant_id === tenantUuid)
assert.deepEqual([shipRow.venue_type, shipRow.default_window_days, shipRow.unikmo_hotel_id], ['ship', 10, 'SHIP-001'])
assert.equal((await portalAction(database, 'admin', { ...shipSettings, data: { ...shipSettings.data, venueType: 'castle' } })).status, 422, 'venue type is hotel or ship')
assert.equal((await portalAction(database, 'admin', { action: 'settings', tenantId: tenantUuid, data: { receptionEmail: 'not-an-email', defaultWindowDays: 10, discoverItems: [] } })).status, 422)
assert.equal((await portalAction(database, 'analyst', shipSettings)).status, 403, 'analysts cannot change settings')
assert.equal((await portalAction(database, 'desk', shipSettings)).status, 403, 'front desk cannot change settings')

// A ship: same endpoint, same stay record, ship wording
const sailing = await stays.resolveUnikmoSession(database, { hotelId: 'SHIP-001', guestReference: 'CABIN-7731', stayEndsAt: '2026-12-08T08:00:00.000Z', stayStartsAt: '2026-12-01T16:00:00.000Z', room: '8042' }, new Date('2026-12-03T12:00:00Z'))
assert.equal(sailing.ok, true)
const shipStay = database.tables.hotel_stays.find(row => row.booking_ref === 'CABIN-7731')
assert.equal(shipStay.tenant_id, tenantUuid)
assert.equal(shipStay.window_days, 10, 'window defaults from the ship\'s settings')
assert.equal(shipStay.app_sessions, 1, 'no card code means an app session')
const shipGuest = await stays.guestSession(database, shipStay, new Date('2026-12-08T09:00:00Z'))
assert.equal(shipGuest.venueType, 'ship')
assert.equal(shipGuest.questions[0].text, 'How was your embarkation?')
assert.equal(shipGuest.questions[1].text, 'How comfortable and clean was your cabin?')
assert.equal(shipGuest.questions[2].text, 'How warm and helpful was our crew?')
assert.deepEqual(shipGuest.questions.map(question => question.id), session.questions.map(question => question.id), 'same question ids, so scores compare')
assert.equal(shipGuest.tiles.rating, true)

const voidResult = await portalAction(database, 'admin', { action: 'void', tenantId: tenantUuid, data: { stayId: shipStay.id } })
assert.equal(voidResult.status, 200)
assert.equal(shipStay.status, 'voided')
assert.equal((await portalAction(database, 'desk', { action: 'void', tenantId: tenantUuid, data: { stayId: shipStay.id } })).status, 403, 'front desk cannot void')
assert.equal((await stays.resolveUnikmoSession(database, { hotelId: 'SHIP-001', guestReference: 'CABIN-7731', stayEndsAt: '2026-12-08T08:00:00.000Z' }, new Date('2026-12-03T12:00:00Z'))).ok, false, 'a voided stay stops opening')

// A voided stay stops working at once
stay.status = 'voided'
assert.equal((await stays.submitToStay(database, stay, 'thank_you', { message: 'Still here?' }, during)).status, 409)
stay.status = 'active'

// Notifications: reception gets everything; the hotel director gets ratings only
process.env.RESEND_API_KEY = 'test-key'
process.env.TISONIK_ENQUIRY_FROM = 'Tisonik <notifications@example.test>'
let sentMail = []
globalThis.fetch = async (_url, options) => { sentMail.push(JSON.parse(options.body)); return { ok: true } }
const mailStay = { tenant_id: tenant, booking_ref: 'BK-1001', room: '204', guest_label: 'Sam', valid_from: '2026-11-10', valid_to: '2026-11-14' }
const lowRating = await stays.notifyHotel(database, mailStay, 'rating', { scores: { check_in: 9, room: 4, team: 10, recommend: 8 }, comment: 'Noisy room.' }, 'ref-1')
assert.deepEqual([lowRating.sent, lowRating.recipients], [true, 2])
assert.deepEqual(sentMail[0].to.sort(), ['director@hotel.example', 'reception@hotel.example'])
assert.equal(sentMail[0].subject, 'LOW SCORE - Stay rating - booking BK-1001 - average 7.8')
assert.ok(sentMail[0].text.includes('Room: 204'))
assert.ok(sentMail[0].text.includes('!! 4/10  How comfortable and clean was your room?'), 'low scores are marked')
assert.ok(sentMail[0].text.includes('skipped  If something needed fixing'), 'a skipped question is shown as skipped')
assert.ok(sentMail[0].text.includes('Noisy room.'))
sentMail = []
await stays.notifyHotel(database, mailStay, 'rating', { scores: { check_in: 9, room: 9, team: 10, recovery: 9, recommend: 10 } }, 'ref-2')
assert.ok(!sentMail[0].subject.includes('LOW SCORE'), 'a good rating is not flagged')
for (const kind of ['private', 'feedback', 'thank_you']) {
  sentMail = []
  await stays.notifyHotel(database, mailStay, kind, { message: 'Hello there.' }, 'ref-3')
  assert.deepEqual(sentMail[0].to, ['reception@hotel.example'], kind + ' goes to reception only')
}
sentMail = []
await stays.notifyHotel(database, { ...mailStay, tenant_id: tenantUuid, booking_ref: 'CABIN-7731', room: '8042' }, 'rating', { scores: { check_in: 9, room: 3, team: 9, recommend: 9 } }, 'ref-ship')
assert.deepEqual(sentMail[0].to.sort(), ['desk@ship.example', 'hoteldirector@ship.example'], 'a ship routes the same way: guest services and the hotel director')
assert.ok(sentMail[0].text.includes('Cabin: 8042') && sentMail[0].text.includes('Voyage:'), 'ship wording in the email')
assert.ok(sentMail[0].text.includes('!! 3/10  How comfortable and clean was your cabin?'))
database.tables.hotel_stay_settings[0].manager_email = 'RECEPTION@hotel.example'
sentMail = []
await stays.notifyHotel(database, mailStay, 'rating', { scores: { check_in: 9, room: 9, team: 9, recommend: 9 } }, 'ref-4')
assert.equal(sentMail[0].to.length, 1, 'one person listed twice gets one email')
database.tables.hotel_stay_settings[0].manager_email = 'director@hotel.example'
database.tables.hotel_stay_settings[0].reception_email = null
sentMail = []
await stays.notifyHotel(database, mailStay, 'private', { message: 'Reception has no address.' }, 'ref-4b')
assert.deepEqual(sentMail[0].to, ['director@hotel.example'], 'the manager covers if reception has no address')
database.tables.hotel_stay_settings[0].manager_email = null
sentMail = []
assert.equal((await stays.notifyHotel(database, mailStay, 'private', { message: 'Nobody set.' }, 'ref-5')).sent, false)
assert.equal(sentMail.length, 0, 'no recipients, no email')
database.tables.hotel_stay_settings[0].manager_email = 'director@hotel.example'
globalThis.fetch = async () => { throw new Error('mail provider down') }
assert.deepEqual(await stays.notifyHotel(database, mailStay, 'private', { message: 'Provider down.' }, 'ref-6'), { sent: false }, 'a mail failure never throws')
delete process.env.RESEND_API_KEY
database.tables.hotel_stay_settings[0].reception_email = 'reception@hotel.example'

// Rate limiting: UNIKMO calls are counted per hotel; guest endpoints per client
const limited = fakeDatabase()
limited.tables.hotel_stay_settings.push({ tenant_id: 'tenant-rl', unikmo_hotel_id: 'RL-1', default_window_days: 14 })
const rlBody = { hotelId: 'RL-1', guestReference: 'G-1', stayEndsAt: '2026-11-14T11:00:00.000Z' }
for (let attempt = 0; attempt < 240; attempt += 1) assert.equal((await stays.resolveUnikmoSession(limited, rlBody, during)).ok, true)
assert.equal((await stays.resolveUnikmoSession(limited, rlBody, during)).limited, true, 'the 241st call in a minute is refused')
const rl = await import('../api/_lib/rate-limit.mjs')
const guestDb = fakeDatabase()
for (let i = 0; i < 20; i += 1) assert.equal(await rl.overLimit(guestDb, 'submit:x', 60, 20), false)
assert.equal(await rl.overLimit(guestDb, 'submit:x', 60, 20), true, 'the 21st hit in a window is refused')
assert.equal(rl.clientKey({ headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } }).length, 32)
assert.ok(!rl.clientKey({ headers: { 'x-real-ip': '203.0.113.9' } }).includes('203'), 'raw addresses are not stored')
const broken = { rpc: async () => ({ data: null, error: new Error('db down') }) }
assert.equal(await rl.overLimit(broken, 'b', 60, 1), false, 'a broken limiter never blocks guests')

console.log('Hotel and ship stay layer contract passed.')
