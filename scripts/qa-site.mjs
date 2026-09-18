import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const root = resolve('dist')
const productionOrigin = 'https://tisonik.com'
const errors = []
const fail = message => errors.push(message)

const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const path = join(directory, entry.name)
  return entry.isDirectory() ? walk(path) : [path]
})

if (!existsSync(root)) fail('dist/ does not exist; run the production build first')

const files = existsSync(root) ? walk(root) : []
const htmlFiles = files.filter(file => extname(file) === '.html')
const clientBundles = files.filter(file => /assets[\\/].*\.js$/.test(file)).map(file => readFileSync(file, 'utf8')).join('\n')

for (const file of htmlFiles) {
  const name = relative(root, file).replaceAll('\\', '/')
  const html = readFileSync(file, 'utf8')
  if (!/<title>[^<]{8,}<\/title>/.test(html)) fail(`${name}: missing useful title`)
  if (!/<meta name="description" content="[^\"]{40,}"/.test(html)) fail(`${name}: missing useful description`)
  if (!html.includes(`<link rel="canonical" href="${productionOrigin}/`)) fail(`${name}: canonical must be absolute and use tisonik.com`)
  if (!html.includes(`<meta property="og:image" content="${productionOrigin}/`)) fail(`${name}: Open Graph image must be absolute and use tisonik.com`)
  if (!/<meta property="og:type" content="website"/.test(html)) fail(`${name}: missing Open Graph type`)
  if (!/<meta property="og:description" content="[^\"]{40,}"/.test(html)) fail(`${name}: missing Open Graph description`)
  if (!/<meta name="twitter:title" content="[^\"]+"/.test(html)) fail(`${name}: missing Twitter title`)
  if (!/<meta name="twitter:description" content="[^\"]{40,}"/.test(html)) fail(`${name}: missing Twitter description`)
  if (!html.includes(`<meta name="twitter:image" content="${productionOrigin}/`)) fail(`${name}: Twitter image must be absolute and use tisonik.com`)
  if (!/<script type="application\/ld\+json">/.test(html)) fail(`${name}: missing structured data`)
  if (!/<div id="root"><main class="seo-fallback"/.test(html)) fail(`${name}: missing crawlable static body content`)
  if (/Cruise Connection/i.test(html)) fail(`${name}: legacy Cruise Connection branding remains`)

  for (const match of html.matchAll(/(?:href|src)="(\/[^\"#?]*)/g)) {
    const target = match[1]
    if (target === '/') continue
    const expected = target.endsWith('/') ? join(root, target, 'index.html') : join(root, target)
    if (!existsSync(expected)) fail(`${name}: broken internal reference ${target}`)
  }
}

for (const required of ['robots.txt', 'sitemap.xml', 'llms.txt', 'llms-full.txt', 'og-card.png']) {
  if (!existsSync(join(root, required))) fail(`missing ${required}`)
}

const robots = existsSync(join(root, 'robots.txt')) ? readFileSync(join(root, 'robots.txt'), 'utf8') : ''
if ((robots.match(/Disallow: \/product-app\//g) || []).length < 6) fail('interactive product walkthrough is not excluded for all declared crawler groups')
if (!robots.includes(`Sitemap: ${productionOrigin}/sitemap.xml`)) fail('robots.txt does not point to the tisonik.com sitemap')

const sitemap = existsSync(join(root, 'sitemap.xml')) ? readFileSync(join(root, 'sitemap.xml'), 'utf8') : ''
if (sitemap.includes('/product-app/')) fail('interactive product walkthrough must not appear in the public sitemap')
for (const match of sitemap.matchAll(/<loc>https:\/\/tisonik\.com(\/[^<]*)<\/loc>/g)) {
  const path = match[1]
  const expected = path === '/' ? join(root, 'index.html') : join(root, path, 'index.html')
  if (!existsSync(expected)) fail(`sitemap route missing from build: ${path}`)
}

for (const aiFile of ['llms.txt', 'llms-full.txt']) {
  const content = existsSync(join(root, aiFile)) ? readFileSync(join(root, aiFile), 'utf8') : ''
  if (!content.includes('https://tisonik.com')) fail(`${aiFile} does not identify tisonik.com as the canonical website`)
}

const productApp = join(root, 'product-app', 'index.html')
if (existsSync(productApp)) {
  const html = readFileSync(productApp, 'utf8')
  if (!/<meta name="robots" content="noindex,nofollow,noarchive"/.test(html)) fail('product walkthrough must be noindex, nofollow and noarchive')
}

const pilot = join(root, 'pilot', 'index.html')
if (existsSync(pilot)) {
  const html = readFileSync(pilot, 'utf8')
  if (!clientBundles.includes('/api/pilot-requests')) fail('pilot page contact form is not connected to the first-party enquiry API')
  if (html.includes('formsubmit.co') || clientBundles.includes('formsubmit.co')) fail('pilot page still exposes a third-party form relay')
  if (/mailto:[^\"']*@tisonik\.com/i.test(html) || /mailto:[^\"']*@tisonik\.com/i.test(clientBundles)) fail('public site exposes a direct Tisonik mailbox')
  if (!/complete Tisonik|complete connected product/i.test(html)) fail('pilot page does not present the complete product experience')
  if (!/existing app/i.test(html)) fail('pilot page does not identify Tisonik as an add-on to the existing app')
}

if (/Cruise Connection/i.test(clientBundles)) fail('client bundle contains legacy Cruise Connection branding')
if (/does not transmit data yet|production CRM\/API connection is intentionally pending/i.test(clientBundles)) fail('client bundle contains a disconnected demo-form path')
if (!clientBundles.includes('/pilot/#contact')) fail('client bundle does not contain the pilot contact destination')
if (!clientBundles.includes('/contact/#contact')) fail('client bundle does not contain the general secure contact-form destination')
if (/Open the interactive product walkthrough|EXPLORE THE WORKFLOWS/.test(clientBundles)) fail('pilot journey contains a circular link back to product workflows')
if (!clientBundles.includes('CruiseConnect appears inside the app guests already use')) fail('executive walkthrough is missing the host-app CruiseConnect entry')
if (!clientBundles.includes('Management sees experience, recovery and attributed revenue together')) fail('executive walkthrough is missing the management experience')
if (!clientBundles.includes('The privacy gateway aggregates before anything reaches us')) fail('executive walkthrough is missing the privacy-safe connector model')
if (!clientBundles.includes('Live event feedback reaches leaders while they can still act')) fail('executive walkthrough is missing structured live-event feedback')
if (!clientBundles.includes('Confirmed attributed revenue')) fail('executive walkthrough is missing revenue attribution')
if (!clientBundles.includes('Did someone make your day today?')) fail('executive walkthrough is missing the passive-guest recognition prompt')
if (!clientBundles.includes('Frequently asked questions about CruiseConnect')) fail('site is missing the public FAQ')
if (!clientBundles.includes('Where does Tisonik run?')) fail('FAQ is missing the deployment architecture answer')
if (!clientBundles.includes('How do passenger privacy and data residency work?')) fail('FAQ is missing privacy and data residency')
if (!clientBundles.includes('Does the cruise line retain ownership and avoid lock-in?')) fail('FAQ is missing ownership and lock-in')
if (!clientBundles.includes('FAQPage')) fail('FAQ is missing structured FAQ data')
if (!clientBundles.includes('OPERATOR-SIDE FACE + ROSTER MATCH')) fail('crew demo is missing duplicate-name identity resolution')
if (!clientBundles.includes('biometric templates, face-match scores')) fail('privacy policy is missing the biometric exclusion boundary')
if (!clientBundles.includes('accepts only the predefined aggregate report')) fail('privacy policy is missing the aggregate-only ingestion boundary')
if (!clientBundles.includes('The default minimum reporting group is 20')) fail('privacy policy is missing the minimum reporting group')
if (!clientBundles.includes('Photo + biometric template stay operator-side')) fail('crew demo is missing the operator-side biometric boundary')
if (!clientBundles.includes('only aggregates reach Tisonik')) fail('crew demo is missing the aggregate-only transmission boundary')
if (!clientBundles.includes('Request a pilot conversation')) fail('executive walkthrough is missing the final pilot handoff')
if (!clientBundles.includes('Send an anonymous vibe')) fail('product is missing the passenger-to-passenger Anonymous Vibe journey')
if (!clientBundles.includes('Children excluded')) fail('Anonymous Vibe demo is missing child exclusion')
if (!clientBundles.includes('different cabin/booking group')) fail('Anonymous Vibe demo is missing cabin/booking-group exclusion')
if (!clientBundles.includes('randomized delivery')) fail('Anonymous Vibe demo is missing timing protection')
if (!clientBundles.includes('Top Five means five score positions')) fail('passenger experience is missing dense-ranking explanation')
if (!clientBundles.includes('Count only')) fail('passenger experience is missing count-only RSVP controls')
if (!clientBundles.includes('no second in-app confirmation')) fail('Anonymous Vibe does not document one-time boarding enrolment')
if (clientBundles.includes('Activate face matching first')) fail('Anonymous Vibe still contains a redundant in-app face-matching confirmation')
if (clientBundles.includes('voluntary selfie') || clientBundles.includes('crew-participating selfie')) fail('Crew recognition still suggests a guest selfie')
if (!clientBundles.includes('face and visible name badge')) fail('Crew recognition does not require face-and-name-badge framing')
if (!clientBundles.includes('VConnect opens only after both adults agree')) fail('product is missing the separate mutual-consent VConnect journey')
if (!clientBundles.includes('One request per sailing day')) fail('VConnect demo is missing the daily request limit')
if (!clientBundles.includes('requester receives no rejection')) fail('VConnect demo is missing non-acceptance privacy')
if (!clientBundles.includes('Five vibes maximum per sailing day')) fail('Anonymous Vibe demo is missing the daily send cap')

const sdkSource = readFileSync(resolve('packages/sdk/src/index.ts'), 'utf8')
for (const required of ['requestVConnect', 'respondToVConnect', 'proposeVConnectPlan', "'vconnect.requested'", "'vconnect.responded'", "'vconnect.plan.proposed'"]) {
  if (!sdkSource.includes(required)) fail(`SDK is missing VConnect contract ${required}`)
}
const referenceHostSource = readFileSync(resolve('packages/reference-host/src/index.ts'), 'utf8')
for (const required of [">=5)return {accepted:false,rejectionReason:'daily_vibe_limit'", ">=1)return {accepted:false,rejectionReason:'daily_vconnect_limit'"]) {
  if (!referenceHostSource.includes(required)) fail(`reference host is missing enforced safety limit ${required}`)
}

const privacyContractSource = readFileSync(resolve('src/privacyMetrics.ts'), 'utf8')
for (const required of ['CruiseAggregateReport', 'MINIMUM_REPORTING_GROUP = 20', 'crewmemberid', 'photo', 'biometrictemplate', 'facematchscore', 'validateCruiseAggregateReport']) {
  if (!privacyContractSource.includes(required)) fail(`aggregate contract is missing ${required}`)
}

const vibeRankingSource = readFileSync(resolve('src/vibeRanking.ts'), 'utf8')
for (const required of ['rankPassengerVibes', 'topFive: rank <= 5', 'new Set']) {
  if (!vibeRankingSource.includes(required)) fail(`passenger dense-ranking contract is missing ${required}`)
}

for (const file of files.filter(file => /\.(?:jpg|jpeg|png)$/i.test(file))) {
  const data = readFileSync(file)
  const jpeg = data[0] === 0xff && data[1] === 0xd8 && data.at(-2) === 0xff && data.at(-1) === 0xd9
  const png = data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (!jpeg && !png) fail(`${relative(root, file)}: invalid image signature`)
}

if (errors.length) {
  console.error(`Site QA failed with ${errors.length} issue(s):\n- ${errors.join('\n- ')}`)
  process.exit(1)
}

console.log(`Site QA passed: ${htmlFiles.length} HTML pages, ${files.length} built files, metadata, static crawl content, routes, contact path and images verified.`)
