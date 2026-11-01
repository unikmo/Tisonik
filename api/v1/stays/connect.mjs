import { z } from 'zod'
import { allowPost, isSameSiteRequest, readJson, sendJson } from '../../_lib/http.mjs'
import { clientKey, limits, overLimit } from '../../_lib/rate-limit.mjs'
import { adminDatabase } from '../../_lib/supabase.mjs'
import { guestToken, loadStay, notifyHotel } from '../../_lib/stays.mjs'
import { connectAction } from '../../_lib/stay-connect.mjs'

const requestSchema = z.object({ token: z.string().max(400).optional(), action: z.string().max(30), data: z.record(z.string(), z.unknown()).default({}) }).strict()

export default async function handler(request, response) {
  if (!allowPost(request, response)) return
  if (!isSameSiteRequest(request)) return sendJson(response, 403, { error: 'origin_not_allowed' })
  try {
    const database = adminDatabase()
    if (await overLimit(database, `connect:${clientKey(request)}`, limits.guestConnect.window, limits.guestConnect.max)) return sendJson(response, 429, { error: 'too_many_requests' })
    const parsed = requestSchema.safeParse(await readJson(request, 4_000))
    if (!parsed.success) return sendJson(response, 422, { error: 'invalid_request' })
    const stay = await loadStay(database, guestToken(request, parsed.data))
    if (!stay) return sendJson(response, 401, { error: 'link_expired' })
    const result = await connectAction(database, stay, parsed.data.action, parsed.data.data)
    if (!result.ok) return sendJson(response, result.status, { error: result.error })
    if (result.notify) await notifyHotel(database, stay, result.notify.kind, result.notify.payload, result.notify.id)
    return sendJson(response, 200, result.body)
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { error: 'invalid_json' })
    console.error('stay-connect-failed', error?.message || error)
    return sendJson(response, 503, { error: 'stay_service_unavailable' })
  }
}
