import { allowPost, isSameSiteRequest, sendJson } from '../../_lib/http.mjs'
import { sessionCookie } from '../../_lib/stays.mjs'

// "Forget this device": clears the cookie session.
export default async function handler(request, response) {
  if (!allowPost(request, response)) return
  if (!isSameSiteRequest(request)) return sendJson(response, 403, { error: 'origin_not_allowed' })
  response.setHeader('Set-Cookie', sessionCookie('', 0))
  return sendJson(response, 200, { ok: true })
}
