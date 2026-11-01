import { allowPost, readJson, sendJson } from '../../_lib/http.mjs'
import { adminDatabase } from '../../_lib/supabase.mjs'
import { authorised } from '../../_lib/unikmo-auth.mjs'
import { nearbySchema, registerNearby } from '../../_lib/stay-nearby.mjs'

// POST /api/integrations/unikmo/nearby - called by UNIKMO's server with the proximity signal from the cruise line's app.
export default async function handler(request, response) {
  if (!allowPost(request, response)) return
  if (!process.env.UNIKMO_API_SECRET) return sendJson(response, 503, { error: 'Integration not configured' })
  if (!authorised(request)) return sendJson(response, 401, { error: 'Unauthorized' })
  try {
    const parsed = nearbySchema.safeParse(await readJson(request, 12_000))
    if (!parsed.success) return sendJson(response, 400, { error: 'Invalid nearby data' })
    const result = await registerNearby(adminDatabase(), parsed.data)
    if (result.limited) return sendJson(response, 429, { error: 'Too many attempts' })
    return sendJson(response, result.ok ? 200 : 204, result.ok ? { recorded: true } : {})
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { error: 'Invalid request' })
    if (error?.message === 'PAYLOAD_TOO_LARGE') return sendJson(response, 413, { error: 'payload_too_large' })
    console.error('unikmo-nearby-failed', error?.message || error)
    return sendJson(response, 503, { error: 'stay_service_unavailable' })
  }
}
