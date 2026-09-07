import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const fallbackDetails: Record<string, string[]> = {
  '/': ['Passenger interaction inside the existing cruise-line app', 'In-app crew photography with face-and-name-badge capture and operator-side roster matching', 'Aggregate-only Tisonik cloud reporting', 'Frequently asked questions covering privacy, IT, connectivity, security, safety, workload, revenue, brand and ownership'],
  '/passenger-experience/': ['Opt-in discovery through nearby, activity or interest context', 'Predefined positive first contact', 'Public-place progression only after acknowledgement'],
  '/crew-recognition/': ['Contextual recognition during the sailing', 'Recognition without public rankings', 'Signals grouped by sailing, team and experience area'],
  '/service-recovery/': ['A private route for guests to signal friction', 'Capture, route, acknowledge, resolve and follow up', 'Department-level Experience Pulse'],
  '/engagement/': ['Interest-led discovery', 'Cruise and activity context', 'Structured positive interaction'],
  '/ancillary-revenue/': ['Context before offer', 'Cruise-line-owned inventory and checkout', 'Pilot-defined attribution'],
  '/social-commerce/': ['Contextual recommendations', 'Cruise-line-owned commerce', 'Pilot-defined attribution'],
  '/cruise-dashboard/': ['Outcome-led pilot measurement', 'No invented proof', 'Signals grouped by sailing and experience area'],
  '/integration/': ['White-label experience inside the cruise-line app', 'Operator-side identity, biometrics and source records', 'Aggregate KPI and non-identifying health telemetry to Tisonik cloud', 'Frequently asked questions covering integration, privacy, security, operations and ownership'],
  '/all-inclusive-resorts/': ['Guest experience activation for all-inclusive resorts', 'Included experience discovery plus relevant ancillary-revenue opportunities', 'In-stay ratings, service recovery and staff recognition while the resort owns commerce'],
  '/resort-live-demo/': ['Interactive resort guest journey with included and paid experiences', 'Five-minute in-stay rating demo with eight 1–10 questions and two written wrap-up questions', 'Illustrative resort-team recovery, ancillary-revenue and automatic-publication view'],
  '/resort-pilot/': ['One-property resort pilot', 'Defined guest journeys and integration boundaries', 'Pilot measurement before wider rollout'],
  '/resort-guest-engagement-software/': ['Resort guest discovery and participation', 'In-stay ratings and service recovery', 'Recognition and relevant ancillary-revenue discovery'],
  '/hotel-service-recovery-software/': ['Private in-stay issue capture', 'Route, acknowledge, resolve and follow up', 'Act before the guest leaves'],
  '/resort-upselling-software/': ['Contextual premium experience discovery', 'Resort-owned inventory, pricing and checkout', 'Pilot-defined attribution'],
  '/hotel-ancillary-revenue-software/': ['Spa, speciality dining, excursions, cabanas, transfers, celebrations, watersports and other paid experiences', 'Commercial context inside the stay', 'Resort-owned commerce'],
  '/resort-experience-discovery/': ['Included dining, activities, entertainment and wellness discovery', 'Time and context-aware participation', 'Clear included versus premium experience distinction'],
  '/hotel-guest-rating-software/': ['Maximum five-minute in-stay rating flow', 'Exactly 10 standard questions: eight guest pain-point ratings scored 1–10, then What was good? and What could be improved?', 'Each written answer is capped at 400 characters and submitted ratings publish for participating properties'],
  '/product-app/': ['Private interactive walkthrough with illustrative data', 'Public product information is available on the main Tisonik pages'],
  '/pilot/': ['Deploy the complete connected product experience', 'Integrate inside the cruise line’s existing app', 'Measure passenger, crew, recovery, engagement and commercial outcomes end to end'],
  '/imprint/': ['TSquare Ventures LLC operator information', 'Tisonik contact details'],
  '/privacy/': ['Website and business enquiry privacy', 'Passenger and crew deployment roles', 'Contact and data-subject rights'],
  '/terms/': ['Website and demonstration terms', 'Positive-interaction rules', 'Pilot and deployment boundaries'],
  '/cookies/': ['Essential local storage', 'Offline application caching', 'No non-essential tracking in the current site'],
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)

