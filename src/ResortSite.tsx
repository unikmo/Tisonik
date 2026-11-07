import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'

const Arrow = () => <span aria-hidden="true">→</span>

const resortImages = {
  hero: 'https://images.unsplash.com/photo-1741316041551-ed5d92b2f14f?auto=format&fit=crop&fm=jpg&q=82&w=2200',
  pool: 'https://images.unsplash.com/photo-1783931420467-e54029948fc9?auto=format&fit=crop&fm=jpg&q=82&w=1800',
  staff: 'https://images.unsplash.com/photo-1759143545924-beb85b33c0f1?auto=format&fit=crop&fm=jpg&q=82&w=1800',
  dining: 'https://images.unsplash.com/photo-1760669348715-b2314a8af89a?auto=format&fit=crop&fm=jpg&q=82&w=1800',
  spa: 'https://images.unsplash.com/photo-1639162906614-0603b0ae95fd?auto=format&fit=crop&fm=jpg&q=82&w=1800',
  sunset: 'https://images.unsplash.com/photo-1772064901616-00264a6c4104?auto=format&fit=crop&fm=jpg&q=82&w=1800',
}

const liveDemoHref = '/resort-live-demo/'
const pilotHref = '/resort-pilot/#contact'

type ResortPageKey =
  | 'pillar'
  | 'demo'
  | 'pilot'
  | 'guest-engagement'
  | 'service-recovery'
  | 'upselling'
  | 'ancillary'
  | 'experience-discovery'
  | 'ratings'

const resortPageFromPath = (path: string): ResortPageKey => {
  const normalized = path.replace(/\/+$/, '') || '/'
  if (normalized === '/resort-live-demo') return 'demo'
  if (normalized === '/resort-pilot') return 'pilot'
  if (normalized === '/resort-guest-engagement-software') return 'guest-engagement'
  if (normalized === '/hotel-service-recovery-software') return 'service-recovery'
  if (normalized === '/resort-upselling-software') return 'upselling'
  if (normalized === '/hotel-ancillary-revenue-software') return 'ancillary'
  if (normalized === '/resort-experience-discovery') return 'experience-discovery'
  if (normalized === '/hotel-guest-rating-software') return 'ratings'
  return 'pillar'
}

const Header = ({ compact = false }: { compact?: boolean }) => (
  <header className="site-header resort-header">
    <a className="brand" href="/hotels/" aria-label="Tisonik resorts home">TISONIK</a>
    {!compact && <nav className="resort-header-nav" aria-label="Resort navigation">
      <a href="/hotels/#experience">Experience</a>
      <a href="/hotels/#revenue">Revenue</a>
      <a href="/hotels/#ratings">Ratings</a>
      <a href="/hotels/#integration">Integration</a>
      <a href="/hotels/#pilot">Pilot</a>
    </nav>}
    <div className="resort-header-actions">
      <a className="resort-header-link" href={liveDemoHref}>Live demo</a>
      <a className="resort-header-cta" href={pilotHref}>Book a live demo <Arrow /></a>
    </div>
  </header>
)

const Footer = () => (
  <footer className="site-footer resort-footer">
    <div><strong>TISONIK</strong><span>A product of TSquare Ventures LLC</span></div>
    <p>Guest experience activation for premium hotels and resorts: discovery, ancillary revenue, in-stay ratings, service recovery and staff recognition.</p>
    <nav className="footer-links" aria-label="Footer navigation">
      <a href="/hotels/">Resorts</a>
      <a href={liveDemoHref}>Live demo</a>
      <a href="/hotel-ancillary-revenue-software/">Ancillary revenue</a>
      <a href="/resort-pilot/">Pilot</a>
      <a href="/contact/">Contact</a>
      <a href="/integration/">How it works</a>
      <a href="/security/">Security</a>
      <a href="/privacy/">Privacy</a>
      <a href="/imprint/">Imprint</a>
    </nav>
  </footer>
)

const ButtonRow = () => (
  <div className="resort-button-row">
    <a className="resort-primary-button" href={liveDemoHref}>View the live demo <Arrow /></a>
    <a className="resort-secondary-button" href={pilotHref}>Explore a resort pilot <Arrow /></a>
  </div>
)

