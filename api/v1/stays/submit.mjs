import { z } from 'zod'
import { allowPost, isSameSiteRequest, readJson, sendJson } from '../../_lib/http.mjs'
import { adminDatabase } from '../../_lib/supabase.mjs'
import { loadStay, notifyHotel, submitToStay } from '../../_lib/stays.mjs'

const requestSchema = z.object({ token: z.string().max(400), kind: z.string().max(20), payload: z.record(z.string(), z.unknown()) }).strict()

export default async function handler(request, response) {
  if (!allowPost(request, response)) return
  if (!isSameSiteRequest(request)) return sendJson(response, 403, { error: 'origin_not_allowed' })
  try {
    const parsed = requestSchema.safeParse(await readJson(request, 8_000))
    if (!parsed.success) return sendJson(response, 422, { error: 'invalid_request' })
    const database = adminDatabase()
    const stay = await loadStay(database, parsed.data.token)
    if (!stay) return sendJson(response, 401, { error: 'link_expired' })
    const result = await submitToStay(database, stay, parsed.data.kind, parsed.data.payload)
    if (!result.ok) return sendJson(response, result.status, { error: result.error })
    await notifyHotel(database, stay, parsed.data.kind, result.parsed, result.submissionId)
    return sendJson(response, 201, { accepted: true })
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { error: 'invalid_json' })
    console.error('stay-submit-failed', error?.message || error)
    return sendJson(response, 503, { error: 'stay_service_unavailable' })
  }
}
