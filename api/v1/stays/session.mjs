import { z } from 'zod'
import { allowPost, isSameSiteRequest, readJson, sendJson } from '../../_lib/http.mjs'
import { adminDatabase } from '../../_lib/supabase.mjs'
import { guestSession, loadStay } from '../../_lib/stays.mjs'

const requestSchema = z.object({ token: z.string().max(400) }).strict()

export default async function handler(request, response) {
  if (!allowPost(request, response)) return
  if (!isSameSiteRequest(request)) return sendJson(response, 403, { error: 'origin_not_allowed' })
  try {
    const parsed = requestSchema.safeParse(await readJson(request, 2_000))
    if (!parsed.success) return sendJson(response, 422, { error: 'invalid_request' })
    const database = adminDatabase()
    const stay = await loadStay(database, parsed.data.token)
    if (!stay) return sendJson(response, 401, { error: 'link_expired' })
    return sendJson(response, 200, await guestSession(database, stay))
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { error: 'invalid_json' })
    console.error('stay-session-failed', error?.message || error)
    return sendJson(response, 503, { error: 'stay_service_unavailable' })
  }
}
