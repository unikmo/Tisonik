import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { HowItWorksPage, SecurityPage } from './TrustPages'

const Arrow = () => <span aria-hidden="true">→</span>
const contactHref = '/contact/#contact'
const pilotContactHref = '/pilot/#contact'
const demoHref = '/product-app/'

type StoryCrop = 'passenger' | 'crew' | 'recovery' | 'engagement' | 'revenue' | 'keepsake'
type PageKey = 'home' | 'passenger' | 'crew' | 'recovery' | 'engagement' | 'revenue' | 'dashboard' | 'integration' | 'hospitality' | 'security' | 'pilot' | 'contact'

type Detail = {
  eyebrow: string
  title: string
  intro: string
  crop: StoryCrop
  alt: string
  facts: { title: string; body: string }[]
  note?: string
}

const details: Record<Exclude<PageKey, 'home' | 'contact' | 'security' | 'hospitality'>, Detail> = {
  passenger: {
    eyebrow: 'PASSENGER EXPERIENCE',
    title: 'Turn a good passenger moment into an anonymous vibe.',
    intro: 'An adult passenger photographs another adult inside the cruise-line app. The operator privately confirms recognised or unavailable; the sender chooses a prepared compliment and the receiver never learns who sent it.',
    crop: 'passenger',
    alt: 'Multicultural cruise passengers of different ages relaxing together',
    facts: [
      { title: 'No passenger directory', body: 'The sender sees no receiver name, profile, candidate list or confidence score. The capture is discarded after operator-side matching.' },
      { title: 'Anonymous delivery', body: 'The stored vibe has no sender identity and is delivered after randomized delay or in a batch so timing cannot reveal the sender.' },
      { title: 'Adult-only safeguards', body: 'Children are excluded. The operator also blocks same-cabin or booking-group compliments, duplicate attempts and abusive use.' },
      { title: 'Private Top Five card', body: 'Dense ranking gives tied passengers the same position. The passenger—not the cruise line—decides whether to share their own Vibe Card.' },
    ],
  },
  crew: {
    eyebrow: 'CREW RECOGNITION',
    title: 'Let great service be seen while it is happening.',
    intro: 'A passenger frames the visible crew name badge, confirms the match and sends instant recognition while the service moment is still fresh.',
    crop: 'crew',
    alt: 'Diverse cruise crew members sharing a candid end-of-shift moment',
    facts: [
      { title: 'Reliable identification', body: 'Use the in-app camera to photograph the crew member with both their face and visible name badge in frame. The cruise line matches the face against its own crew roster; the badge name supports the match but is not used alone.' },
      { title: 'Biometrics stay operator-side', body: 'The image, face template and match score remain on-device, ship-local or in the cruise line’s own identity service. Tisonik never receives them.' },
      { title: 'Recognition, not ranking', body: 'Passengers choose up to two prepared positive reasons. Public crew leaderboards and passenger-facing star ratings are excluded.' },
      { title: 'Aggregate evidence', body: 'Tisonik receives only threshold-protected sailing, reason and department totals; individual records remain with the operator.' },
    ],
  },
  recovery: {
    eyebrow: 'SERVICE RECOVERY',
    title: 'Resolve the moment while it still matters.',
    intro: 'Tisonik gives guests a private route to signal friction during the journey so the operator has a chance to respond before the sailing ends.',
    crop: 'recovery',
    alt: 'Cruise crew member returning a child’s toy beside their parent',
    facts: [
      { title: 'Private by design', body: 'Service issues are separated from positive recognition and passenger interaction.' },
      { title: 'Closed-loop intent', body: 'The workflow is designed around capture, routing, acknowledgement, resolution and a follow-up signal.' },
      { title: 'Experience Pulse', body: 'A lightweight private pulse can help the operator understand department-level experience without creating a public rating system.' },
    ],
  },
  engagement: {
    eyebrow: 'ENGAGEMENT',
    title: 'Make participation—and feedback—feel effortless.',
    intro: 'Tisonik helps guests discover relevant onboard moments and gives leaders immediate structured feedback after live events through three to five quick questions without free text.',
    crop: 'engagement',
    alt: 'Multigenerational passengers enjoying an inclusive deck activity',
    facts: [
      { title: 'Interest-led', body: 'Guests can voluntarily share cruise-relevant interests that help shape discovery and participation.' },
      { title: 'Context-aware', body: 'Activity and sailing context can make recommendations feel more relevant than a generic feed.' },
      { title: 'Positive interaction', body: 'The interaction model is designed around structured, positive steps rather than unrestricted stranger messaging.' },
      { title: 'Immediate event feedback', body: 'Guests rate live events with a small set of prepared questions. Leaders see results immediately, while the cruise line controls whether aggregated ratings are published.' },
    ],
  },
  revenue: {
    eyebrow: 'ANCILLARY REVENUE',
    title: 'Make relevance commercial without turning the journey into a catalogue.',
    intro: 'Tisonik can create recommendation and intent context around relevant onboard experiences while leaving inventory, price, checkout and payment with the cruise line.',
    crop: 'revenue',
    alt: 'A multicultural family choosing an onboard experience together',
    facts: [
      { title: 'Context before offer', body: 'Commercial relevance can come from expressed interests, onboard participation and timing rather than a generic advertising feed.' },
      { title: 'Host-owned commerce', body: 'Tisonik does not need to own inventory, pricing, checkout or payment; those remain in the cruise line’s commerce environment.' },
      { title: 'Pilot-measurable', body: 'A pilot can define attribution or treatment/control logic before any performance claim is made.' },
    ],
  },
  dashboard: {
    eyebrow: 'PILOT MEASUREMENT',
    title: 'Measure the signals that matter to the pilot.',
    intro: 'Tisonik combines passenger participation, crew recognition, live-event feedback, service recovery and privacy-safe attributed revenue into an operator-facing pilot view.',
    crop: 'crew',
    alt: 'Cruise hospitality team members in a service environment',
    facts: [
      { title: 'Outcome-led', body: 'A pilot should measure agreed behavior and operational outcomes, not just page opens or feature taps.' },
      { title: 'No invented proof', body: 'Public performance claims should follow real pilot evidence rather than demo data.' },
      { title: 'Management context', body: 'Signals can be grouped by sailing, team, experience area and defined pilot KPI.' },
      { title: 'Revenue without passenger identity', body: 'Opaque handoff references can connect Tisonik activity to confirmed booking value without giving Tisonik passenger names, payment data or booking references.' },
    ],
  },
  integration: {
    eyebrow: 'HOW IT INTEGRATES',
    title: 'Designed to fit the cruise app you already have.',
    intro: 'The passenger experience sits inside the cruise line’s existing app. Identity and real-time source records stay in the operator environment; Tisonik cloud receives aggregate outcomes and non-identifying service-health telemetry.',
    crop: 'passenger',
    alt: 'Guest experience in a modern hospitality setting',
    facts: [
      { title: 'Inside the cruise app', body: 'A white-label SDK or embedded web module provides the passenger interface; it can be pre-bundled or cached for the sailing.' },
      { title: 'Operator identity zone', body: 'Passenger/crew identity, badge photos, face templates, source actions and payments stay on-device, ship-local or in cruise-line systems.' },
      { title: 'Tisonik aggregate cloud', body: 'Tisonik receives threshold-protected KPI reports plus uptime, latency, version, sync-success and error-count telemetry—with no person-level identifier.' },
      { title: 'Offline and ship-local', body: 'Core actions use host-approved device storage and ship-local APIs, then aggregate reporting synchronizes when approved connectivity is available.' },
    ],
    note: 'Architecture direction, not a claim of production deployment. Native proximity and host-system integrations require cruise-line implementation.'
  },
  pilot: {
    eyebrow: 'PILOT TISONIK',
    title: 'Pilot the complete Tisonik experience on one ship.',
    intro: 'Deploy the integrated product experience inside the cruise-line app—passenger interaction, crew recognition, private recovery, engagement, ancillary discovery and operator measurement—then validate it end to end.',
    crop: 'engagement',
    alt: 'Guests participating in a premium hospitality experience',
    facts: [
      { title: 'One complete product', body: 'The pilot includes the connected Tisonik experience rather than asking the operator to choose isolated modules.' },
      { title: 'Inside the existing app', body: 'Tisonik is an add-on interaction layer. It does not ask guests to download or learn another app.' },
      { title: 'Evidence across the journey', body: 'Agree activation, recognition, recovery, engagement, commercial and operational measures before launch.' },
    ],
  },
}

