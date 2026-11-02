import { slug } from './stay-connect-config.mjs'

// Kept apart from stay-connect.mjs so stays.mjs can use it without an import cycle.

const dateOf = now => now.toISOString().slice(0, 10)

// Discover lines become offers with a stable id and an optional number of places.
export function offerItemsFromLines(lines) {
  const seen = new Map()
  return lines.slice(0, 12).map(line => {
    const base = slug(line.title) || 'offer'
    const count = (seen.get(base) || 0) + 1
    seen.set(base, count)
    return { id: count > 1 ? `${base}-${count}` : base, title: String(line.title).trim(), body: String(line.body || '').trim(), ...(line.spots ? { spots: line.spots } : {}) }
  })
}

// Old rows had no id. Give them one from the title so the page can still address them.
export const withIds = items => items.map((item, index) => ({ ...item, id: item.id || slug(item.title) || `offer-${index + 1}` }))

// The venue's offers with places left and who is going. Names appear only for guests this guest has met (an accepted
// compliment), who are still opted in and chose to share their plans. Everyone else is a count.
export async function offersFor(database, stay, settings, profile, now) {
  const items = withIds(settings?.discover_items || [])
  if (!items.length) return []
  const { data: rsvps, error } = await database.from('stay_offer_rsvps').select('stay_id, offer_id').eq('tenant_id', stay.tenant_id).limit(5000)
  if (error) throw error
  const going = new Map()
  const mine = new Set()
  for (const row of rsvps || []) {
    going.set(row.offer_id, (going.get(row.offer_id) || 0) + 1)
    if (row.stay_id === stay.id) mine.add(row.offer_id)
  }
  const friends = new Map()
  if (profile && profile.discoverable) {
    const [incoming, outgoing] = await Promise.all([
      database.from('stay_affirmations').select('from_profile, to_profile, status').eq('to_profile', profile.id),
      database.from('stay_affirmations').select('from_profile, to_profile, status').eq('from_profile', profile.id),
    ])
    const metIds = [...new Set([...(incoming.data || []), ...(outgoing.data || [])].filter(row => row.status === 'acknowledged').map(row => (row.from_profile === profile.id ? row.to_profile : row.from_profile)))]
    if (metIds.length) {
      const { data: people } = await database.from('stay_profiles').select('id, stay_id, display_name, discoverable, share_plans, expires_on').in('id', metIds)
      const { data: blocks } = await database.from('stay_blocks').select('blocker_profile, blocked_profile').eq('blocker_profile', profile.id)
      const { data: blockedMe } = await database.from('stay_blocks').select('blocker_profile, blocked_profile').eq('blocked_profile', profile.id)
      const hidden = new Set([...(blocks || []).map(row => row.blocked_profile), ...(blockedMe || []).map(row => row.blocker_profile)])
      const visible = (people || []).filter(person => person.discoverable && person.share_plans && person.expires_on >= dateOf(now) && !hidden.has(person.id))
      const byStay = new Map(visible.map(person => [person.stay_id, person.display_name]))
      for (const row of rsvps || []) {
        const name = byStay.get(row.stay_id)
        if (name) friends.set(row.offer_id, [...(friends.get(row.offer_id) || []), name])
      }
    }
  }
  return items.map(item => {
    const count = going.get(item.id) || 0
    return {
      id: item.id,
      title: String(item.title || ''),
      body: String(item.body || ''),
      left: item.spots ? Math.max(0, item.spots - count) : null,
      going: count,
      friends: (friends.get(item.id) || []).slice(0, 3),
      joined: mine.has(item.id),
    }
  })
}

// Ratings staff have asked for that are still open and this guest has not answered.
export async function liveRatingsFor(database, stay, now) {
  const { data: open, error } = await database.from('stay_live_ratings').select('id, title, opened_at, closes_at').eq('tenant_id', stay.tenant_id).limit(50)
  if (error) throw error
  const current = (open || []).filter(row => Date.parse(row.opened_at) <= now.getTime() && Date.parse(row.closes_at) > now.getTime())
  if (!current.length) return []
  const { data: answered } = await database.from('stay_live_answers').select('live_id').eq('stay_id', stay.id)
  const done = new Set((answered || []).map(row => row.live_id))
  return current.filter(row => !done.has(row.id)).sort((a, b) => Date.parse(b.opened_at) - Date.parse(a.opened_at)).slice(0, 3).map(row => ({ id: row.id, title: row.title }))
}