const PhonePreview = () => (
  <div className="resort-phone" aria-label="Illustrative Tisonik resort guest experience">
    <div className="resort-phone-top"><span>AZURE BAY RESORT · DEMO</span><span>10:24</span></div>
    <h3>Your day, made easier.</h3>
    <article>
      <small>INCLUDED · 11:30</small>
      <strong>Reef discovery walk</strong>
      <span>Beach House · 8 places remaining</span>
      <b>Included in your stay</b>
    </article>
    <article>
      <small>JUST FOR YOU · 15:30</small>
      <strong>Ocean-view spa opening</strong>
      <span>60 min · Serenity Pavilion</span>
      <b>Reserve with the resort</b>
    </article>
  </div>
)

type FeatureProps = {
  number: string
  eyebrow: string
  title: string
  children: ReactNode
  image: string
  alt: string
  reverse?: boolean
  imagePosition?: string
  imageScale?: number
  id?: string
}

const Feature = ({ number, eyebrow, title, children, image, alt, reverse = false, imagePosition, imageScale, id }: FeatureProps) => (
  <section id={id} className={`resort-feature ${reverse ? 'is-reverse' : ''}`}>
    <div className="resort-feature-copy">
      <span className="resort-number">{number}</span>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <div className="resort-feature-body">{children}</div>
    </div>
    <figure className="resort-feature-image"><img src={image} alt={alt} loading="lazy" style={{ objectPosition: imagePosition, transform: imageScale ? `scale(${imageScale})` : undefined }} /></figure>
  </section>
)

const ratingWords = ['Poor', 'Fair', 'Okay', 'Great', 'Superb'] as const
const ratingAreas = ['Reception', 'Your room', 'Dining', 'Spa & pool', 'Bar & lounge'] as const

const RatingPreview = ({ compact = false }: { compact?: boolean }) => (
  <div className={`resort-rating-preview ${compact ? 'is-compact' : ''}`}>
    <div className="resort-rating-head">
      <div><small>HOW IS TODAY? · DEMO</small><strong>Reception</strong></div>
      <span>One tap</span>
    </div>
    <p>Only rate what you used. If something is not right, the team hears about it today.</p>
    <div className="rating-scale rating-scale--words" aria-hidden="true">{ratingWords.map(word => <span key={word}>{word}</span>)}</div>
    {!compact && <div className="rating-roundup-preview">
      <span>A low score reaches the team at once</span>
      <span>Private to the hotel team. Not published by Tisonik.</span>
    </div>}
  </div>
)
const StayRatingDemo = () => {
  const [picked, setPicked] = useState<Record<string, number>>({})
  const answers = Object.values(picked)
  const low = answers.some(index => index <= 1)
  return <div className="rating-demo-card">
    <div className="rating-demo-progress"><span>HOW IS TODAY GOING? · DEMO</span><span>ONE TAP PER AREA</span></div>
    <h3>Only rate what you used.</h3>
    <p>Guests rate each area from Poor to Superb. If something is not right, the team hears about it today.</p>
    {ratingAreas.map(area => <div key={area} className="rating-demo-area">
      <strong>{area}</strong>
      <div className="rating-demo-words" role="group" aria-label={area}>
        {ratingWords.map((word, index) => <button key={word} type="button" className={picked[area] === index ? 'is-selected' : ''} aria-pressed={picked[area] === index} disabled={picked[area] !== undefined} onClick={() => setPicked({ ...picked, [area]: index })}>{word}</button>)}
      </div>
    </div>)}
    {answers.length > 0 && <p className="rating-demo-note" role="status">{low ? 'Thank you. We have told the team so they can put it right today.' : 'Thank you.'}</p>}
    {answers.length > 0 && <button type="button" onClick={() => setPicked({})}>Try again</button>}
  </div>
}