const pageFromPath = (path: string): PageKey => {
  const normalized = path.replace(/\/+$/, '') || '/'
  if (normalized === '/') return 'home'
  if (normalized === '/passenger-experience') return 'passenger'
  if (normalized === '/crew-recognition') return 'crew'
  if (normalized === '/service-recovery') return 'recovery'
  if (normalized === '/engagement') return 'engagement'
  if (normalized === '/ancillary-revenue' || normalized === '/social-commerce') return 'revenue'
  if (normalized === '/cruise-dashboard') return 'dashboard'
  if (normalized === '/integration') return 'integration'
  if (normalized === '/hospitality') return 'hospitality'
  if (normalized === '/security') return 'security'
  if (normalized === '/pilot') return 'pilot'
  if (normalized === '/contact') return 'contact'
  return 'home'
}

const Header = ({ page }: { page: PageKey }) => (
  <header className="site-header">
    <a className="brand" href="/" aria-label="Tisonik home">TISONIK</a>
    <nav className="desktop-nav" aria-label="Primary navigation">
      <a href="/">Cruise Lines</a>
      <a href="/hotels/">Hotels &amp; Resorts</a>
      <a href="/service-recovery/">Service Recovery</a>
      <a href="/crew-recognition/">Recognition</a>
      <a href="/ancillary-revenue/">Ancillary Revenue</a>
    </nav>
    <div className="header-actions"><a className="header-cta" href={page === 'pilot' ? pilotContactHref : page === 'contact' ? contactHref : demoHref}>{page === 'pilot' ? 'Request a pilot' : page === 'contact' ? 'Contact' : 'View product demo'} <Arrow /></a><a className="menu-link" href="/integration/">How it works <span className="menu-lines" aria-hidden="true"><i/><i/><i/></span></a></div>
  </header>
)

