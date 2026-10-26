import assert from 'node:assert/strict'

process.env.STAY_CODE_PEPPER = 'p'.repeat(40)
process.env.STAY_LINK_SECRET = 'l'.repeat(40)
delete process.env.RESEND_API_KEY

const stays = await import('../api/_lib/stays.mjs')

// Minimal in-memory stand-in for the Supabase query builder used by the stay layer.
function fakeDatabase() {
  const tables = { hotel_stays: [], hotel_stay_submissions: [], hotel_stay_settings: [] }
  let serial = 0
  return {
    tables,
    from(name) {
      const rows = tables[name]
      const filters = []
      let countOnly = false
      const run = () => rows.filter(row => filters.every(([key, value]) => row[key] === value))
      const builder = {
        select(_columns, options) { countOnly = options?.head === true; return builder },
        eq(key, value) { filters.push([key, value]); return builder },
        async maybeSingle() { return { data: run()[0] || null, error: null } },
        insert(value) {
          const duplicate = name === 'hotel_stays' && rows.some(row => row.tenant_id === value.tenant_id && row.code_digest === value.code_digest)
          const duplicateRating = name === 'hotel_stay_submissions' && value.kind === 'rating' && rows.some(row => row.stay_id === value.stay_id && row.kind === 'rating')
          const row = { id: `id-${++serial}`, status: name === 'hotel_stays' ? 'active' : 'new', ...value }
          return { select: () => ({ single: async () => {
            if (duplicate || duplicateRating) return { data: null, error: { code: '23505' } }
            rows.push(row)
            return { data: { id: row.id }, error: null }
          } }) }
        },
        then(resolve) { resolve(countOnly ? { count: run().length, error: null } : { data: run(), error: null }) },
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
assert.equal(stays.verifyStayToken(token, during.getTime() + 13 * 3600_000), null, 'expires after 12 hours')

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

// A voided stay stops working at once
stay.status = 'voided'
assert.deepEqual(await stays.resolveStay(database, tenant, created.code, during), { valid: false, reason: 'voided' })
assert.equal((await stays.submitToStay(database, stay, 'thank_you', { message: 'Still here?' }, during)).status, 409)

console.log('Hotel stay layer contract passed.')
