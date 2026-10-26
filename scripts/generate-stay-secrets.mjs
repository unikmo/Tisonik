import { randomBytes } from 'node:crypto'

// Prints fresh secrets for the hotel stay layer. Nothing is written anywhere:
// copy each value into Vercel (and UNIKMO_API_SECRET into UNIKMO) yourself, then clear your terminal.
const secret = () => randomBytes(48).toString('base64url')

console.log(`# Tisonik (Vercel project environment variables)
STAY_CODE_PEPPER=${secret()}
STAY_LINK_SECRET=${secret()}
UNIKMO_API_SECRET=${secret()}

# UNIKMO (its own environment) - the same UNIKMO_API_SECRET value as above
TISONIK_API_SECRET=<same value as UNIKMO_API_SECRET>
TISONIK_ALLOWED_ORIGIN=https://tisonik.com
TISONIK_SESSION_API_URL=https://tisonik.com/api/integrations/unikmo/session

# Keep STAY_CODE_PEPPER once hotels have stays: changing it makes every existing code stop working.`)