const Footer = () => (
  <footer className="site-footer">
    <div><strong>TISONIK</strong><span>A product of TSquare Ventures LLC</span></div>
    <p>Guest experience activation for cruise lines and all-inclusive hotels &amp; resorts: service recovery, recognition, engagement, discovery and ancillary revenue.</p>
    <nav className="footer-links" aria-label="Footer navigation"><a href={contactHref}>Contact</a><a href="/imprint/">Imprint</a><a href="/security/">Security</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/cookies/">Cookies</a></nav>
  </footer>
)

const Section = ({ id, eyebrow, title, children, crop, reverse = false, alt, shot, shotAlt }: { id: string; eyebrow: string; title: string; children: ReactNode; crop: StoryCrop; reverse?: boolean; alt: string; shot?: string; shotAlt?: string }) => (
  <section id={id} className={`story-section ${reverse ? 'story-section--reverse' : ''}`}>
    <div className="story-copy"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><div className="story-body">{children}</div></div>
    <figure className={`story-visual story-visual--${crop}`} role="img" aria-label={shot ? `${alt}. ${shotAlt}` : alt}>
      {shot && <span className="story-phone" aria-hidden="true"><img src={shot} alt="" loading="lazy" width="390" height="843" /></span>}
    </figure>
  </section>
)

const EntityDefinition = () => (
  <section className="entity-definition" aria-labelledby="what-is-tisonik">
    <p className="eyebrow">WHAT TISONIK IS</p>
    <h2 id="what-is-tisonik">Not another app. One experience layer inside the guest journey you already own.</h2>
    <p>Tisonik is a white-label guest-experience interaction layer for cruise lines and all-inclusive hotels and resorts. It fits into the operator’s existing app or digital guest journey without replacing the booking, property-management or commerce stack. The operator retains control of its brand, inventory, pricing, checkout and payment.</p>
    <div className="entity-links" aria-label="Tisonik product areas">
      <a href="/">Cruise lines</a><a href="/hotels/">Hotels &amp; resorts</a><a href="/service-recovery/">Service recovery</a><a href="/crew-recognition/">Recognition</a><a href="/ancillary-revenue/">Ancillary revenue</a><a href="/integration/">How it works</a><a href="/security/">Security</a>
    </div>
  </section>
)

