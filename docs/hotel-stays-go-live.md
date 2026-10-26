# Hotel stays: go-live runbook

Everything here is done by a person with access to the production Supabase project, the Vercel project `tisonik` and the UNIKMO environment. None of it has been run yet.

## 1. Before the first hotel

- [ ] Legal review of the new Privacy Policy section 13 and the stay-session cookie row on the Cookies page (both on branch `hotel-stays`). They describe stay records held by Tisonik on the hotel's behalf; the rest of the policy still describes the aggregate-only cruise design.
- [ ] Confirm the 90-day retention (after the after-checkout window closes) and the 14-day default window.
- [x] Rating questions approved 26 October (`RATING_QUESTIONS` in `api/_lib/stays.mjs`). Question 4 can be skipped.

## 2. Database (Supabase)

Apply in this order, in the SQL editor or with the Supabase CLI. Take a backup first.

1. `supabase/migrations/202610260012_hotel_stays.sql` - stay tables, retention function.
2. `supabase/migrations/202610260013_front_desk_role.sql` - adds the `front_desk` role. Run it on its own.
3. `supabase/migrations/202610260014_stay_rate_limits.sql` - rate-limit table and functions.

Check: `select count(*) from hotel_stays;` returns 0 and `select public.stay_rate_limit_hit('test', 60, 5);` returns `true`.

## 3. Environment variables

Run `node scripts/generate-stay-secrets.mjs`, then set in Vercel (Production):

| Variable | Notes |
|---|---|
| `STAY_CODE_PEPPER` | 32+ characters. Never change it once stays exist. |
| `STAY_LINK_SECRET` | 32+ characters. (`TISONIK_GUEST_SESSION_SECRET` is accepted as an alias.) |
| `UNIKMO_API_SECRET` | 32+ characters. Same value goes into UNIKMO as `TISONIK_API_SECRET`. |
| `TISONIK_PUBLIC_ORIGIN` | `https://tisonik.com` (must be https). |
| `RESEND_API_KEY`, `TISONIK_ENQUIRY_FROM` | For emailing reception and the hotel director. Without them messages and ratings are stored and shown in the portal only. |
| `CRON_SECRET` | Already used by the enquiry cron; the new `stays-purge` cron uses the same one. |

In UNIKMO: `TISONIK_SESSION_API_URL=https://tisonik.com/api/integrations/unikmo/session`, `TISONIK_API_SECRET=<same as UNIKMO_API_SECRET>`, `TISONIK_ALLOWED_ORIGIN=https://tisonik.com`.

## 4. Per hotel

1. Create the hotel's tenant and invite its staff in Supabase as for any operator. Roles: `operator_admin` (everything), `front_desk` (create stays, work the inbox), `operator_analyst` (inbox status only), `operator_viewer` (read only).
2. Sign in at `/portal/` as the hotel admin. In **Hotel settings** set: hotel name, **UNIKMO hotel ID** (must equal what UNIKMO sends as `hotelId`), the **reception email** and the **hotel director or manager email** (both receive every message, thank-you and rating; a rating with any score of 6 or below is flagged LOW SCORE in the subject), days open after checkout, and the Discover items. Saving creates the hotel's settings row.
3. Create a test stay for tomorrow and write the code on a card.

## 5. Smoke test (after deploying the branch)

```bash
curl -s -X POST https://tisonik.com/api/integrations/unikmo/session \
  -H "Authorization: Bearer $UNIKMO_API_SECRET" -H "Content-Type: application/json" \
  -d '{"hotelId":"<id>","cardCode":"ABCD-7K92","guestReference":"<booking>","stayEndsAt":"2026-12-31T11:00:00.000Z"}'
```

Expected: `{"url":"https://tisonik.com/stay/#t=..."}`. Open the URL on a phone: the tiles show, the address bar loses the `#t=` part, "Forget this device" signs out. A wrong code returns 403; ten wrong codes in a minute return 429 for that hotel until the minute rolls over.

## 6. Known limits

- Dates are compared as calendar dates in UTC; hotel time zones are not modelled, so a day can roll over a few hours early or late.
- A stay link lasts 15 minutes; the cookie session lasts to the end of the after-checkout window (at most 30 days). Links are not single-use.
- Rate limits are per minute in the database: 60 session, 20 exchange and 20 submit requests per client; 240 calls and 10 wrong codes per hotel.
- If the rate-limit functions fail, requests are allowed through (and logged) so a database hiccup never locks guests out.
