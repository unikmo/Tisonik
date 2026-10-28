import { allowPost, readJson, sendJson } from '../../_lib/http.mjs'
import { adminDatabase } from '../../_lib/supabase.mjs'
import { authorised } from '../../_lib/unikmo-auth.mjs'
import { registerUnikmoCode, unikmoCodeSchema } from '../../_lib/stays.mjs'

// POST /api/integrations/unikmo/codes - UNIKMO sends Tisonik a card code it created (status "active", the default),
// or revokes one (status "revoked"). Tisonik never creates codes; it keeps a keyed hash so it can check them later.
export default async function handler(request, response) {
  if (!allowPost(request, response)) return
  if (!process.env.UNIKMO_API_SECRET) return sendJson(response, 503, { error: 'Integration not configured' })
  if (!authorised(request)) return sendJson(response, 401, { error: 'Unauthorized' })
  try {
    const parsed = unikmoCodeSchema.safeParse(await readJson(request, 2_000))
    if (!parsed.success) return sendJson(response, 400, { error: 'Invalid code data' })
    const result = await registerUnikmoCode(adminDatabase(), parsed.data)
    if (result.limited) return sendJson(response, 429, { error: 'Too many requests' })
    if (result.conflict) return sendJson(response, 409, { error: 'Code already in use' })
    if (!result.ok) return sendJson(response, 403, { error: 'Unable to register code' })
    return sendJson(response, 200, { registered: !result.revoked, revoked: Boolean(result.revoked) })
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { error: 'Invalid request' })
    if (error?.message === 'PAYLOAD_TOO_LARGE') return sendJson(response, 413, { error: 'payload_too_large' })
    console.error('unikmo-code-failed', error?.message || error)
    return sendJson(response, 503, { error: 'stay_service_unavailable' })
  }
}
