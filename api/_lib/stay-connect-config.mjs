// Fixed wording and rules for guest connect. Nothing here is free text: every label a guest can send is on one of these lists,
// so a guest can never send another guest an insult, a phone number or an invitation to a cabin.
// Source of the rules: docs/PRODUCT.md (Cruise Connection product definition).

export const INTERESTS = [
  { id: 'food', label: 'Food' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'culture', label: 'Culture' },
  { id: 'trivia', label: 'Trivia & games' },
  { id: 'music', label: 'Live music' },
  { id: 'family', label: 'Family time' },
  { id: 'nature', label: 'Beach & nature' },
]

export const AFFIRMATIONS = [
  { id: 'style', label: 'Great style' },
  { id: 'kind', label: 'That was kind of you' },
  { id: 'laugh', label: 'You made us laugh' },
  { id: 'energy', label: 'Great energy' },
  { id: 'friendly', label: 'You seemed friendly' },
  { id: 'trivia', label: 'Great trivia teammate' },
]

// Public places and activities only. A cabin or room is never offered.
export const PLACES = [
  { id: 'coffee', label: 'Coffee' },
  { id: 'bar', label: 'A drink at the bar' },
  { id: 'restaurant', label: 'A meal' },
  { id: 'trivia', label: 'Trivia or a game' },
  { id: 'spa', label: 'Spa or wellness' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'fitness', label: 'A workout' },
  { id: 'show', label: 'A show' },
  { id: 'excursion', label: 'An excursion' },
]

export const REASONS = [
  { id: 'welcome', label: 'Made us feel welcome' },
  { id: 'beyond', label: 'Went above and beyond' },
  { id: 'exceptional', label: 'Exceptional service' },
  { id: 'solved', label: 'Solved a problem' },
  { id: 'family', label: 'Great with our family' },
  { id: 'memorable', label: 'Made our trip memorable' },
]

export const AVATARS = ['coral', 'amber', 'sand', 'sage', 'teal', 'sky', 'indigo', 'plum', 'rose', 'slate', 'olive', 'ink']

const departments = {
  ship: [
    { id: 'dining', label: 'Dining' },
    { id: 'stateroom', label: 'Stateroom' },
    { id: 'pool_deck', label: 'Pool & deck' },
    { id: 'entertainment', label: 'Entertainment' },
    { id: 'excursions', label: 'Excursions' },
    { id: 'guest_services', label: 'Guest services' },
  ],
  hotel: [
    { id: 'reception', label: 'Reception' },
    { id: 'room', label: 'Your room' },
    { id: 'dining', label: 'Dining' },
    { id: 'spa_pool', label: 'Spa & pool' },
    { id: 'bar', label: 'Bar & lounge' },
  ],
}

export const departmentsFor = venueType => departments[venueType === 'ship' ? 'ship' : 'hotel']

// Which parts of the portal each kind of venue gets. Guest-to-guest connection is for ships; hotels switch it off.
export const featuresFor = venueType => ({
  people: venueType === 'ship',
  recognition: true,
  pulse: true,
})

export const LIMITS = { affirmationsPerDay: 10, reportsPerStay: 5, interestsMax: 10 }

// Names are shown to other guests, so they may not carry contact details or links.
export const nameIsSafe = value => !/\d{3,}|@|https?:|www\.|\.com\b/i.test(value)

export const slug = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28)

// Turns "Name | Role" lines into crew items with stable ids. A second person with the same name gets a numbered id.
export function crewItemsFromLines(lines) {
  const seen = new Map()
  return lines.slice(0, 40).map(line => {
    const name = String(line.name || '').trim()
    const base = slug(name) || 'crew'
    const count = (seen.get(base) || 0) + 1
    seen.set(base, count)
    return { id: count > 1 ? `${base}-${count}` : base, name, role: String(line.role || '').trim() }
  })
}
