import { z } from 'zod'
import { allowPost, isSameSiteRequest, readJson, sendJson } from './_lib/http.mjs'
import { adminDatabase } from './_lib/supabase.mjs'
import { deliverEnquiryNotification } from './_lib/enquiry-notification.mjs'

export const enquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  workEmail: z.string().trim().email().max(254),
  company: z.string().trim().min(2).max(160),
  roleTitle: z.string().trim().max(120).optional().default(''),
  message: z.string().trim().min(10).max(4000),
  privacyConsent: z.literal(true),
  website: z.string().max(200).optional().default(''),
  sourcePath: z.enum(['/pilot/', '/resort-pilot/', '/contact/']).optional().default('/pilot/'),
}).strict()

export function normalizeEnquiry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  return {
    name: value.name ?? value.fullName,
    workEmail: value.workEmail ?? value.email,
    company: value.company ?? value.organisation ?? value.organization,
    roleTitle: value.roleTitle ?? value.role ?? '',
    message: value.message ?? value.details,
    privacyConsent: value.privacyConsent === true || value.privacyConsent === 'true' || value.privacy_consent === 'yes',
    website: value.website ?? value._honey ?? '',
    sourcePath: value.sourcePath ?? value.source_path ?? '/pilot/',
  }
}

export default async function handler(request, response) {
  if (!allowPost(request, response)) return
  if (!isSameSiteRequest(request)) return sendJson(response, 403, { error: 'origin_not_allowed' })

  try {
    const parsed = enquirySchema.safeParse(normalizeEnquiry(await readJson(request, 16_000)))
    if (!parsed.success) {
      const invalidFields = [...new Set(parsed.error.issues.map(issue => String(issue.path[0] || 'request')))]
      console.warn('pilot-request-validation-failed', invalidFields.join(','))
      return sendJson(response, 400, { error: 'invalid_enquiry', invalidFields })
    }
    const { website, privacyConsent, workEmail, roleTitle, sourcePath, ...rest } = parsed.data
    if (website) return sendJson(response, 202, { accepted: true })

    const database = adminDatabase()
    const { data: enquiry, error } = await database.from('pilot_requests').insert({
      ...rest,
      work_email: workEmail.toLowerCase(),
      role_title: roleTitle || null,
      consented_at: new Date().toISOString(),
      source_path: sourcePath,
    }).select('id').single()
    if (error) throw error
    const { error: outboxError } = await database.from('pilot_request_notifications').insert({ pilot_request_id: enquiry.id })
    if (outboxError) {
      // The enquiry is already durably stored. Notification infrastructure must
      // never turn a successful conversion into a customer-visible failure.
      console.error('pilot-request-notification-queue-failed', outboxError.message)
    } else {
      await deliverEnquiryNotification(database, enquiry.id)
    }
    return sendJson(response, 201, { accepted: true })
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { error: 'invalid_json' })
    if (error?.message === 'PAYLOAD_TOO_LARGE') return sendJson(response, 413, { error: 'payload_too_large' })
    console.error('pilot-request-failed', error?.message || error)
    return sendJson(response, 503, { error: 'enquiry_temporarily_unavailable' })
  }
}
