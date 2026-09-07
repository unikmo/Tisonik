import { useState, type FormEvent, type ReactNode } from 'react'

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
    <a className="brand" href="/" aria-label="Tisonik home">TISONIK</a>
    {!compact && <nav className="resort-header-nav" aria-label="Resort navigation">
      <a href="/all-inclusive-resorts/#experience">Experience</a>
      <a href="/all-inclusive-resorts/#revenue">Revenue</a>
      <a href="/all-inclusive-resorts/#ratings">Ratings</a>
      <a href="/all-inclusive-resorts/#integration">Integration</a>
      <a href="/all-inclusive-resorts/#pilot">Pilot</a>
    </nav>}
    <div className="resort-header-actions">
      <a className="resort-header-link" href={liveDemoHref}>Live demo</a>
      <a className="resort-header-cta" href={pilotHref}>Book a live demo <Arrow /></a>
    </div>
  </header>
)

const Footer = () => (
  <footer className="site-footer resort-footer">
    <div><strong>TISONIK</strong><span>Tisonik is operated by TSquare Ventures LLC, a Wyoming (USA) limited liability company.</span></div>
    <p>Guest experience activation for all-inclusive hotels and resorts: discovery, ancillary revenue, in-stay ratings, service recovery and staff recognition.</p>
    <nav className="footer-links" aria-label="Footer navigation">
      <a href="/">Tisonik home</a>
      <a href="/all-inclusive-resorts/">Resorts</a>
      <a href={liveDemoHref}>Live demo</a>
      <a href="/hotel-ancillary-revenue-software/">Ancillary revenue</a>
      <a href="/resort-pilot/">Pilot</a>
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

const RatingPreview = ({ compact = false }: { compact?: boolean }) => (
  <div className={`resort-rating-preview ${compact ? 'is-compact' : ''}`}>
    <div className="resort-rating-head">
      <div><small>STAY PULSE · DEMO</small><strong>How is your stay going?</strong></div>
      <span>&lt; 5 min</span>
    </div>
    <p><b>Question 5 of 10</b> · How would you rate waiting times and speed of service?</p>
    <div className="rating-scale" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
    {!compact && <div className="rating-roundup-preview">
      <span><b>Q9</b> What was good? · up to 400 characters</span>
      <span><b>Q10</b> What could be improved? · up to 400 characters</span>
    </div>}
  </div>
)

const ratingScaleQuestions = [
  'How clean and well maintained is your room?',
  'How comfortable is your room for sleeping and relaxing?',
  'How would you rate the quality and choice of food?',
  'How would you rate drinks and bar service?',
  'How would you rate waiting times and speed of service?',
  'How helpful and welcoming are the staff?',
  'How clean and well maintained are the pools, beach and shared areas?',
  'How easy is it to find and join activities, entertainment and included experiences?',
] as const

const StayRatingDemo = () => {
  const [question, setQuestion] = useState(0)
  const [scores, setScores] = useState<number[]>([])
  const [good, setGood] = useState('')
  const [improve, setImprove] = useState('')
  const [done, setDone] = useState(false)

  const selectScore = (score: number) => {
    const nextScores = [...scores]
    nextScores[question] = score
    setScores(nextScores)
  }

  const reset = () => {
    setQuestion(0)
    setScores([])
    setGood('')
    setImprove('')
    setDone(false)
  }

  if (done) return <div className="rating-demo-card rating-complete">
    <p className="eyebrow">DEMO COMPLETE</p>
    <h3>Rating published. The resort can still act while you are here.</h3>
    <p>For a participating property, submission publishes the rating. The property receives the same signal for recovery but cannot selectively hold back a rating because it is poor.</p>
    <button type="button" onClick={reset}>Try again</button>
  </div>

  if (question === 8) return <div className="rating-demo-card">
    <div className="rating-demo-progress"><span>QUESTION 9 OF 10 · DEMO</span><span>UP TO 400 CHARACTERS</span></div>
    <h3>What was good?</h3>
    <p>A short wrap-up question after the eight 1–10 ratings.</p>
    <label htmlFor="rating-good">Your answer <span>{good.length}/400</span></label>
    <textarea id="rating-good" maxLength={400} value={good} onChange={event => setGood(event.target.value)} rows={5} placeholder="What stood out positively?" />
    <button className="resort-primary-button" type="button" onClick={() => setQuestion(9)}>Next question <Arrow /></button>
  </div>

  if (question === 9) return <div className="rating-demo-card">
    <div className="rating-demo-progress"><span>QUESTION 10 OF 10 · DEMO</span><span>UP TO 400 CHARACTERS</span></div>
    <h3>What could be improved?</h3>
    <p>The final question gives the resort specific context it can act on while the guest is still there.</p>
    <label htmlFor="rating-improve">Your answer <span>{improve.length}/400</span></label>
    <textarea id="rating-improve" maxLength={400} value={improve} onChange={event => setImprove(event.target.value)} rows={5} placeholder="What could the resort improve?" />
    <button className="resort-primary-button" type="button" onClick={() => setDone(true)}>Submit &amp; publish demo rating <Arrow /></button>
  </div>

  return <div className="rating-demo-card">
    <div className="rating-demo-progress"><span>QUESTION {question + 1} OF 10 · DEMO</span><span>1–10</span></div>
    <h3>{ratingScaleQuestions[question]}</h3>
    <p>Questions 1–8 use the same simple 1–10 scale. Questions 9 and 10 are the short written wrap-up.</p>
    <div className="rating-demo-scale">
      {Array.from({ length: 10 }, (_, index) => {
        const value = index + 1
        return <button className={scores[question] === value ? 'is-selected' : ''} type="button" key={value} onClick={() => selectScore(value)} aria-label={`Rate ${value} out of 10`}>{value}</button>
      })}
    </div>
    <div className="rating-demo-labels"><span>Needs work</span><span>Excellent</span></div>
    <button className="resort-primary-button" type="button" disabled={!scores[question]} onClick={() => setQuestion(question + 1)}>Next question <Arrow /></button>
  </div>
}

const ResortPillar = () => (
  <div className="tisonik-site resort-site">
    <Header />
    <main>
      <section className="resort-hero resort-hero--people">
        <div className="resort-hero-copy">
          <p className="eyebrow">GUEST EXPERIENCE ACTIVATION FOR ALL-INCLUSIVE RESORTS</p>
          <h1>Make more of <span>every stay.</span></h1>
          <p>Help guests discover what is included, surface relevant paid experiences, rate the stay while it can still be improved and recognize exceptional service—while creating more useful ancillary-revenue moments inside the resort journey.</p>
          <ButtonRow />
          <div className="resort-proof-strip" aria-label="Tisonik resort product principles">
            <span>No separate guest app</span>
            <span>Resort-owned inventory &amp; checkout</span>
            <span>White-label experience layer</span>
          </div>
        </div>
        <figure className="resort-hero-media">
          <img src={resortImages.hero} alt="Guests swimming and relaxing together at an all-inclusive resort pool" fetchPriority="high" />
          <PhonePreview />
        </figure>
      </section>

      <section className="resort-neutral-proof">
        <span>BUILT FOR ALL-INCLUSIVE RESORTS</span>
        <strong>More guest participation.</strong>
        <strong>Earlier service recovery.</strong>
        <strong>More visible staff recognition.</strong>
        <strong>More ancillary revenue moments.</strong>
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
          <p>The flow is deliberately short: questions 1–8 are standard guest pain-point ratings scored from 1 to 10. Question 9 asks “What was good?” and question 10 asks “What could be improved?” Each written answer is capped at 400 characters.</p>
          <div className="resort-rating-benefits">
            <article><strong>One standard format</strong><span>Every participating property uses the same 10-question flow: eight scored pain-point questions followed by two short written wrap-up questions.</span></article>
            <article><strong>Recovery while it matters</strong><span>The resort receives the signal while the guest is still there and has a real chance to respond before checkout.</span></article>
            <article><strong>Participation means publication</strong><span>Submitted ratings go public. A participating property cannot selectively suppress or hold back poor ratings.</span></article>
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
          <p>Explore discovery, relevant paid experiences, the complete 10-question in-stay rating and the resort-team response flow in one self-serve demo.</p>
        </div>
        <a className="resort-primary-button" href={liveDemoHref}>Open live demo <Arrow /></a>
      </section>

      <section id="integration" className="resort-integration">
        <div>
          <p className="eyebrow">A SEAMLESS FIT FOR THE RESORT</p>
          <h2>An experience layer—not another destination.</h2>
        </div>
        <div className="resort-integration-grid">
          <article><span>01</span><strong>Inside the existing journey</strong><p>White-label or embedded rather than another app guests must download.</p></article>
          <article><span>02</span><strong>Resort-owned commerce</strong><p>Inventory, availability, pricing, checkout and payment stay with the property.</p></article>
          <article><span>03</span><strong>Actionable signals</strong><p>Discovery, ratings, recovery and recognition are structured for resort teams to act on.</p></article>
          <article><span>04</span><strong>One-property start</strong><p>Define scope and measures before wider rollout.</p></article>
        </div>
      </section>

      <section id="pilot" className="resort-pilot-hero">
        <figure><img src={resortImages.sunset} alt="Guests relaxing together at a resort infinity pool at sunset" loading="lazy" /></figure>
        <div>
          <p className="eyebrow">PILOT TISONIK AT YOUR RESORT</p>
          <h2>Start with one property.</h2>
          <p>Run a focused pilot with clear guest journeys, defined success measures and a controlled integration boundary.</p>
          <div className="resort-pilot-checks">
            <span>Defined use cases</span><span>Resort-owned data and brand</span><span>Measurable pilot outcomes</span><span>Scale, iterate or stop</span>
          </div>
          <ButtonRow />
        </div>
      </section>

      <section className="resort-related-pages">
        <p className="eyebrow">EXPLORE THE RESORT PLATFORM</p>
        <h2>Go deeper on the job you need to solve.</h2>
        <div className="resort-related-grid">
          <a href="/resort-guest-engagement-software/"><strong>Guest engagement</strong><span>Discovery and participation across the stay.</span></a>
          <a href="/hotel-service-recovery-software/"><strong>Service recovery</strong><span>Act on friction before the guest leaves.</span></a>
          <a href="/hotel-guest-rating-software/"><strong>In-stay ratings</strong><span>Eight 1–10 ratings plus two short wrap-up questions.</span></a>
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
            <p>Included value comes first. Relevant paid experiences appear naturally in the same journey. The guest can then rate the stay before departure, giving the resort time to respond without changing the publication path.</p>
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
              <div className="demo-team-row"><strong>Rating format</strong><span>Questions 1–8 use the 1–10 scale. Q9 is “What was good?” and Q10 is “What could be improved?”, up to 400 characters each.</span></div>
              <div className="demo-team-row"><strong>In-stay signal</strong><span>The guest is still on property, so the team can respond while the stay is still happening.</span></div>
              <div className="demo-team-row"><strong>Recovery</strong><span>Route → acknowledge → resolve → follow up.</span></div>
              <div className="demo-team-row"><strong>Ancillary revenue</strong><span>Surface relevant spa, dining, excursion, cabana, transfer and celebration opportunities while the resort keeps commerce.</span></div>
              <div className="demo-team-row"><strong>Publishing</strong><span>Automatic for participating properties; submitted ratings cannot be selectively held back.</span></div>
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
    {status === 'error' && <p className="resort-form-status">The form could not be sent. Email <a href="mailto:info@tisonik.com">info@tisonik.com</a>.</p>}
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
        <figure><img src={resortImages.hero} alt="Guests enjoying an all-inclusive resort pool" fetchPriority="high" /></figure>
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
    alt: 'Guests enjoying an all-inclusive resort pool',
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
    title: 'A five-minute rating that gives the resort time to act.',
    intro: 'The standard flow has 10 questions in total: eight guest pain-point questions scored 1–10, then “What was good?” and “What could be improved?” with up to 400 characters each.',
    image: resortImages.sunset,
    alt: 'Couple enjoying a resort pool at sunset',
    points: [
      { title: 'Questions 1–8: score', body: 'Eight fixed guest pain-point questions use the same 1–10 scale. Participating hotels do not choose or rewrite them.' },
      { title: 'Questions 9–10: context', body: '“What was good?” and “What could be improved?” close the rating with two separate answers of up to 400 characters each.' },
      { title: 'Public by participation', body: 'Submitted ratings go public. The resort can respond while the guest is still there, but participation does not include a right to suppress poor ratings.' },
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
          <h2>Eight scores. Two wrap-up questions. Then publish.</h2>
          <p>The live demo uses the complete standard 10-question format. Participating properties cannot change the questions or selectively hold back submitted ratings.</p>
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
