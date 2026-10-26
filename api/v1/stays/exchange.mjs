import { z } from 'zod'
import { allowPost, isSameSiteRequest, readJson, sendJson } from '../../_lib/http.mjs'
import { clientKey, limits, overLimit } from '../../_lib/rate-limit.mjs'
import { adminDatabase } from '../../_lib/supabase.mjs'
import { exchangeLink, sessionCookie } from '../../_lib/stays.mjs'

const requestSchema = z.object({ token: z.string().max(400) }).strict()

// The guest page swaps the short-lived link from the URL fragment for an HttpOnly cookie session.
export default async function handler(request, response) {
  if (!allowPost(request, response)) return
  if (!isSameSiteRequest(request)) return sendJson(response, 403, { error: 'origin_not_allowed' })
  try {
    const database = adminDatabase()
    if (await overLimit(database, `exchange:${clientKey(request)}`, limits.guestExchange.window, limits.guestExchange.max)) return sendJson(response, 429, { error: 'too_many_requests' })
    const parsed = requestSchema.safeParse(await readJson(request, 2_000))
    if (!parsed.success) return sendJson(response, 422, { error: 'invalid_request' })
    const session = await exchangeLink(database, parsed.data.token)
    if (!session) return sendJson(response, 401, { error: 'link_expired' })
    response.setHeader('Set-Cookie', sessionCookie(session.token, session.maxAge))
    return sendJson(response, 200, { ok: true })
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { error: 'invalid_json' })
    console.error('stay-exchange-failed', error?.message || error)
    return sendJson(response, 503, { error: 'stay_service_unavailable' })
  }
}