const staticSeoFallback = () => ({
  name: 'tisonik-static-seo-fallback',
  transformIndexHtml(html: string) {
    const title = html.match(/<title>(.*?)<\/title>/s)?.[1] || 'Tisonik'
    const description = html.match(/<meta name="description" content="(.*?)"\s*\/?>(?:\s*)/s)?.[1] || 'Guest-experience interaction layer.'
    const canonical = html.match(/<link rel="canonical" href="(.*?)"/)?.[1] || 'https://tisonik.com/'
    const path = new URL(canonical, 'https://tisonik.com').pathname
    const details = fallbackDetails[path] || fallbackDetails['/']
    const isContactPage = path === '/pilot/' || path === '/resort-pilot/'
    const contactHeading = path === '/resort-pilot/' ? 'Book a live resort demo or discuss a one-property pilot' : 'Request a complete one-ship Tisonik pilot'
    const contactBody = path === '/resort-pilot/' ? 'Tisonik is a guest-experience layer for all-inclusive hotels and resorts. Enable JavaScript to use our secure first-party enquiry form, or email info@tisonik.com.' : 'Tisonik is an add-on inside the cruise line’s existing app—not a separate guest app.'
    const contact = isContactPage ? `<section id="contact"><h2>${escapeHtml(contactHeading)}</h2><p>${escapeHtml(contactBody)}</p><p>Email <a href="mailto:info@tisonik.com">info@tisonik.com</a>.</p></section>` : ''
    const resortNav = '<a href="/">Tisonik home</a> · <a href="/all-inclusive-resorts/">All-inclusive resorts</a> · <a href="/resort-live-demo/">Resort live demo</a> · <a href="/hotel-guest-rating-software/">In-stay ratings</a> · <a href="/hotel-ancillary-revenue-software/">Ancillary revenue</a> · <a href="/resort-pilot/#contact">Resort pilot</a>'
    const cruiseNav = '<a href="/">Tisonik</a> · <a href="/all-inclusive-resorts/">Hotels &amp; resorts</a> · <a href="/passenger-experience/">Passenger experience</a> · <a href="/crew-recognition/">Crew recognition</a> · <a href="/service-recovery/">Service recovery</a> · <a href="/engagement/">Engagement</a> · <a href="/ancillary-revenue/">Ancillary revenue</a> · <a href="/pilot/#contact">Contact</a>'
    const navigation = path.includes('resort') || path.includes('hotel-') || path === '/all-inclusive-resorts/' ? resortNav : cruiseNav
    const fallback = `<main class="seo-fallback" style="max-width:980px;margin:0 auto;padding:48px 24px 72px;font-family:Inter,Arial,sans-serif;color:#171715;background:#faf8f4"><nav aria-label="Primary">${navigation}</nav><article><p style="margin-top:64px;letter-spacing:.18em;font-size:12px;color:#3d7580">TISONIK · OPERATED BY TSQUARE VENTURES LLC · WYOMING, USA</p><h1 style="max-width:850px;font-size:clamp(38px,6vw,72px);line-height:1.02;font-weight:400">${escapeHtml(title)}</h1><p style="max-width:760px;font-size:19px;line-height:1.65;color:#5f5a54">${escapeHtml(description)}</p><h2>What this page covers</h2><ul>${details.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>${contact}</article><footer style="margin-top:64px"><p>Tisonik is operated by TSquare Ventures LLC, a Wyoming (USA) limited liability company.</p><a href="mailto:info@tisonik.com">info@tisonik.com</a> · <a href="/privacy/">Privacy</a> · <a href="/imprint/">Imprint</a></footer></main>`
    const socialTags = [
      html.includes('property="og:type"') ? '' : '<meta property="og:type" content="website"/>',
      html.includes('property="og:description"') ? '' : `<meta property="og:description" content="${escapeHtml(description)}"/>`,
      html.includes('name="twitter:card"') ? '' : '<meta name="twitter:card" content="summary_large_image"/>',
      html.includes('name="twitter:title"') ? '' : `<meta name="twitter:title" content="${escapeHtml(title)}"/>`,
      html.includes('name="twitter:description"') ? '' : `<meta name="twitter:description" content="${escapeHtml(description)}"/>`,
      html.includes('name="twitter:image"') ? '' : '<meta name="twitter:image" content="https://tisonik.com/og-card.png"/>',
    ].join('')
    return html.replace('</head>', `${socialTags}</head>`).replace('<div id="root"></div>', `<div id="root">${fallback}</div>`)
  },
})

export default defineConfig({
  plugins: [react(), staticSeoFallback()],
  build: {
    rollupOptions: {
      input: [
        'index.html',
        'passenger-experience/index.html',
        'crew-recognition/index.html',
        'service-recovery/index.html',
        'engagement/index.html',
        'ancillary-revenue/index.html',
        'social-commerce/index.html',
        'cruise-dashboard/index.html',
        'integration/index.html',
        'all-inclusive-resorts/index.html',
        'resort-live-demo/index.html',
        'resort-pilot/index.html',
        'resort-guest-engagement-software/index.html',
        'hotel-service-recovery-software/index.html',
        'resort-upselling-software/index.html',
        'hotel-ancillary-revenue-software/index.html',
        'resort-experience-discovery/index.html',
        'hotel-guest-rating-software/index.html',
        'product-app/index.html',
        'pilot/index.html',
        'portal/index.html',
        'sandbox/index.html',
        'imprint/index.html',
        'privacy/index.html',
        'terms/index.html',
        'cookies/index.html',
      ],
    },
  },
})
