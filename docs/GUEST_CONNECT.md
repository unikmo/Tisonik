# Guest connect: what the guest portal does, by venue type

The guest portal (`/stay/`) is one app. A venue is either a `ship` or a `hotel`, and that switches parts of it on or off.
The rules come from `docs/PRODUCT.md` (Cruise Connection). Code: `api/_lib/stay-connect-config.mjs` (wording and flags),
`api/_lib/stay-connect.mjs` (actions), `api/v1/stays/connect.mjs` (endpoint), `stay/index.html` (page).

| Feature | Ship | Hotel | Rule |
|---|---|---|---|
| Welcome from the Cruise Director or hotel manager | Yes | Yes | YouTube or Vimeo link, loaded only when the guest presses play |
| Day-of-stay progress | Yes | Yes | |
| Thank someone (free text) | Yes | Yes | Open during and after the stay |
| Recognise crew or team | Yes | Yes | Crew list set by the venue. One person once per day, one or two preset reasons. No public rankings |
| Daily pulse by department | Yes | Yes | 1 to 10, once per department per day. Six ship areas, five hotel areas. A score of 6 or below emails the desk the same day. 9 or above invites a recognition |
| Need help? Let us fix it | Yes | Yes | During the stay. Goes to guest services or reception |
| Share feedback | Yes | Yes | After checkout only |
| Rate your voyage or stay | Yes | Yes | Five questions, last day and after |
| Discover (venue recommendations) and keepsake | Yes | Yes | |
| **Meet people** (opt-in profile, discover by interest) | **Yes** | **No** | Adults only, first name and preset avatar, never a photo, contact or cabin |
| **Compliments** between guests | **Yes** | **No** | Six preset lines. One per guest pair per day, ten a day. Recipient can say thanks or pass, and the sender is never told about a pass |
| **Meet-up suggestions** | **Yes** | **No** | Only after the recipient says thanks. Public places only (never a cabin). One open suggestion at a time |
| Block and report | Yes | No | Report goes to the desk and blocks the guest |

More ways to find people and close the loop (all on, ships only unless noted):

| Feature | Rule |
|---|---|
| **Nearby** | Guest turns it on in their profile. The cruise line's app sends a rotating token and the tokens it can hear to UNIKMO, which posts them to `POST /api/integrations/unikmo/nearby`. Two opted-in guests who can hear each other see each other. Signals older than 10 minutes are ignored. No map, no distance |
| **Same activity** | Venue lists activities (settings, one per line: title, a bar, then when). A guest says "I took part today". They then see other guests who took part in the same one in the last two days. Self-declared, not verified |
| **Did we fix it?** (ships and hotels) | When the desk marks a private message resolved, the guest is asked. "Yes" records it. "Not yet" reopens the message and emails the desk "NOT FIXED". Operators can read the answer |
| **Voyage or stay in numbers** (ships and hotels) | In the last two days and after checkout: days, crew recognised, compliments received and sent, top compliment. A share button shares the numbers only, never names |

Nearby needs the ship's own app. The portal and the server are built, but nothing sends a proximity signal until the cruise line's app does. Request body:
`{ "hotelId": "...", "guestReference": "...", "token": "8-64 letters, digits, - or _", "seen": ["up to 200 tokens"] }`, with the same Bearer secret as the other UNIKMO endpoints.
A guest who has not turned Nearby on is ignored (the call returns 204).

Still not built: the cruise line's public end-of-voyage totals (counts across all guests) and the native proximity code in the cruise line's app.

## Privacy

- Everything cascades from the stay, so it is deleted with the stay by the daily purge.
- Operators can read crew recognitions and pulse scores for their own venue. They cannot read profiles, compliments, meet-ups or blocks.
- Guests are visible only if they opted in, confirmed they are 18 or over, and their stay is still open.
- Names may not contain digits (three or more), `@`, links or `.com`, so a name cannot carry a contact detail.

## Database

Migrations `202611010016_guest_connect.sql` then `202611010017_connect_extras.sql` (apply after `202611010015_welcome_video.sql`, before deploying the code). The second adds `activity_items`, the re-check columns, the Nearby columns and `stay_activity_joins`.
Adds `crew_items` to `hotel_stay_settings`, the `report` submission kind, and six tables:
`stay_profiles`, `stay_affirmations`, `stay_meetups`, `stay_blocks`, `crew_recognitions`, `stay_pulses`.

## Tests

`npm run test:hotel-stays` runs the stay contract and `scripts/test-guest-connect.mjs` (features per venue, opt-in and adult rules,
daily limits, blocks, meet-up gating, crew and pulse limits, desk emails).
