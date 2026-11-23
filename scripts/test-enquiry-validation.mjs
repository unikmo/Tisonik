import assert from 'node:assert/strict'
import { enquirySchema, normalizeEnquiry } from '../api/pilot-requests.mjs'

const base = {
  name: 'Alex Morgan',
  workEmail: 'alex@example.com',
  company: 'Example Hotel',
  roleTitle: '',
  privacyConsent: true,
  website: '',
  sourcePath: '/contact/',
}
for (const message of ['Hi', 'Short', 'A'.repeat(4000)]) {
  const parsed = enquirySchema.safeParse(normalizeEnquiry({ ...base, message }))
  assert.equal(parsed.success, true, `Valid message of length ${message.length} was rejected`)
}
for (const message of ['', '  ', 'A'.repeat(4001)]) {
  const parsed = enquirySchema.safeParse(normalizeEnquiry({ ...base, message }))
  assert.equal(parsed.success, false, `Invalid message of length ${message.length} was accepted`)
}
assert.equal(enquirySchema.safeParse(normalizeEnquiry({ ...base, message: 'Hello', privacyConsent: false })).success, false)
console.log('Enquiry message validation regression checks passed.')