const buyerFaqs = [
  ['Where does Tisonik run?', 'The passenger experience runs inside the cruise line’s existing app as a white-label SDK or embedded module. Identity resolution and source actions run on-device, ship-local or in the operator’s systems. Tisonik cloud receives only aggregate KPI reports and non-identifying service-health telemetry.'],
  ['How do passenger privacy and data residency work?', 'Passenger and crew records stay in your environment and your region. Tisonik receives no names, photos, biometric templates or person-level identifiers, and any group under 20 is suppressed.'],
  ['How much IT integration is required?', 'One embedded feature connects to scoped host interfaces for launch context, operator-side identity, ship operations, booking outcomes and aggregate reporting. The pilot defines each interface before deployment.'],
  ['What happens when ship connectivity is limited?', 'Core actions run on the device and ship-local services, so the public internet is not needed for every interaction. Approved aggregate reports sync when the link returns.'],
  ['How does Tisonik pass cybersecurity and vendor review?', 'Production requirements: signed requests, tenant separation, role-based access, replay protection, allow-listed aggregate schemas, body-free analytics logs and independent security testing.'],
  ['How are anonymous passenger vibes, safety and minors handled?', 'Adults only. Children cannot send, receive or be matched. The operator resolves the receiver and returns no name, each sender is capped at five a sailing day, the capture is discarded after matching, and compliments arrive without the sender’s identity or exact time.'],
  ['Can passengers choose to connect?', 'Yes, through the separate VConnect flow—not by replying to an Anonymous Vibe. An adult may send one predefined connection request per sailing day. The recipient can accept, decline, block or report; the requester receives an update only after acceptance. Thereafter, both passengers can use prepared public-venue, activity and time options. Free text, cabins, room numbers, live location and dating-oriented prompts are excluded.'],
  ['Does Anonymous Vibe require a second consent screen?', 'No. The cruise line can include Tisonik recognition as a clearly stated purpose in its adult boarding imaging enrolment. Adults who accept are enrolled once for that sailing and are not interrupted again when using Anonymous Vibe; those who decline or opt out are excluded from matching.'],
  ['Can the cruise line publish passenger rankings or identities?', 'No. Top Five uses dense score positions and the result is private. Only the passenger can choose to share their own Vibe Card. Event RSVPs show a count by default; chosen name/image visibility is a separate passenger choice limited to confirmed attendees.'],
  ['Does crew recognition become employee ranking?', 'No public leaderboard or passenger-facing crew rating is created. Identity verification stays operator-side, recognition uses prepared positive reasons, and employment decisions remain solely with the cruise line.'],
  ['Will this create additional operational workload?', 'Prepared response blocks, routing rules and priority states turn activity into structured operational signals instead of another free-text inbox.'],
  ['Can the revenue attribution be trusted?', 'Your systems resolve bookings and send signed confirmed, cancelled, refunded and net-value totals. Tisonik does not rely on self-reported clicks and never receives booking references.'],
  ['Who controls the brand and published ratings?', 'The cruise line controls the feature name, co-branding, placement and whether any aggregate event rating is published.'],
  ['Does the cruise line retain ownership and avoid lock-in?', 'Yes. You keep identity, commerce and every source record. Tisonik can be removed without migrating a passenger or biometric database from us.'],
]

const faqStructuredData = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: buyerFaqs.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })),
})

const BuyerReadiness = ({ schema = true }: { schema?: boolean }) => <section className="buyer-readiness" aria-labelledby="buyer-readiness-title">{schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqStructuredData }}/>}<p className="eyebrow">FAQs</p><h2 id="buyer-readiness-title">Frequently asked questions about Tisonik.</h2><div className="buyer-readiness-grid">{buyerFaqs.map(([question,answer],index)=><details key={question} open={index===0}><summary><span>{String(index+1).padStart(2,'0')}</span><h3>{question}</h3><i aria-hidden="true">+</i></summary><p>{answer}</p></details>)}</div></section>

// The first thing on the homepage: Tisonik and four promises, readable before any video plays, beside a silent film.
// The film and the crew photo share one frame. The film starts by itself unless the visitor prefers reduced motion, and can always be paused.
const filmHooks: [string, string][] = [
  ['No new app required.', 'Works inside the app you already have, or from the card on any phone.'],
  ['A welcome that becomes a keepsake.', 'Cruise Director greeting on day one. Cruise highlights are added to the same welcome code.'],
  ['Offers that sell themselves.', '“Your friend Dee is going. 3 places left.”'],
  ['Hear it before the review.', 'Five short questions the day before guests leave, pushed by your Cruise Director and animation team. You can still fix it.'],
]
const filmAlt = 'A card on the bed, a welcome from the Cruise Director, a friend going to dinner with three places left, a show rated as it ends, crew thanked by name, and a low score reaching the desk.'

