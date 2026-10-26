import assert from 'node:assert/strict'

process.env.STAY_CODE_PEPPER = 'p'.repeat(40)
process.env.STAY_LINK_SECRET = 'l'.repeat(40)
delete process.env.RESEND_API_KEY

const stays = await import('../api/_lib/stays.mjs')

// Minimal in-memory stand-in for the Supabase query builder used by the stay layer.
function fakeDatabase() {
  const tables = { hotel_stays: [], hotel_stay_submissions: [], hotel_stay_settings: [], memberships: [] }
  let serial = 0
  return {
    tables,
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
          const duplicate = name === 'hotel_stays' && rows.some(row => row.tenant_id === value.tenant_id && row.code_digest === value.code_digest)
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
database.tables.hotel_stay_settings.push({ tenant_id: tenant, hotel_name: 'Hotel Test', default_window_days: 14, discover_items: [{ title: 'Spa', body: 'Book at reception' }] })

// Codes
const code = stays.generateStayCode()
assert.match(code, /^[2-9A-HJKMNP-Z]{8}$/)
assert.equal(stays.normalizeCode(stays.displayCode(code).toLowerCase()), code)
assert.equal(stays.normalizeCode('ABC0EFGH'), null, 'zero is not in the alphabet')
assert.equal(stays.normalizeCode('short'), null)
assert.notEqual(stays.codeDigest('a', code), stays.codeDigest('b', code), 'digest is scoped to the hotel')

// Create + resolve
const created = await stays.createStay(database, tenant, { bookingRef: 'BK-1001', validFrom: '2026-11-10', validTo: '2026-11-14', room: '204', guestLabel: 'Sam' })
assert.match(created.code, /^[2-9A-HJKMNP-Z]{8}$/)
assert.equal(database.tables.hotel_stays[0].window_days, 14, 'window defaults from hotel settings')
assert.ok(!JSON.stringify(database.tables.hotel_stays[0]).includes(created.code), 'plain code is never stored')

const during = new Date('2026-11-12T10:00:00Z')
const ok = await stays.resolveStay(database, tenant, created.displayCode, during)
assert.equal(ok.valid, true)
assert.equal(ok.phase, 'during')
assert.equal(ok.validTo, '2026-11-14')
assert.match(ok.stayUrl, /^https:\/\/tisonik\.com\/stay\/#t=/)
assert.deepEqual(await stays.resolveStay(database, tenant, 'ZZZZZZZZ', during), { valid: false, reason: 'unknown' })
assert.deepEqual(await stays.resolveStay(database, 'tenant-2', created.code, during), { valid: false, reason: 'unknown' }, 'another hotel cannot use this code')

// Tokens
const token = ok.stayUrl.split('#t=')[1]
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
assert.equal(stays.signSessionToken(database.tables.hotel_stays[0], Date.parse('2026-12-30T00:00:00Z')), null, 'no session for a closed stay')
const cookie = stays.sessionCookie(exchanged.token, exchanged.maxAge)
assert.match(cookie, /HttpOnly; Secure; SameSite=Strict$/)
assert.equal(stays.readCookie({ headers: { cookie: 'a=1; tsk_stay=' + exchanged.token + '; b=2' } }, 'tsk_stay'), exchanged.token)
assert.equal(stays.guestToken({ headers: { cookie: 'tsk_stay=COOKIE' } }, { token: 'BODY' }), 'COOKIE', 'cookie wins over body token')
assert.equal(stays.guestToken({ headers: {} }, { token: 'BODY' }), 'BODY')
database.tables.hotel_stays[0].status = 'voided'
assert.equal(await stays.exchangeLink(database, token, during), null, 'a voided stay cannot be exchanged')
database.tables.hotel_stays[0].status = 'active'

// UNIKMO session contract: hotelId, cardCode, guestReference, stayEndsAt
database.tables.hotel_stay_settings[0].unikmo_hotel_id = 'HOTEL-001'
const unikmoBody = { hotelId: 'HOTEL-001', cardCode: created.displayCode, guestReference: 'bk-1001', stayEndsAt: '2026-11-14T11:00:00.000Z' }
assert.equal(stays.unikmoSessionSchema.safeParse(unikmoBody).success, true)
assert.equal(stays.unikmoSessionSchema.safeParse({ ...unikmoBody, extra: 1 }).success, false, 'unknown fields are rejected')
assert.equal(stays.unikmoSessionSchema.safeParse({ ...unikmoBody, cardCode: 'ABCD7K92' }).success, false, 'code must be XXXX-XXXX')
const session1 = await stays.resolveUnikmoSession(database, unikmoBody, during)
assert.equal(session1.ok, true)
assert.match(session1.url, /^https:\/\/tisonik\.com\/stay\/#t=[\w-]+\.[\w-]+$/)
assert.ok(!decodeURIComponent(session1.url).includes('BK-1001') && !Buffer.from(session1.url.split('#t=')[1].split('.')[0], 'base64url').toString().includes('1001'), 'link carries no booking number')
assert.equal((await stays.resolveUnikmoSession(database, { ...unikmoBody, hotelId: 'HOTEL-999' }, during)).ok, false, 'unmapped hotel')
assert.equal((await stays.resolveUnikmoSession(database, { ...unikmoBody, guestReference: 'BK-9999' }, during)).ok, false, 'reference must match the booking')
assert.equal((await stays.resolveUnikmoSession(database, { ...unikmoBody, cardCode: 'ZZZZ-ZZZZ' }, during)).ok, false, 'unknown code')
const afterCheckout = await stays.resolveUnikmoSession(database, unikmoBody, new Date('2026-11-20T12:00:00Z'))
assert.equal(afterCheckout.ok, true, 'still opens inside the after-checkout window, whatever stayEndsAt says')
assert.equal((await stays.resolveUnikmoSession(database, unikmoBody, new Date('2026-12-30T12:00:00Z'))).phase, 'closed')
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

// Phases and tiles
const stay = database.tables.hotel_stays[0]
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
const scores = { check_in: 9, room: 8, food_drink: 7, staff: 10, recommend: 9 }
assert.equal((await stays.submitToStay(database, stay, 'private', { message: 'The air conditioning is loud.' }, lastDay)).ok, true)
assert.equal((await stays.submitToStay(database, stay, 'feedback', { message: 'Too late for this.' }, lastDay)).status, 409, 'feedback is closed during the stay')
assert.equal((await stays.submitToStay(database, stay, 'rating', { scores: { ...scores, room: 11 } }, lastDay)).status, 422)
assert.equal((await stays.submitToStay(database, stay, 'rating', { scores: { check_in: 9 } }, lastDay)).status, 422, 'all five questions are required')
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
assert.equal(session.tiles.rating, false, 'rating is hidden once submitted')
assert.equal(session.questions.length, 5)
assert.equal(session.discover.length, 1)

// Portal actions (signed-in staff)
const { portalAction } = await import('../api/_lib/stays-portal.mjs')
const tenantUuid = '11111111-1111-4111-8111-111111111111'
const otherUuid = '22222222-2222-4222-8222-222222222222'
database.tables.memberships.push(
  { tenant_id: tenantUuid, user_id: 'admin', role: 'operator_admin' },
  { tenant_id: tenantUuid, user_id: 'analyst', role: 'operator_analyst' },
  { tenant_id: tenantUuid, user_id: 'viewer', role: 'operator_viewer' },
)
const newStay = { action: 'create', tenantId: tenantUuid, data: { bookingRef: 'BK-2002', validFrom: '2026-12-01', validTo: '2026-12-03', room: '12', guestLabel: 'Alex' } }
const made = await portalAction(database, 'admin', newStay)
assert.equal(made.status, 201)
assert.match(made.body.code, /^[2-9A-HJKMNP-Z]{8}$/)
const madeRow = database.tables.hotel_stays.find(row => row.id === made.body.stayId)
assert.equal(madeRow.tenant_id, tenantUuid, 'stay belongs to the staff member\'s hotel')
assert.equal((await portalAction(database, 'analyst', newStay)).status, 403, 'analysts cannot create stays')
assert.equal((await portalAction(database, 'viewer', { action: 'status', tenantId: tenantUuid, data: { submissionId: '33333333-3333-4333-8333-333333333333', status: 'seen' } })).status, 403)
assert.equal((await portalAction(database, 'admin', { ...newStay, tenantId: otherUuid })).status, 403, 'no access to another hotel')
assert.equal((await portalAction(database, 'admin', { ...newStay, data: { ...newStay.data, validTo: '2026-11-30' } })).status, 422, 'departure before arrival is rejected')
assert.equal((await portalAction(database, 'stranger', newStay)).status, 403)

const inboxRow = database.tables.hotel_stay_submissions[0]
const marked = await portalAction(database, 'analyst', { action: 'status', tenantId: tenantUuid, data: { submissionId: inboxRow.id, status: 'resolved' } })
assert.equal(marked.status, 200)
assert.equal(database.tables.hotel_stay_submissions.find(row => row.id === inboxRow.id).status, 'new', 'ids from the stub tenant do not match this hotel, so nothing changes')
inboxRow.tenant_id = tenantUuid
await portalAction(database, 'analyst', { action: 'status', tenantId: tenantUuid, data: { submissionId: inboxRow.id, status: 'resolved' } })
assert.equal(inboxRow.status, 'resolved')

const settingsResult = await portalAction(database, 'admin', { action: 'settings', tenantId: tenantUuid, data: { hotelName: 'Hotel Test', notifyEmail: 'desk@hotel.example', defaultWindowDays: 10, discoverItems: [{ title: 'Spa', body: 'Level 2' }] } })
assert.equal(settingsResult.status, 200)
assert.equal(database.tables.hotel_stay_settings.find(row => row.tenant_id === tenantUuid).default_window_days, 10)
assert.equal((await portalAction(database, 'admin', { action: 'settings', tenantId: tenantUuid, data: { notifyEmail: 'not-an-email', defaultWindowDays: 10, discoverItems: [] } })).status, 422)

const voidResult = await portalAction(database, 'admin', { action: 'void', tenantId: tenantUuid, data: { stayId: made.body.stayId } })
assert.equal(voidResult.status, 200)
assert.equal(madeRow.status, 'voided')
assert.deepEqual(await stays.resolveStay(database, tenantUuid, made.body.code, new Date('2026-12-02T12:00:00Z')), { valid: false, reason: 'voided' })

// A voided stay stops working at once
stay.status = 'voided'
assert.deepEqual(await stays.resolveStay(database, tenant, created.code, during), { valid: false, reason: 'voided' })
assert.equal((await stays.submitToStay(database, stay, 'thank_you', { message: 'Still here?' }, during)).status, 409)

console.log('Hotel stay layer contract passed.')
