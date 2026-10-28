# Hotel and ship guest page: go-live runbook

## How it works

UNIKMO owns the card code. It issues it, prints it, and checks it. Tisonik never creates, stores or checks a code. Once UNIKMO has accepted a guest (a card code it checked, or a guest the ship's app already knows), UNIKMO's server calls Tisonik's session endpoint with a guest reference and the stay's end date. Tisonik creates the stay record on the first call, updates it on later ones, and returns a 15-minute link to the guest page. The in-app cruise experience is separate and unchanged; this page is the fallback, and the hotel product.

Everything here is done by a person with access to the production Supabase project, the Vercel project `tisonik` and the UNIKMO environment. None of it has been run yet.

## 1. Before the first hotel

- [ ] Agree with UNIKMO: the guest reference is one stable value per guest for the whole stay (the same from the ship's app and from the card), the end date is accurate, and UNIKMO limits wrong-code guesses (Tisonik no longer sees codes).
- [ ] Legal review of the new Privacy Policy section 13 and the stay-session cookie row on the Cookies page (both on branch `hotel-stays`). They describe stay records held by Tisonik on the hotel's behalf; the rest of the policy still describes the aggregate-only cruise design.
- [ ] Approve the ship wording of the five rating questions (embarkation, cabin, crew). Hotels use the approved wording.
- [ ] Confirm the 90-day retention (after the after-checkout window closes) and the 14-day default window.
- [x] Rating questions approved 26 October (`RATING_QUESTIONS` in `api/_lib/stays.mjs`). Question 4 can be skipped.

## 2. Database (Supabase)

Apply in this order, in the SQL editor or with the Supabase CLI. Take a backup first.

1. `supabase/migrations/202610260012_hotel_stays.sql` - stay tables (guest reference, dates, app and card session counts), venue type, retention function.
2. `supabase/migrations/202610260013_front_desk_role.sql` - adds the `front_desk` role. Run it on its own.
3. `supabase/migrations/202610260014_stay_rate_limits.sql` - rate-limit table and functions.

Check: `select count(*) from hotel_stays;` returns 0 and `select public.stay_rate_limit_hit('test', 60, 5);` returns `true`.

## 3. Environment variables

Run `node scripts/generate-stay-secrets.mjs`, then set in Vercel (Production):

| Variable | Notes |
|---|---|
| `STAY_LINK_SECRET` | 32+ characters. (`TISONIK_GUEST_SESSION_SECRET` is accepted as an alias.) |
| `UNIKMO_API_SECRET` | 32+ characters. Same value goes into UNIKMO as `TISONIK_API_SECRET`. |
| `TISONIK_PUBLIC_ORIGIN` | `https://tisonik.com` (must be https). |
| `RESEND_API_KEY`, `TISONIK_ENQUIRY_FROM` | For emailing reception (everything) and the hotel director (ratings only). Without them messages and ratings are stored and shown in the portal only. |
| `CRON_SECRET` | Already used by the enquiry cron; the new `stays-purge` cron uses the same one. |

In UNIKMO: `TISONIK_SESSION_API_URL=https://tisonik.com/api/integrations/unikmo/session`, `TISONIK_API_SECRET=<same as UNIKMO_API_SECRET>`, `TISONIK_ALLOWED_ORIGIN=https://tisonik.com`.

## 4. Per hotel

1. Create the hotel or ship's tenant and invite its staff in Supabase as for any operator. Roles: `operator_admin` (everything), `front_desk` (work the inbox), `operator_analyst` (inbox status only), `operator_viewer` (read only).
2. Sign in at `/portal/` as the hotel admin. In **Settings** set: **Type** (hotel or ship), name, **UNIKMO hotel ID** (must equal what UNIKMO sends as `hotelId`), the **reception or guest services email** (receives every message, thank-you and rating) and the **hotel director or manager email** (receives ratings only; a rating with any score of 6 or below is flagged LOW SCORE in the subject), days open after checkout, and the Discover items. Saving creates the hotel's settings row.
3. Nobody creates stays in the portal. They appear in the Stays list when UNIKMO first calls the session endpoint for a guest. Run the smoke test below to create one.

## 5. Smoke test (after deploying the branch)

```bash
curl -s -X POST https://tisonik.com/api/integrations/unikmo/session \
  -H "Authorization: Bearer $UNIKMO_API_SECRET" -H "Content-Type: application/json" \
  -d '{"hotelId":"<id>","guestReference":"<guest reference>","stayStartsAt":"2026-12-01T14:00:00.000Z","stayEndsAt":"2026-12-31T11:00:00.000Z"}'
```

Optional fields: `cardCode` (accepted and ignored), `source` (`app` or `card`; defaults to `card` when a card code is sent, otherwise `app`), `room`, `firstName`. Expected: `{"url":"https://tisonik.com/stay/#t=..."}`; the stay now shows in the portal. Open the URL on a phone: the tiles show, the address bar loses the `#t=` part, "Forget this device" signs out. An unmapped hotel, a stay that has closed, an end date more than 400 days away, or a voided stay returns 403. More than 240 calls a minute for one hotel return 429.

## 6. Known limits

- Dates are compared as calendar dates in UTC; hotel time zones are not modelled, so a day can roll over a few hours early or late.
- A stay link lasts 15 minutes; the cookie session lasts to the end of the after-checkout window (at most 30 days). Links are not single-use.
- Rate limits are per minute in the database: 60 session, 20 exchange and 20 submit requests per client; 240 UNIKMO calls per hotel. Wrong-code guessing is UNIKMO's to limit; Tisonik does not see codes.
- UNIKMO is trusted for the stay dates (its server proves itself with the shared secret). A stay is identified by hotel and guest reference exactly as sent, so UNIKMO must send the same text every time.
- One rating per stay. If the in-app flow also collects a rating, Tisonik cannot see it, so a guest could rate in both places. The two ratings are different products (10 in-app questions, 5 here).
- The ship wording of the rating questions is a proposal.
- If the rate-limit functions fail, requests are allowed through (and logged) so a database hiccup never locks guests out.
