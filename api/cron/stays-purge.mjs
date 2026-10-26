import { timingSafeEqual } from 'node:crypto'
import { sendJson } from '../_lib/http.mjs'
import { adminDatabase } from '../_lib/supabase.mjs'

const authorised = request => {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET || ''}`), supplied = Buffer.from(String(request.headers.authorization || ''))
  return Boolean(process.env.CRON_SECRET) && expected.length === supplied.length && timingSafeEqual(expected, supplied)
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'method_not_allowed' })
  if (!authorised(request)) return sendJson(response, 401, { error: 'unauthorised' })
  try {
    const { data, error } = await adminDatabase().rpc('purge_expired_hotel_stays', { retention_days: 90 })
    if (error) throw error
    return sendJson(response, 200, { removed: data })
  } catch (error) {
    console.error('stay-purge-failed', error?.message || error)
    return sendJson(response, 503, { error: 'purge_failed' })
  }
}
