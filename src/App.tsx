import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { affirmations, kpis, recognitionReasons } from './data'
import type { View } from './types'
import { getLaunchContext, notifyHostReady, openHostBooking, publishPassengerInterest, requestNearbyDiscovery, stopNearbyDiscovery, notifyAffirmation, notifyPublicMeetProposal, notifyCrewRecognition, notifyServiceIssue, notifyExperiencePulse, requestPassengerFaceMatch, notifyAnonymousPassengerVibe, requestVConnect, respondToVConnect, proposeVConnectPlan, updateEventIdentityVisibility } from './bridge'
import { getQueuedActionCount, queueOfflineAction } from './offline'
import { rankPassengerVibes } from './vibeRanking'
import { Icon } from './Icon'
export { Icon } from './Icon'

const routeMap: Record<string, View> = {
  '/': 'overview',
  '/passenger-experience/': 'passenger',
  '/crew-recognition/': 'crew',
  '/service-recovery/': 'recovery',
  '/social-commerce/': 'commerce',
  '/cruise-dashboard/': 'dashboard',
  '/integration/': 'integration',
  '/pilot/': 'pilot',
  '/imprint/': 'imprint',
  '/privacy/': 'privacy',
  '/terms/': 'terms',
  '/cookies/': 'cookies',
}

const seo: Record<View, { title: string; description: string; path: string }> = {
  overview: {
    title: 'Tisonik | Crew Recognition, Service Recovery & Passenger Engagement',
    description: 'A white-label add-to-app module for cruise lines that turns onboard interactions into crew recognition, service recovery, participation, commerce and shareable positive memories.',
    path: '/',
  },
  passenger: {
    title: 'Passenger Experience | Tisonik',
    description: 'Opt-in nearby, shared-activity and shared-interest discovery with predefined positive affirmations, reciprocal public-place invitations and no unrestricted chat.',
    path: '/passenger-experience/',
  },
  crew: {
    title: 'Crew Recognition for Cruise Lines | Tisonik',
    description: 'Capture named, contextual crew recognition during the sailing, with recognition totals, unique guest counts and sailing-level summaries.',
    path: '/crew-recognition/',
  },
  recovery: {
    title: 'Real-Time Service Recovery for Cruise Lines | Tisonik',
    description: 'Privately route guest issues while the guest is still sailing and use a private Experience Pulse to measure department satisfaction and post-recovery improvement.',
    path: '/service-recovery/',
  },
  commerce: {
    title: 'Social Commerce & Passenger Interests | Tisonik',
    description: 'Turn voluntarily shared passenger interests and positive onboard connections into relevant activities, perishable-inventory conversion and measurable cruise-line commerce.',
    path: '/social-commerce/',
  },
  dashboard: {
    title: 'Cruise-Line Dashboard | Tisonik',
    description: 'Measure crew recognition, service recovery, passenger participation, social sharing and attributed onboard revenue in one pilot dashboard.',
    path: '/cruise-dashboard/',
  },
  integration: {
    title: 'Cruise App Integration & Offline-First Architecture | Tisonik',
    description: 'See how Tisonik embeds in an existing cruise-line app, supports native proximity and ship-local operation without public internet, and hands commerce back to the host.',
    path: '/integration/',
  },
  pilot: {
    title: 'Tisonik Pilot & Commercial Framework',
    description: 'Design a one-ship Tisonik pilot with active passenger promotion, predefined KPIs and a working commercial model combining platform and attributable performance fees.',
    path: '/pilot/',
  },
  imprint: {
    title: 'Imprint | Tisonik',
    description: 'Legal operator and contact information for Tisonik, a product of TSquare Ventures LLC.',
    path: '/imprint/',
  },
  privacy: {
    title: 'Privacy Policy | Tisonik',
    description: 'How Tisonik handles website, passenger, crew, proximity, service-recovery and commercial data.',
    path: '/privacy/',
  },
  terms: {
    title: 'Terms of Service | Tisonik',
    description: 'Terms governing the Tisonik website, demonstrations and passenger-facing module when deployed by a cruise-line partner.',
    path: '/terms/',
  },
  cookies: {
    title: 'Cookie & Local Storage Policy | Tisonik',
    description: 'How Tisonik uses essential browser storage, offline caching and cookies or similar technologies.',
    path: '/cookies/',
  },
}

const normalizePath = (path: string) => path === '/' ? '/' : `${path.replace(/\/+$/, '')}/`
const pilotContactPath = '/pilot/#contact'
const productViews = new Set<View>(['overview', 'passenger', 'crew', 'recovery', 'commerce', 'dashboard', 'integration'])

const resolveView = (isProductDemo: boolean): View => {
  if (!isProductDemo) return routeMap[normalizePath(window.location.pathname)] || 'overview'
  const requested = new URLSearchParams(window.location.search).get('view') as View | null
  return requested && productViews.has(requested) ? requested : 'overview'
}

