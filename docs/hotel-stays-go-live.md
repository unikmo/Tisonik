# Hotel and ship guest page: go-live runbook

## How it works

UNIKMO creates the card codes and sends them to Tisonik. Tisonik never creates a code. When UNIKMO creates or assigns a code, it sends it to `POST /api/integrations/unikmo/codes` with the guest reference and the stay's dates; Tisonik creates the stay record and keeps only a keyed hash of the code. When a guest uses the card, UNIKMO's server calls `POST /api/integrations/unikmo/session` with the code; Tisonik checks that it is a code UNIKMO sent, for that guest, and still valid, then returns a 15-minute link to the guest page. A guest the ship's app already knows needs no code: the session call without a code creates or updates the stay directly. The in-app cruise experience is separate and unchanged; this page is the fallback, and the hotel product.

Everything here is done by a person with access to the production Supabase project, the Vercel project `tisonik` and the UNIKMO environment. None of it has been run yet.

## 1. Before the first hotel

- [ ] Agree with UNIKMO: the guest reference is one stable value per guest for the whole stay (the same from the ship's app and from the card), the end date is accurate, and UNIKMO sends every code to Tisonik when it creates or replaces it, and revokes it when a card is lost.
- [ ] Legal review of the new Privacy Policy section 13 and the stay-session cookie row on the Cookies page (both on branch `hotel-stays`). They describe stay records held by Tisonik on the hotel's behalf; the rest of the policy still describes the aggregate-only cruise design.
- [ ] Approve the ship wording of the five rating questions (embarkation, cabin, crew). Hotels use the approved wording.
- [ ] Confirm the 90-day retention (after the after-checkout window closes) and the 14-day default window.
- [x] Rating questions approved 26 October (`RATING_QUESTIONS` in `api/_lib/stays.mjs`). Question 4 can be skipped.

## 2. Database (Supabase)

Apply in this order, in the SQL editor or with the Supabase CLI. Take a backup first.

1. `supabase/migrations/202610260012_hotel_stays.sql` - stay tables (guest reference, dates, hashed card code, app and card session counts), venue type, retention function.
2. `supabase/migrations/202610260013_front_desk_role.sql` - adds the `front_desk` role. Run it on its own.
3. `supabase/migrations/202610260014_stay_rate_limits.sql` - rate-limit table and functions.

Check: `select count(*) from hotel_stays;` returns 0 and `select public.stay_rate_limit_hit('test', 60, 5);` returns `true`.

## 3. Environment variables

Run `node scripts/generate-stay-secrets.mjs`, then set in Vercel (Production):

| Variable | Notes |
|---|---|
| `STAY_CODE_PEPPER` | 32+ characters. Never change it once codes are registered. |
| `STAY_LINK_SECRET` | 32+ characters. (`TISONIK_GUEST_SESSION_SECRET` is accepted as an alias.) |
| `UNIKMO_API_SECRET` | 32+ characters. Same value goes into UNIKMO as `TISONIK_API_SECRET`. |
| `TISONIK_PUBLIC_ORIGIN` | `https://tisonik.com` (must be https). |
| `RESEND_API_KEY`, `TISONIK_ENQUIRY_FROM` | For emailing reception (everything) and the hotel director (ratings only). Without them messages and ratings are stored and shown in the portal only. |
| `CRON_SECRET` | Already used by the enquiry cron; the new `stays-purge` cron uses the same one. |

In UNIKMO: `TISONIK_SESSION_API_URL=https://tisonik.com/api/integrations/unikmo/session`, `TISONIK_CODES_API_URL=https://tisonik.com/api/integrations/unikmo/codes`, `TISONIK_API_SECRET=<same as UNIKMO_API_SECRET>`, `TISONIK_ALLOWED_ORIGIN=https://tisonik.com`.

## 4. Per hotel

1. Create the hotel or ship's tenant and invite its staff in Supabase as for any operator. Roles: `operator_admin` (everything), `front_desk` (work the inbox), `operator_analyst` (inbox status only), `operator_viewer` (read only).
2. Sign in at `/portal/` as the hotel admin. In **Settings** set: **Type** (hotel or ship), name, **UNIKMO hotel ID** (must equal what UNIKMO sends as `hotelId`), the **reception or guest services email** (receives every message, thank-you and rating) and the **hotel director or manager email** (receives ratings only; a rating with any score of 6 or below is flagged LOW SCORE in the subject), days open after checkout, and the Discover items. Saving creates the hotel's settings row.
3. Nobody creates stays or codes in the portal. Stays appear in the list when UNIKMO first sends a code or opens a session for a guest. Run the smoke test below to create one.

## 5. Smoke test (after deploying the branch)

Register a code, as UNIKMO would when it creates one:

```bash
curl -s -X POST https://tisonik.com/api/integrations/unikmo/codes \
  -H "Authorization: Bearer $UNIKMO_API_SECRET" -H "Content-Type: application/json" \
  -d '{"hotelId":"<id>","cardCode":"<UNIKMO code>","guestReference":"<guest reference>","stayStartsAt":"2026-12-01T14:00:00.000Z","stayEndsAt":"2026-12-31T11:00:00.000Z"}'
```

Expected: `{"registered":true,"revoked":false}`; the stay now shows in the portal. Send the same body with `"status":"revoked"` to revoke the code. A code already held by another guest returns 409.

Then open a session, as UNIKMO would when the guest uses the card:

```bash
curl -s -X POST https://tisonik.com/api/integrations/unikmo/session \
  -H "Authorization: Bearer $UNIKMO_API_SECRET" -H "Content-Type: application/json" \
  -d '{"hotelId":"<id>","cardCode":"<UNIKMO code>","guestReference":"<guest reference>","stayEndsAt":"2026-12-31T11:00:00.000Z"}'
```

Expected: `{"url":"https://tisonik.com/stay/#t=..."}`. Open the URL on a phone: the tiles show, the address bar loses the `#t=` part, "Forget this device" signs out. Leave out `cardCode` to test the app path (it creates the stay if needed). Optional fields on both calls: `stayStartsAt`, `room`, `firstName`; on the session call also `source` (`app` or `card`; defaults to `card` when a code is sent).

A code UNIKMO has not registered, a code for a different guest, a revoked code, a voided stay, a stay that has closed, an end date more than 400 days away or an unmapped hotel all return 403. Ten wrong codes in a minute return 429 for that hotel until the minute rolls over, and more than 240 calls a minute for one hotel also return 429.

## 6. Known limits

- Dates are compared as calendar dates in UTC; hotel time zones are not modelled, so a day can roll over a few hours early or late.
- A stay link lasts 15 minutes; the cookie session lasts to the end of the after-checkout window (at most 30 days). Links are not single-use.
- Rate limits are per minute in the database: 60 session, 20 exchange and 20 submit requests per client; 240 UNIKMO calls per hotel. Ten wrong or mismatched codes a minute per hotel pause code checks for that hotel; guests without a code are not held up.
- UNIKMO is trusted for the stay dates and for every code it registers (its server proves itself with the shared secret). A stay is identified by hotel and guest reference exactly as sent, so UNIKMO must send the same text every time.
- One rating per stay. If the in-app flow also collects a rating, Tisonik cannot see it, so a guest could rate in both places. The two ratings are different products (10 in-app questions, 5 here).
- The ship wording of the rating questions is a proposal.
- If the rate-limit functions fail, requests are allowed through (and logged) so a database hiccup never locks guests out.