const filmHooks: [string, string][] = [
  ['No new app required.', 'Works inside the app you already have, or from the card on any phone.'],
  ['A welcome that becomes a keepsake.', 'A greeting from your General Manager on day one, on a card guests take home.'],
  ['Offers that sell themselves.', '“Tonight’s tasting menu. 5 places left.”'],
  ['Fix it before the review.', 'A low score reaches reception straight away, while the guest is still in the building.'],
]
const filmAlt = 'A card on the bed, a welcome from the General Manager, a tasting menu with five places left, an event rated as it ends, a team member recognised, and a low score reaching reception.'

const HotelFilm = () => {
  const [slide, setSlide] = useState<'film' | 'card'>('film')
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
    <h1 className="film-tagline">The guest experience layer for hotels.</h1>
    <div className="film-tabs" role="group" aria-label="Choose what to show">
      {([['film', 'The film'], ['card', 'The card']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={slide === key} onClick={() => setSlide(key)}>{label}</button>)}
    </div>
    <figure className="film-frame">
      {slide === 'film'
        ? <video ref={video} muted loop playsInline preload="metadata" poster="/media/tisonik-film-hotel-poster.jpg" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} aria-label={filmAlt}>
          <source src="/media/tisonik-film-hotel.webm" type="video/webm" />
        </video>
        : <img src="/media/unikmo-card-on-bed-hotel.webp" alt="A UNIKMO welcome card resting on a hotel bed" />}
      {slide === 'film' && <button type="button" className="film-toggle" onClick={toggle}>{playing ? 'Pause film' : 'Play film'}</button>}
    </figure>
    <ul className="film-hooks">{filmHooks.map(([line]) => <li key={line}><i aria-hidden="true" /><strong>{line}</strong></li>)}</ul>
    <div className="film-cta"><a className="resort-primary-button" href="#pilot">Start with one property <Arrow /></a></div>
    <a className="film-quiet" href="https://www.unikmo.com/hotels">See the physical welcome card <Arrow /></a>
  </section>
}

