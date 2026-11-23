import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'))
const read = path => readFile(resolve(root, path), 'utf8')
const [index, marketing, resort, marketingCss, styles, edge] = await Promise.all([read('index.html'), read('src/MarketingSite.tsx'), read('src/ResortSite.tsx'), read('src/marketing.css'), read('src/styles.css'), read('packages/operator-edge/src/service.mjs')])
const required = [
  [index.includes('name="viewport"'), 'responsive viewport'],
  [marketing.includes('aria-labelledby="pilot-contact-title"'), 'labelled contact region'],
  [marketing.includes('<label>Work email'), 'labelled email input'],
  [marketing.includes("fetch('/api/pilot-requests'"), 'first-party enquiry endpoint'],
  [!marketing.includes('formsubmit.co'), 'no third-party form relay'],
  [marketing.includes("status === 'sent'\n      ? <div className=\"pilot-contact-form\""), 'contact confirmation replaces the entire form'],
  [resort.includes("if (status === 'sent') return <div className=\"resort-contact-form\""), 'resort confirmation replaces the entire form'],
  [marketingCss.includes('.pilot-contact-form[role="status"] .form-success') && marketingCss.includes('text-align: center'), 'centered enlarged contact confirmation'],
  [styles.includes('@media (prefers-reduced-motion: reduce)'), 'reduced-motion support'],
  [styles.includes(':focus-visible'), 'keyboard focus indicator'],
  [edge.includes("daily_vibe_limit"), 'server-side abuse state'],
  [edge.includes("daily_vconnect_limit"), 'server-side VConnect state'],
]
for (const [ok, label] of required) if (!ok) throw new Error(`UI/safety contract missing: ${label}`)
console.log('Accessibility, responsive, conversion and abuse-state source contracts passed.')
