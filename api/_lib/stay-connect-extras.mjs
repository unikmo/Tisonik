import { AFFIRMATIONS } from './stay-connect-config.mjs'

// Kept apart from stay-connect.mjs so stays.mjs can use it without an import cycle.

// Private messages the desk has marked resolved and the guest has not yet answered "did we fix it?" about.
export async function recoveryPrompts(database, stay) {
  const { data } = await database.from('hotel_stay_submissions').select('id, payload, recheck').eq('stay_id', stay.id).eq('kind', 'private').eq('status', 'resolved')
  return (data || []).filter(row => !row.recheck).slice(0, 3).map(row => ({ id: row.id, about: String(row.payload?.message || '').slice(0, 90) }))
}

const labelOf = id => AFFIRMATIONS.find(item => item.id === id)?.label || id

// A private look back at the voyage or stay. Shown near the end and after checkout. Nothing here names another guest.
export async function voyageSummary(database, stay, profile, total) {
  const [recognitions, pulses] = await Promise.all([
    database.from('crew_recognitions').select('crew_id').eq('stay_id', stay.id),
    database.from('stay_pulses').select('id').eq('stay_id', stay.id),
  ])
  let received = []
  let sent = 0
  if (profile) {
    const [incoming, outgoing] = await Promise.all([
      database.from('stay_affirmations').select('label, status').eq('to_profile', profile.id),
      database.from('stay_affirmations').select('id').eq('from_profile', profile.id),
    ])
    received = (incoming.data || []).filter(row => row.status !== 'ignored')
    sent = (outgoing.data || []).length
  }
  const counts = new Map()
  received.forEach(row => counts.set(row.label, (counts.get(row.label) || 0) + 1))
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return {
    days: total,
    crewRecognised: new Set((recognitions.data || []).map(row => row.crew_id)).size,
    scoresGiven: (pulses.data || []).length,
    complimentsReceived: received.length,
    complimentsSent: sent,
    topCompliment: top ? labelOf(top[0]) : null,
  }
}
