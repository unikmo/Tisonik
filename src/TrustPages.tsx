import type { ReactNode } from 'react'

const Arrow = () => <span aria-hidden="true">→</span>

type Faq = [question: string, answer: string]

const FaqBlock = ({ id, eyebrow, title, items }: { id: string; eyebrow: string; title: string; items: Faq[] }) => (
  <section id={id} className="buyer-readiness" aria-labelledby={`${id}-title`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })),
    }) }} />
    <p className="eyebrow">{eyebrow}</p>
    <h2 id={`${id}-title`}>{title}</h2>
    <div className="buyer-readiness-grid">
      {items.map(([question, answer], index) => (
        <details key={question} open={index === 0}>
          <summary><span>{String(index + 1).padStart(2, '0')}</span><h3>{question}</h3><i aria-hidden="true">+</i></summary>
          <p>{answer}</p>
        </details>
      ))}
    </div>
  </section>
)

const Block = ({ id, eyebrow, title, lead, children }: { id: string; eyebrow: string; title: string; lead?: string; children: ReactNode }) => (
  <section id={id} className="trust-block">
    <p className="eyebrow">{eyebrow}</p>
    <h2>{title}</h2>
    {lead && <p className="trust-lead">{lead}</p>}
    {children}
  </section>
)

const JumpLinks = ({ links }: { links: [string, string][] }) => (
  <nav className="trust-jump" aria-label="On this page">{links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}</nav>
)

const Cta = ({ children }: { children: ReactNode }) => <div className="trust-cta">{children}</div>

/* ------------------------------------------------------------------ */
/* /integration/ : how Tisonik and UNIKMO work, for the business buyer */
/* ------------------------------------------------------------------ */

const howItWorksFaqs: Faq[] = [
  ['Does the guest need to download an app or create an account?', 'No. On a ship the guest uses the cruise line’s own app. In a hotel or resort the card opens a web page on their phone. There is no account, no password and no sign-up form.'],
  ['What if a card is lost or handed to someone else?', 'UNIKMO revokes the code and Tisonik refuses it from then on. A code is also tied to one guest: the right code with the wrong guest is refused too. We tested both cases before launch.'],
  ['What does UNIKMO do, and what does Tisonik do?', 'UNIKMO produces the cards, creates every code, and tells Tisonik which code belongs to which guest and for which dates. Tisonik never creates a code. It checks each scan against what UNIKMO has registered, runs the guest page and delivers what the guest sends to your team.'],
  ['Do you need to connect to our property-management or booking system?', 'Not for the guest page. UNIKMO supplies the guest reference and the stay dates. Your booking, property-management, commerce and payment systems are not touched. Deeper connections, for example for cruise identity or revenue attribution, are agreed in a pilot and always stay on your side.'],
  ['Who in our team receives what the guest sends?', 'Reception or guest services receive every thank-you, private message and rating by email and in the portal. The hotel director or manager receives ratings only. Any rating with a score of 6 or lower is flagged LOW SCORE in the subject line, so it is read first.'],
  ['What does the guest see on each day of the stay?', 'It changes with the stay. Before arrival and during the stay they can discover what is on offer and thank someone. During the stay they can also write to the team privately. On the last day and after checkout they can rate the stay. After checkout, for 14 days by default, they can leave final feedback. Then the page closes.'],
  ['Can a guest rate more than once?', 'No. There is one rating per stay. Thank-yous and private messages have sensible limits so the inbox cannot be flooded.'],
  ['Are hotel and ship ratings comparable?', 'Yes. Hotels and ships use the same five questions on the same 1 to 10 scale. Only the nouns change on a ship: embarkation, cabin and crew instead of check-in, room and team. Scores therefore compare across a group.'],
  ['What happens to the data after the stay?', 'The page closes at the end of the after-checkout window. Stay records and the messages attached to them are then deleted automatically after a retention period set in your agreement (our default is 90 days). The security page lists exactly what is held and for how long.'],
  ['What does it cost, and how long does a pilot take?', 'Both are agreed per property or ship, because they depend on how many cards you issue and which journeys you start with. Send us a short note through the pilot form and we will reply with a specific proposal.'],
]