const HomeFilm = () => {
  const [slide, setSlide] = useState<'film' | 'crew'>('film')
  const [playing, setPlaying] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const element = video.current
    if (slide !== 'film' || !element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    element.play().catch(() => {})
  }, [slide])
  const toggle = () => {
    const element = video.current
    if (!element) return
    if (element.paused) element.play().catch(() => {})
    else element.pause()
  }
  return <section className="film-top" aria-label="What Tisonik does">
    <p className="film-wordmark">Tisonik<span>.</span></p>
    <p className="film-tagline">The guest experience layer for cruise lines.</p>
    <div className="film-tabs" role="group" aria-label="Choose what to show">
      {([['film', 'The film'], ['crew', 'Your crew']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={slide === key} onClick={() => setSlide(key)}>{label}</button>)}
    </div>
    <figure className="film-frame">
      {slide === 'film'
        ? <video ref={video} muted loop playsInline preload="metadata" poster="/media/tisonik-film-cruise-poster.jpg" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} aria-label={filmAlt}>
          <source src="/media/tisonik-film-cruise.webm" type="video/webm" />
        </video>
        : <img src="/media/hero-centered-black-crew-amara.jpg" alt="Black cruise crew member welcoming guests onboard" />}
      {slide === 'film' && <button type="button" className="film-toggle" onClick={toggle}>{playing ? 'Pause film' : 'Play film'}</button>}
    </figure>
    <ul className="film-hooks">{filmHooks.map(([line]) => <li key={line}><i aria-hidden="true" /><strong>{line}</strong></li>)}</ul>
    <div className="film-cta"><a className="pilot-button pilot-button--primary" href="#pilot">See the one-ship pilot <Arrow /></a></div>
  </section>
}

const Home = () => (
  <>
    <HomeFilm />
    <section id="top" className="hero">
      <p className="eyebrow hero-eyebrow">GUEST EXPERIENCE FOR CRUISE LINES &amp; ALL-INCLUSIVE RESORTS</p>
      <h1>Transform guest experiences. <span>Grow ancillary revenue.</span></h1>
      <p className="hero-positioning">A white-label experience layer inside the digital journey you already own—not another app for guests to download.</p>
    </section>
    <section className="hero-after" aria-labelledby="hero-after-title">
      <p id="hero-after-title" className="hero-after-copy">Tisonik helps cruise lines and resort operators personalise interactions, recognise excellence, recover service issues earlier and surface more relevant experiences.</p>
      <div className="pilot-actions">
        <a className="pilot-link" href={demoHref}>VIEW CRUISE PRODUCT DEMO <Arrow /></a>
        <a className="pilot-link" href="/hotels/">EXPLORE HOTELS &amp; RESORTS <Arrow /></a>
      </div>
    </section>
    <section className="quiet-proof" aria-label="Tisonik hospitality environments">
      <p className="eyebrow">ONE EXPERIENCE LAYER · TWO HOSPITALITY ENVIRONMENTS</p>
      <div className="proof-grid">
        <article><strong>Cruise lines</strong><span>Passenger experience, crew recognition, service recovery, engagement and onboard revenue discovery.</span><a className="pilot-link" href="#passenger-experience">Explore cruise <Arrow /></a></article>
        <article><strong>Hotels &amp; all-inclusive resorts</strong><span>Guest discovery, in-stay service recovery, staff recognition, ratings and ancillary-revenue activation.</span><a className="pilot-link" href="/hotels/">Explore resorts <Arrow /></a></article>
        <article><strong>Controlled pilots</strong><span>Start with one ship or one property, define success measures first, then scale, iterate or stop on evidence.</span></article>
      </div>
    </section>
    <section className="manifesto" aria-label="Tisonik cruise promise"><p className="eyebrow">FOR THE CRUISE JOURNEY</p><h2>Built to feel natural onboard.</h2><p className="manifesto-copy">A quieter interaction layer for guests, crew and the moments between the itinerary.</p></section>
    <Section id="passenger-experience" eyebrow="PASSENGER EXPERIENCE" title="Make the app feel more alive." crop="passenger" alt="Multicultural cruise passengers of different ages relaxing together" shot="/media/portal-welcome.jpg" shotAlt="The guest page: a welcome from the Cruise Director, then a show the guest has just seen, ready to rate with one tap"><p>Give guests more relevant reasons to interact throughout the sailing—without making the experience feel busy, intrusive or transactional.</p></Section>
    <Section id="crew-recognition" eyebrow="CREW RECOGNITION" title="Let great service be seen." crop="crew" alt="Diverse cruise crew members sharing a candid end-of-shift moment" reverse shot="/media/portal-crew-recognition.jpg" shotAlt="The guest page: a crew member chosen, two preset reasons picked, ready to send"><p>A simple thank-you becomes visible, measurable and memorable for guest, crew and operator.</p></Section>
    <Section id="service-recovery" eyebrow="SERVICE RECOVERY" title="Fix it while it still matters." crop="recovery" alt="Cruise crew member returning a child’s toy beside their parent" shot="/media/portal-service-recovery.jpg" shotAlt="The guest page: a low stateroom score, answered with thanks and a promise that the team has been told"><p>Guests signal friction discreetly. You respond before the experience is over.</p></Section>
    <Section id="engagement" eyebrow="LIVE EXPERIENCE FEEDBACK" title="Improve events while the sailing is still underway." crop="engagement" alt="Multigenerational passengers enjoying an inclusive deck activity" reverse shot="/media/portal-live-rating.jpg" shotAlt="The guest page: Just finished, how was the evening show, five one-tap answers"><p>After a live event, ask three to five structured questions with prepared response blocks. Leaders see feedback immediately; the cruise line decides which aggregated ratings to publish.</p></Section>
    <Section id="ancillary-revenue" eyebrow="ANCILLARY REVENUE" title="Make relevance commercial." crop="revenue" alt="A multicultural family choosing an onboard experience together" shot="/media/portal-offers-keepsake.jpg" shotAlt="The guest page: Chef table dinner, your friend Dee is going, 3 places left, and a button to hold a place"><p>When guests are already engaged, the right experiences appear naturally. Checkout and payment stay with you.</p></Section>
    <Section id="keepsake" eyebrow="THE KEEPSAKE · LESS PAPER" title="Less disposable print. A keepsake that lasts." crop="keepsake" alt="A UNIKMO card standing on a made-up cabin bed" reverse><p>One card replaces the paper pile. Our cruise media team adds cruise highlights to the same welcome code. Curated moments are an optional extra.</p><p>UNIKMO cards can be customised to your cruise line’s brand. <a href="#pilot">Talk to us</a>.</p></Section>
    <EntityDefinition />
    <section className="quiet-proof"><p className="eyebrow">BUILT TO FIT THE CRUISE JOURNEY</p><div className="proof-grid"><article><strong>Inside the existing app</strong><span>No competing destination for the guest.</span></article><article><strong>Immediate operational feedback</strong><span>Structured event ratings reach leaders while they can still act.</span></article><article><strong>Revenue evidence without identity</strong><span>Confirmed booking value is attributed through opaque references and aggregated outcomes.</span></article></div></section>
    <BuyerReadiness />
    <section id="pilot" className="pilot-section"><p className="eyebrow">ONE SHIP. THE COMPLETE EXPERIENCE.</p><h2>See the product, then pilot it inside the cruise app guests already use.</h2><p>Walk through the connected passenger and management experience, then request a complete one-ship pilot.</p><div className="pilot-actions"><a className="pilot-button pilot-button--primary" href={pilotContactHref}>Request a pilot <Arrow /></a><a className="pilot-button pilot-button--secondary" href={demoHref}>View product demo <Arrow /></a></div></section>
  </>
)

