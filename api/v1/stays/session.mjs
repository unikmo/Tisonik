import { z } from 'zod'
import { allowPost, isSameSiteRequest, readJson, sendJson } from '../../_lib/http.mjs'
import { clientKey, limits, overLimit } from '../../_lib/rate-limit.mjs'
import { adminDatabase } from '../../_lib/supabase.mjs'
import { guestSession, guestToken, loadStay } from '../../_lib/stays.mjs'

const requestSchema = z.object({ token: z.string().max(400).optional() }).strict()

export default async function handler(request, response) {
  if (!allowPost(request, response)) return
  if (!isSameSiteRequest(request)) return sendJson(response, 403, { error: 'origin_not_allowed' })
  try {
    const database = adminDatabase()
    if (await overLimit(database, `session:${clientKey(request)}`, limits.guestSession.window, limits.guestSession.max)) return sendJson(response, 429, { error: 'too_many_requests' })
    const parsed = requestSchema.safeParse(await readJson(request, 2_000))
    if (!parsed.success) return sendJson(response, 422, { error: 'invalid_request' })
    const stay = await loadStay(database, guestToken(request, parsed.data))
    if (!stay) return sendJson(response, 401, { error: 'link_expired' })
    return sendJson(response, 200, await guestSession(database, stay))
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { error: 'invalid_json' })
    console.error('stay-session-failed', error?.message || error)
    return sendJson(response, 503, { error: 'stay_service_unavailable' })
  }
}
