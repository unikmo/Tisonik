import assert from 'node:assert/strict'
import { notificationConfigured, smtpConfigured, smtpOptions, copyRecipient } from '../api/_lib/enquiry-notification.mjs'

process.env.RESEND_API_KEY = ''
process.env.TISONIK_ENQUIRY_TO = ''
process.env.TISONIK_ENQUIRY_FROM = ''
process.env.TISONIK_SMTP_HOST = 'mail.tisonik.com'
process.env.TISONIK_SMTP_USER = 'hello@tisonik.com'
process.env.TISONIK_SMTP_PASSWORD = ''
assert.equal(smtpConfigured(), false)
assert.equal(notificationConfigured(), false)

process.env.TISONIK_SMTP_PASSWORD = 'test-only-password'
assert.equal(smtpConfigured(), true)
assert.equal(notificationConfigured(), true)
const options = smtpOptions()
assert.equal(options.host, 'mail.tisonik.com')
assert.equal(options.port, 465)
assert.equal(options.secure, true)
assert.deepEqual(options.auth, {
  user: 'hello@tisonik.com',
  pass: 'test-only-password',
})
assert.equal(options.connectionTimeout, 8000)
process.env.TISONIK_ENQUIRY_TO = 'mbanwie@googlemail.com'
assert.equal(copyRecipient(), 'mbanwie@googlemail.com')
process.env.TISONIK_ENQUIRY_TO = 'hello@tisonik.com'
assert.equal(copyRecipient(), undefined)
console.log('Tisonik SSL/TLS SMTP configuration contract passed.')