function useRoute() {
  const isProductDemo = window.location.pathname.startsWith('/product-app/')
  const initialPath = normalizePath(window.location.pathname)
  const [view, setView] = useState<View>(isProductDemo ? resolveView(true) : routeMap[initialPath] || 'overview')

  useEffect(() => {
    const onPop = () => setView(resolveView(isProductDemo))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [isProductDemo])

  useEffect(() => {
    const current = seo[view]
    document.title = current.title
    const description = document.querySelector('meta[name="description"]')
    description?.setAttribute('content', current.description)
    const canonical = document.querySelector('link[rel="canonical"]')
    const publicPath = isProductDemo ? '/product-app/' : current.path
    canonical?.setAttribute('href', `${window.location.origin}${publicPath}`)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', current.title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', current.description)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', `${window.location.origin}${publicPath}`)
  }, [view, isProductDemo])

  const navigate = (next: View) => {
    const params = new URLSearchParams(window.location.search)
    params.set('view', next)
    const path = isProductDemo ? `/product-app/?${params.toString()}` : seo[next].path
    if (`${window.location.pathname}${window.location.search}` !== path) window.history.pushState({}, '', path)
    setView(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return { view, navigate, isProductDemo }
}

const AppLink = ({ to, navigate, className, children, onClick }: { to: View; navigate: (v: View) => void; className?: string; children: ReactNode; onClick?: () => void }) => {
  const href = window.location.pathname.startsWith('/product-app/') ? `/product-app/?view=${to}` : seo[to].path
  return <a href={href} className={className} onClick={(e: MouseEvent<HTMLAnchorElement>) => { e.preventDefault(); onClick?.(); navigate(to) }}>{children}</a>
}

const navItems: { key: View; label: string }[] = [
  { key: 'crew', label: 'Crew recognition' },
  { key: 'passenger', label: 'Passenger experience' },
  { key: 'commerce', label: 'Commerce' },
  { key: 'dashboard', label: 'Dashboard' },
]

const Flywheel = () => {
  const steps = [
    ['G', 'Great interaction', 'A real positive moment onboard.'],
    ['A', 'Affirmation', 'Passenger or crew recognition is captured.'],
    ['M', 'More participation & interaction', 'Positive moments encourage people to join and meet.'],
    ['M', 'More activity & commerce', 'Shared interest creates relevant onboard demand.'],
    ['E', 'End-of-cruise summary', 'The best moments are collected into a personal record.'],
    ['S', 'Social sharing', 'Guests and crew share selected positive memories.'],
    ['O', 'Organic exposure', 'Authentic advocacy carries the cruise experience beyond the ship.'],
  ]
  return (
    <div className="gammeso-track" aria-label="GAMMESO flywheel">
      {steps.map(([letter, label, note], index) => (
        <div className="gammeso-step" key={label}>
          <div className="gammeso-letter">{letter}</div>
          <div className="gammeso-step-copy"><strong>{label}</strong><span>{note}</span></div>
          {index < steps.length - 1 && <div className="gammeso-connector"><Icon name="arrow" size={17}/></div>}
        </div>
      ))}
    </div>
  )
}

const PhoneShell = ({ children, label = 'Guest module', compact = false }: { children: ReactNode; label?: string; compact?: boolean }) => (
  <div className={`phone-wrap ${compact ? 'compact' : ''}`}>
    <div className="phone-label"><span className="live-dot" /> {label}</div>
    <div className="phone">
      <div className="phone-top"><span>9:41</span><div className="island"/><span>5G ▰</span></div>
      {children}
    </div>
  </div>
)

const CrewRecognitionCard = ({ compact = false, shareable = false }: { compact?: boolean; shareable?: boolean }) => {
  const [shared, setShared] = useState(false)
  const shareRecognition = async () => {
    const text = '84 recognitions from 61 guests · Sailing CC-0826-17 · 2–9 Aug 2026'
    try {
      if (navigator.share) await navigator.share({ title: 'My Crew Recognition', text })
      else if (navigator.clipboard) await navigator.clipboard.writeText(text)
      setShared(true)
    } catch { /* user cancelled */ }
  }
  return (
  <div className={`recognition-summary-card ${compact ? 'compact-card' : ''}`}>
    <div className="summary-card-top">
      <div className="crew-identity"><span className="crew-photo big">AN</span><div><small>DINING TEAM</small><h3>Ana Rodrigues</h3></div></div>
      <span className="verified-pill"><Icon name="check" size={13}/> Verified</span>
    </div>
    <div className="sailing-meta">
      <span><Icon name="ship" size={15}/><b>CC-0826-17</b><small>Sailing</small></span>
      <span><Icon name="calendar" size={15}/><b>2–9 Aug 2026</b><small>Dates</small></span>
    </div>
    <div className="recognition-total">
      <strong>84</strong>
      <div><b>recognitions</b><span>from 61 unique guests</span></div>
    </div>
    <div className="recognition-breakdown">
      <div><b>31</b><span>Made us feel welcome</span></div>
      <div><b>23</b><span>Exceptional service</span></div>
      <div><b>17</b><span>Went above and beyond</span></div>
      <div><b>9</b><span>Made our trip memorable</span></div>
      <div><b>4</b><span>Solved a problem</span></div>
    </div>
    <div className="consistency-row"><Icon name="chart" size={16}/><span>Recognized on <b>6 of 7 sailing days</b></span></div>
    {shareable && <div className="crew-share-row"><span>Personal recognition summary</span><button onClick={shareRecognition}><Icon name="share" size={14}/>{shared ? 'Copied / shared' : 'Share'}</button></div>}
  </div>
  )
}

function Overview({ navigate }: { navigate: (v: View) => void }) {
  const [bookingHandoff, setBookingHandoff] = useState(false)
  const [memoryShared, setMemoryShared] = useState(false)
  const openBooking = () => { openHostBooking('mediterranean-tasting-2030'); setBookingHandoff(true) }
  const shareMemory = async () => {
    const text = 'My Tisonik · Mediterranean Escape · The positive moments I collected at sea.'
    try {
      if (navigator.share) await navigator.share({ title: 'My Tisonik', text })
      else if (navigator.clipboard) await navigator.clipboard.writeText(text)
      setMemoryShared(true)
    } catch { /* user cancelled */ }
  }
  return (
    <main>
      <section className="hero-premium">
        <div className="hero-backdrop" aria-hidden="true"><div className="sea-line one"/><div className="sea-line two"/><div className="sea-glow"/></div>
        <div className="section-shell hero-grid">
          <div className="hero-copy premium-copy">
            <div className="eyebrow"><Icon name="layers" size={15}/> White-label add-to-app module for cruise lines</div>
            <h1>Make every positive onboard interaction <span>more valuable.</span></h1>
            <p className="lead">Tisonik adds real-time crew recognition, private service recovery, safe passenger interaction and measurable social commerce to the cruise app you already have.</p>
            <div className="hero-actions">
              <a href={pilotContactPath} className="btn primary xl">Request a demo <Icon name="arrow" size={18}/></a>
              <AppLink to="crew" navigate={navigate} className="btn glass xl">See the platform</AppLink>
            </div>
            <div className="trust-row premium-trust">
              <span><Icon name="check" size={15}/> Verified guests</span>
              <span><Icon name="check" size={15}/> Structured interactions</span>
              <span><Icon name="check" size={15}/> Private recovery</span>
              <span><Icon name="check" size={15}/> Enterprise controlled</span>
              <span><Icon name="check" size={15}/> Offline-first at sea</span>
            </div>
          </div>

          <div className="hero-stage" aria-label="Tisonik white-label passenger preview">
            <figure className="hero-photo-panel">
              <img src="/media/hero-deck.jpg" alt="Passengers relaxing together on an open cruise ship deck at sunset" />
              <figcaption>Designed for real onboard moments—not another screen-first social network.</figcaption>
            </figure>
            <div className="hero-orbit orbit-a"/><div className="hero-orbit orbit-b"/>
            <div className="floating-event crew-event"><span className="event-icon"><Icon name="crew" size={18}/></span><div><small>CREW RECOGNITION</small><b>Made us feel welcome</b><span>Ana · Dining team</span></div></div>
            <div className="floating-event recovery-event"><span className="event-icon coral"><Icon name="help" size={18}/></span><div><small>SERVICE RECOVERY</small><b>Issue acknowledged</b><span>Excursions · 2 min ago</span></div></div>
            <PhoneShell label="Inside the cruise-line app" compact>
              <div className="mobile-head hero-mobile-head"><div><small>Day 4 of 7</small><strong>Mediterranean Escape</strong></div><div className="avatar">MA</div></div>
              <div className="mobile-hero-moment"><small>GOOD AFTERNOON, MARIA</small><h3>Who made your day better?</h3><p>Turn a good moment into recognition in seconds.</p><button onClick={() => navigate('crew')}>Recognize someone <Icon name="arrow" size={15}/></button></div>
              <div className="quick-grid clean-grid">
                <button onClick={() => navigate('crew')}><span><Icon name="crew"/></span><b>Recognize</b><small>Crew</small></button>
                <button onClick={() => navigate('recovery')}><span><Icon name="help"/></span><b>Get help</b><small>Privately</small></button>
                <button onClick={() => navigate('passenger')}><span><Icon name="people"/></span><b>Connect</b><small>Positively</small></button>
                <button onClick={() => navigate('commerce')}><span><Icon name="cart"/></span><b>Join</b><small>Together</small></button>
              </div>
              <div className="moment-strip polished"><div><Icon name="spark" size={17}/><span><b>12</b> positive moments collected</span></div><small>Your cruise story is growing.</small></div>
            </PhoneShell>
            <div className="floating-event commerce-event"><span className="event-icon gold"><Icon name="cart" size={18}/></span><div><small>SHARED INTEREST</small><b>3 friends interested</b><span>Mediterranean tasting · 8:30 PM</span></div></div>
          </div>
        </div>
      </section>

      <section className="outcome-strip section-shell" aria-label="Tisonik outcomes">
        <div className="outcome-intro"><small>ONE ADD-TO-APP MODULE</small><strong>Five measurable outcomes.</strong></div>
        <div className="outcome-item"><img src="/media/cruise-candid-crew.jpg" alt="" loading="lazy"/><span>01</span><b>Crew recognition</b><small>Capture excellence now</small></div>
        <div className="outcome-item"><img src="/media/cruise-family-recovery.jpg" alt="" loading="lazy"/><span>02</span><b>Service recovery</b><small>Resolve while onboard</small></div>
        <div className="outcome-item"><img src="/media/cruise-diverse-passengers.jpg" alt="" loading="lazy"/><span>03</span><b>Participation</b><small>Create real-world connection</small></div>
        <div className="outcome-item"><img src="/media/cruise-family-experience.jpg" alt="" loading="lazy"/><span>04</span><b>Commerce</b><small>Convert shared intent</small></div>
        <div className="outcome-item"><img src="/media/shareable-memory.jpg" alt="" loading="lazy"/><span>05</span><b>Advocacy</b><small>Turn moments into sharing</small></div>
      </section>

      <section className="crew-cinematic" id="crew-recognition">
        <div className="section-shell cinematic-grid">
          <div className="cinematic-copy">
            <div className="section-kicker light">CREW RECOGNITION · CENTRAL BY DESIGN</div>
            <h2>Recognize great service <span>while it is happening.</span></h2>
            <p>Named crew recognition should not depend on a guest remembering a first name—or names being unique. The passenger uses the in-app camera to photograph the crew member with both face and visible name badge in frame. The operator matches the face against its own crew roster and uses the badge name as an additional check before appreciation is sent.</p>
            <div className="cinematic-rule"><Icon name="shield" size={20}/><div><b>Designed for genuine repeat excellence.</b><span>One guest can recognize the same crew member once per day, selecting up to two predefined reasons. Total recognition is shown alongside unique guest count and sailing consistency.</span></div></div>
            <AppLink to="crew" navigate={navigate} className="text-link light-link">Explore crew recognition <Icon name="arrow" size={17}/></AppLink>
          </div>
          <div className="cinematic-visual">
            <img className="cinematic-photo" src="/media/cruise-candid-crew.jpg" alt="Diverse cruise crew members sharing a candid end-of-shift moment" loading="lazy"/>
            <div className="cinematic-photo-label"><span>REAL-TIME RECOGNITION</span><b>Great service becomes visible while the sailing is still happening.</b></div>
            <div className="badge-capture-panel"><div className="capture-top"><span>01</span><small>FRAME CREW MEMBER + BADGE</small></div><div className="badge-shot"><div className="badge-person"><span>AN</span><div><small>OPERATOR FACE + ROSTER MATCH</small><b>Ana Rodrigues · •482</b><em>Dining · Meridian</em></div></div><span className="camera-corner"><Icon name="camera" size={19}/></span></div><div className="capture-confirm"><Icon name="check" size={15}/> Biometric processing stays operator-side · only aggregates reach Tisonik</div></div>
            <CrewRecognitionCard compact />
          </div>
        </div>
      </section>

      <section className="recovery-story section-shell">
        <div className="recovery-story-card">
          <div className="recovery-story-copy"><div className="section-kicker">THE OTHER SIDE OF THE MOMENT</div><h2>Recognize the good. Recover the bad. <span>While the guest is still onboard.</span></h2><p>Negative experiences never enter the recognition stream. A separate private route sends the issue to the right onboard team, giving the operator the chance to intervene before disembarkation, surveys or social media.</p><AppLink to="recovery" navigate={navigate} className="text-link">See service recovery <Icon name="arrow" size={17}/></AppLink></div>
          <div className="recovery-visual-stack">
            <figure className="story-photo recovery-photo">
              <img src="/media/cruise-family-recovery.jpg" alt="Cruise crew member returning a child's toy beside their parent" loading="lazy"/>
              <figcaption>Private recovery while the guest is still onboard.</figcaption>
            </figure>
            <div className="recovery-flow-visual">
              <div className="flow-node"><span><Icon name="help"/></span><small>GUEST</small><b>Excursion issue</b></div><div className="flow-line"><span>2 min</span></div><div className="flow-node active"><span><Icon name="bell"/></span><small>RIGHT TEAM</small><b>Acknowledged</b></div><div className="flow-line"><span>12 min</span></div><div className="flow-node success"><span><Icon name="check"/></span><small>ONBOARD</small><b>Resolved</b></div>
            </div>
          </div>
        </div>
      </section>

      <section className="passenger-story section-shell">
        <div className="section-heading split-heading"><div><div className="section-kicker">PASSENGER EXPERIENCE</div><h2>The ship is the social environment. <span>Tisonik only makes the safe first move easier.</span></h2></div><p>Guests can discover opted-in people nearby, through a shared activity or through shared interests. First contact is a positive predefined affirmation. Only a recipient response unlocks a proposal to meet in a public onboard place or activity.</p></div>
        <figure className="passenger-photo-banner">
          <img src="/media/cruise-diverse-passengers.jpg" alt="Multicultural cruise passengers of different ages relaxing together" loading="lazy"/>
          <figcaption><b>Three natural discovery routes.</b><span>Nearby · shared activity · shared interests</span></figcaption>
        </figure>
        <div className="journey-stage expanded-journey">
          <div className="journey-person"><div className="person-photo">DA</div><b>Daniel</b><small>Nearby · Food · Shopping</small><span className="same-sailing"><Icon name="check" size={12}/> Opted-in · same sailing</span></div>
          <div className="journey-step"><span>1</span><small>AFFIRM</small><strong>That was kind of you.</strong></div>
          <div className="journey-arrow"><Icon name="arrow"/></div>
          <div className="journey-step"><span>2</span><small>RESPOND</small><strong>Daniel acknowledges.</strong></div>
          <div className="journey-arrow"><Icon name="arrow"/></div>
          <div className="journey-step highlighted"><span>3</span><small>MEET</small><strong>Coffee · Deck 6</strong></div>
        </div>
        <div className="discovery-mini-row"><span><b>Nearby</b> coarse proximity, opt-in</span><span><b>Shared activity</b> verified context</span><span><b>Shared interests</b> food, shopping, fitness & more</span></div>
        <div className="safety-footnote"><Icon name="shield" size={18}/><span>No unrestricted messaging. No dating mode. No exact live location. No cabin/stateroom meeting option. Block/report controls remain available.</span></div>
      </section>

      <section className="commerce-story">
        <div className="section-shell commerce-story-grid">
          <div className="commerce-visual-premium">
            <figure className="commerce-photo">
              <img src="/media/cruise-family-experience.jpg" alt="A multicultural family choosing an onboard experience together" loading="lazy"/>
              <figcaption>Social intent becomes relevant onboard inventory—not a generic ad feed.</figcaption>
            </figure>
            <div className="commerce-topline"><span>SHARED INTENT DETECTED</span><span className="capacity">9 seats left</span></div>
            <h3>Mediterranean tasting</h3>
            <div className="group-avatars premium-avatars"><span>MA</span><span>JL</span><span>SK</span><span>+2</span></div>
            <p><b>7 passengers who share your food interest</b> are considering tonight's tasting. Three are people you've already positively connected with.</p>
            <div className="experience-meta"><span>8:30 PM</span><span>Deck 7</span><span>$49 pp</span></div>
            <div className="commerce-cta-row"><button onClick={openBooking}>{bookingHandoff ? 'Booking handoff sent ✓' : 'View in cruise-line booking'} {!bookingHandoff && <Icon name="arrow" size={16}/>}</button><small>{bookingHandoff ? 'The host app received the selected inventory item.' : 'Inventory · price · payment stay with the cruise line'}</small></div>
          </div>
          <div className="commerce-story-copy"><div className="section-kicker light">PARTICIPATION → COMMERCE</div><h2>Surface the right experience because people want to do it <span>together.</span></h2><p>Tisonik does not create an ad feed. Travellers voluntarily share cruise-relevant interests; the system combines that intent with real onboard interaction and sends any booking back to the cruise line's own commerce environment.</p><div className="commerce-proof"><div><b>Relevant</b><span>Based on expressed activity interest</span></div><div><b>Timely</b><span>Can respond to remaining capacity</span></div><div><b>Measurable</b><span>Built for agreed attribution or treatment/control testing</span></div></div><AppLink to="commerce" navigate={navigate} className="text-link light-link">Explore participation & commerce <Icon name="arrow" size={17}/></AppLink></div>
        </div>
      </section>

      <section className="gammeso-signature section-shell" id="gammeso">
        <div className="gammeso-title"><div><div className="section-kicker">THE OPERATING FLYWHEEL</div><h2><span>GAMMESO</span><sup>™</sup></h2></div><p>One positive moment creates the conditions for another—and ultimately creates value for the guest, crew member and cruise line.</p></div>
        <Flywheel />
      </section>

      <section className="memory-section section-shell">
        <div className="memory-copy"><div className="section-kicker">THE MEMORY LAYER</div><h2>Positive moments should not disappear when the sailing ends.</h2><p>Participating passengers and crew receive a personal summary tied to the actual sailing. Selected summaries can be shared externally, turning authentic recognition into organic cruise-line exposure.</p><div className="privacy-note"><Icon name="lock" size={18}/><span>Public passenger summaries show the compliments received—not the identities of the people who sent them unless separately permitted.</span></div></div>
        <div className="memory-cards">
          <div className="share-card premium-share"><img className="memory-photo" src="/media/shareable-memory.jpg" alt="A passenger photographing a memorable coastal cruise destination" loading="lazy"/><small>CC-0826-17 · 2–9 AUG 2026</small><h3>Your Tisonik</h3><p>The positive moments you collected at sea.</p><div className="affirm-grid">{affirmations.map(a => <div key={a.label} className={`affirm ${a.tone}`}><b>{a.count}</b><span>{a.label}</span></div>)}</div><div className="share-footer"><span>Powered by Tisonik</span><button onClick={shareMemory}><Icon name="share" size={15}/> {memoryShared ? 'Copied / shared' : 'Share'}</button></div></div>
          <CrewRecognitionCard compact shareable />
        </div>
      </section>

      <section className="dashboard-preview">
        <div className="section-shell dashboard-preview-grid">
          <div className="dashboard-preview-copy"><div className="section-kicker light">MEASURABLE BY DESIGN</div><h2>Show management what changed—not just how many people opened the feature.</h2><p>The pilot dashboard brings recognition, recovery, participation, commerce and sharing into one operational view.</p><AppLink to="dashboard" navigate={navigate} className="btn glass xl">Open cruise-line dashboard <Icon name="arrow" size={18}/></AppLink></div>
          <div className="dashboard-window">
            <div className="window-top"><span/><span/><span/><small>Mediterranean Escape · CC-0826-17</small></div>
            <div className="mini-kpis"><div><small>CREW RECOGNITIONS</small><b>812</b><span>+22%</span></div><div><small>RESOLVED ONBOARD</small><b>93%</b><span>14m median</span></div><div><small>ATTRIBUTED VALUE</small><b>$18.4K</b><span>pilot estimate</span></div></div>
            <div className="mini-dashboard-row"><div className="mini-chart"><small>POSITIVE MOMENTS · 7 DAYS</small><div className="spark-bars">{[38,54,47,70,63,81,74].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div></div><div className="mini-ring"><div className="ring-visual"><span>93%</span></div><small>Resolved onboard</small></div></div>
          </div>
        </div>
      </section>

      <section className="integration-premium section-shell">
        <div className="integration-heading"><div><div className="section-kicker">BUILT TO FIT THE APP YOU ALREADY HAVE</div><h2>An engagement layer—not another cruise app.</h2></div><p>The operator keeps its brand, passenger relationship, inventory, pricing and payment stack. Tisonik supplies the positive-interaction layer and the intelligence around it.</p></div>
        <div className="integration-visual-band"><img src="/media/cruise-inclusive-activity.jpg" alt="Multigenerational passengers enjoying an inclusive deck activity" loading="lazy"/><div><small>BUILT FOR CRUISE LIFE</small><b>Human interaction remains the experience. Tisonik sits quietly underneath it.</b></div></div>
        <div className="integration-system"><div className="system-node"><span>01</span><b>Cruise-line app</b><small>Identity · itinerary · passenger context</small></div><div className="system-plus">+</div><div className="system-node featured"><span>02</span><b>Tisonik</b><small>Recognition · recovery · interaction · intent</small></div><div className="system-plus">+</div><div className="system-node"><span>03</span><b>Existing commerce</b><small>Inventory · price · booking · payment</small></div></div><AppLink to="integration" navigate={navigate} className="text-link">See the cruise-app integration route <Icon name="arrow" size={17}/></AppLink>
        <div className="deployment-row"><span>API</span><span>Embedded mobile web</span><span>Native SDK bridge</span><span>Offline-first ship mode</span><span>White-label configuration</span></div>
      </section>

      <section className="pilot-cta section-shell">
        <div className="pilot-cta-inner"><div><small>PROVE IT ON ONE SHIP</small><h2>Pilot the complete experience. Measure what changes.</h2><p>One ship. Selected sailings. Connected workflows. Predetermined KPIs. Commercial review date.</p></div><a href={pilotContactPath} className="btn primary inverted xl">Request a demo <Icon name="arrow" size={18}/></a></div>
      </section>
    </main>
  )
}

function PassengerModule() {
  const context = useMemo(() => getLaunchContext(), [])
  const [cruiseConnectEnabled, setCruiseConnectEnabled] = useState(true)
  const [matchState, setMatchState] = useState<'idle' | 'recognized' | 'unavailable' | 'sent'>('idle')
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null)
  const [vconnectState, setVconnectState] = useState<'idle'|'requested'|'accepted'|'declined'|'planned'>('idle')
  const [vconnectOption, setVconnectOption] = useState('Coffee in the atrium')
  const [interestSet, setInterestSet] = useState<string[]>(['Food experiences', 'Live music', 'Culture'])
  const [eventReserved, setEventReserved] = useState(false)
  const [showIdentity, setShowIdentity] = useState(false)
  const [shared, setShared] = useState(false)
  const vibeOptions = ['You made my day', 'Great energy', 'That was kind of you', 'You made us laugh', 'Wonderful cruise spirit']
  const interestOptions = ['Food experiences', 'Wine tasting', 'Shopping', 'Fitness', 'Wellness', 'Culture', 'Trivia & games', 'Live music', 'Family activities', 'Beach & nature']
  const ranking = rankPassengerVibes([
    { id: 'p1', validVibes: 29 }, { id: 'p2', validVibes: 26 }, { id: 'p3', validVibes: 22 },
    { id: 'current', validVibes: 18 }, { id: 'p5', validVibes: 18 }, { id: 'p6', validVibes: 18 },
    { id: 'p7', validVibes: 14 },
  ])
  const currentRank = ranking.find(entry => entry.id === 'current')!

  const toggleInterest = (interest: string) => {
    const next = interestSet.includes(interest) ? interestSet.filter(item => item !== interest) : [...interestSet, interest]
    setInterestSet(next)
    publishPassengerInterest(next)
  }

  const runMatch = (recognized = true) => {
    requestPassengerFaceMatch()
    setSelectedVibe(null)
    setMatchState(recognized ? 'recognized' : 'unavailable')
  }

  const sendVibe = () => {
    if (!selectedVibe || matchState !== 'recognized') return
    notifyAnonymousPassengerVibe('ONE-TIME-RECEIVER-TOKEN', selectedVibe)
    setMatchState('sent')
  }

  const sendVConnect = () => {
    requestVConnect('ONE-TIME-RECEIVER-TOKEN', vconnectOption.toLowerCase().replace(/ /g,'-'))
    setVconnectState('requested')
  }
  const answerVConnect = (accepted: boolean) => {
    respondToVConnect('SAMPLE-REQUEST-TOKEN', accepted)
    setVconnectState(accepted ? 'accepted' : 'declined')
  }
  const planVConnect = (venueOptionId: string) => {
    proposeVConnectPlan('SAMPLE-CONNECTION-TOKEN', venueOptionId, 'tomorrow-afternoon')
    setVconnectState('planned')
  }

  const reserveEvent = () => setEventReserved(true)
  const toggleEventIdentity = () => {
    const next = !showIdentity
    setShowIdentity(next)
    updateEventIdentityVisibility('welcome-meet-food-music', next)
  }

  const shareVibeCard = async () => {
    const text = `My CruiseConnect Vibe Card · Position #${currentRank.rank} · Mediterranean Escape · shared by me`
    try {
      if (navigator.share) await navigator.share({ title: 'My CruiseConnect Vibe Card', text })
      else if (navigator.clipboard) await navigator.clipboard.writeText(text)
      setShared(true)
    } catch { /* passenger cancelled */ }
  }

  return (
    <main className="page section-shell passenger-vibe-page">
      <div className="page-head editorial"><div><div className="section-kicker">PASSENGER-TO-PASSENGER CRUISECONNECT</div><h1>Notice a good moment. <span>Send an anonymous vibe.</span></h1><p>The sender photographs the adult passenger inside the cruise-line app. The operator returns only recognised or unavailable; no name is shown, the capture is discarded after matching and the receiver never learns who sent the compliment.</p></div><div className="pill"><Icon name="lock" size={15}/> Adult-only · anonymous · no open chat</div></div>

      <section className="vibe-settings-panel">
        <div><div className="section-kicker light">ONE BOARDING CHOICE</div><h2>CruiseConnect is ready for the sailing.</h2><p>The cruise line presents imaging and CruiseConnect recognition together during boarding enrolment. Eligible adults who accept that combined purpose enter the sailing recognition pool once—there is no second confirmation inside Anonymous Vibe.</p></div>
        <div className="vibe-setting-controls">
          <div><span><b>CruiseConnect</b><small>Interests, invitations and private Vibe Card</small></span><button className={cruiseConnectEnabled ? 'active' : ''} onClick={() => setCruiseConnectEnabled(value => !value)}>{cruiseConnectEnabled ? 'On · opt out' : 'Off · reactivate'}</button></div>
          <div><span><b>Boarding recognition status</b><small>Covered once during cruise-line imaging enrolment</small></span><button className="active" disabled>Enrolled</button></div>
        </div>
      </section>

      <div className="demo-grid refined passenger-demo-grid vibe-demo-grid">
        <PhoneShell label="Passenger view · Anonymous Vibe">
          <div className="mobile-head"><div><small>CruiseConnect</small><strong>Send an anonymous vibe</strong></div><div className="avatar"><Icon name="heart" size={18}/></div></div>
          {context.ageBand === 'minor' ? <div className="minor-safety-state"><Icon name="shield" size={24}/><h3>Anonymous Vibes are unavailable</h3><p>Children are excluded from passenger recognition and cannot send or receive vibes.</p></div> : !cruiseConnectEnabled ? <div className="minor-safety-state"><Icon name="lock" size={24}/><h3>CruiseConnect is off</h3><p>Reactivate it in your sailing preferences whenever you choose.</p></div> : <>
            <div className="passenger-camera-card">
              <div className="camera-view"><img src="/media/cruise-diverse-passengers.jpg" alt="Adult cruise passengers enjoying time together"/><span className="face-frame"/><small>Keep one adult passenger in frame</small></div>
              {matchState === 'idle' && <><h3>Who made this moment better?</h3><p>No passenger directory, name or second consent screen. The cruise line resolves enrolled adult receivers privately.</p><button onClick={() => runMatch(true)}><Icon name="camera" size={17}/> Take sample photo</button><button className="camera-alt" onClick={() => runMatch(false)}>Simulate poor/unavailable match</button></>}
              {matchState === 'unavailable' && <div className="match-result unavailable"><Icon name="help" size={20}/><div><b>This passenger is not available for Anonymous Vibes</b><span>Try another photo or leave the moment private. No reason or age is disclosed.</span></div><button onClick={() => setMatchState('idle')}>Try again</button></div>}
              {(matchState === 'recognized' || matchState === 'sent') && <div className="match-result recognized"><Icon name="check" size={20}/><div><small>CRUISE-LINE CONFIRMATION</small><b>Adult passenger recognised</b><span>No name, profile or match score shared</span></div></div>}
            </div>
            {matchState === 'recognized' && <><p className="mobile-prompt">Choose one prepared vibe</p><div className="signal-list compact-signals">{vibeOptions.map(vibe => <button className={selectedVibe === vibe ? 'selected' : ''} key={vibe} onClick={() => setSelectedVibe(vibe)}><Icon name="heart" size={16}/>{vibe}</button>)}</div><button className="mobile-primary" disabled={!selectedVibe} onClick={sendVibe}>Send anonymously</button></>}
            {matchState === 'sent' && <div className="anonymous-success"><Icon name="heart" size={24}/><h3>Your vibe is on its way</h3><p>It will arrive after a randomized delay. The receiver cannot see your identity, location or exact send time.</p><button onClick={() => { setMatchState('idle'); setSelectedVibe(null) }}>Done</button></div>}
            <div className="safety-note"><Icon name="shield" size={16}/><span>The cruise line checks same sailing, adult eligibility, duplicate limits and different cabin/booking group. The capture is discarded after matching. No sender identity is stored in the vibe record.</span></div>
          </>}
        </PhoneShell>

        <div className="explain-stack">
          <article className="feature-large"><div className="number">01</div><div><h3>Photograph the passenger</h3><p>The capture goes only to the cruise line’s identity zone—not Tisonik.</p></div></article>
          <article className="feature-large"><div className="number">02</div><div><h3>Recognised or unavailable</h3><p>The sender sees no passenger name, photograph, candidate list or confidence score.</p></div></article>
          <article className="feature-large"><div className="number">03</div><div><h3>Eligibility before delivery</h3><p>Children and same-cabin/booking companions are excluded; duplicate and abuse limits are enforced operator-side.</p></div></article>
          <article className="feature-large accent"><div className="number">04</div><div><h3>Anonymous by design</h3><p>No sender appears in the record. Randomized or batched delivery prevents timing from identifying them.</p></div></article>
          <article className="feature-large commercial"><div className="number">05</div><div><h3>Aggregates only</h3><p>Tisonik receives threshold-protected vibe totals and ranking distributions—not passenger records.</p></div></article>
        </div>
      </div>

      <section className="interest-onboarding">
        <div className="interest-copy"><div className="section-kicker light">OPTIONAL INTERESTS</div><h2>Make it easier to meet people naturally.</h2><p>After booking, the cruise-line app softly asks what guests enjoy. On embarkation day, the activity team can invite small interest groups to a relaxed five-to-ten-minute welcome—never a sales event.</p><div className="interest-proof"><span><Icon name="people" size={16}/> Curated cruise-relevant interests</span><span><Icon name="calendar" size={16}/> Short, public-place introductions</span><span><Icon name="cart" size={16}/> Later offers remain optional and relevant</span></div></div>
        <div className="interest-picker"><small>YOUR OPTIONAL INTERESTS</small><h3>What might make this sailing more enjoyable?</h3><div className="interest-chips">{interestOptions.map(interest => <button key={interest} className={interestSet.includes(interest) ? 'active' : ''} onClick={() => toggleInterest(interest)}>{interestSet.includes(interest) && <Icon name="check" size={13}/>} {interest}</button>)}</div><div className="interest-match"><div className="group-avatars"><span>♫</span><span>🍽</span><span>?</span><span>+14</span></div><p><b>17 adults share at least one interest.</b> Identity stays hidden until each passenger chooses otherwise.</p></div></div>
      </section>

      <section className="event-identity-section">
        <div><div className="section-kicker">EVENT RSVP PRIVACY</div><h2>Join the group without publishing yourself.</h2><p>The default RSVP contributes only to the attendee count. A passenger may separately show their chosen name and image to confirmed attendees; the cruise line never posts passenger identity to social media.</p></div>
        <div className="event-rsvp-card"><small>WELCOME MEET · FOOD + LIVE MUSIC</small><h3>Tomorrow · 5:30 PM · Atrium</h3><p>Five-to-ten-minute introduction hosted by the activity team.</p><div className="event-count"><b>{eventReserved ? '18' : '17'}</b><span>passengers joining</span></div>{!eventReserved ? <button onClick={reserveEvent}>Reserve my place</button> : <><div className="reserved-state"><Icon name="check" size={16}/> Place reserved · counted anonymously</div><label><span><b>Show my chosen name and image</b><small>Visible only to confirmed attendees</small></span><input type="checkbox" checked={showIdentity} onChange={toggleEventIdentity}/></label><small className="event-default-note">Default: count only. You can change this until the event begins.</small></>}</div>
      </section>

      <section className="recipient-experience anonymous-receiver-section">
        <div className="recipient-copy"><div className="section-kicker">WHAT THE RECEIVER SEES</div><h2>A kind message—with no trail back.</h2><p>The recipient receives only the prepared compliment after a randomized delay. There is no sender name, profile, location, timestamp, reply button or “vibe back” route.</p><div className="privacy-note"><Icon name="lock" size={18}/><span>The cruise line may transiently authenticate the sender to enforce safety rules, but sender identity is not retained in the compliment record or disclosed to Tisonik.</span></div></div>
        <div className="receiver-preview-card anonymous-receiver-card"><div className="anonymous-mark"><Icon name="heart" size={24}/></div><small>SOMEONE APPRECIATED YOU</small><blockquote>“You made my day.”</blockquote><p>Delivered privately during your sailing.</p><span>Sender hidden · timing obscured · no reply</span></div>
      </section>

      <section className="vconnect-section">
        <div className="vconnect-copy"><div className="section-kicker">OPTIONAL · SEPARATE FROM ANONYMOUS VIBES</div><h2>VConnect opens only after both adults agree.</h2><p>A passenger may send one predefined connection request per sailing day. It is never attached to an Anonymous Vibe. The recipient can accept, decline, block or report; a decline or ignored request reveals nothing to the requester.</p><div className="guardrail-list"><span><Icon name="check" size={15}/> One request per sailing day</span><span><Icon name="lock" size={15}/> Accepted response disclosed only</span><span><Icon name="people" size={15}/> Adults on the same sailing</span><span><Icon name="shield" size={15}/> Public venues only</span></div></div>
        <div className="vconnect-card"><small>VCONNECT · PREDEFINED OPTIONS ONLY</small>{vconnectState==='idle'&&<><h3>Would you like to connect?</h3><p>The recipient will see your limited sailing profile. Choose one respectful reason.</p><div className="vconnect-options">{['Coffee in the atrium','Join me for trivia','Meet before tonight’s show'].map(option=><button key={option} className={vconnectOption===option?'active':''} onClick={()=>setVconnectOption(option)}>{option}</button>)}</div><button className="vconnect-primary" onClick={sendVConnect}>Send today’s request</button></>}{vconnectState==='requested'&&<><h3>Incoming request</h3><div className="vconnect-profile"><span>MA</span><div><b>Maria · same sailing</b><small>{vconnectOption}</small></div></div><p>Accepting reveals a limited connection profile and opens only prepared meeting options.</p><div className="vconnect-actions"><button className="vconnect-primary" onClick={()=>answerVConnect(true)}>Accept</button><button onClick={()=>answerVConnect(false)}>Decline</button><button onClick={()=>answerVConnect(false)}>Block / report</button></div></>}{vconnectState==='declined'&&<div className="vconnect-result"><Icon name="lock" size={24}/><h3>Request closed privately</h3><p>The requester receives no rejection, read receipt or status. No further contact route is opened.</p><button onClick={()=>setVconnectState('idle')}>Reset demo</button></div>}{vconnectState==='accepted'&&<><h3>Connection accepted</h3><p>Both passengers can now choose from approved public-place and time options. There is still no free-text chat.</p><div className="vconnect-options"><button onClick={()=>planVConnect('atrium-cafe')}>Atrium café · tomorrow afternoon</button><button onClick={()=>planVConnect('trivia-lounge')}>Trivia lounge · 4:30 PM</button><button onClick={()=>planVConnect('theatre-entrance')}>Theatre entrance · before the show</button></div></>}{vconnectState==='planned'&&<div className="vconnect-result"><Icon name="check" size={24}/><h3>Public meeting proposed</h3><p>The other passenger can confirm or decline. Cabins, room numbers, live location and unrestricted messages are unavailable.</p><button onClick={()=>setVconnectState('idle')}>Reset demo</button></div>}<div className="vconnect-limit"><Icon name="shield" size={14}/> Five vibes maximum per sailing day; a sixth attempt pauses sending until the next sailing day.</div></div>
      </section>

      <section className="summary-preview vibe-card-preview"><div><div className="section-kicker light">PRIVATE END-OF-CRUISE VIBE CARD</div><h2>Top Five means five score positions—not only five people.</h2><p>Equal valid-vibe totals share the same dense rank: if ten passengers tie at position four, all are #4 and the next distinct score is #5. Only the passenger may share their own card.</p></div><div className="share-card"><small>MEDITERRANEAN ESCAPE · 2–9 AUG 2026</small><h3>Your CruiseConnect Vibe Card</h3><div className="vibe-rank"><span>TOP FIVE</span><strong>#{currentRank.rank}</strong><p>Among the most appreciated adult passengers on this sailing</p></div><div className="affirm-grid">{affirmations.map(item => <div key={item.label} className={`affirm ${item.tone}`}><b>{item.count}</b><span>{item.label}</span></div>)}</div><div className="share-footer"><span>Private until you share</span><button onClick={shareVibeCard}><Icon name="share" size={16}/> {shared ? 'Copied / shared' : 'Share my card'}</button></div></div></section>
    </main>
  )
}

export function LegacyPassengerModule() {
  const [discoveryMode, setDiscoveryMode] = useState<'nearby' | 'activity' | 'interests'>('nearby')
  const [nearbyEnabled, setNearbyEnabled] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const [receiverState, setReceiverState] = useState<'waiting' | 'acknowledged' | 'ignored'>('waiting')
  const [proposal, setProposal] = useState<string | null>(null)
  const [shareState, setShareState] = useState('Share')
  const [interestSet, setInterestSet] = useState<string[]>(['Food experiences', 'Shopping', 'Fitness'])
  const [queuedCount, setQueuedCount] = useState(() => getQueuedActionCount())
  const [online, setOnline] = useState(() => navigator.onLine)
  const nearbyGuests = [
    { id: 'GUEST-DANIEL-208', initials: 'DA', name: 'Daniel', detail: 'Nearby · Shopping · Food', className: 'daniel' },
    { id: 'GUEST-SOFIA-311', initials: 'SK', name: 'Sofia', detail: 'Nearby · Fitness · Wellness', className: '' },
    { id: 'GUEST-JONAS-144', initials: 'JL', name: 'Jonas', detail: 'Nearby · Trivia · Culture', className: '' },
  ]
  const [selectedGuest, setSelectedGuest] = useState(nearbyGuests[0])
  const [previewAction, setPreviewAction] = useState<'acknowledged' | 'ignored' | 'blocked' | null>(null)
  const launchContext = useMemo(() => getLaunchContext(), [])

  const interestOptions = ['Food experiences','Shopping','Fitness','Wellness','Adventure excursions','Culture','Trivia & games','Live music','Family activities','Beach & nature']
  const publicMeetOptions = ['Coffee','Bar','Restaurant','Trivia / game','Spa / wellness','Shopping','Fitness activity','Show','Excursion']
  const nearbySignals = ['Great style','That was kind of you','You made us laugh','Great energy','You seemed friendly']

  const resetInteraction = () => { setSent(null); setReceiverState('waiting'); setProposal(null) }
  const selectGuest = (guest: typeof nearbyGuests[number]) => { setSelectedGuest(guest); resetInteraction() }
  const selectDiscoveryMode = (mode: 'nearby' | 'activity' | 'interests') => {
    setDiscoveryMode(mode)
    if (mode === 'activity') setSelectedGuest(nearbyGuests[2])
    if (mode === 'interests') setSelectedGuest(nearbyGuests[0])
    resetInteraction()
  }

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    const onQueue = () => setQueuedCount(getQueuedActionCount())
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('tisonik-queue-change', onQueue)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('tisonik-queue-change', onQueue)
    }
  }, [])

  const toggleInterest = (interest: string) => {
    const next = interestSet.includes(interest) ? interestSet.filter(x => x !== interest) : [...interestSet, interest]
    setInterestSet(next)
    const sentToHost = publishPassengerInterest(next)
    if (!sentToHost && !navigator.onLine) queueOfflineAction('UPDATE_INTERESTS', { interests: next }, launchContext.sailingId)
  }

  const toggleNearby = () => {
    const next = !nearbyEnabled
    setNearbyEnabled(next)
    if (next) requestNearbyDiscovery()
    else stopNearbyDiscovery()
  }

  const sendAffirmation = (signal: string) => {
    setSent(signal)
    setReceiverState('waiting')
    const sentToHost = notifyAffirmation(selectedGuest.id, signal)
    if (!sentToHost && !navigator.onLine) queueOfflineAction('PASSENGER_AFFIRMATION', { recipientGuestId: selectedGuest.id, affirmationId: signal }, launchContext.sailingId)
  }

  const chooseProposal = (venue: string) => {
    setProposal(venue)
    const sentToHost = notifyPublicMeetProposal(selectedGuest.id, venue)
    if (!sentToHost && !navigator.onLine) queueOfflineAction('PUBLIC_MEET_PROPOSAL', { recipientGuestId: selectedGuest.id, venueType: venue }, launchContext.sailingId)
  }

  const sharePassengerSummary = async () => {
    const text = 'My Tisonik · Sailing CC-0826-17 · 7× You made us laugh · 5× Great trivia teammate · 4× Enjoyed meeting you'
    try {
      if (navigator.share) await navigator.share({ title: 'My Tisonik', text })
      else if (navigator.clipboard) await navigator.clipboard.writeText(text)
      setShareState('Copied / shared')
    } catch { /* user cancelled */ }
  }

  return (
    <main className="page section-shell">
      <div className="page-head editorial"><div><div className="section-kicker">PASSENGER EXPERIENCE</div><h1>Notice someone. Find common ground. <span>Connect naturally onboard.</span></h1><p>Tisonik helps verified guests discover opted-in people nearby, reconnect through shared activities or find passengers with shared interests. First contact is always a predefined positive affirmation—not open messaging.</p></div><div className="pill"><Icon name="shield" size={15}/> Same-sailing · opt-in · no open chat</div></div>

      <section className="interest-onboarding">
        <div className="interest-copy"><div className="section-kicker light">ACTIVATE BEFORE & DURING THE SAILING</div><h2>Tell the app what would make this cruise better.</h2><p>The cruise line can surface Tisonik as soon as the sailing experience opens in its app. Guests select practical interests that improve discovery and later create relevant social-commerce opportunities.</p><div className="interest-proof"><span><Icon name="people" size={16}/> Shared interests create natural connection</span><span><Icon name="cart" size={16}/> The same intent can surface relevant cruise inventory</span><span><Icon name="shield" size={16}/> Guests control discoverability</span></div></div>
        <div className="interest-picker"><small>YOUR SAILING INTERESTS</small><h3>What are you interested in?</h3><div className="interest-chips">{interestOptions.map(interest => <button key={interest} className={interestSet.includes(interest) ? 'active' : ''} onClick={() => toggleInterest(interest)}>{interestSet.includes(interest) && <Icon name="check" size={13}/>} {interest}</button>)}</div><div className="interest-match"><div className="group-avatars"><span>DA</span><span>SK</span><span>JL</span><span>+14</span></div><p><b>17 people on this sailing</b> share at least one of your selected interests.</p></div></div>
      </section>

      <section className="privacy-architecture proximity-privacy">
        <div className="privacy-intro"><div className="section-kicker">DISCOVERY WITHOUT A PASSENGER DIRECTORY</div><h2>Proximity, shared context and shared interests—not a browse-everyone screen.</h2><p>A guest may want to compliment someone they just noticed at the casino, pool or promenade. Nearby discovery makes that possible without publishing the sailing manifest or revealing precise location.</p></div>
        <div className="privacy-grid">
          <article><span>01</span><b>Nearby is opt-in</b><p>Guests can make themselves visible to nearby Tisonik users for a limited period or while using the feature.</p></article>
          <article><span>02</span><b>Human identifies human</b><p>A chosen first name and profile image help the sender identify the person they can already see. No facial recognition.</p></article>
          <article><span>03</span><b>Coarse proximity only</b><p>Show “Nearby,” not a live map or exact metre distance. Never expose cabin, booking reference, phone number or room location.</p></article>
          <article><span>04</span><b>Minors protected</b><p>Minor accounts are excluded from peer discovery by default and follow cruise-line and guardian rules.</p></article>
        </div>
      </section>

      <div className="demo-grid refined passenger-demo-grid proximity-demo-grid">
        <PhoneShell label="Traveller view · proximity + positive affirmation">
          <div className="mobile-head"><div><small>Positive moments</small><strong>Connect onboard</strong></div><div className="avatar">MA</div></div>
          <div className="offline-status"><span className={online ? 'status-dot online' : 'status-dot'} /><div><b>{online ? 'Ship mode ready' : 'No public internet required'}</b><small>{queuedCount ? `${queuedCount} action${queuedCount === 1 ? '' : 's'} queued for sync` : 'Core interaction remains available onboard'}</small></div></div>
          {launchContext.ageBand === 'minor' ? <div className="minor-safety-state"><Icon name="shield" size={24}/><h3>Peer discovery is unavailable</h3><p>Minor accounts are excluded by default. The cruise line must explicitly approve any age-appropriate experience under its safeguarding rules.</p></div> : <>
          <div className="discovery-tabs three"><button className={discoveryMode==='nearby'?'active':''} onClick={()=>selectDiscoveryMode('nearby')}>Nearby</button><button className={discoveryMode==='activity'?'active':''} onClick={()=>selectDiscoveryMode('activity')}>Shared activity</button><button className={discoveryMode==='interests'?'active':''} onClick={()=>selectDiscoveryMode('interests')}>Interests</button></div>

          {discoveryMode === 'nearby' && <>
            <div className="nearby-control"><div><small>NEARBY VISIBILITY</small><b>{nearbyEnabled ? 'Visible while using this screen' : 'You are not visible nearby'}</b></div><button className={nearbyEnabled ? 'active' : ''} onClick={toggleNearby}>{nearbyEnabled ? 'On' : 'Off'}</button></div>
            <div className="nearby-context"><Icon name="people" size={16}/><span>People shown here are opted-in and physically nearby. Exact distance is never displayed.</span></div>
            <div className="nearby-people">{nearbyGuests.map(guest => <button key={guest.id} className={`nearby-person ${selectedGuest.id===guest.id?'selected':''}`} onClick={()=>selectGuest(guest)}><span className={`profile-photo ${guest.className}`}>{guest.initials}</span><span><b>{guest.name}</b><small>{guest.detail}</small></span><em>{selectedGuest.id===guest.id?'Selected':'Choose'}</em></button>)}</div>
          </>}

          {discoveryMode === 'activity' && <><div className="activity-context"><small>YOU BOTH ATTENDED</small><b>Trivia Night · Deck 6</b><span>Only opted-in guests from this activity appear.</span></div><div className="person-card"><div className="person-avatar">JL</div><div><strong>Jonas</strong><small>Trivia Night · shared activity</small></div><span>Verified</span></div></>}

          {discoveryMode === 'interests' && <><div className="activity-context"><small>SHARED INTEREST</small><b>Shopping & local food</b><span>Guests choose which interests they are willing to share.</span></div><div className="person-card"><div className="person-avatar">DA</div><div><strong>Daniel</strong><small>Shopping · Food experiences</small></div><span>2 shared</span></div></>}

          <p className="mobile-prompt">Send {selectedGuest.name} a positive affirmation</p>
          <div className="signal-list compact-signals">{nearbySignals.map(signal => <button disabled={Boolean(sent)} className={sent === signal ? 'selected' : ''} key={signal} onClick={() => sendAffirmation(signal)}><Icon name="heart" size={16}/>{signal}{sent === signal && <span>Sent</span>}</button>)}</div>

          {sent && <div className="receiver-gate"><small>AFFIRMATION SENT</small><b>{sent}</b>{receiverState === 'waiting' && <><p>{selectedGuest.name} may acknowledge or ignore it. No meeting proposal is available until they respond.</p><div className="demo-response"><button onClick={() => setReceiverState('acknowledged')}>Simulate acknowledgement</button><button className="muted" onClick={() => setReceiverState('ignored')}>Simulate ignore</button></div></>}{receiverState === 'ignored' && <><p>{selectedGuest.name} ignored the affirmation. The interaction ends here. No further contact route is exposed.</p><button className="receiver-reset" onClick={resetInteraction}>Start another walkthrough</button></>}{receiverState === 'acknowledged' && <><div className="mutual-positive"><Icon name="check" size={14}/> {selectedGuest.name} acknowledged your affirmation.</div><p className="meeting-rule">You may now suggest a <b>public onboard place or activity</b>. Cabins/staterooms are never offered.</p><div className="public-meet-grid">{publicMeetOptions.map(place => <button key={place} className={proposal===place?'selected':''} onClick={() => chooseProposal(place)}>{place}</button>)}</div>{proposal && <><div className="proposal-sent"><Icon name="check" size={13}/> {proposal} proposal sent</div><button className="receiver-reset" onClick={resetInteraction}>Start another walkthrough</button></>}</> }</div>}

          <div className="safety-note"><Icon name="shield" size={16}/><span>No unrestricted messaging. No dating mode. No cabin meeting option. One affirmation per sender → recipient → sailing day. Block/report remain available.</span></div>
          </>}
        </PhoneShell>

        <div className="explain-stack">
          <article className="feature-large"><div className="number">01</div><div><h3>Discover naturally</h3><p>Nearby, shared activity and shared interests cover the real ways people notice or meet one another onboard.</p></div></article>
          <article className="feature-large"><div className="number">02</div><div><h3>Affirm first</h3><p>The first contact can only be a predefined positive signal. The recipient can acknowledge it or ignore it.</p></div></article>
          <article className="feature-large"><div className="number">03</div><div><h3>Reciprocity unlocks the next step</h3><p>Only after the recipient responds can the sender suggest coffee, a bar, restaurant, game, spa, shopping, fitness, a show or excursion.</p></div></article>
          <article className="feature-large accent"><div className="number">04</div><div><h3>Meet in the real world</h3><p>Tisonik does not need to host a conversation. Guests meet onboard or can later move to the cruise line's chat or their own communication channel.</p></div></article>
          <article className="feature-large commercial"><div className="number">05</div><div><h3>Shared intent becomes commerce</h3><p>The same interests that create connection can surface relevant dining, shopping, wellness, activity and excursion inventory when the cruise line chooses to promote it.</p></div></article>
        </div>
      </div>

      <section className="recipient-experience">
        <div className="recipient-copy"><div className="section-kicker">WHAT THE RECEIVER SEES</div><h2>The recipient stays in control.</h2><p>Daniel sees the positive affirmation and a minimal sender profile. He can acknowledge or ignore it. Ignoring ends the interaction; acknowledgement allows Maria to propose an approved public onboard place or activity.</p><div className="privacy-note"><Icon name="lock" size={18}/><span>No cabin, phone number or private contact detail is revealed. A response is consent to the next structured step—not consent to unrestricted messaging.</span></div></div>
        <div className="receiver-preview-card"><div className="receiver-profile"><span className="profile-photo">MA</span><div><small>POSITIVE AFFIRMATION FROM</small><b>Maria</b><span>Nearby · same sailing</span></div></div><blockquote>“That was kind of you.”</blockquote><div className="receiver-actions"><button className="primary-receiver" disabled={previewAction!==null} onClick={()=>setPreviewAction('acknowledged')}><Icon name="check" size={14}/> Acknowledge</button><button disabled={previewAction!==null} onClick={()=>setPreviewAction('ignored')}>Ignore</button><button className="text-action" disabled={previewAction!==null} onClick={()=>setPreviewAction('blocked')}>Block / report</button></div><small className="receiver-foot">{previewAction === 'acknowledged' ? 'Acknowledged. Maria may now propose an approved public place or activity.' : previewAction === 'ignored' ? 'Ignored. The interaction ended and no further route was exposed.' : previewAction === 'blocked' ? 'Blocked and reported. Maria cannot contact this account again in the walkthrough.' : 'Acknowledging does not open chat. It only allows a public-place/activity proposal.'}</small>{previewAction && <button className="receiver-preview-reset" onClick={()=>setPreviewAction(null)}>Reset receiver state</button>}</div>
      </section>

      <section className="offline-passenger-section">
        <div><div className="section-kicker light">DESIGNED FOR LIFE AT SEA</div><h2>Public internet is optional for the core experience.</h2><p>The production module is designed to run from the cruise-line app with a cached local shell, native nearby discovery and an offline action queue. When onboard connectivity is available, actions can sync over the ship's network; when external internet returns, deferred cloud analytics and social sharing can complete.</p></div>
        <div className="offline-layers"><article><span>01</span><b>On-device</b><p>Cached interface, preferences, selected interests and pending actions.</p></article><article><span>02</span><b>Ship-local</b><p>Native proximity bridge and onboard APIs/LAN where the operator exposes them.</p></article><article><span>03</span><b>Deferred cloud</b><p>Non-urgent analytics, external sharing and cloud replication sync later.</p></article></div>
      </section>

      <section className="summary-preview"><div><div className="section-kicker light">END-OF-CRUISE MEMORY</div><h2>A positive artifact guests may actually want to share.</h2><p>Public sharing contains the recipient's affirmations—not the identities of the people who sent them unless separately permitted.</p></div><div className="share-card"><small>CC-0826-17 · 2–9 AUG 2026</small><h3>Your Tisonik</h3><p>The positive moments you collected at sea.</p><div className="affirm-grid">{affirmations.map(a => <div key={a.label} className={`affirm ${a.tone}`}><b>{a.count}</b><span>{a.label}</span></div>)}</div><div className="share-footer"><span>Powered by Tisonik</span><button onClick={sharePassengerSummary}><Icon name="share" size={16}/> {shareState}</button></div></div></section>
    </main>
  )
}