export function HowItWorksPage({ cruiseDetail }: { cruiseDetail: ReactNode }) {
  return <>
    <section className="trust-hero">
      <p className="eyebrow">HOW IT WORKS</p>
      <h1>One card. One guest page. One inbox for your team.</h1>
      <p className="trust-intro">UNIKMO puts a card in the guest’s hand. Tisonik turns every use of that card into thanks, honest feedback and ratings, and sends each one to the right person while the guest is still with you. Your booking, property and payment systems stay exactly as they are.</p>
      <JumpLinks links={[['#parts', 'The two parts'], ['#journey', 'Guest journey'], ['#who', 'Who sees what'], ['#where', 'Where it applies'], ['#start', 'Getting started'], ['#questions', 'Questions']]} />
    </section>

    <Block id="parts" eyebrow="THE TWO PARTS" title="UNIKMO opens the door. Tisonik runs the room." lead="Two companies, two clearly separated jobs. Keeping them apart is what makes the setup quick and the data question simple.">
      <div className="trust-two">
        <article>
          <small>UNIKMO · THE CARD</small>
          <h3>The physical opener</h3>
          <ul>
            <li>Produces the guest card, a keepsake the guest takes home.</li>
            <li>Creates every card code.</li>
            <li>Sends each code to Tisonik with a guest reference and the stay dates.</li>
            <li>Revokes a code when a card is lost.</li>
            <li>Asks Tisonik to open the guest page when the card is used.</li>
          </ul>
        </article>
        <article>
          <small>TISONIK · THE GUEST LAYER</small>
          <h3>The brain behind the card</h3>
          <ul>
            <li>Checks every use of a card against what UNIKMO registered. Tisonik never creates a code.</li>
            <li>Shows the guest the right options for that day of the stay.</li>
            <li>Delivers thank-yous, private messages and ratings to the right staff.</li>
            <li>Gives your team a portal to work the inbox and see results.</li>
            <li>Measures what matters without collecting more than it needs.</li>
          </ul>
        </article>
      </div>
      <div className="trust-flow" role="img" aria-label="Flow: UNIKMO creates the card and code and sends it to Tisonik. The guest uses the card. Tisonik checks the code with UNIKMO's record and opens the guest page. Messages and ratings go to hotel or ship staff.">
        <div><b>UNIKMO</b><span>Creates card and code</span></div><i aria-hidden="true">→</i>
        <div><b>Tisonik</b><span>Registers the stay, keeps only a keyed hash of the code</span></div><i aria-hidden="true">→</i>
        <div><b>Guest</b><span>Uses the card on their phone</span></div><i aria-hidden="true">→</i>
        <div><b>Your team</b><span>Gets thanks, messages and ratings</span></div>
      </div>
    </Block>

    <Block id="journey" eyebrow="THE GUEST JOURNEY" title="What a guest actually does." lead="No download, no account, no password. The page adapts to where the guest is in their stay.">
      <ol className="trust-steps">
        <li><b>The guest receives a card.</b><span>It is handed over as part of your normal arrival. UNIKMO has already told Tisonik which guest and which dates it belongs to.</span></li>
        <li><b>They scan it with their phone.</b><span>Tisonik checks the code. If it is unknown, revoked, for a different guest or outside the stay, nothing opens.</span></li>
        <li><b>The guest page opens.</b><span>On a ship this happens inside the cruise line’s app. At a hotel it is a web page. Either way it carries your property’s name.</span></li>
        <li><b>They see what fits the day.</b><span>Discover what is on offer. Thank someone. Write privately to the team. On the last day and after checkout, rate the stay. After checkout, leave final feedback.</span></li>
        <li><b>The right person is told.</b><span>Reception or guest services get everything by email and in the portal. The director gets ratings, with low scores flagged.</span></li>
        <li><b>The page closes.</b><span>After the after-checkout window (14 days by default) the link stops working. Records are deleted later on a fixed schedule.</span></li>
      </ol>
    </Block>

    <Block id="who" eyebrow="WHO SEES WHAT" title="Every message goes to someone who can act on it." lead="Access is set per person and enforced in the database, not just hidden on screen.">
      <div className="trust-table-wrap">
        <table className="trust-table">
          <thead><tr><th scope="col">Who</th><th scope="col">What they see</th><th scope="col">Notes</th></tr></thead>
          <tbody>
            <tr><th scope="row">The guest</th><td>Their own page and what they send</td><td>Nothing from any other guest.</td></tr>
            <tr><th scope="row">Reception or guest services</th><td>Every thank-you, private message, feedback note and rating</td><td>Emailed as they arrive and kept in the portal.</td></tr>
            <tr><th scope="row">Hotel director or manager</th><td>Ratings only</td><td>A score of 6 or lower is flagged LOW SCORE in the subject line.</td></tr>
            <tr><th scope="row">Your portal users</th><td>Depends on role</td><td>Admin: everything and settings. Front desk: work the inbox. Analyst: inbox status only. Viewer: read only.</td></tr>
            <tr><th scope="row">UNIKMO</th><td>The codes and guest references it created</td><td>UNIKMO never sees what a guest writes.</td></tr>
          </tbody>
        </table>
      </div>
    </Block>

    <Block id="where" eyebrow="WHERE IT APPLIES" title="Built for ships and hotels. Designed to extend." lead="The idea underneath is simple: a guest, a defined visit, and a few moments in which to say thanks or flag a problem. That shape fits more than one kind of place.">
      <div className="trust-three">
        <article>
          <small>AVAILABLE · CRUISE LINES</small>
          <h3>Inside the app guests already use</h3>
          <p>Tisonik sits inside the cruise line’s own app. By design, identity and source records stay in the operator’s environment and only aggregate results reach Tisonik. The interface is built to keep working on ship-local services when connectivity is limited. Where the app is not available, the same guest page works through the card.</p>
          <a href="/pilot/">Cruise pilot <Arrow /></a>
        </article>
        <article>
          <small>AVAILABLE · HOTELS AND RESORTS</small>
          <h3>From the first night to the review</h3>
          <p>A card, a guest page and a team inbox, with no change to your property systems. Resorts can add experience discovery, in-stay service recovery, staff recognition and relevant ancillary revenue, with inventory, pricing and checkout staying with the resort.</p>
          <a href="/all-inclusive-resorts/">Hotels and resorts <Arrow /></a>
        </article>
        <article>
          <small>NEXT · OTHER VENUES</small>
          <h3>Where guests spend hours or days</h3>
          <p>Premium and long-haul cabins and lounges, casino resorts and multi-night theme-park stays all share the same shape. We add one kind of venue at a time, after a pilot shows it works, and do not switch one on from a template. Not available yet. Tell us if you run one.</p>
          <a href="/contact/#contact">Talk to us <Arrow /></a>
        </article>
      </div>
      <p className="trust-note">Hotels and ships use the same five rating questions on the same 1 to 10 scale, so scores compare across a group. Only the nouns change on a ship.</p>
    </Block>

    <Block id="start" eyebrow="GETTING STARTED" title="From first call to first guest." lead="A controlled start on one property or one ship. Success measures are agreed before anything goes live.">
      <ol className="trust-steps">
        <li><b>Agree the boundary.</b><span>Which journeys start first, and what stays in your systems. We write it down.</span></li>
        <li><b>Set up your property.</b><span>We create your property in Tisonik and agree the identifier UNIKMO uses for it.</span></li>
        <li><b>Give your team access.</b><span>Staff sign in with an emailed link and you choose each person’s role. You tell us the reception address and the director’s address.</span></li>
        <li><b>Connect with UNIKMO and test.</b><span>Codes and stay dates start to flow. We test with a test guest before any real guest, including a lost-card case.</span></li>
        <li><b>Run the pilot, then decide.</b><span>Measure what you agreed. Scale it, adjust it or stop.</span></li>
      </ol>
      <div className="trust-two">
        <article>
          <small>WHAT WE ASK OF YOU</small>
          <ul><li>A named contact.</li><li>A reception or guest-services email address.</li><li>The hotel director’s or manager’s email address.</li><li>Staff who will sign in to the portal.</li></ul>
        </article>
        <article>
          <small>WHAT WE DO NOT ASK OF YOU</small>
          <ul><li>A connection to your property-management or booking system for the guest page.</li><li>Payment or commerce changes.</li><li>Guest data exports.</li><li>Another app for guests to download.</li></ul>
        </article>
      </div>
    </Block>

    <Block id="stays" eyebrow="WHAT STAYS WITH YOU" title="You keep what is yours.">
      <div className="trust-three">
        <article><h3>Your systems</h3><p>Bookings, property management, inventory, pricing, checkout and payment stay where they are. Tisonik does not replace them and does not take payment.</p></article>
        <article><h3>Your brand</h3><p>The guest page carries your property’s name. You control the wording your guests see and which journeys are switched on.</p></article>
        <article><h3>Your exit</h3><p>You can stop at any time. Cards simply stop opening the page, and stay records are deleted on the schedule on the security page.</p></article>
      </div>
      <Cta>
        <a className="pilot-button" href="/security/">How we protect guest data <Arrow /></a>
        <a className="pilot-button pilot-button--secondary" href="/pilot/#contact">Request a cruise pilot <Arrow /></a>
        <a className="pilot-button pilot-button--secondary" href="/resort-pilot/#contact">Request a resort pilot <Arrow /></a>
      </Cta>
    </Block>

    <section id="cruise-detail" className="trust-cruise">
      <p className="eyebrow">CRUISE DETAIL · FOR YOUR IT AND SECURITY TEAM</p>
      <h2>How the cruise integration is built.</h2>
      <p className="trust-lead">For cruise lines the guest layer lives inside the existing app, identity stays in the operator zone, and only aggregate results reach Tisonik.</p>
      {cruiseDetail}
    </section>

    <FaqBlock id="questions" eyebrow="BEFORE YOU ASK" title="Questions buyers ask us first." items={howItWorksFaqs} />
  </>
}