const PilotContactForm = ({ mode = 'pilot' }: { mode?: 'pilot' | 'contact' }) => {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(new URLSearchParams(window.location.search).get('sent') === '1' ? 'sent' : 'idle')
  const [errorMessage, setErrorMessage] = useState('')
  const submitEnquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('sending')
    setErrorMessage('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/pilot-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workEmail: form.get('email'),
          name: form.get('name'),
          roleTitle: form.get('role') || '',
          company: form.get('company'),
          message: form.get('message'),
          privacyConsent: form.get('privacy_consent') === 'yes',
          website: form.get('_honey') || '',
          sourcePath: mode === 'contact' ? '/contact/' : '/pilot/',
        }),
      })
      if (!response.ok) {
        const problem = await response.json().catch(() => ({})) as { error?: string, invalidFields?: string[] }
        if (response.status === 400 && problem.error === 'invalid_enquiry') {
          const labels: Record<string,string> = { workEmail:'work email', name:'name', company:'company', roleTitle:'role', message:'pilot details', privacyConsent:'privacy consent' }
          const fields = (problem.invalidFields || []).map(field => labels[field] || field).join(', ')
          setErrorMessage(fields ? `Please check: ${fields}.` : 'Please check the form details and try again.')
        } else setErrorMessage('The secure form is temporarily unavailable. Please try again later.')
        setStatus('error')
        return
      }
      setStatus('sent')
      event.currentTarget.reset()
    } catch {
      setErrorMessage('The secure form is temporarily unavailable. Please try again later.')
      setStatus('error')
    }
  }
  const isGeneral = mode === 'contact'
  return <section id="contact" className="contact-form-section" aria-labelledby="pilot-contact-title">
    <div className="contact-form-copy"><p className="eyebrow">{isGeneral ? 'CONTACT TISONIK' : 'REQUEST A PILOT'}</p><h1 id="pilot-contact-title">{isGeneral ? 'Tell us what you need.' : 'Plan a complete one-ship Tisonik pilot.'}</h1><p>{isGeneral ? 'Use the secure form for product, partnership, privacy or enterprise enquiries. We’ll respond directly to the work email you provide.' : 'You have seen the product. Tell us about your existing app, target ship and timing, and we’ll respond personally about a complete one-ship pilot.'}</p><div className="contact-confidence"><span>Secure contact form</span><span>Direct response from TSquare Ventures LLC</span><span>No mailing list</span></div></div>
    <form className="pilot-contact-form" onSubmit={submitEnquiry}>
      <input className="form-honeypot" type="text" name="_honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {status === 'sent' && <p className="form-success" role="status">Thank you. Your Tisonik enquiry is safely recorded. We’ll reply personally.</p>}
      {status === 'error' && <p className="form-error" role="alert">{errorMessage || 'The secure form is temporarily unavailable. Please try again later.'}</p>}
      <label>Work email<input required name="email" type="email" autoComplete="email" placeholder="name@cruiseline.com" /></label>
      <div className="contact-form-row"><label>Name<input required name="name" autoComplete="name" placeholder="Your name" /></label><label>Role<input name="role" autoComplete="organization-title" placeholder="Guest Experience, Digital…" /></label></div>
      <label>{isGeneral ? 'Company or organisation' : 'Cruise line or company'}<input required name="company" autoComplete="organization" placeholder="Organisation" /></label>
      <label>{isGeneral ? 'How can we help?' : 'What should we know about your current app or pilot?'}<textarea required name="message" rows={5} placeholder={isGeneral ? 'Product, partnership, privacy or enterprise enquiry…' : 'Current cruise app, target ship or sailing, integration priorities, timing…'} /></label>
      <label className="form-consent"><input required type="checkbox" name="privacy_consent" value="yes" /><span>I agree that TSquare Ventures LLC may use these details to respond to my enquiry, as described in the <a href="/privacy/">privacy policy</a>.</span></label>
      <button className="pilot-button contact-submit" type="submit" disabled={status === 'sending' || status === 'sent'}>{status === 'sending' ? 'Sending securely…' : status === 'sent' ? 'Enquiry received' : isGeneral ? <>Send enquiry <Arrow /></> : <>Request a pilot conversation <Arrow /></>}</button>
    </form>
  </section>
}

