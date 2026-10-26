import { timingSafeEqual } from 'node:crypto'
import { allowPost, readJson, sendJson } from '../../_lib/http.mjs'
import { adminDatabase } from '../../_lib/supabase.mjs'
import { resolveUnikmoSession, unikmoSessionSchema } from '../../_lib/stays.mjs'

const authorised = request => {
  const configured = process.env.UNIKMO_API_SECRET
  const header = String(request.headers.authorization || '')
  const supplied = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '')
  const expected = Buffer.from(configured || '')
  return Boolean(configured) && configured.length >= 32 && supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

// POST /api/integrations/unikmo/session - called by UNIKMO's server after a guest enters the card code.
export default async function handler(request, response) {
  if (!allowPost(request, response)) return
  if (!process.env.UNIKMO_API_SECRET) return sendJson(response, 503, { error: 'Integration not configured' })
  if (!authorised(request)) return sendJson(response, 401, { error: 'Unauthorized' })
  try {
    const parsed = unikmoSessionSchema.safeParse(await readJson(request, 2_000))
    if (!parsed.success) return sendJson(response, 400, { error: 'Invalid stay data' })
    const result = await resolveUnikmoSession(adminDatabase(), parsed.data)
    if (!result.ok) return sendJson(response, 403, { error: 'Unable to create guest session' })
    return sendJson(response, 200, { url: result.url })
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { error: 'Invalid request' })
    if (error?.message === 'PAYLOAD_TOO_LARGE') return sendJson(response, 413, { error: 'payload_too_large' })
    console.error('unikmo-session-failed', error?.message || error)
    return sendJson(response, 503, { error: 'stay_service_unavailable' })
  }
}
