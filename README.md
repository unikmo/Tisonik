# Tisonik

Tisonik is a white-label guest-experience interaction layer for cruise lines and premium hotels and resorts. It fits inside an operator's existing digital journey rather than replacing the operator's core app, PMS, booking or commerce stack.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

## Build

```bash
npm run build
```

## Crawlable cruise routes

- `/`
- `/crew-recognition/`
- `/service-recovery/`
- `/passenger-experience/`
- `/social-commerce/`
- `/cruise-dashboard/`
- `/integration/`
- `/pilot/`

## Company

Tisonik is a product of **TSquare Ventures LLC**.

30 N Gould St Ste R  
Sheridan, WY 82801  
USA

## Resort vertical routes

- `/hotels/`
- `/resort-live-demo/`
- `/resort-pilot/`
- `/resort-guest-engagement-software/`
- `/hotel-service-recovery-software/`
- `/hotel-guest-rating-software/`
- `/resort-experience-discovery/`
- `/resort-upselling-software/`
- `/hotel-ancillary-revenue-software/`

### Resort rating model

Guests rate their day with one tap per area, from Poor to Superb (scored 2, 4, 6, 8, 10 behind the buttons; the numbers are never shown). A low score (Poor or Fair) reaches the hotel team at once. Staff can also ask every guest to rate an event the moment it ends.

Before departure, guests answer five short questions (scored 1–10) plus an optional comment. All ratings are private to the property's team and are not published by Tisonik. See `docs/hotel-stays-go-live.md`.

### Resort ancillary-revenue model

The resort journey can surface relevant paid opportunities such as spa and wellness, speciality dining, excursions, cabanas and daybeds, private transfers, celebrations and watersports. The resort retains inventory, availability, pricing, checkout, payment and fulfilment. Public commercial-performance claims require real pilot evidence.

The Vite build treats each route as its own HTML entry so important buyer propositions are not represented only by client-side state.

## SEO production step

The canonical production domain is `https://tisonik.com`.

```bash
SITE_URL=https://tisonik.com npm run seo:generate
npm run build
```

## Final passenger interaction model

Discovery is intentionally scoped. There is no browse-all-passengers screen.

A verified passenger can find an opted-in same-sailing passenger through:

1. **Nearby** — coarse proximity supplied by the native cruise-line app/SDK; never a live map or exact distance.
2. **Shared activity** — both passengers attended the same verified onboard activity/context.
3. **Shared interests** — passengers voluntarily expose selected cruise-relevant interests such as food, shopping, fitness, wellness or excursion types.

First contact is a **predefined positive affirmation only**. The receiver can acknowledge or ignore it. Only after acknowledgement can the sender propose a predefined **public onboard venue/activity** such as coffee, a bar, restaurant, game, spa/wellness, shopping, fitness, a show or excursion. Cabins/staterooms are never offered.

No unrestricted chat. No dating mode. No phone-number disclosure.

## Offline-first requirement

Core Tisonik cruise usage must not depend on public internet access at sea.

The demo includes:

- a service-worker cached application shell
- a production requirement to pre-bundle/pre-cache the module before sailing or serve it from the ship-local network so first onboard open does not require public internet
- local preference/action persistence
- an offline action queue
- host bridge events for nearby discovery, interests, affirmations, public-meeting proposals, crew recognition, service issues and Experience Pulse
- an integration architecture separating **device**, **ship-local network** and **external cloud** responsibilities

Production nearby discovery should be supplied by a native cruise-app bridge/SDK. The web UI itself should not claim precise proximity or authenticate passengers.

If the ship exposes onboard APIs/LAN, events can synchronize locally without public internet. If external connectivity is unavailable, non-urgent events can queue and synchronize later. Production queued records should use the host application's approved secure local storage.

## Crew recognition

- Badge-photo identification, not facial recognition.
- One passenger may recognize the same crew member once per sailing-local day.
- Up to two predefined positive reasons per recognition event.
- Crew summary shows sailing number, dates, total recognitions, unique recognizing guests and recognition consistency across sailing days.
- No public leaderboard or popularity ranking.

## Experience Pulse

Experience Pulse is private cruise-line operational feedback, not the resort public-rating product.

- Ask only about departments/experiences the guest used.
- Maximum one pulse per guest/department/sailing-local day.
- Low score can open private service recovery.
- High score can route into named crew recognition.
- Post-resolution pulse can measure whether satisfaction improved after recovery.

## Social commerce

Passenger interests and positive connections create natural social proof around relevant cruise inventory. The cruise line keeps inventory, price, checkout and payment.

The cruise line must actively promote the passenger layer before and during the sailing for a pilot to produce meaningful activation and commerce evidence.

## Working commercial framework

For design-partner discussions, the current working cruise anchor is:

- Enterprise onboarding/integration fee — negotiated
- Ship activation/licensing fee — negotiated per vessel
- Platform fee — **$1 per eligible passenger** working anchor
- Performance fee — **5% of agreed attributable incremental onboard revenue** working anchor

A lower passenger fee such as $0.50 can be negotiated against stronger minimums, vessel licensing or performance economics. These are working negotiation anchors, not fixed public pricing.

## Host app integration

`src/bridge.ts` is a demo transport contract only. See `docs/INTEGRATION.md` for the production architecture. Query parameters and browser `postMessage` are never identity proof.

## Important demo notes

- Demo metrics and property/sailing details are illustrative.
- Public demonstrations do not imply an affiliation with any hotel, resort or cruise brand.
- The public pilot request form posts to the first-party `/api/pilot-requests` endpoint.
- Production identity, secure offline storage, operational routing, analytics and host-system integrations are implemented with the operator during pilot deployment.

## Legal pages

Business-specific legal routes are included at `/imprint/`, `/privacy/`, `/terms/`, and `/cookies/`. See `docs/LEGAL.md`.

## Cruise visual storytelling

The cruise overview uses cruise-hospitality imagery under `public/media/`. Resort pages use a separate resort-specific visual direction and must not reuse cruise imagery.