const ResortPillar = () => (
  <div className="tisonik-site resort-site">
    <Header />
    <main>
      <HotelFilm />

      <section className="resort-neutral-proof">
        <span>ENGINEERED FOR PREMIUM & LUXURY HOSPITALITY</span>
        <strong>More guest participation.</strong>
        <strong>Earlier service recovery.</strong>
        <strong>More visible staff recognition.</strong>
        <strong>More ancillary revenue moments.</strong>
      </section>

      <section className="resort-why" aria-labelledby="resort-why-title">
        <p className="eyebrow">WHY IT EXISTS</p>
        <h2 id="resort-why-title">Guests stay quiet, then say it online.</h2>
        <div className="resort-why-grid">
          <p>Guests often stay quiet during the stay, then share problems online when it is too late.</p>
          <p>Great service goes unnoticed.</p>
          <p>Relevant experiences stay undiscovered.</p>
        </div>
        <strong className="resort-why-line">Tisonik changes the timing.</strong>
      </section>

      <section className="resort-intro">
        <p className="eyebrow">A MORE CONNECTED RESORT EXPERIENCE</p>
        <h2>Everything guests love.<br />Easier to discover.</h2>
        <p>Dining, activities, entertainment, wellness and resort moments are easier to find. Tisonik also creates room for relevant paid experiences without taking over the resort&apos;s inventory, pricing, checkout or payment.</p>
      </section>

      <section id="experience" className="resort-feature-wrap">
        <Feature number="01" eyebrow="DISCOVER & PARTICIPATE" title="Make the resort feel alive." image={resortImages.pool} alt="Guest enjoying a landscaped resort pool">
          <p>Help guests move naturally from poolside to activities, dining, entertainment and shared experiences. Less “we didn&apos;t know that was happening.” More of the stay actually experienced.</p>
        </Feature>

        <Feature number="02" eyebrow="SERVICE RECOVERY" title="Fix the moment before it becomes the review." image={resortImages.staff} alt="Guest-service team member assisting at a hotel reception" reverse>
          <p>Give guests a private path to say when something is wrong while they are still on property. Route the signal, acknowledge it, resolve it and follow up before departure.</p>
        </Feature>

        <Feature number="03" eyebrow="STAFF RECOGNITION" title="Celebrate the people who make the difference." image={resortImages.dining} alt="Guests enjoying a premium dining experience at a tropical resort">
          <p>Let guests recognize the waiter, housekeeper, bartender, kids-club host, concierge or activity team member who made the stay better—without turning hospitality into a public employee leaderboard.</p>
        </Feature>

        <Feature id="revenue" number="04" eyebrow="ANCILLARY REVENUE" title="More of the stay can become bookable." image={resortImages.spa} alt="Guest receiving a relaxing spa treatment" reverse>
          <p>The opportunity extends well beyond one spa offer. Tisonik can surface paid experiences at relevant moments while the resort keeps inventory, pricing, checkout and payment.</p>
          <div className="resort-opportunity-list" aria-label="Illustrative ancillary revenue opportunities">
            <span>Spa &amp; wellness</span>
            <span>Speciality dining</span>
            <span>Excursions</span>
            <span>Cabanas &amp; daybeds</span>
            <span>Private transfers</span>
            <span>Celebrations</span>
            <span>Watersports</span>
          </div>
          <a className="resort-text-link" href="/hotel-ancillary-revenue-software/">See the ancillary revenue use case <Arrow /></a>
        </Feature>
      </section>

      <section id="ratings" className="resort-ratings-section">
        <div className="resort-ratings-copy">
          <p className="eyebrow">IN-STAY RATINGS</p>
          <h2>Ask while there is still time to make it right.</h2>
          <p>Guests rate their day with one tap per area, from Poor to Superb. A low score reaches the team at once, while the guest is still on property. Before they leave, five short questions and an optional comment go to the manager.</p>
          <div className="resort-rating-benefits">
            <article><strong>One tap, not a survey</strong><span>Reception, room, dining, spa and pool, bar and lounge. Guests rate only what they used.</span></article>
            <article><strong>Recovery while it matters</strong><span>The resort receives the signal while the guest is still there and has a real chance to respond before checkout.</span></article>
            <article><strong>Private to the hotel team</strong><span>Ratings go to the property&apos;s team. Tisonik does not publish them.</span></article>
          </div>
          <a className="resort-text-link" href="/hotel-guest-rating-software/">See the resort rating workflow <Arrow /></a>
        </div>
        <div className="resort-ratings-visual">
          <RatingPreview />
          <figure><img src={resortImages.sunset} alt="Couple enjoying a resort infinity pool at sunset" loading="lazy" /></figure>
        </div>
      </section>

      <section className="resort-live-demo-callout">
        <div>
          <p className="eyebrow">LIVE PRODUCT DEMO</p>
          <h2>See the guest journey in action.</h2>
          <p>Explore discovery, relevant paid experiences, the in-stay rating and the hotel-team response flow in one self-serve demo.</p>
        </div>
        <a className="resort-primary-button" href={liveDemoHref}>Open live demo <Arrow /></a>
      </section>

      <section id="integration" className="resort-integration">
        <div>
          <p className="eyebrow">A SEAMLESS FIT FOR THE RESORT</p>
          <h2>An experience layer—not another destination.</h2>
        </div>
        <div className="resort-integration-grid">
          <article><span>01</span><strong>Inside the existing journey</strong><p>White-label inside your existing guest app, or opened from a UNIKMO card in the room. Not another app to download.</p></article>
          <article><span>02</span><strong>Resort-owned commerce</strong><p>Inventory, availability, pricing, checkout and payment stay with the property.</p></article>
          <article><span>03</span><strong>Actionable signals</strong><p>Discovery, ratings, recovery and recognition are structured for resort teams to act on.</p></article>
          <article><span>04</span><strong>One-property start</strong><p>Define scope and measures before wider rollout.</p></article>
        </div>
      </section>

      <section className="resort-integration resort-journey" aria-labelledby="resort-journey-title">
        <div>
          <p className="eyebrow">THE COMPLETE JOURNEY</p>
          <h2 id="resort-journey-title">One connected guest journey. Two complementary products.</h2>
        </div>
        <div className="resort-integration-grid">
          <article><span>ARRIVAL</span><strong>A premium physical welcome</strong><p>A UNIKMO card is waiting in the room. Scanning it opens a personal welcome.</p></article>
          <article><span>DURING THE STAY</span><strong>Engagement, recovery and discovery</strong><p>Tisonik lets guests flag issues while you can still fix them, thank great staff and find relevant offers.</p></article>
          <article><span>DEPARTURE</span><strong>A lasting digital keepsake</strong><p>The same card stays with the guest after checkout.</p></article>
        </div>
        <p className="resort-journey-link"><a className="resort-text-link" href="https://www.unikmo.com/hotels">Explore UNIKMO for Hotels <Arrow /></a></p>
      </section>

      <section id="pilot" className="resort-pilot-hero">
        <figure><img src={resortImages.sunset} alt="Guests relaxing together at a resort infinity pool at sunset" loading="lazy" /></figure>
        <div>
          <p className="eyebrow">PILOT TISONIK AT YOUR RESORT</p>
          <h2>Start with one property.</h2>
          <p>Define success together. Scale only when the numbers prove it.</p>
          <p>We agree the measures up front, for example activation, recovery time, recognition volume, and offers viewed and places held.</p>
          <div className="resort-pilot-checks">
            <span>Defined use cases</span><span>Resort-owned data and brand</span><span>Measurable pilot outcomes</span><span>Scale, iterate or stop</span>
          </div>
          <div className="resort-button-row"><a className="resort-primary-button" href={pilotHref}>Start with one property <Arrow /></a></div>
          <a className="film-quiet film-quiet--left" href={liveDemoHref}>View the product demo <Arrow /></a>
        </div>
      </section>

      <section className="resort-related-pages">
        <p className="eyebrow">EXPLORE THE RESORT PLATFORM</p>
        <h2>Go deeper on the job you need to solve.</h2>
        <div className="resort-related-grid">
          <a href="/resort-guest-engagement-software/"><strong>Guest engagement</strong><span>Discovery and participation across the stay.</span></a>
          <a href="/hotel-service-recovery-software/"><strong>Service recovery</strong><span>Act on friction before the guest leaves.</span></a>
          <a href="/hotel-guest-rating-software/"><strong>In-stay ratings</strong><span>One tap per area, private to the hotel team.</span></a>
          <a href="/resort-experience-discovery/"><strong>Experience discovery</strong><span>Make included value easier to find.</span></a>
          <a href="/resort-upselling-software/"><strong>Premium discovery</strong><span>Relevant extras without catalogue overload.</span></a>
          <a href="/hotel-ancillary-revenue-software/"><strong>Ancillary revenue</strong><span>Surface more bookable moments while commerce stays with the resort.</span></a>
        </div>
      </section>
    </main>
    <Footer />
  </div>
)