const hospitalityRows: [string, string, string][] = [
  ['Welcome from', 'The Cruise Director', 'The General Manager'],
  ['Offers', '“Your friend Dee is going. 3 places left.”', '“Tonight’s tasting menu. 5 places left.” Guests never see each other.'],
  ['Hearing it early', 'Five short questions the day before guests leave, pushed by your Cruise Director and animation team', 'Events rated the moment they end; a low score reaches reception straight away'],
  ['The keepsake', 'Cruise highlights added to the same welcome code by our cruise media team', 'A card guests take home, with the welcome behind it'],
  ['Where to start', 'One ship', 'One property'],
]

const sharedPromises: [string, string][] = [
  ['No new app required.', 'Works inside the app you already have, or from the card on any phone.'],
  ['A welcome that becomes a keepsake.', 'A greeting on day one, on a card guests can keep.'],
  ['Offers that sell themselves.', 'Places left, shown at the moment they matter.'],
  ['Hear it before the review.', 'Find out what guests think while you can still fix it.'],
]

const HospitalityPage = () => <>
  <section className="detail-hero hosp-hero"><p className="eyebrow">ONE EXPERIENCE LAYER · TWO HOSPITALITY ENVIRONMENTS</p><h1>One guest experience layer for cruise lines and hotels.</h1><p className="detail-intro">A UNIKMO card opens a Tisonik guest page: a welcome, offers, ratings and thanks, with no new app required. The same layer, set up for a ship or for a property.</p></section>
  <section className="hosp-films" aria-label="The Tisonik films">
    {([['Cruise lines', 'cruise', '/', 'Explore cruise'], ['Hotels & resorts', 'hotel', '/hotels/', 'Explore hotels']] as const).map(([name, key, href, cta]) => <article key={key}>
      <video muted loop playsInline controls preload="none" poster={`/media/tisonik-film-${key}-poster.jpg`} aria-label={`The Tisonik film for ${name.toLowerCase()}`}><source src={`/media/tisonik-film-${key}.webm`} type="video/webm" /></video>
      <h2>{name}</h2><a className="pilot-link" href={href}>{cta.toUpperCase()} <Arrow /></a>
    </article>)}
  </section>
  <section className="quiet-proof"><p className="eyebrow">THE SAME FOUR PROMISES</p><div className="proof-grid">{sharedPromises.map(([line, more]) => <article key={line}><strong>{line}</strong><span>{more}</span></article>)}</div></section>
  <section className="hosp-compare" aria-labelledby="hosp-compare-title"><p className="eyebrow">WHERE THEY DIFFER</p><h2 id="hosp-compare-title">Set up for how each place actually works.</h2>
    <div className="hosp-table" role="table"><div role="row" className="hosp-head"><span role="columnheader" /><span role="columnheader">Cruise</span><span role="columnheader">Hotel</span></div>{hospitalityRows.map(([label, cruise, hotel]) => <div role="row" key={label}><strong role="rowheader">{label}</strong><span role="cell">{cruise}</span><span role="cell">{hotel}</span></div>)}</div>
    <p className="hosp-custom">UNIKMO cards can be customised to your brand. <a href={contactHref}>Talk to us</a>.</p>
  </section>
  <section className="pilot-section"><p className="eyebrow">START SMALL</p><h2>One ship, or one property.</h2><p>Define the guest journeys and success measures first. Then scale, iterate or stop.</p><div className="pilot-actions"><a className="pilot-button pilot-button--primary" href={pilotContactHref}>See the one-ship pilot <Arrow /></a><a className="pilot-button" href="/resort-pilot/#contact">Start with one property <Arrow /></a><a className="pilot-link" href={demoHref}>VIEW PRODUCT DEMO <Arrow /></a></div></section>
