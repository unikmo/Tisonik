import { timingSafeEqual } from 'node:crypto'

export const authorised = request => {
  const configured = process.env.UNIKMO_API_SECRET
  const header = String(request.headers.authorization || '')
  const supplied = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '')
  const expected = Buffer.from(configured || '')
  return Boolean(configured) && configured.length >= 32 && supplied.length === expected.length && timingSafeEqual(supplied, expected)
}