const ResortLiveDemo = () => {
  const [mode, setMode] = useState<'guest' | 'rating' | 'team'>('guest')

  return <div className="tisonik-site resort-site resort-route-page">
    <Header compact />
    <main>
      <section className="resort-route-hero">
        <p className="eyebrow">INTERACTIVE RESORT DEMO</p>
        <h1>See Tisonik through the guest&apos;s eyes.</h1>
        <p>Follow a simple three-step story: the guest journey, the in-stay rating and the resort-team response. Everything below is illustrative demo content—not claimed pilot performance.</p>
      </section>

      <section className="resort-demo-shell">
        <div className="resort-demo-tabs" role="group" aria-label="Demo views">
          <button className={mode === 'guest' ? 'is-active' : ''} onClick={() => setMode('guest')} type="button">1 · Guest journey</button>
          <button className={mode === 'rating' ? 'is-active' : ''} onClick={() => setMode('rating')} type="button">2 · Stay rating</button>
          <button className={mode === 'team' ? 'is-active' : ''} onClick={() => setMode('team')} type="button">3 · Resort team</button>
        </div>
        <div className="resort-demo-stage">
          <aside>
            <p className="eyebrow">AZURE BAY · DEMO PROPERTY</p>
            <h2>Day 3 of 7</h2>
            <p>Included value comes first. Relevant paid experiences appear naturally in the same journey. The guest can then rate the stay before departure, giving the hotel time to respond while the guest is still there.</p>
          </aside>
          <div className="resort-demo-canvas">
            {mode === 'guest' && <div className="demo-guest-phone">
              <small>GOOD MORNING · DEMO</small>
              <h3>Make more of today.</h3>
              <article><span>INCLUDED · 11:30</span><strong>Reef discovery walk</strong><small>Beach House · 8 places left</small></article>
              <article><span>INCLUDED · 19:00</span><strong>Sunset terrace tasting</strong><small>Included seating available</small></article>
              <article><span>PREMIUM · 15:30</span><strong>Ocean-view spa opening</strong><small>Reserve through the resort</small></article>
              <article><span>PREMIUM · TOMORROW</span><strong>Private sunset sail</strong><small>Reserve through the resort</small></article>
              <a href="#rating" onClick={event => { event.preventDefault(); setMode('rating') }}>Continue to the stay rating <Arrow /></a>
            </div>}
            {mode === 'rating' && <StayRatingDemo />}
            {mode === 'team' && <div className="demo-team-view">
              <p className="eyebrow">ILLUSTRATIVE RESORT VIEW</p>
              <h3>Act before checkout.</h3>
              <div className="demo-team-row"><strong>Rating format</strong><span>One tap per area, from Poor to Superb. A low score reaches the hotel team at once.</span></div>
              <div className="demo-team-row"><strong>In-stay signal</strong><span>The guest is still on property, so the team can respond while the stay is still happening.</span></div>
              <div className="demo-team-row"><strong>Recovery</strong><span>Route → acknowledge → resolve → follow up.</span></div>
              <div className="demo-team-row"><strong>Ancillary revenue</strong><span>Surface relevant spa, dining, excursion, cabana, transfer and celebration opportunities while the resort keeps commerce.</span></div>
              <div className="demo-team-row"><strong>Privacy</strong><span>Ratings are private to the hotel team. Tisonik does not publish them.</span></div>
            </div>}
          </div>
        </div>
      </section>

      <section className="resort-route-next">
        <div><p className="eyebrow">NEXT STEP</p><h2>See the use case with your property in mind.</h2></div>
        <a className="resort-primary-button" href={pilotHref}>Book a live demo <Arrow /></a>
      </section>
    </main>
    <Footer />
  </div>
}