</>

const DetailPage = ({ page }: { page: Exclude<PageKey, 'home'> }) => {
  if (page === 'security') return <><SecurityPage /><section className="detail-next"><p className="eyebrow">THE CONNECTED PRODUCT</p><h2>See how this fits into the complete Tisonik experience.</h2><a className="pilot-button" href={demoHref}>View product demo <Arrow /></a></section></>
  if (page === 'integration') {
    const cruise = details.integration
    return <><HowItWorksPage cruiseDetail={<><section className="detail-facts" id="details">{cruise.facts.map((fact,index)=><article key={fact.title}><span>0{index+1}</span><h3>{fact.title}</h3><p>{fact.body}</p></article>)}</section>{cruise.note && <p className="architecture-note">{cruise.note}</p>}<BuyerReadiness schema={false} /></>} /><section className="detail-next"><p className="eyebrow">THE CONNECTED PRODUCT</p><h2>See how this fits into the complete Tisonik experience.</h2><a className="pilot-button" href={demoHref}>View product demo <Arrow /></a></section></>
  }
  if (page === 'hospitality') return <HospitalityPage />
  if (page === 'pilot') return <PilotContactForm mode="pilot" />
  if (page === 'contact') return <PilotContactForm mode="contact" />
  const detail = details[page]
  return <>
    <section className="detail-hero"><p className="eyebrow">{detail.eyebrow}</p><h1>{detail.title}</h1><p className="detail-intro">{detail.intro}</p><figure className={`detail-visual story-visual--${detail.crop}`} role="img" aria-label={detail.alt} /></section>
    <section className="detail-facts" id="details">{detail.facts.map((fact,index)=><article key={fact.title}><span>0{index+1}</span><h2>{fact.title}</h2><p>{fact.body}</p></article>)}</section>
    {detail.note && <p className="architecture-note">{detail.note}</p>}
    <EntityDefinition />
    <section className="detail-next"><p className="eyebrow">THE CONNECTED PRODUCT</p><h2>See how this fits into the complete Tisonik experience.</h2><a className="pilot-button" href={demoHref}>View product demo <Arrow /></a></section>
  </>
}

export default function MarketingSite() {
  const page = pageFromPath(window.location.pathname)
  return <div className="tisonik-site" data-page={page}><Header page={page} /><main>{page === 'home' ? <Home /> : <DetailPage page={page} />}</main><Footer /></div>
}
