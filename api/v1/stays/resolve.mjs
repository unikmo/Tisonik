import { z } from 'zod'
import { authenticateConnector } from '../../_lib/connector-auth.mjs'
import { allowPost, readJson, sendJson } from '../../_lib/http.mjs'
import { resolveStay } from '../../_lib/stays.mjs'

const requestSchema = z.object({ code: z.string().max(40) }).strict()

// Called by UNIKMO's server, never by the guest's phone. The hotel is identified by the connector key.
export default async function handler(request, response) {
  if (!allowPost(request, response)) return
  try {
    const auth = await authenticateConnector(request)
    if (!auth) return sendJson(response, 401, { error: 'invalid_connector_credentials' })
    const parsed = requestSchema.safeParse(await readJson(request, 2_000))
    if (!parsed.success) return sendJson(response, 422, { error: 'invalid_request' })
    return sendJson(response, 200, await resolveStay(auth.database, auth.connector.tenant_id, parsed.data.code))
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { error: 'invalid_json' })
    console.error('stay-resolve-failed', error?.message || error)
    return sendJson(response, 503, { error: 'stay_service_unavailable' })
  }
}