const ResortPilotForm = () => {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    const form = new FormData(event.currentTarget)
    const payload = {
      name: String(form.get('name') || ''),
      workEmail: String(form.get('email') || ''),
      company: String(form.get('company') || ''),
      roleTitle: String(form.get('role') || ''),
      message: String(form.get('message') || ''),
      privacyConsent: form.get('privacy_consent') === 'yes',
      website: String(form.get('website') || ''),
      sourcePath: '/resort-pilot/',
    }
    try {
      const response = await fetch('/api/pilot-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setStatus(response.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return <form className="resort-contact-form" onSubmit={submit}>
    <label>Work email<input required name="email" type="email" autoComplete="email" placeholder="name@hotelgroup.com" /></label>
    <div className="resort-form-row">
      <label>Name<input required name="name" autoComplete="name" placeholder="Your name" /></label>
      <label>Role<input name="role" autoComplete="organization-title" placeholder="Guest Experience, Digital…" /></label>
    </div>
    <label>Property or hotel group<input required name="company" autoComplete="organization" placeholder="Organisation" /></label>
    <label>What should we know?<textarea required name="message" rows={5} minLength={10} placeholder="Target property, current guest app, priorities, timing…" /></label>
    <label className="resort-form-consent"><input required type="checkbox" name="privacy_consent" value="yes" /><span>I agree that TSquare Ventures LLC may use these details to respond to my enquiry, as described in the <a href="/privacy/">privacy policy</a>.</span></label>
    <label className="resort-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <button className="resort-primary-button" type="submit" disabled={status === 'sending' || status === 'sent'}>
      {status === 'sending' ? 'Sending…' : status === 'sent' ? 'Enquiry received' : <>Request a live demo or pilot <Arrow /></>}
    </button>
    {status === 'error' && <p className="resort-form-status">The form could not be sent. Please try again later.</p>}
  </form>
}

const ResortPilot = () => (
  <div className="tisonik-site resort-site resort-route-page">
    <Header compact />
    <main>
      <section className="resort-pilot-page-hero">
        <div>
          <p className="eyebrow">ONE PROPERTY. DEFINED OUTCOMES.</p>
          <h1>Pilot Tisonik without betting the estate.</h1>
          <p>Start with selected guest journeys, a defined integration boundary and success measures agreed before launch.</p>
          <div className="resort-pilot-checks">
            <span>Discovery &amp; participation</span>
            <span>Public in-stay ratings &amp; recovery</span>
            <span>Staff recognition</span>
            <span>Ancillary revenue opportunities</span>
          </div>
        </div>
        <figure><img src={resortImages.hero} alt="Guests enjoying a resort pool" fetchPriority="high" /></figure>
      </section>

      <section className="resort-pilot-steps">
        <article><span>01</span><strong>Scope</strong><p>One property and selected guest journeys.</p></article>
        <article><span>02</span><strong>Connect</strong><p>Agree host interfaces, brand treatment and ownership boundaries.</p></article>
        <article><span>03</span><strong>Measure</strong><p>Define participation, ratings, recovery, recognition and commercial signals before launch.</p></article>
        <article><span>04</span><strong>Decide</strong><p>Scale, iterate or stop based on evidence.</p></article>
      </section>

      <section id="contact" className="resort-contact-section">
        <div>
          <p className="eyebrow">BOOK A LIVE DEMO / DISCUSS A PILOT</p>
          <h2>Tell us about the property.</h2>
          <p>We will use this context to make the conversation specific rather than giving you a generic software tour.</p>
          <a href={liveDemoHref}>Prefer self-serve first? Open the live demo <Arrow /></a>
        </div>
        <ResortPilotForm />
      </section>
    </main>
    <Footer />
  </div>
)

const seoPages: Record<Exclude<ResortPageKey, 'pillar' | 'demo' | 'pilot'>, {
  eyebrow: string
  title: string
  intro: string
  image: string
  alt: string
  points: { title: string; body: string }[]
}> = {
  'guest-engagement': {
    eyebrow: 'RESORT GUEST ENGAGEMENT SOFTWARE',
    title: 'Make the resort easier to experience.',
    intro: 'Tisonik connects discovery, participation, public in-stay ratings, service recovery, recognition and ancillary-revenue discovery in one resort-focused experience layer.',
    image: resortImages.hero,
    alt: 'Guests enjoying a resort pool',
    points: [
      { title: 'Discover what is included', body: 'Surface dining, activities, entertainment and wellness at useful moments.' },
      { title: 'Capture the stay while it is happening', body: 'Short in-stay ratings give the resort time to respond before departure.' },
      { title: 'Connect guest value and commercial value', body: 'Relevant paid experiences can appear without turning the stay into an advertising feed.' },
    ],
  },
  'service-recovery': {
    eyebrow: 'HOTEL SERVICE RECOVERY SOFTWARE',
    title: 'Act while the guest is still there.',
    intro: 'A post-stay complaint is information. An in-stay signal is an opportunity to change the outcome.',
    image: resortImages.staff,
    alt: 'Guest-service team member assisting at a hotel reception',
    points: [
      { title: 'Capture early', body: 'Give the guest an easy route to signal friction while the team still has time to act.' },
      { title: 'Route and acknowledge', body: 'Send the issue to the right operational owner and make the response visible.' },
      { title: 'Resolve and follow up', body: 'Close the loop before checkout whenever the resort still has time to act.' },
    ],
  },
  'upselling': {
    eyebrow: 'RESORT UPSELLING SOFTWARE',
    title: 'Surface the right premium experience—not another catalogue.',
    intro: 'Tisonik uses context around the stay to make relevant extras easier to discover while the resort keeps control of commerce.',
    image: resortImages.spa,
    alt: 'Guest receiving a spa treatment',
    points: [
      { title: 'Context before offer', body: 'Spa, dining, excursions and celebrations can appear when they fit the guest.' },
      { title: 'Resort-owned commerce', body: 'Inventory, availability, pricing, checkout and payment remain with the property.' },
      { title: 'Pilot-measurable', body: 'Define attribution logic before making any performance claim.' },
    ],
  },
  'ancillary': {
    eyebrow: 'HOTEL ANCILLARY REVENUE SOFTWARE',
    title: 'Show more of the stay’s revenue opportunity.',
    intro: 'Spa, speciality dining, excursions, transfers, cabanas, watersports and celebrations can all become relevant bookable moments inside the guest journey.',
    image: resortImages.dining,
    alt: 'Couple dining by the ocean at a tropical resort',
    points: [
      { title: 'More than one upsell', body: 'Surface different paid experiences across the day and across the stay instead of relying on one generic offer.' },
      { title: 'Context before offer', body: 'Make the opportunity feel useful to the guest by matching timing and resort context.' },
      { title: 'Keep the transaction stack', body: 'Inventory, pricing, checkout, payment and fulfilment remain with the resort.' },
    ],
  },
  'experience-discovery': {
    eyebrow: 'RESORT EXPERIENCE DISCOVERY',
    title: 'Make prepaid value impossible to miss.',
    intro: 'Guests have already paid for much of the resort experience. Tisonik helps them see more of what is available today.',
    image: resortImages.pool,
    alt: 'Guest swimming in a landscaped resort pool',
    points: [
      { title: 'Included experiences first', body: 'Activities, dining, entertainment, sports and programming are easier to find.' },
      { title: 'Time and context matter', body: 'Make the experience useful to the guest\'s current day rather than showing one static directory.' },
      { title: 'Premium stays distinct', body: 'Clearly separate what is included from what costs extra.' },
    ],
  },
  'ratings': {
    eyebrow: 'HOTEL GUEST RATING SOFTWARE',
    title: 'One tap per area, while the guest is still there.',
    intro: 'Guests rate their day from Poor to Superb, one tap per area. A low score reaches the hotel team at once, so it can be put right before the guest leaves.',
    image: resortImages.sunset,
    alt: 'Couple enjoying a resort pool at sunset',
    points: [
      { title: 'One tap, not a survey', body: 'Reception, room, dining, spa and pool, bar and lounge. Guests rate only what they used, from Poor to Superb.' },
      { title: 'Low scores reach the team at once', body: 'A Poor or Fair score alerts the hotel team and thanks the guest. Staff can put it right while the guest is still on property.' },
      { title: 'Before they leave', body: 'A short rating before departure asks five questions and one optional comment. It goes to the manager.' },
      { title: 'Private to the hotel team', body: 'Ratings go to the property’s team. Tisonik does not publish them.' },
    ],
  },
}

const ResortSeoPage = ({ page }: { page: Exclude<ResortPageKey, 'pillar' | 'demo' | 'pilot'> }) => {
  const content = seoPages[page]
  return <div className="tisonik-site resort-site resort-route-page">
    <Header compact />
    <main>
      <section className="resort-seo-hero">
        <div>
          <p className="eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p>{content.intro}</p>
          <ButtonRow />
        </div>
        <figure><img src={content.image} alt={content.alt} fetchPriority="high" /></figure>
      </section>
      <section className="resort-seo-points">
        {content.points.map((point, index) => <article key={point.title}><span>0{index + 1}</span><h2>{point.title}</h2><p>{point.body}</p></article>)}
      </section>
      {page === 'ratings' && <section className="resort-seo-rating-demo">
        <div>
          <p className="eyebrow">TRY THE STANDARD FLOW</p>
          <h2>One tap per area. Poor to Superb.</h2>
          <p>The demo uses the same words guests see. Everything here is illustrative, and ratings in the real product go only to the hotel team.</p>
        </div>
        <StayRatingDemo />
      </section>}
      <section className="resort-route-next">
        <div><p className="eyebrow">SEE IT IN CONTEXT</p><h2>Move from the use case to the complete resort experience.</h2></div>
        <a className="resort-primary-button" href={liveDemoHref}>Open live demo <Arrow /></a>
      </section>
    </main>
    <Footer />
  </div>
}

export default function ResortSite() {
  const page = resortPageFromPath(window.location.pathname)
  if (page === 'demo') return <ResortLiveDemo />
  if (page === 'pilot') return <ResortPilot />
  if (page !== 'pillar') return <ResortSeoPage page={page} />
  return <ResortPillar />
}