/* ------------------------------------------------------------------ */
/* /security/ : data security and privacy, for IT, security and legal  */
/* ------------------------------------------------------------------ */

const securityFaqs: Faq[] = [
  ['Where is guest data stored?', 'In a managed Postgres database in Frankfurt, Germany (AWS eu-central-1, provided by Supabase). Email notifications are sent through Resend from its EU region (Ireland). The application that serves the guest page runs on Vercel, set to the Frankfurt region.'],
  ['Who is the controller and who is the processor?', 'For the hotel or ship guest page, the hotel or cruise line is the controller of its guests’ stay records and messages. TSquare Ventures LLC processes them on the operator’s behalf, under the agreement we sign with each operator.'],
  ['Can someone read the card codes from your database?', 'No. We store only a keyed hash of each code, made with a secret that is kept in our hosting settings and never in the database. A copy of the database alone does not reveal a code.'],
  ['How does a guest session work, and how long does it last?', 'The card opens a signed link that is valid for 15 minutes and is exchanged for a session cookie. The cookie is HttpOnly, Secure and SameSite=Strict, and only works on the guest endpoints. The session ends when the after-checkout window closes, and never lasts more than 30 days.'],
  ['How do you stop guessing of codes?', 'Failed code checks are rate-limited per property: ten wrong codes in a minute pause code checks for that property. Guest requests are also rate-limited per client. We key these limits on a hash of the address, never on the raw IP address.'],
  ['How do your staff and ours sign in?', 'By a one-time link sent to the work email. There are no passwords to leak. Access is by role, and the database itself restricts each person to their own property’s records.'],
  ['What happens to the data when we stop?', 'The guest page closes at the end of the after-checkout window. A scheduled job then deletes stay records and their messages once the retention period has passed (default 90 days, set in your agreement). On request we delete a property’s data sooner.'],
  ['Have you had an independent security test?', 'Not yet. It is planned before the first live hotel or ship. Automated code scanning and a baseline web-application scan already run in our build pipeline. The independent test covers the guest and UNIKMO endpoints, the portal and access between properties, includes a retest after fixes, and we share its summary with operators who ask.'],
  ['Do you hold any security certification?', 'Not yet, and we do not claim one. A certification follows the independent test, in the framework our first customers ask for. Meanwhile we complete your security questionnaire, describe our controls in detail, and sign a data-processing agreement with each operator before go-live.'],
  ['What would you do if there were an incident?', 'We would tell the affected operator without delay, say what happened and what data was involved, and help them meet their own notification duties. The operator, as controller, decides how guests are told.'],
]

