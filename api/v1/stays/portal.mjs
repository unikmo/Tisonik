import { allowPost, isSameSiteRequest, readJson, sendJson } from '../../_lib/http.mjs'
import { adminDatabase } from '../../_lib/supabase.mjs'
import { portalAction } from '../../_lib/stays-portal.mjs'

// Called by the signed-in portal. Identity comes from the Supabase access token, never from the body.
export default async function handler(request, response) {
  if (!allowPost(request, response)) return
  if (!isSameSiteRequest(request)) return sendJson(response, 403, { error: 'origin_not_allowed' })
  try {
    const authorization = String(request.headers.authorization || '')
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (token.length < 20 || token.length > 4000) return sendJson(response, 401, { error: 'sign_in_required' })
    const database = adminDatabase()
    const { data, error } = await database.auth.getUser(token)
    if (error || !data?.user) return sendJson(response, 401, { error: 'sign_in_required' })
    const result = await portalAction(database, data.user.id, await readJson(request, 16_000))
    return sendJson(response, result.status, result.body)
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { error: 'invalid_json' })
    if (error?.message === 'PAYLOAD_TOO_LARGE') return sendJson(response, 413, { error: 'payload_too_large' })
    console.error('stay-portal-failed', error?.message || error)
    return sendJson(response, 503, { error: 'stay_service_unavailable' })
  }
}