function CrewRecognition() {
  const launchContext = useMemo(() => getLaunchContext(), [])
  const [badgeCaptured, setBadgeCaptured] = useState(false)
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [sent, setSent] = useState(false)
  const sendCrewRecognition = () => {
    if (selectedReasons.length === 0) return
    setSent(true)
    const sentToHost = notifyCrewRecognition('CREW-ANA-RODRIGUES', selectedReasons)
    if (!sentToHost && !navigator.onLine) queueOfflineAction('CREW_RECOGNITION', { crewMemberId: 'CREW-ANA-RODRIGUES', reasonIds: selectedReasons }, launchContext.sailingId)
  }
  const toggleReason = (reason: string) => {
    if (sent) return
    setSelectedReasons(current => {
      if (current.includes(reason)) return current.filter(r => r !== reason)
      return current.length < 2 ? [...current, reason] : current
    })
  }
  return (
    <main className="page section-shell">
      <div className="page-head editorial"><div><div className="section-kicker">CREW RECOGNITION</div><h1>Capture excellent service <span>while the moment is still fresh.</span></h1><p>Recognition is tied to the crew member, ship, sailing and date. Repeat excellence can be recognized across the voyage without turning the feature into a voting mechanism.</p></div><div className="pill"><Icon name="calendar" size={15}/> Once per crew member, per guest, per day</div></div>
      <div className="crew-page-grid">
        <PhoneShell label="Recognition flow">
          <div className="mobile-head"><div><small>Crew recognition</small><strong>Say thank you now</strong></div><div className="avatar"><Icon name="crew" size={18}/></div></div>
          <div className="badge-capture"><div className="camera-ring"><Icon name="camera" size={28}/></div><h3>Photograph the crew member in the app</h3><p>Keep the crew member’s face and visible name badge in frame. The cruise line matches the face against its own crew roster; badge text alone is not sufficient.</p><button onClick={()=>setBadgeCaptured(true)} disabled={badgeCaptured}>{badgeCaptured ? 'Identity matched ✓' : 'Open sample camera'}</button></div>
          {badgeCaptured && <div className="identified"><span className="crew-photo">AN</span><div><small>OPERATOR FACE + ROSTER MATCH</small><strong>Ana Rodrigues · Crew ID •482</strong><span>Dining · Meridian Restaurant · 8:14 PM</span></div><Icon name="check"/></div>}
          <div className="recognition-selector-head"><p className="mobile-prompt">Choose up to two reasons</p><span>{selectedReasons.length}/2</span></div>
          <div className="recognition-chips">{recognitionReasons.map(r => <button onClick={() => toggleReason(r)} disabled={!badgeCaptured || sent || (!selectedReasons.includes(r) && selectedReasons.length >= 2)} className={selectedReasons.includes(r) ? 'active' : ''} key={r}>{r}</button>)}</div>
          <button className="mobile-primary" disabled={!badgeCaptured || sent || selectedReasons.length === 0} onClick={sendCrewRecognition}>{sent ? 'Recognition sent instantly ✓' : badgeCaptured ? 'Send instant recognition' : 'Match the crew identity to continue'}</button>
          <div className="daily-rule"><Icon name="lock" size={15}/><span>{sent ? 'Photo, biometric template and match score stayed operator-side. Tisonik receives only aggregate totals.' : 'Identity processing stays on-device, ship-local or in the cruise line’s system. One recognition per guest → crew member → calendar day.'}</span></div>
        </PhoneShell>
        <div className="crew-data-story"><div className="section-kicker">FROM THANK-YOU TO USEFUL SIGNAL</div><h2>Show total recognition with the context that makes it credible.</h2><p>Raw compliment totals alone are easy to misread. Tisonik separates breadth, depth and consistency.</p><div className="data-definition-grid"><div><b>84</b><span>Total recognition moments</span></div><div><b>61</b><span>Unique guests recognizing Ana</span></div><div><b>6/7</b><span>Sailing days with recognition</span></div></div><CrewRecognitionCard shareable /></div>
      </div>
      <section className="recognition-policy"><div><Icon name="shield" size={23}/><h3>Recognition, not ranking.</h3></div><p>No public crew leaderboards, popularity contests or passenger-facing star ratings. Management can analyze trends internally while the crew-facing experience remains a record of appreciation.</p></section>
    </main>
  )
}

