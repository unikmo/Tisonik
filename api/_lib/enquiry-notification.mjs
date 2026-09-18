import { createHash } from 'node:crypto'

const dashboardUrl = 'https://tisonik.com/portal/'
export const notificationConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.TISONIK_ENQUIRY_TO && process.env.TISONIK_ENQUIRY_FROM)

const cleanHeader = value => String(value || '').replace(/[\r\n]+/g, ' ').trim()

export async function deliverEnquiryNotification(database, pilotRequestId) {
  if (!notificationConfigured()) return { configured: false }
  try {
    const { data: enquiry, error: enquiryError } = await database
      .from('pilot_requests')
      .select('name,work_email,company,role_title,message,source_path,created_at')
      .eq('id', pilotRequestId)
      .single()

    if (enquiryError || !enquiry) throw new Error('enquiry_lookup_failed')

    const type =
      enquiry.source_path === '/resort-pilot/' ? 'resort pilot' :
      enquiry.source_path === '/contact/' ? 'website contact' :
      'cruise pilot'

    const company = cleanHeader(enquiry.company)
    const subject = `New Tisonik ${type} enquiry${company ? ` — ${company}` : ''}`
    const text = [
      'New Tisonik enquiry',
      '',
      `Type: ${type}`,
      `Name: ${enquiry.name}`,
      `Work email: ${enquiry.work_email}`,
      `Company: ${enquiry.company}`,
      `Role: ${enquiry.role_title || 'Not provided'}`,
      `Submitted: ${enquiry.created_at || 'Unknown'}`,
      '',
      'Message:',
      enquiry.message,
      '',
      `Reference: ${pilotRequestId}`,
      `Portal: ${dashboardUrl}`,
    ].join('\n')

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.TISONIK_ENQUIRY_FROM,
        to: [process.env.TISONIK_ENQUIRY_TO],
        reply_to: enquiry.work_email,
        subject,
        text,
      }),
    })
    if (!response.ok) throw new Error(`notification_provider_${response.status}`)
    await database.from('pilot_request_notifications').update({ status:'sent', attempts:1, sent_at:new Date().toISOString(), last_error_hash:null }).eq('pilot_request_id',pilotRequestId)
    return { configured:true, sent:true }
  } catch (error) {
    const hash=createHash('sha256').update(String(error?.message||'notification_failed')).digest('hex')
    await database.from('pilot_request_notifications').update({ status:'failed', attempts:1, next_attempt_at:new Date(Date.now()+15*60_000).toISOString(), last_error_hash:hash }).eq('pilot_request_id',pilotRequestId)
    return { configured:true, sent:false }
  }
}