type Row = [string, string, string]
const dataRows: Row[] = [
  ['Guest reference', 'An identifier UNIKMO supplies for the guest, such as a booking number', 'Needed to tie a card to one guest'],
  ['Stay dates', 'Arrival and departure', 'Decides which options the guest sees and when the page closes'],
  ['Room or cabin, first name', 'Only if the operator chooses to send them', 'Optional. Helps staff act on a message'],
  ['Card code', 'A keyed hash only, never the code itself', 'Checks that a card is genuine'],
  ['What the guest writes', 'Thank-yous, private messages, feedback and ratings', 'The product itself. Delivered to staff'],
  ['Session counters', 'How many times the page was opened, from card or app', 'Shows the operator whether guests use it'],
  ['Crew recognitions and daily scores', 'Which team member a guest recognised and why (up to two preset reasons), and 1 to 10 scores for areas such as dining', 'Lets the operator thank staff and fix problems while the guest is still there'],
  ['Places held on offers', 'Which venue offer a guest asked to hold a place on', 'Counts places left and tells the desk. Payment stays with the venue'],
  ['Event ratings', 'A guest score of 1 to 10 for a show or event staff asked about', 'Tells the operator how it went'],
  ['Follow-up answer', 'Whether a guest says a problem was fixed', 'Tells the operator if a fix worked'],
  ['Opt-in profile (ships only)', 'A first name, a preset avatar and chosen interests, kept only if a guest turns on People. If they also turn on Nearby, a rotating code from the ship app, kept for ten minutes of use, which listed activities they joined, and, if they choose, that guests they have met can see which offers they are going to', 'Lets guests who both opted in say hello. Hotels do not have this feature'],
  ['Compliments and meet-up suggestions (ships only)', 'Preset compliments between two opted-in guests and a suggested public place. No free text, no chat', 'Makes a safe first hello. Operators cannot read them'],
]

