import { authenticateConnector } from '../../_lib/connector-auth.mjs'
import { allowPost, readJson, sendJson } from '../../_lib/http.mjs'
import { createStay, createStaySchema } from '../../_lib/stays.mjs'

// Front-desk or PMS script creates a stay and gets the code once. The portal form will call the same logic.
export default async function handler(request, response) {
  if (!allowPost(request, response)) return
  try {
    const auth = await authenticateConnector(request)
    if (!auth) return sendJson(response, 401, { error: 'invalid_connector_credentials' })
    const parsed = createStaySchema.safeParse(await readJson(request, 4_000))
    if (!parsed.success) return sendJson(response, 422, { error: 'invalid_stay', issues: parsed.error.issues.map(({ path, message }) => ({ path, message })) })
    return sendJson(response, 201, await createStay(auth.database, auth.connector.tenant_id, parsed.data))
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { error: 'invalid_json' })
    console.error('stay-create-failed', error?.message || error)
    return sendJson(response, 503, { error: 'stay_service_unavailable' })
  }
}