function RecoveryPage({ navigate }: { navigate: (v: View) => void }) {
  const launchContext = useMemo(() => getLaunchContext(), [])
  const [issue, setIssue] = useState('Excursion issue')
  const [submitted, setSubmitted] = useState(false)
  const [department, setDepartment] = useState('Dining')
  const [pulseScore, setPulseScore] = useState<number | null>(null)
  const departments = ['Dining','Stateroom','Pool & deck','Entertainment','Excursions','Guest services']
  const pulseLabels = ['Very poor','Poor','Okay','Good','Excellent']
  const submitIssue = () => {
    setSubmitted(true)
    const sentToHost = notifyServiceIssue(issue)
    if (!sentToHost && !navigator.onLine) queueOfflineAction('SERVICE_ISSUE', { category: issue }, launchContext.sailingId)
  }
  const submitPulse = (score: number) => {
    setPulseScore(score)
    const sentToHost = notifyExperiencePulse(department, score)
    if (!sentToHost && !navigator.onLine) queueOfflineAction('EXPERIENCE_PULSE', { department, score }, launchContext.sailingId)
  }
  const routePulseToHelp = () => {
    setIssue(department === 'Dining' ? 'Dining problem' : department === 'Stateroom' ? 'Cabin issue' : 'Excursion issue')
    setSubmitted(false)
    window.setTimeout(() => document.getElementById('service-request')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
  }
  return (
    <main className="page section-shell">
      <div className="page-head editorial"><div><div className="section-kicker">REAL-TIME SERVICE RECOVERY</div><h1>Give the cruise line a chance to fix the problem <span>before the sailing ends.</span></h1><p>Complaints use a private operational route, completely separate from positive recognition and passenger affirmations.</p></div><div className="pill coral"><Icon name="lock" size={15}/> Private by design</div></div>
      <div className="recovery-page-grid">
        <div id="service-request"><PhoneShell label="Private service route">
          <div className="mobile-head"><div><small>Need help?</small><strong>Let's fix it onboard</strong></div><div className="avatar"><Icon name="help" size={18}/></div></div>
          <div className="help-intro"><div className="help-icon"><Icon name="bell"/></div><h3>Tell the right team now</h3><p>This is a private service route—not a public review.</p></div>
          <p className="mobile-prompt">What do you need help with?</p>
          <div className="issue-list">{['Cabin issue','Dining problem','Excursion issue','Billing question','Accessibility need','Lost item'].map(x => <button key={x} className={issue===x?'active':''} onClick={()=>{setIssue(x);setSubmitted(false)}}>{x}<span>›</span></button>)}</div>
          <button className="mobile-primary warning" disabled={submitted} onClick={submitIssue}>{submitted ? 'Sent to service team ✓' : 'Send to service team'}</button>
          <div className="recovery-status"><span className="status-dot"/><div><b>{submitted ? 'Issue acknowledged' : 'Pilot workflow'}</b><small>{submitted ? `${issue} · assigned to onboard team` : 'Acknowledge → assign → resolve → close loop with guest'}</small></div></div>
        </PhoneShell></div>
        <div className="recovery-ops"><div className="section-kicker">OPERATIONAL LOOP</div><h2>From private signal to closed-loop recovery.</h2><div className="ops-timeline"><div><span>01</span><div><b>Capture</b><p>Ship, sailing, guest, issue type and relevant location context.</p></div></div><div><span>02</span><div><b>Route</b><p>Send the issue to the appropriate onboard team instead of a generic feedback queue.</p></div></div><div><span>03</span><div><b>Respond</b><p>Acknowledge the passenger while they are still onboard.</p></div></div><div><span>04</span><div><b>Resolve & re-check</b><p>Track resolution time, then ask whether the experience improved before closing the loop.</p></div></div></div><div className="ops-metric-panel"><div><small>DEMO PILOT</small><b>93%</b><span>resolved onboard</span></div><div><small>MEDIAN ACKNOWLEDGEMENT</small><b>2m</b><span>from guest submission</span></div><div><small>MEDIAN RESOLUTION</small><b>14m</b><span>across routed issues</span></div></div></div>
      </div>

      <section className="experience-pulse-section">
        <div className="pulse-copy"><div className="section-kicker">EXPERIENCE PULSE · PRIVATE TO THE CRUISE LINE</div><h2>Measure the whole experience—not only the complaints that escape.</h2><p>A lightweight department pulse gives the operator a live view of Dining, Stateroom, Pool & Deck, Entertainment, Excursions and Guest Services. It is <b>not a public star-rating system</b>. Low scores can offer immediate private help; resolved issues can receive a short follow-up pulse to measure recovery.</p><div className="pulse-guardrails"><span><Icon name="check" size={14}/> Only departments the guest used</span><span><Icon name="clock" size={14}/> Maximum one department pulse per day</span><span><Icon name="lock" size={14}/> Results stay private to the operator</span></div></div>
        <div className="pulse-demo-card">
          <small>QUICK EXPERIENCE PULSE</small><h3>How was your experience?</h3>
          <div className="department-chips">{departments.map(d=><button key={d} className={department===d?'active':''} onClick={()=>{setDepartment(d);setPulseScore(null)}}>{d}</button>)}</div>
          <div className="pulse-question"><b>{department}</b><span>Today · Sailing CC-0826-17</span></div>
          <div className="pulse-scale">{pulseLabels.map((label,i)=><button key={label} className={pulseScore===i+1?'active':''} onClick={()=>submitPulse(i+1)}><b>{i+1}</b><span>{label}</span></button>)}</div>
          {pulseScore && pulseScore <= 2 && <div className="pulse-recovery-offer"><Icon name="help" size={17}/><div><b>Would you like us to fix this now?</b><span>Your rating stays private. We can route the issue to the right onboard team.</span></div><button onClick={routePulseToHelp}>Get help</button></div>}
          {pulseScore === 3 && <div className="pulse-thanks"><Icon name="check" size={16}/> Thanks. This helps the onboard team understand today's experience.</div>}
          {pulseScore && pulseScore >= 4 && <div className="pulse-positive-route"><Icon name="heart" size={17}/><div><b>Did a crew member make this experience special?</b><span>Turn a strong department experience into named recognition.</span></div><AppLink to="crew" navigate={navigate}>Recognize crew</AppLink></div>}
        </div>
      </section>
    </main>
  )
}

function Commerce() {
  const [handoff, setHandoff] = useState(false)
  const sendToHost = () => { openHostBooking('mediterranean-tasting-2030'); setHandoff(true) }
  return (
    <main className="page section-shell">
      <div className="page-head editorial"><div><div className="section-kicker">PARTICIPATION & SOCIAL COMMERCE</div><h1>Use shared passenger intent to fill real experiences—<span>not push generic ads.</span></h1><p>Travellers voluntarily share cruise-relevant interests such as food, shopping, fitness, wellness and excursion styles. Tisonik uses that context—plus positive onboard connections—to surface relevant cruise inventory at the moment doing it together feels natural.</p></div><div className="pill coral"><Icon name="chart" size={15}/> Attribution-ready</div></div>

      <section className="interest-commerce-map">
        <div><div className="section-kicker light">INTEREST → CONNECTION → INVENTORY</div><h2>The same preference can improve both guest experience and revenue.</h2><p>The cruise line controls which interests map to which products. Tisonik provides the social context and group-intent signal.</p></div>
        <div className="interest-map-grid"><article><b>Food experiences</b><span>Specialty dining · tastings · culinary excursions</span></article><article><b>Shopping</b><span>Onboard retail · shopping excursions · local markets</span></article><article><b>Fitness</b><span>Classes · active excursions · wellness experiences</span></article><article><b>Wellness</b><span>Spa · recovery · yoga · premium wellness</span></article><article><b>Adventure</b><span>Shore excursions · sports · outdoor activities</span></article><article><b>Culture</b><span>Museums · city tours · local food & heritage</span></article></div>
      </section>

      <div className="commerce-grid">
        <div className="intent-panel"><div className="panel-head"><div><small>SOCIAL INTENT SIGNAL</small><h3>Tonight's Mediterranean tasting</h3></div><span className="occupancy">9 seats left</span></div><div className="group-avatars"><span>MA</span><span>DA</span><span>JL</span><span>+4</span></div><p><b>7 passengers who share your food interest</b> are considering this experience. Three are people you've already positively connected with.</p><div className="experience-meta"><span>8:30 PM</span><span>Deck 7</span><span>$49 pp</span></div><button className="btn primary" onClick={sendToHost}>View in cruise-line booking <Icon name="arrow" size={17}/></button><small className="fine">{handoff ? 'Demo handoff emitted to the host cruise app.' : 'Inventory, price and payment remain with the cruise line.'}</small></div>
        <div className="commerce-logic"><div className="logic-line"><span>1</span><div><b>Interest declared</b><small>Guest chooses what they are genuinely interested in doing on this sailing.</small></div></div><div className="logic-line"><span>2</span><div><b>Natural social proof</b><small>Relevant people on the same sailing share the interest or have already connected positively.</small></div></div><div className="logic-line"><span>3</span><div><b>Timely inventory</b><small>The cruise line chooses eligible inventory and timing, including remaining capacity.</small></div></div><div className="logic-line"><span>4</span><div><b>Host-app conversion</b><small>The booking returns to the cruise line and is measured using agreed attribution or control logic.</small></div></div></div>
      </div>

      <section className="activation-commerce"><div><div className="section-kicker">DISTRIBUTION IS PART OF THE PRODUCT</div><h2>The cruise line must actively drive passenger activation.</h2><p>Interest data and social commerce only become useful at sufficient participation. Pilot deployment therefore includes agreed app placements before sailing and onboard.</p></div><div className="activation-steps"><span>Pre-sailing interest selection</span><span>Embarkation activation</span><span>Daily activity prompts</span><span>Contextual inventory prompts</span></div></section>

      <section className="inventory-section"><div><div><div className="section-kicker">PERISHABLE INVENTORY</div><h2>A smarter way to surface what still has capacity.</h2></div><span className="inventory-note">Example pilot data</span></div><div className="inventory-table"><div className="table-head"><span>Experience</span><span>Availability</span><span>Relevant groups</span><span>Signal</span></div>{[['Chef’s table','8 seats','6 groups','High'],['Sunset spa circuit','11 spots','4 groups','Medium'],['Coastal excursion','14 seats','9 groups','High'],['Late show upgrade','21 seats','7 groups','Medium']].map(row => <div className="table-row" key={row[0]}>{row.map((x,i)=><span key={x} className={i===3?`signal ${x.toLowerCase()}`:''}>{x}</span>)}</div>)}</div></section>
    </main>
  )
}


function Dashboard() {
  const bars = useMemo(() => [54, 70, 61, 82, 76, 92, 88], [])
  const [showIssues, setShowIssues] = useState(false)
  const exportPilotReport = () => {
    const rows = [['Metric','Value','Context'], ...kpis.map(kpi => [kpi.label,kpi.value,kpi.detail]), ['Open issues','7','Illustrative walkthrough data']]
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g,'""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'tisonik-pilot-report-demo.csv'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  return (
    <main className="page section-shell dashboard-page">
      <div className="dash-top"><div><div className="section-kicker">CRUISE-LINE DASHBOARD</div><h1>Mediterranean Escape · <span>Sailing CC-0826-17</span></h1><p>2–9 August 2026 · Illustrative white-label pilot performance · Day 4 of 7</p></div><div className="dash-actions"><button className="btn ghost" onClick={exportPilotReport}>Export pilot report</button><button className="btn primary" aria-expanded={showIssues} onClick={()=>setShowIssues(current => !current)}>{showIssues ? 'Hide live issues' : 'View live issues'}</button></div></div>
      {showIssues && <section className="live-issues-panel" aria-label="Illustrative live service issues"><div><small>LIVE ISSUE QUEUE · ILLUSTRATIVE</small><h2>Seven open items, prioritized for onboard action.</h2></div><div className="live-issue-list"><article><span className="issue-priority urgent">URGENT</span><b>Accessibility support · Deck 5</b><small>Acknowledged 2 minutes ago · Guest Services</small></article><article><span className="issue-priority">IN PROGRESS</span><b>Excursion meeting-point clarification</b><small>Assigned 6 minutes ago · Shore Experiences</small></article><article><span className="issue-priority">NEW</span><b>Dining allergy confirmation</b><small>Received just now · Dining Operations</small></article></div></section>}
      <div className="kpi-grid">{kpis.map(k => <article key={k.label}><div className="kpi-top"><span>{k.label}</span><b>{k.trend}</b></div><strong>{k.value}</strong><small>{k.detail}</small></article>)}</div>
      <div className="dash-grid">
        <section className="chart-card"><div className="card-head"><div><small>POSITIVE INTERACTION</small><h3>Recognition & affirmation volume</h3></div><span>7-day sailing</span></div><div className="bar-chart">{bars.map((b,i)=><div className="bar-col" key={i}><div className="bar" style={{height:`${b}%`}}><span>{120+i*17}</span></div><small>D{i+1}</small></div>)}</div></section>
        <section className="recovery-card"><div className="card-head"><div><small>SERVICE RECOVERY</small><h3>Open issues</h3></div><span className="badge-green">93% resolved onboard</span></div><div className="issue-metric"><strong>7</strong><span>currently open</span></div><div className="recovery-bars"><div><span>Under 15 min</span><div><i style={{width:'68%'}}/></div><b>68%</b></div><div><span>15–30 min</span><div><i style={{width:'23%'}}/></div><b>23%</b></div><div><span>30+ min</span><div><i style={{width:'9%'}}/></div><b>9%</b></div></div></section><section className="pulse-dashboard-card"><div className="card-head"><div><small>EXPERIENCE PULSE</small><h3>Department satisfaction today</h3></div><span>Private · demo data</span></div><div className="department-score-list">{[['Entertainment','4.7','94%'],['Dining','4.6','92%'],['Stateroom','4.4','88%'],['Excursions','4.3','86%'],['Pool & deck','4.2','84%']].map(([name,score,positive])=><div key={name}><span>{name}</span><div><i style={{width:positive}}/></div><b>{score}</b></div>)}</div><div className="recovery-uplift"><span><Icon name="chart" size={16}/></span><div><small>POST-RECOVERY PULSE</small><b>+1.6 average satisfaction uplift</b><p>Measures whether a resolved issue actually improved the guest experience.</p></div></div></section>
        <section className="recognition-card"><div className="card-head"><div><small>CREW RECOGNITION</small><h3>What guests are recognizing</h3></div><span>812 total · 536 unique guests</span></div><div className="donut-area"><div className="donut"><div>812<small>moments</small></div></div><div className="legend"><span><i className="l1"/>Made us feel welcome <b>31%</b></span><span><i className="l2"/>Went above and beyond <b>24%</b></span><span><i className="l3"/>Exceptional service <b>19%</b></span><span><i className="l4"/>Other positive reasons <b>26%</b></span></div></div></section>
        <section className="revenue-card"><div className="card-head"><div><small>COMMERCE ATTRIBUTION</small><h3>Shared-intent conversion</h3></div><span>Pilot estimate</span></div><div className="revenue-big"><strong>$18,420</strong><small>attributed gross booking value</small></div><div className="revenue-lines"><div><span>Specialty dining</span><b>$6,820</b></div><div><span>Excursions</span><b>$5,970</b></div><div><span>Activities & spa</span><b>$3,880</b></div><div><span>Other experiences</span><b>$1,750</b></div></div><div className="control-note"><Icon name="chart" size={17}/><span>Final pilot should validate incrementality using treatment/control measurement where feasible.</span></div></section>
      </div>
      <section className="gamme-dash"><div><div className="section-kicker light">GAMMESO HEALTH</div><h2>One operational view of the entire positive-interaction loop.</h2></div><div className="gamme-metrics">{[['G','1,406','Great interactions'],['A','1,118','Affirmations'],['M','428','Joined activities'],['M','$18.4K','Activity commerce'],['E','322','Summaries ready'],['S','127','Shares initiated'],['O','39.4K','Organic impressions']].map(([l,v,t])=><div key={t}><span>{l}</span><b>{v}</b><small>{t}</small></div>)}</div></section>
    </main>
  )
}

function IntegrationPage() {
  const context = useMemo(() => getLaunchContext(), [])
  const [tested, setTested] = useState(false)
  const [nearbyTested, setNearbyTested] = useState(false)
  const testHandoff = () => { openHostBooking('demo-specialty-dining'); setTested(true) }
  const testNearby = () => { requestNearbyDiscovery(); setNearbyTested(true) }
  return (
    <main className="page section-shell integration-page">
      <div className="page-head editorial"><div><div className="section-kicker">CRUISE-APP INTEGRATION</div><h1>Add the module to the app guests already use. <span>Keep it useful even without public internet.</span></h1><p>The cruise-line app remains the trusted host. Tisonik adds the interaction layer through an embedded experience plus native bridge capabilities for identity, proximity, notifications and booking handoff.</p></div><div className="pill"><Icon name="layers" size={15}/> White-label · offline-first · host controlled</div></div>

      <section className="integration-flow-card">
        <div className="integration-sequence">
          <article><span>01</span><div><b>Module is available before the ship loses public internet</b><p>The cruise app pre-bundles or pre-caches the static module during app install/pre-sailing sync, or serves the shell from the ship-local network.</p></div></article><article><span>02</span><div><b>Guest opens Tisonik</b><p>The cruise line promotes the feature pre-sailing, at embarkation, from the daily program or through contextual prompts inside its existing app.</p></div></article>
          <article><span>03</span><div><b>Host establishes a sailing-scoped identity</b><p>A short-lived signed launch token is validated server-side when connectivity is available; the app can retain an approved offline entitlement for the active sailing.</p></div></article>
          <article><span>04</span><div><b>Native bridge supplies ship capabilities</b><p>Nearby discovery, notifications and other device-native functions are exposed by the cruise-line app/SDK. The web surface never treats browser proximity as authoritative.</p></div></article>
          <article><span>05</span><div><b>Core interaction works onboard</b><p>Interests, nearby discovery, affirmations, crew recognition, Experience Pulse and invitations can operate from the cached app shell and ship-local services.</p></div></article>
          <article><span>06</span><div><b>Actions sync locally or queue</b><p>If the ship exposes onboard APIs/LAN, actions sync there. Otherwise non-urgent actions are queued locally for later synchronization; production should place that queue in the host app's approved secure storage.</p></div></article>
          <article><span>07</span><div><b>Commerce returns to the host</b><p>Relevant purchase intent opens the cruise line's own inventory, pricing, checkout and payment route. Tisonik never needs to become the merchant.</p></div></article>
          <article><span>08</span><div><b>Deferred cloud sync completes later</b><p>External analytics, cloud replication and social sharing can complete when internet connectivity returns.</p></div></article>
        </div>
        <div className="launch-context-card"><small>DEMO HOST CONTEXT</small><h3>{context.hostApp}</h3><div><span>Sailing</span><b>{context.sailingId}</b></div><div><span>Ship</span><b>{context.shipId}</b></div><div><span>Guest scope</span><b>{context.guestId}</b></div><div><span>Age band</span><b>{context.ageBand}</b></div><div><span>Session source</span><b>{context.source}</b></div><button className="btn primary" onClick={testNearby}>Test nearby bridge</button>{nearbyTested && <p className="bridge-success">Demo START_NEARBY_DISCOVERY event emitted. A native host SDK would return opted-in nearby pseudonymous guests.</p>}<button className="btn primary secondary-host" onClick={testHandoff}>Test booking handoff <Icon name="arrow" size={16}/></button>{tested && <p className="bridge-success">Demo OPEN_BOOKING event emitted. In production the host app would open its approved booking route.</p>}</div>
      </section>

      <section className="offline-architecture">
        <div className="offline-arch-copy"><div className="section-kicker light">OFFLINE-FIRST SHIP ARCHITECTURE</div><h2>No public internet should not mean no Tisonik.</h2><p>The production design separates the <b>device layer</b>, the <b>ship-local layer</b> and the <b>external cloud layer</b>. The passenger should not care which path is currently available.</p></div>
        <div className="offline-arch-grid"><article><span>DEVICE</span><h3>Cached app + native SDK</h3><p>Pre-bundled or pre-cached app shell, local preferences, offline action queue, native proximity bridge and approved sailing entitlement.</p><small>Available even on first onboard open when preloaded</small></article><article><span>SHIP</span><h3>Onboard network / local APIs</h3><p>Passenger/crew lookup, local event delivery, service routing and optional onboard analytics when the cruise line exposes ship-local services.</p><small>No public internet required</small></article><article><span>CLOUD</span><h3>Deferred synchronization</h3><p>Enterprise analytics, cross-sailing aggregation, CRM/BI feeds and external social sharing when connectivity returns.</p><small>Eventually consistent by design</small></article></div>
      </section>

      <section className="proximity-contract">
        <div><div className="section-kicker">NATIVE PROXIMITY CONTRACT</div><h2>Nearby discovery should reveal identity—not track location.</h2><p>The host SDK rotates anonymous nearby identifiers and resolves them only for verified, same-sailing, opted-in guests. Tisonik receives enough information for a human to recognize another human, not a live location feed.</p></div>
        <div className="guardrail-list"><span><Icon name="shield" size={16}/> Opt-in nearby visibility</span><span><Icon name="people" size={16}/> First name + chosen profile image</span><span><Icon name="lock" size={16}/> Rotating pseudonymous proximity ID</span><span><Icon name="check" size={16}/> “Nearby,” never exact metres</span><span><Icon name="calendar" size={16}/> Same sailing only</span><span><Icon name="shield" size={16}/> Minors excluded by default</span></div>
      </section>

      <section className="integration-guardrails">
        <div><div className="section-kicker">PRODUCTION SECURITY BOUNDARY</div><h2>The browser bridge is not the authentication system.</h2><p>A live integration must validate signed launch credentials server-side when establishing the sailing entitlement, bind all actions to the validated guest/sailing scope, allowlist host origins/deep links and protect locally queued records at rest. Query parameters alone must never establish identity.</p></div>
        <div className="guardrail-list"><span><Icon name="shield" size={16}/> Short-lived signed launch token</span><span><Icon name="lock" size={16}/> Server-side validation</span><span><Icon name="users" size={16}/> Pseudonymous guest ID</span><span><Icon name="calendar" size={16}/> Sailing-scoped offline entitlement</span><span><Icon name="layers" size={16}/> Allowlisted host bridge</span><span><Icon name="check" size={16}/> No separate Tisonik login</span></div>
      </section>
    </main>
  )
}


function PilotPage() {
  return (
    <main className="page section-shell pilot-page">
      <div className="pilot-intro"><div className="section-kicker">PILOT DESIGN</div><h1>Pilot the complete Tisonik experience on <span>one ship.</span></h1><p>Deploy the connected product inside the cruise line’s existing app, promote it across selected sailings and measure the full passenger, crew, recovery, engagement and commercial journey.</p><div className="pilot-principles"><div><b>01</b><span>One ship or defined sailing set</span></div><div><b>02</b><span>Complete connected experience</span></div><div><b>03</b><span>Predetermined KPIs</span></div><div><b>04</b><span>Active passenger promotion</span></div></div></div>
      <div className="pilot-form"><div><small>REQUEST A DEMO</small><h2>Use the live pilot enquiry.</h2><p>Review the complete experience and contact TSquare Ventures LLC through the production form.</p></div><a className="btn primary xl" href="/pilot/#contact">Open the live enquiry <Icon name="arrow" size={18}/></a></div>

      <section className="promotion-requirement"><div><div className="section-kicker light">PILOT REQUIREMENT</div><h2>The cruise line has to promote the feature.</h2><p>Social commerce only becomes measurable if enough travellers activate the passenger layer and share interests. A valid pilot therefore includes agreed placements in the cruise app—not a hidden feature with no meaningful exposure.</p></div><div className="promotion-grid"><span>Pre-sailing interest setup</span><span>Embarkation prompt</span><span>Home/app tile</span><span>Daily-program prompts</span><span>Activity context prompts</span><span>End-of-cruise summary</span></div></section>

      <section className="commercial-framework">
        <div className="commercial-head"><div><div className="section-kicker">WORKING COMMERCIAL FRAMEWORK</div><h2>Software fee + performance upside.</h2></div><p>The numbers below are a negotiation anchor for design-partner conversations, not fixed public pricing. The pilot should prove value before a fleet-wide contract.</p></div>
        <div className="commercial-cards"><article><small>01 · ENTERPRISE</small><h3>Onboarding / integration</h3><p>One-time implementation, security, white-label configuration and host-app integration.</p><b>Negotiated</b></article><article><small>02 · VESSEL</small><h3>Ship activation & license</h3><p>Ship configuration, venues, departments, crew and operational mappings.</p><b>Negotiated per ship</b></article><article className="featured"><small>03 · PLATFORM</small><h3>Eligible passenger fee</h3><p>Aligns the cruise line to actively promote activation rather than pay only for self-selected users.</p><b>$1 / eligible passenger <em>working anchor</em></b></article><article><small>04 · PERFORMANCE</small><h3>Incremental commerce</h3><p>Applied only to agreed attributable incremental onboard revenue, measured with agreed attribution or control methods.</p><b>5% <em>working anchor</em></b></article></div>
        <div className="commercial-note"><Icon name="chart" size={18}/><span>Alternative negotiation structure: a lower passenger fee such as <b>$0.50</b> can be traded against stronger minimums, vessel licensing or performance economics. Do not lock that concession into the public proposition before pilot data exists.</span></div>
      </section>
    </main>
  )
}


type LegalKind = 'imprint' | 'privacy' | 'terms' | 'cookies'

const LegalPage = ({ kind }: { kind: LegalKind }) => {
  const updated = '4 September 2026'

  if (kind === 'imprint') return (
    <main className="legal-page">
      <div className="legal-hero"><div className="section-kicker">LEGAL</div><h1>Imprint</h1><p>Legal operator information for Tisonik.</p><span>Last updated: {updated}</span></div>
      <div className="legal-layout"><aside className="legal-toc"><b>Operator</b><a href="#operator">Company information</a><a href="#contact">Contact</a><a href="#responsibility">Responsibility</a><a href="#ip">Intellectual property</a></aside><article className="legal-content">
        <section id="operator"><h2>1. Operator information</h2><p><strong>Tisonik</strong> is a product of <strong>TSquare Ventures LLC</strong>.</p><dl className="legal-details"><div><dt>Legal entity</dt><dd>TSquare Ventures LLC</dd></div><div><dt>Business address</dt><dd>30 N Gould St Ste R, Sheridan, WY 82801, USA</dd></div></dl></section>
        <section id="contact"><h2>2. Contact</h2><p>Use the <a href="/contact/">Tisonik contact form</a> for business and privacy enquiries.</p><p>For privacy requests, write <strong>“Privacy request – Tisonik”</strong> at the start of your message.</p></section>
        <section id="responsibility"><h2>3. Service and content responsibility</h2><p>TSquare Ventures LLC is responsible for the Tisonik website and product materials. Tisonik is designed as white-label software for cruise lines. Unless a specific cruise-line partnership is expressly identified, demonstrations, ship names, passenger records, crew records, metrics and interface examples shown on this website are illustrative and do not imply affiliation with any cruise operator.</p><p>When Tisonik is deployed by a cruise-line partner, the cruise line remains responsible for its passenger relationship, ship operations, safety procedures, inventory, pricing, bookings, payments and physical onboard services.</p></section>
        <section id="ip"><h2>4. Intellectual property</h2><p>Unless otherwise stated, the Tisonik name, product concepts, interface designs, text, graphics, software, documentation, GAMMESO framework and other original materials are owned by TSquare Ventures LLC or used under licence. Third-party marks remain the property of their respective owners.</p><p>Reproduction, modification, distribution, reverse engineering or commercial reuse beyond normal evaluation of the service requires prior written permission, except where applicable law provides otherwise.</p></section>
        <section><h2>5. External links and liability</h2><p>This website may link to third-party services. TSquare Ventures LLC does not control their content, availability or privacy practices. General product information is provided for evaluation purposes and does not constitute legal, safety, medical, travel or financial advice. Liability is governed by the <a href="/terms/">Terms of Service</a> and applicable law.</p></section>
      </article></div>
    </main>
  )

  if (kind === 'privacy') return (
    <main className="legal-page">
      <div className="legal-hero"><div className="section-kicker">PRIVACY</div><h1>Privacy Policy</h1><p>Privacy rules designed around a cruise-line embedded, offline-capable positive-interaction service.</p><span>Last updated: {updated}</span></div>
      <div className="legal-layout"><aside className="legal-toc"><b>Privacy</b><a href="#roles">Who controls data</a><a href="#data">Data we process</a><a href="#anonymous-vibes">Anonymous Vibes</a><a href="#purposes">Purposes & bases</a><a href="#sharing">Sharing</a><a href="#retention">Retention</a><a href="#rights">Your rights</a></aside><article className="legal-content">
        <section><h2>1. Scope</h2><p>This policy explains how TSquare Ventures LLC, operating Tisonik, handles personal data on this website and, where a cruise-line partner deploys Tisonik, within the embedded passenger and operational module.</p><p>The public website currently presents a product demonstration. A live cruise deployment will also provide cruise-line-specific privacy information reflecting that operator's systems, configuration and legal responsibilities.</p></section>
        <section id="roles"><h2>2. Who is responsible for your data?</h2><h3>Website and business enquiries</h3><p>TSquare Ventures LLC is the data controller for information submitted directly to us through the Tisonik website, pilot enquiries, commercial communications and our own website security records.</p><h3>Passenger and crew module</h3><p>In the default white-label deployment, the passenger experience runs inside the cruise line's app. The <strong>cruise line retains passenger and crew identity, booking, payment, photographs, biometric templates, match scores and detailed operational records</strong> and acts as controller for that processing. Identity resolution occurs on-device, ship-local or in the cruise line's identity service.</p><p>Tisonik does not receive passenger or crew source events or biometric data. Its analytics interface accepts only the predefined aggregate report described below and rejects names, passenger or crew identifiers, photographs, biometric templates, face-match scores, booking references, exact event timestamps and free text. The default minimum reporting group is 20.</p></section>
        <section id="data"><h2>3. Categories of data</h2><p>Tisonik's default analytics store contains only a predefined aggregate report:</p><ul><li><strong>Reporting envelope:</strong> operator, ship, sailing, reporting period, generation time, privacy-gateway version and applied reporting threshold.</li><li><strong>Activation:</strong> eligible, activated and positive-action totals.</li><li><strong>Crew recognition:</strong> recognition, recognizing-guest and recognized-crew totals plus prepared-reason and department counts.</li><li><strong>Structured event feedback:</strong> response total, one-to-five distribution and prepared response-block totals. Standard live feedback contains three to five questions and no free-text field.</li><li><strong>Recovery:</strong> issue, acknowledgement and resolution totals, median response times and prepared category counts.</li><li><strong>Commerce attribution:</strong> handoff, confirmed, cancelled and refunded totals, currency, net attributed value and product-category counts.</li><li><strong>Service health:</strong> aggregate uptime, latency, sync-success, software-version and error-count measures without passenger, crew or device identifiers.</li><li><strong>Business contact data:</strong> name, work email, company, role and information included in a pilot or enterprise enquiry.</li></ul><p>Daily or sailing cells below 20 are suppressed or rolled up before transmission. Tisonik does not receive source events, names, passenger or crew identifiers, photos, biometric templates, face-match scores, cabins, booking or attribution references, exact event timestamps, free text or payment data. Randomized or hashed person-level identifiers are not sent because they may remain personal data.</p><h3>Crew identity camera</h3><p>The recognition flow asks a passenger to use the in-app camera to photograph the crew member with both the crew member’s face and visible name badge in frame. The badge name supports identity resolution but is not used alone. Where approved by the operator and applicable law, the cruise-line identity service may match the face against its own crew roster. The photograph, biometric template, candidate list and match score stay on-device, ship-local or inside the operator's own systems and are not uploaded to Tisonik. The operator must define the lawful basis, notice, access, accuracy, retention, challenge and non-biometric fallback appropriate to each deployment.</p></section>
        <section id="anonymous-vibes"><h2>4. Anonymous passenger vibes, VConnect and facial matching</h2><p>The cruise line may combine its boarding imaging enrolment with a clearly stated CruiseConnect recognition purpose. An eligible adult who accepts that combined enrolment enters the sailing recognition pool once and is not asked to confirm again when another passenger sends a vibe. Adults who decline or later opt out are excluded from the recognition pool.</p><p>To send an Anonymous Vibe, the sender photographs the intended adult receiver inside the cruise-line app. The cruise line processes the capture in its identity environment and returns only an opaque one-time token or a generic unavailable result. The sender is not shown the receiver's name, profile, age, candidate list, rejection reason or match score. The capture is destroyed after the match transaction and never reaches Tisonik.</p><p>Before accepting a vibe, the cruise line verifies that both accounts are adults on the same sailing, are not members of the same cabin or booking group and have not exceeded duplicate or abuse limits. A passenger may send no more than five vibes per sailing-local day; a sixth attempt pauses further sending until the next sailing day. Children cannot send, receive or be matched. The compliment record does not retain sender identity, and delivery is randomized or batched so timing does not expose the sender.</p><p>VConnect is a separate, non-anonymous request flow and is never presented as a reply to a vibe. An adult may send one predefined VConnect request per sailing-local day. The recipient sees the requester's limited sailing profile and may accept, decline, block or report. A decline, ignored request or report is not disclosed to the requester; only acceptance opens a limited connection and predefined public-venue, activity and time options. Cabins, room numbers, exact location and free text are excluded.</p><p>Tisonik receives only threshold-protected aggregate vibe totals and dense-rank distributions. Equal valid-vibe totals share the same score position. A Top Five Vibe Card is private by default and may be shared only by its passenger. Event reservations expose only a count unless a passenger separately chooses to show a selected name/image to confirmed attendees.</p></section>
        <section id="purposes"><h2>5. Why data are processed and legal bases</h2><p>Depending on the context and controller, approved data may be processed to:</p><ul><li>provide the embedded service and verified sailing access;</li><li>deliver structured positive interactions and crew recognition;</li><li>show a limited daily recognition prompt only to passengers who have not yet taken a positive action that day;</li><li>collect immediate live-event ratings through three to five prepared questions without free text;</li><li>route private issues inside the cruise line's environment and measure recovery outcomes;</li><li>attribute confirmed bookings and revenue to CruiseConnect activity without receiving passenger identity or payment data;</li><li>produce anonymized and aggregated benchmarks that may be shared with customers and prospects;</li><li>operate offline queues, protect platform security and administer enterprise relationships.</li></ul><p>The cruise line decides which aggregated event-rating results it publishes. Tisonik does not publish passenger-level feedback. Relevant legal bases and transparency requirements remain deployment-specific; minimizing or pseudonymizing data reduces risk but does not itself remove all privacy obligations.</p></section>
        <section><h2>6. Offline operation and local storage</h2><p>Tisonik is designed to work even when the passenger has no public internet connection. Essential application files may be cached on the device and actions may be stored temporarily in local browser/app storage until the ship-local service or approved backend can receive them. Offline storage is used to preserve requested functionality, not for advertising.</p><p>Where the module is pre-bundled in the cruise-line app or served from the ship-local network, the cruise line may also operate technical storage governed by its own privacy notice.</p></section>
        <section id="sharing"><h2>7. Who receives data</h2><p>We do not sell personal data. Passenger and crew identity, photographs, biometric templates, face-match results, payment and detailed operational records remain with the cruise line. Tisonik receives only the threshold-protected aggregate report and non-identifying service-health totals.</p><p>Tisonik may use and share irreversibly anonymized ranges or percentiles to report pilot outcomes and benchmark the product for other cruise lines. A cross-customer benchmark must combine at least five independently operated sailings and 100 qualifying responses, in addition to the minimum cell size of 20. Contracting customers may opt out of benchmarking.</p><p>Pilot enquiries are recorded directly in Tisonik's access-controlled business database and are not relayed through a public form service. An optional email delivery provider receives only a generic “new enquiry” alert and an internal reference—not the sender’s name, email, company or message. Do not include sensitive personal data in that form.</p></section>
        <section><h2>8. International transfers</h2><p>Where personal data are transferred outside the European Economic Area, the responsible controller will use an applicable lawful transfer mechanism, such as an adequacy decision or approved contractual safeguards, where required. Cruise-line partners may operate globally and will describe their own transfer arrangements in their privacy notices.</p></section>
        <section id="retention"><h2>9. Retention</h2><p>Tisonik does not receive or retain passenger-level, crew-level or biometric analytics events in the default architecture. The cruise-line privacy gateway aggregates before transmission. The cruise line defines and enforces retention for photographs and biometric templates in its own identity environment; they never reach Tisonik.</p><p>Aggregate reports, non-identifying service-health totals and irreversibly anonymized benchmark ranges may be retained according to the customer agreement. Minimum-group thresholds and benchmark cohort rules are applied before use or sharing.</p></section>
        <section id="rights"><h2>10. Your rights</h2><p>Where the GDPR applies, you may have rights to access, correct, erase or restrict your personal data, receive portable data in applicable cases, object to certain processing and withdraw consent without affecting processing already lawfully carried out.</p><p>For data processed within a cruise-line deployment, the cruise line shown in the app/privacy notice is normally the first contact for exercising passenger or crew rights. For data for which TSquare Ventures LLC is controller, use the <a href="/contact/">Tisonik contact form</a> and begin your message with “Privacy request – Tisonik”.</p><p>You may also lodge a complaint with the competent data-protection or privacy authority where applicable.</p></section>
        <section><h2>11. Security</h2><p>We design Tisonik around data minimization, opaque sailing-scoped references, structured rather than free-text feedback, constrained passenger interactions, role-based access, secure transport, limited retention, small-group suppression and separation of business analytics from cruise-line identity systems. No system can guarantee absolute security, and live deployments require cruise-line security review and agreed technical controls.</p></section>
        <section><h2>12. Automated decision-making</h2><p>Tisonik may use rules or recommendations to surface relevant activities or operational signals. It is not designed to make solely automated decisions that produce legal or similarly significant effects on passengers or crew. Any material employment, safety, complaint or service decision remains with the cruise line and its authorized personnel.</p></section>
        <section><h2>13. Changes and contact</h2><p>We may update this policy as the product, cruise-line integrations or legal requirements evolve. Material changes will be reflected by the “Last updated” date and, where required, additional notice.</p><p>Controller for this website: TSquare Ventures LLC, 30 N Gould St Ste R, Sheridan, WY 82801, USA. Use the <a href="/contact/">Tisonik contact form</a> for enquiries.</p></section>
      </article></div>
    </main>
  )

  if (kind === 'terms') return (
    <main className="legal-page">
      <div className="legal-hero"><div className="section-kicker">TERMS</div><h1>Terms of Service</h1><p>Terms for the Tisonik website, demonstrations and partner-deployed passenger module.</p><span>Last updated: {updated}</span></div>
      <div className="legal-layout"><aside className="legal-toc"><b>Terms</b><a href="#scope">Scope</a><a href="#module">Passenger module</a><a href="#conduct">Interaction rules</a><a href="#commerce">Commerce</a><a href="#liability">Liability</a><a href="#law">Governing law</a></aside><article className="legal-content">
        <section id="scope"><h2>1. Operator and scope</h2><p>These Terms govern access to the Tisonik website, demonstrations and, where enabled by a cruise-line partner, the Tisonik passenger-facing and operational module. Tisonik is operated by TSquare Ventures LLC, 30 N Gould St Ste R, Sheridan, WY 82801, USA.</p><p>For cruise-line customers, a signed enterprise, pilot, data-processing or licensing agreement prevails over these public Terms to the extent of any conflict.</p></section>
        <section><h2>2. White-label service</h2><p>Tisonik is designed to sit within or alongside a cruise line's existing digital environment. The cruise line remains responsible for its passenger contract, vessel operations, safety, staff management, itinerary, activities, inventory, pricing, bookings, payments and fulfilment. Tisonik does not itself operate a vessel, excursion, restaurant, spa, casino, medical service or other physical cruise service.</p><p>Unless expressly stated, demo brands, ships, people, statistics and commercial figures are illustrative and do not indicate a partnership with a particular cruise line.</p></section>
        <section id="module"><h2>3. Access to the passenger module</h2><p>Access may be restricted to verified guests on a particular sailing and may be launched through the cruise line's app using a sailing-scoped or pseudonymous identifier. You must not attempt to impersonate another passenger or crew member, access another sailing, bypass feature restrictions or manipulate the service.</p><p>The service may operate through the ship-local network or cached/offline functionality when public internet is unavailable. Some actions may remain queued until approved connectivity becomes available.</p></section>
        <section id="conduct"><h2>4. Anonymous Vibe and VConnect rules</h2><p>Tisonik intentionally limits passenger-to-passenger communication. It is not an unrestricted chat service, dating service or passenger directory.</p><ul><li>Anonymous Vibes are available only between eligible adult passengers on the same sailing.</li><li>The sender may photograph an intended receiver only through the approved in-app flow and may select only one prepared positive compliment.</li><li>The sender is not shown the receiver's name, profile or match score; the receiver is never shown the sender.</li><li>Passengers sharing a cabin or booking group cannot compliment one another.</li><li>Each passenger may send up to five vibes per sailing-local day. A sixth attempt pauses sending until the next sailing day.</li><li>Duplicate, abusive, harassing, discriminatory, sexual, threatening, fraudulent or commercially manipulative use is prohibited.</li><li>Children cannot send, receive or be matched for passenger vibes or VConnect.</li></ul><p>Vibes have no reply or reciprocal-contact function. Delivery may be delayed or batched to protect sender anonymity. Facial matching requires the deployment-specific activation and privacy notice provided by the cruise line.</p><h3>VConnect</h3><p>VConnect is a separate mutual-consent feature. An eligible adult may send one request per sailing-local day using only a prepared request option. The recipient may accept, decline, block or report. The requester receives an update only when the recipient accepts; non-acceptance reveals no read receipt, reason or status. After acceptance, both passengers may use only approved public-place, activity and time options. Cabins, room numbers, live location, dating-oriented prompts and unrestricted messages are prohibited.</p></section>
        <section><h2>5. Nearby and interest discovery</h2><p>Nearby discovery is intended for passengers who voluntarily enable discoverability. It provides coarse proximity, not a precise tracking map. You must not use proximity features to follow, monitor or locate another person after they have disabled discoverability or indicated that they do not wish to interact.</p><p>Shared interests are self-selected and may be used to surface passengers, activities or cruise-line offers that are relevant to those interests. Tisonik does not guarantee that another user's profile, interest or availability remains current.</p></section>
        <section><h2>6. Crew recognition</h2><p>Crew recognition is for genuine positive service interactions. A passenger uses the in-app camera to photograph the crew member with both the face and visible name badge in frame. Badge text alone is not used; where enabled, face matching occurs only inside the cruise line's identity environment to select the correct roster record. Tisonik does not receive the photograph, template, candidate list or score. The operator must provide the required notice and a non-biometric identification route.</p><p>In the standard design, a passenger may recognize the same crew member once per sailing-local day and may select up to two predefined reasons. Recognition summaries are not public employee rankings or star-rating systems. Employment, compensation, performance and disciplinary decisions remain solely with the cruise line.</p></section>
        <section><h2>7. Live feedback, service recovery and Experience Pulse</h2><p>Event feedback is designed as three to five structured rating questions or prepared response blocks without a free-text field. Results are available to authorized cruise-line leaders during the sailing; the cruise line decides whether any aggregated rating is published.</p><p>Private service-recovery tools and department satisfaction prompts help the cruise line identify and address issues during the sailing. They are not emergency services. For medical emergencies, personal safety threats, missing persons, fire, crime or other urgent situations, passengers must use the cruise line's designated emergency or onboard assistance procedures.</p><p>Submitting feedback or an issue does not guarantee a particular remedy, refund, response time or outcome. Those decisions belong to the cruise line under its passenger contract and policies.</p></section>
        <section id="commerce"><h2>8. Activities, recommendations and commerce</h2><p>Tisonik may surface relevant dining, excursions, spa, retail, entertainment or other cruise-line inventory based on shared interests, group context or availability. A recommendation is not a guarantee of availability, quality, suitability or price.</p><p>Unless expressly agreed otherwise, the cruise line or its designated merchant handles inventory, pricing, checkout, payment, refunds and fulfilment. Their booking and passenger terms apply to those transactions. Tisonik may record referral or attribution events used to measure incremental commerce under the cruise-line agreement.</p></section>
        <section><h2>9. Social sharing and ranking</h2><p>Passenger Vibe Cards remain private until the passenger chooses to export or share their own card. The cruise line does not publish passenger rankings or identities to social media. Dense ranking gives equal valid-vibe totals the same position: all passengers tied at position four remain #4, and the next lower distinct score is #5. “Top Five” means the first five score positions and may include more than five passengers.</p></section>
        <section><h2>10. Minors</h2><p>Children are excluded from passenger-to-passenger Anonymous Vibes: they cannot send, receive or be matched. Any other minor access must follow the cruise line's account, consent and safeguarding rules and be separately configured as an age-appropriate experience.</p></section>
        <section><h2>11. Intellectual property</h2><p>The Tisonik software, design, documentation, branding, GAMMESO framework and original content are owned by TSquare Ventures LLC or its licensors and are protected by applicable intellectual-property laws. No licence is granted except the limited right to access the service for its intended purpose. Reverse engineering, scraping, copying, resale or creation of derivative commercial services is prohibited except where applicable law expressly permits it.</p></section>
        <section><h2>12. Availability and changes</h2><p>Shipboard connectivity, host-app availability, device capabilities, maintenance, safety rules and cruise-line systems may affect functionality. We do not guarantee uninterrupted availability. Features may be modified, suspended or withdrawn for security, safety, compliance, partner configuration or product-development reasons.</p></section>
        <section id="liability"><h2>13. Disclaimers and liability</h2><p>To the maximum extent permitted by applicable law, Tisonik is provided without a guarantee that passengers will meet, respond, participate, purchase, receive recognition or obtain a particular service outcome. TSquare Ventures LLC is not responsible for the independent conduct of passengers, crew members, cruise-line personnel or third-party suppliers, or for physical activities undertaken after an interaction.</p><p>TSquare Ventures LLC's liability is limited to the extent permitted by law. Nothing in these Terms excludes or limits liability that cannot legally be excluded, including liability for intentional misconduct or other non-excludable statutory liability.</p></section>
        <section><h2>14. Suspension and safety</h2><p>Access may be restricted or suspended where reasonably necessary to protect passengers, crew, the cruise line or the service, including suspected abuse, fraud, harassment, security incidents or attempts to circumvent controls. Reports may be shared with the cruise line's authorized safety or service teams where appropriate.</p></section>
        <section><h2>15. Privacy</h2><p>Personal-data processing is described in the <a href="/privacy/">Privacy Policy</a> and, for live deployments, the relevant cruise line's privacy notice. Essential browser/device storage is described in the <a href="/cookies/">Cookie & Local Storage Policy</a>.</p></section>
        <section id="law"><h2>16. Governing law and disputes</h2><p>These public Terms are subject to applicable law and any mandatory consumer protections. Enterprise customer disputes, governing law and forum are defined by the applicable signed agreement.</p></section>
        <section><h2>17. Contact and changes</h2><p>We may update these Terms as the product or legal requirements evolve. Continued use after an effective update may be subject to the updated Terms where permitted by law.</p><p>Questions: use the <a href="/contact/">Tisonik contact form</a>. TSquare Ventures LLC, 30 N Gould St Ste R, Sheridan, WY 82801, USA.</p></section>
      </article></div>
    </main>
  )

  return (
    <main className="legal-page">
      <div className="legal-hero"><div className="section-kicker">STORAGE & COOKIES</div><h1>Cookie & Local Storage Policy</h1><p>What the current Tisonik website stores on your device—and what it does not.</p><span>Last updated: {updated}</span></div>
      <div className="legal-layout"><aside className="legal-toc"><b>Storage</b><a href="#current">Current use</a><a href="#essential">Essential storage</a><a href="#nonessential">Analytics & marketing</a><a href="#manage">Manage storage</a></aside><article className="legal-content">
        <section id="current"><h2>1. Current public website</h2><p>The current Tisonik public website/demo does <strong>not intentionally use advertising cookies, cross-site tracking cookies or non-essential analytics cookies</strong>. It uses essential browser technologies needed to demonstrate offline-capable product behaviour.</p><p>Because the current public build does not activate non-essential tracking, we do not display a consent banner merely to obtain consent for advertising or analytics that are not present.</p></section>
        <section id="essential"><h2>2. Essential browser storage</h2><p>Tisonik may use the following strictly functional technologies:</p><div className="legal-table"><div className="legal-row legal-row-head"><span>Technology</span><span>Purpose</span><span>Typical duration</span></div><div className="legal-row"><span>Service Worker / Cache Storage</span><span>Caches the application shell so the module can continue to load when public internet is unavailable.</span><span>Until browser/app cache is cleared or the service worker updates.</span></div><div className="legal-row"><span>Local Storage: offline queue</span><span>Temporarily stores user-requested actions when connectivity is unavailable so they can be synchronized later.</span><span>Until successful synchronization, expiry or local storage is cleared.</span></div><div className="legal-row"><span>Host-app technical state</span><span>May be used in a live cruise-line deployment to maintain a secure sailing-scoped session or preferences.</span><span>Defined by the cruise-line configuration and deployment notice.</span></div></div><p>Local Storage and Cache Storage are not traditional HTTP cookies, but they can store information on a device and are therefore explained here for transparency.</p></section>
        <section id="nonessential"><h2>3. Analytics, marketing and third-party technologies</h2><p>If Tisonik later introduces non-essential analytics, advertising pixels, behavioral tracking or similar technologies on the public website, those technologies will not be activated for users in jurisdictions requiring prior consent until the user has made the applicable choice. Rejecting non-essential technologies should be as accessible as accepting them.</p><p>A cruise-line partner may use its own analytics, authentication or app-storage technologies around the embedded module. Those are governed by the cruise line's cookie/privacy information unless TSquare Ventures LLC independently determines their use.</p></section>
        <section><h2>4. External services and social sharing</h2><p>Tisonik may provide links or user-initiated handoffs to cruise-line booking systems or social platforms. We do not need to load a social platform's tracking technology merely to display a share button. Once you choose to open an external service, that provider may use cookies or similar technologies under its own policies.</p></section>
        <section id="manage"><h2>5. How to manage storage</h2><p>You can delete or block browser cookies, Local Storage and cached site data through your browser or device settings. Clearing essential offline data may remove queued actions or require the application shell to be downloaded again before offline use.</p><p>Within a live cruise-line app, additional controls may be available through the host app's privacy or storage settings.</p></section>
        <section><h2>6. Changes and contact</h2><p>We will update this page if the technologies used by Tisonik change. If a future change requires consent, the consent mechanism will be introduced before the relevant non-essential technology is activated where required by law.</p><p>Questions: use the <a href="/contact/">Tisonik contact form</a>.</p></section>
      </article></div>
    </main>
  )
}


export default function App() {
  const { view, navigate, isProductDemo } = useRoute()
  const [menuOpen, setMenuOpen] = useState(false)
  const launchContext = useMemo(() => getLaunchContext(), [])
  useEffect(() => { notifyHostReady(launchContext) }, [launchContext])
  useEffect(() => { setMenuOpen(false) }, [view])
  return (
    <div className="app">
      {isProductDemo && <div className="executive-demo-banner"><span><b>INTERACTIVE PRODUCT WALKTHROUGH</b> · Illustrative sailing data</span><a href={pilotContactPath}>Contact us <Icon name="arrow" size={14}/></a></div>}
      <header className="topbar">
        {isProductDemo ? <AppLink to="overview" navigate={navigate} className="brand"><span className="brand-mark"><Icon name="spark" size={19}/></span><span><b>Tisonik</b></span></AppLink> : <a href="/" className="brand"><span className="brand-mark"><Icon name="spark" size={19}/></span><span><b>Tisonik</b></span></a>}
        <nav aria-label="Primary navigation">{navItems.map(item => isProductDemo ? <AppLink key={item.key} to={item.key} navigate={navigate} className={view===item.key?'active':''}>{item.label}</AppLink> : <a key={item.key} href={seo[item.key].path} className={view===item.key?'active':''}>{item.label}</a>)}</nav>
        <button className="mobile-menu-button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={()=>setMenuOpen(current => !current)}><Icon name={menuOpen?'close':'menu'} size={20}/></button>
        <a href={pilotContactPath} className="nav-cta">Request a demo <Icon name="arrow" size={15}/></a>
        {menuOpen && <div className="mobile-nav-panel">{isProductDemo ? <><AppLink to="crew" navigate={navigate}>Crew recognition</AppLink><AppLink to="passenger" navigate={navigate}>Passenger experience</AppLink><AppLink to="recovery" navigate={navigate}>Service recovery & pulse</AppLink><AppLink to="commerce" navigate={navigate}>Commerce</AppLink><AppLink to="dashboard" navigate={navigate}>Dashboard</AppLink><AppLink to="integration" navigate={navigate}>Integration</AppLink></> : <><a href="/crew-recognition/">Crew recognition</a><a href="/passenger-experience/">Passenger experience</a><a href="/service-recovery/">Service recovery & pulse</a><a href="/ancillary-revenue/">Commerce</a><a href="/cruise-dashboard/">Dashboard</a><a href="/integration/">Integration</a></>}<a href={pilotContactPath}>Request a demo</a></div>}
      </header>
      {view === 'overview' && <Overview navigate={navigate}/>} 
      {view === 'passenger' && <PassengerModule/>}
      {view === 'crew' && <CrewRecognition/>}
      {view === 'recovery' && <RecoveryPage navigate={navigate}/>}
      {view === 'commerce' && <Commerce/>}
      {view === 'dashboard' && <Dashboard/>}
      {view === 'integration' && <IntegrationPage/>}
      {view === 'pilot' && <PilotPage/>}
      {view === 'imprint' && <LegalPage kind="imprint"/>}
      {view === 'privacy' && <LegalPage kind="privacy"/>}
      {view === 'terms' && <LegalPage kind="terms"/>}
      {view === 'cookies' && <LegalPage kind="cookies"/>}
      <footer><div className="footer-brand"><span className="brand-mark"><Icon name="spark" size={17}/></span><span>Tisonik</span></div><p>One white-label add-on inside the cruise line’s existing app.</p><div className="footer-links">{isProductDemo ? <><AppLink to="crew" navigate={navigate}>Crew recognition</AppLink><AppLink to="recovery" navigate={navigate}>Service recovery</AppLink><AppLink to="integration" navigate={navigate}>Integration</AppLink></> : <><a href="/crew-recognition/">Crew recognition</a><a href="/service-recovery/">Service recovery</a><a href="/integration/">Integration</a></>}<a href={pilotContactPath}>Contact us</a></div><div className="footer-legal"><a href="/imprint/">Imprint</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/cookies/">Cookies</a></div><span className="demo-disclaimer">Interactive walkthrough · Illustrative data · No cruise-line affiliation implied</span></footer>
    </div>
  )
}