export function SecurityPage() {
  return <>
    <section className="trust-hero">
      <p className="eyebrow">DATA SECURITY AND PRIVACY</p>
      <h1>What we hold, why, for how long, and who can see it.</h1>
      <p className="trust-intro">Written for the people who review vendors: IT, security, legal and data protection. We say plainly what is built, what is not yet done and what we do not collect, so you do not have to find out in a questionnaire.</p>
      <JumpLinks links={[['#glance', 'At a glance'], ['#data', 'What we hold'], ['#codes', 'Card codes'], ['#access', 'Access'], ['#retention', 'Retention'], ['#hosting', 'Hosting'], ['#status', 'Status'], ['#faq', 'Questions']]} />
    </section>

    <Block id="glance" eyebrow="AT A GLANCE" title="Less data, kept for less time, seen by fewer people.">
      <div className="trust-three trust-glance">
        <article><h3>No accounts, passwords or payments</h3><p>Guests never create an account or enter a password, and Tisonik takes no payment or card details.</p></article>
        <article><h3>Codes stored as keyed hashes</h3><p>A copy of the database does not reveal a single card code.</p></article>
        <article><h3>Access enforced in the database</h3><p>Each person can read only their own property’s records, whatever the screen shows.</p></article>
        <article><h3>EU data region</h3><p>Guest data is stored in Frankfurt. Notification email is sent from the EU.</p></article>
        <article><h3>Automatic deletion</h3><p>A daily job deletes stay records and messages when their retention period ends.</p></article>
        <article><h3>The cruise app stays aggregate-only</h3><p>In the cruise app design, Tisonik receives no names, photos, biometric templates or person-level identifiers. The card page is separate: there, a guest who opts in to People chooses a first name and an avatar, and nothing else.</p></article>
      </div>
    </Block>

    <Block id="data" eyebrow="WHAT WE HOLD" title="Two products, two data designs. We keep them apart." lead="The cruise in-app product and the hotel and ship guest page store different things. A reviewer should read both.">
      <h3 className="trust-sub">Hotel and ship guest page (stay records)</h3>
      <div className="trust-table-wrap">
        <table className="trust-table">
          <thead><tr><th scope="col">Item</th><th scope="col">What it is</th><th scope="col">Why we need it</th></tr></thead>
          <tbody>{dataRows.map(([item, what, why]) => <tr key={item}><th scope="row">{item}</th><td>{what}</td><td>{why}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="trust-note"><b>Not collected on the guest page:</b> passwords, payment or card details, passport or ID numbers, photographs, precise location, or any account. The only profile is the optional People profile on ships, which a guest creates by choice and which holds no photograph, contact detail or cabin number. The page asks the browser for no camera, microphone or location access.</p>
      <h3 className="trust-sub">Cruise in-app product (aggregate-only)</h3>
      <div className="trust-two">
        <article><small>WHAT TISONIK RECEIVES</small><ul><li>Predefined aggregate KPI reports, with any group smaller than 20 suppressed.</li><li>Service-health figures: uptime, latency, version, sync success and error counts.</li></ul></article>
        <article><small>WHAT STAYS WITH THE OPERATOR</small><ul><li>Names, photos, face templates and face-match scores.</li><li>Booking references, payments and source records.</li><li>Identity resolution, which runs on the device, on the ship or in the operator’s own service.</li></ul></article>
      </div>
    </Block>

    <Block id="codes" eyebrow="CARD CODES" title="UNIKMO creates the code. Tisonik can only check it." lead="This is the core of the trust model, and it is deliberately simple.">
      <ol className="trust-steps">
        <li><b>UNIKMO creates the code</b><span>and sends it to Tisonik over a secured connection, together with the guest reference and stay dates. Tisonik never generates a code.</span></li>
        <li><b>Tisonik stores only a keyed hash.</b><span>The hash is bound to your property and made with a secret held in our hosting settings, kept apart from the database.</span></li>
        <li><b>On each use, Tisonik hashes what it is shown</b><span>and compares. A code that was never registered, that belongs to another guest, that was revoked, or whose stay has ended is refused.</span></li>
        <li><b>UNIKMO revokes a lost card</b><span>and the code stops working at once.</span></li>
      </ol>
      <p className="trust-note">We tested these refusals end to end on our production system before launch: unregistered code, right code with the wrong guest, and revoked code all return “forbidden”. One trust assumption remains and we state it openly: UNIKMO is trusted for the stay dates and for every code it registers.</p>
    </Block>

    <Block id="access" eyebrow="ACCESS CONTROL" title="Three kinds of access, each limited.">
      <div className="trust-three">
        <article>
          <small>GUESTS</small>
          <h3>Short link, scoped session</h3>
          <ul>
            <li>The card opens a signed link valid for 15 minutes.</li>
            <li>It is exchanged for a session cookie: HttpOnly, Secure, SameSite=Strict, limited to the guest endpoints.</li>
            <li>The session ends when the after-checkout window closes, and never lasts more than 30 days.</li>
            <li>The guest page is excluded from search engines, is never cached and sends no referrer.</li>
          </ul>
        </article>
        <article>
          <small>UNIKMO</small>
          <h3>Server to server, with a secret</h3>
          <ul>
            <li>Calls carry a secret of at least 32 characters, compared in constant time.</li>
            <li>Without it, the endpoints return “unauthorised”.</li>
            <li>Code checks are rate-limited per property, and calls per property per minute are capped.</li>
          </ul>
        </article>
        <article>
          <small>STAFF</small>
          <h3>Emailed link, role by role</h3>
          <ul>
            <li>Sign-in is by a one-time emailed link. There are no passwords.</li>
            <li>Roles: admin, front desk, analyst, viewer.</li>
            <li>Row-level security in the database limits each person to their own property. Stay records can be written only by the server.</li>
            <li>The portal is excluded from search engines and is never cached.</li>
          </ul>
        </article>
      </div>
    </Block>

    <Block id="retention" eyebrow="RETENTION AND DELETION" title="Data is deleted on a schedule, not on request.">
      <ol className="trust-steps">
        <li><b>During the stay</b><span>Guests can thank, write privately and rate according to the day.</span></li>
        <li><b>After checkout</b><span>The page stays open for the after-checkout window, 14 days by default and adjustable per property up to 60.</span></li>
        <li><b>Retention</b><span>Stay records and their messages are then kept for a retention period, 90 days by default and set in your agreement.</span></li>
        <li><b>Deletion</b><span>A scheduled job runs daily and deletes expired stays, with their messages and ratings. It also clears old rate-limit counters.</span></li>
      </ol>
      <p className="trust-note">Messages that staff have already received by email sit in the operator’s own mailboxes and follow the operator’s own retention rules.</p>
    </Block>

    <Block id="hosting" eyebrow="HOSTING AND SERVICE PROVIDERS" title="Three providers, each with one job." lead="We name them so your data-protection team can review them.">
      <div className="trust-table-wrap">
        <table className="trust-table">
          <thead><tr><th scope="col">Provider</th><th scope="col">Job</th><th scope="col">Region</th><th scope="col">What passes through it</th></tr></thead>
          <tbody>
            <tr><th scope="row">Supabase</th><td>Database and sign-in</td><td>Frankfurt, Germany</td><td>All stay records and messages</td></tr>
            <tr><th scope="row">Vercel</th><td>Serves the website and runs the guest and UNIKMO endpoints</td><td>Frankfurt (functions)</td><td>Guest requests while they are processed</td></tr>
            <tr><th scope="row">Resend</th><td>Sends notification email to staff</td><td>EU (Ireland)</td><td>The text of each notification, which includes what the guest wrote</td></tr>
          </tbody>
        </table>
      </div>
      <p className="trust-note">Website visitors and enquiries are covered by the <a href="/privacy/">privacy policy</a>. The contracting company is TSquare Ventures LLC.</p>
    </Block>

    <Block id="practices" eyebrow="SECURITY PRACTICES" title="What runs today.">
      <div className="trust-three">
        <article><h3>In transit and at the edge</h3><p>HTTPS everywhere with HSTS, no content-type sniffing, a strict referrer policy and a content-security policy on the portal. Camera, microphone and location are switched off for the whole site.</p></article>
        <article><h3>Secrets and configuration</h3><p>Secrets live in the hosting provider’s protected settings and are never stored in the code or the database. The stay-layer secrets must be at least 32 characters or the service refuses to start.</p></article>
        <article><h3>Build pipeline</h3><p>Automated code scanning (CodeQL) and a baseline web-application scan (OWASP ZAP) run in our pipeline. Dependencies are checked weekly for known vulnerabilities.</p></article>
      </div>
    </Block>

    <Block id="status" eyebrow="STATUS AND ROADMAP" title="What is in place, and how we are closing the rest." lead="Until a formal certification is in place, you get what a reviewer actually needs: this page, a completed questionnaire, the independent test summary once it exists, the data-processing agreement and the provider list.">
      <div className="trust-table-wrap">
        <table className="trust-table">
          <thead><tr><th scope="col">Item</th><th scope="col">Status</th><th scope="col">Next step</th></tr></thead>
          <tbody>
            <tr><th scope="row">Hashed codes, signed links, scoped sessions, rate limits</th><td><span className="trust-chip trust-chip--done">Built and tested</span></td><td>Covered by the independent test below.</td></tr>
            <tr><th scope="row">Row-level security and role-based access</th><td><span className="trust-chip trust-chip--done">Built</span></td><td>Cross-property access is a named test case.</td></tr>
            <tr><th scope="row">Automatic deletion of expired stays</th><td><span className="trust-chip trust-chip--done">Built</span></td><td>Retention period confirmed per operator in the agreement.</td></tr>
            <tr><th scope="row">Privacy policy for the guest page</th><td><span className="trust-chip trust-chip--open">Draft, in legal review</span></td><td>Published in final form after review.</td></tr>
            <tr><th scope="row">Independent penetration test</th><td><span className="trust-chip trust-chip--open">Planned before the first live property</span></td><td>An accredited tester, with the guest and UNIKMO endpoints, the portal and access between properties in scope, and a retest after fixes. We share the summary with operators on request.</td></tr>
            <tr><th scope="row">Security certification (ISO 27001 or SOC 2)</th><td><span className="trust-chip trust-chip--open">Roadmap, not yet held</span></td><td>We pursue the framework our first customers ask for, after the independent test.</td></tr>
            <tr><th scope="row">Data-processing agreement</th><td><span className="trust-chip trust-chip--open">Template in preparation, signed before go-live</span></td><td>Sent with the pilot proposal.</td></tr>
          </tbody>
        </table>
      </div>
    </Block>

    <FaqBlock id="faq" eyebrow="FOR SECURITY AND LEGAL REVIEW" title="Questions reviewers ask us first." items={securityFaqs} />

    <section className="trust-block trust-closing">
      <p className="eyebrow">NEXT STEP</p>
      <h2>Send us your questionnaire.</h2>
      <p className="trust-lead">We will answer it against what is written here and tell you plainly where something is not yet in place.</p>
      <Cta>
        <a className="pilot-button" href="/contact/#contact">Contact us <Arrow /></a>
        <a className="pilot-button pilot-button--secondary" href="/integration/">How it works <Arrow /></a>
        <a className="pilot-button pilot-button--secondary" href="/privacy/">Privacy policy <Arrow /></a>
      </Cta>
    </section>
  </>
}
