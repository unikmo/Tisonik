import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from './supabaseClient'
import './portal-hotel.css'

type Settings = { venue_type: 'hotel' | 'ship'; hotel_name: string | null; unikmo_hotel_id: string | null; reception_email: string | null; manager_email: string | null; default_window_days: number; discover_items: { title: string; body: string }[] }
type Stay = { id: string; booking_ref: string; room: string | null; guest_label: string | null; valid_from: string; valid_to: string; window_days: number; status: 'active' | 'voided'; app_sessions: number; card_sessions: number; created_at: string }
type Submission = { id: string; stay_id: string; kind: 'thank_you' | 'private' | 'feedback' | 'rating'; payload: Record<string, unknown>; status: 'new' | 'seen' | 'resolved'; created_at: string }
type Filter = 'action' | 'thank_you' | 'rating'

const kindLabel: Record<Submission['kind'], string> = { private: 'Private message', feedback: 'Post-stay feedback', thank_you: 'Thank you', rating: 'Rating' }
const questionLabel: Record<string, string> = { check_in: 'Arrival and check-in', room: 'Room or cabin', team: 'Team or crew', recovery: 'Putting things right', recommend: 'Would recommend' }

async function call(token: string, action: string, tenantId: string, data: Record<string, unknown>) {
  const response = await fetch('/api/v1/stays/portal', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, tenantId, data }) })
  const body = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, body }
}

const blankSettings: Settings = { venue_type: 'hotel', hotel_name: '', unikmo_hotel_id: '', reception_email: '', manager_email: '', default_window_days: 14, discover_items: [] }
const itemsToText = (items: Settings['discover_items']) => items.map(item => `${item.title} | ${item.body}`).join('\n')
const textToItems = (text: string) => text.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 12).map(line => { const [title, ...rest] = line.split('|'); return { title: title.trim(), body: rest.join('|').trim() } }).filter(item => item.title)

export default function HotelStaysPanel({ tenantId, token, canWrite, isTisonikAdmin }: { tenantId: string; token: string; canWrite: boolean; isTisonikAdmin: boolean }) {
  const [settings, setSettings] = useState<Settings | null | undefined>(undefined)
  const [stays, setStays] = useState<Stay[]>([])
  const [subs, setSubs] = useState<Submission[]>([])
  const [filter, setFilter] = useState<Filter>('action')
  const [settingsForm, setSettingsForm] = useState({ venueType: 'hotel' as 'hotel' | 'ship', hotelName: '', unikmoHotelId: '', receptionEmail: '', managerEmail: '', defaultWindowDays: 14, discover: '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!supabase) return
    const s = await supabase.from('hotel_stay_settings').select('venue_type,hotel_name,unikmo_hotel_id,reception_email,manager_email,default_window_days,discover_items').eq('tenant_id', tenantId).maybeSingle()
    const row = (s.data as Settings | null) || null
    setSettings(row)
    if (row) setSettingsForm({ venueType: row.venue_type || 'hotel', hotelName: row.hotel_name || '', unikmoHotelId: row.unikmo_hotel_id || '', receptionEmail: row.reception_email || '', managerEmail: row.manager_email || '', defaultWindowDays: row.default_window_days, discover: itemsToText(row.discover_items || []) })
    const st = await supabase.from('hotel_stays').select('id,booking_ref,room,guest_label,valid_from,valid_to,window_days,status,app_sessions,card_sessions,created_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(50)
    setStays((st.data || []) as Stay[])
    const su = await supabase.from('hotel_stay_submissions').select('id,stay_id,kind,payload,status,created_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(150)
    setSubs((su.data || []) as Submission[])
  }, [tenantId])
  useEffect(() => { void load() }, [load])

  if (settings === undefined) return null
  if (settings === null && !isTisonikAdmin) return null

  const ship = (settings?.venue_type || settingsForm.venueType) === 'ship'
  const desk = ship ? 'Guest services' : 'Reception'
  const stayById = new Map(stays.map(stay => [stay.id, stay]))
  const shown = subs.filter(sub => filter === 'action' ? sub.kind === 'private' || sub.kind === 'feedback' : filter === 'thank_you' ? sub.kind === 'thank_you' : sub.kind === 'rating')
  const waiting = subs.filter(sub => (sub.kind === 'private' || sub.kind === 'feedback') && sub.status === 'new').length
  const ratings = subs.filter(sub => sub.kind === 'rating')
  const averages = Object.keys(questionLabel).map(key => {
    const values = ratings.map(sub => Number((sub.payload.scores as Record<string, number> | undefined)?.[key])).filter(Number.isFinite)
    return { key, average: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null }
  })

  const voidStay = async (stay: Stay) => {
    if (!window.confirm(`Void booking ${stay.booking_ref}? The guest page for this stay will stop opening.`)) return
    const result = await call(token, 'void', tenantId, { stayId: stay.id })
    setMessage(result.ok ? `Booking ${stay.booking_ref} voided.` : 'Could not void that stay.')
    void load()
  }
  const mark = async (sub: Submission, status: Submission['status']) => {
    const result = await call(token, 'status', tenantId, { submissionId: sub.id, status })
    if (!result.ok) setMessage('Could not update that message.')
    void load()
  }
  const saveSettings = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setMessage('')
    const result = await call(token, 'settings', tenantId, { venueType: settingsForm.venueType, hotelName: settingsForm.hotelName.trim() || null, unikmoHotelId: settingsForm.unikmoHotelId.trim() || null, receptionEmail: settingsForm.receptionEmail.trim() || null, managerEmail: settingsForm.managerEmail.trim() || null, defaultWindowDays: Number(settingsForm.defaultWindowDays), discoverItems: textToItems(settingsForm.discover) })
    setBusy(false)
    setMessage(result.ok ? 'Settings saved.' : 'Settings could not be saved. Check the email address.')
    void load()
  }
  return <>
    <section className="portal-panel hotel-panel">
      <h2>{ship ? 'Voyages' : 'Hotel stays'}</h2>
      <p className="portal-empty">Stay-level data for this {ship ? 'ship' : 'hotel'}: a guest reference sent by UNIKMO, an optional {ship ? 'cabin' : 'room'} and first name, and what guests write. Stays appear here when a guest first opens the guest page from a UNIKMO card or the ship app. This is separate from the aggregate reports above. Stays are deleted automatically 90 days after their after-checkout window closes.</p>
      {message && <p className="portal-status" role="status">{message}</p>}
      {stays.length ? <div className="hotel-stays"><div><b>Guest reference</b><b>{ship ? 'Cabin' : 'Room'}</b><b>Stay</b><b>Opened via</b><b /></div>{stays.map(stay => <div key={stay.id}><span>{stay.booking_ref}{stay.guest_label ? ` · ${stay.guest_label}` : ''}</span><span>{stay.room || '—'}</span><span>{stay.valid_from} → {stay.valid_to}</span><span>{stay.status === 'voided' ? 'voided' : `app ${stay.app_sessions} · card ${stay.card_sessions}`}</span><span>{canWrite && stay.status === 'active' && <button className="hotel-link" onClick={() => void voidStay(stay)}>Void</button>}</span></div>)}</div> : <p className="portal-empty">No stays yet. They are created automatically when a guest first opens the guest page.</p>}
    </section>

    <section className="portal-panel hotel-panel">
      <h2>Guest inbox{waiting ? ` · ${waiting} waiting` : ''}</h2>
      <div className="hotel-filters" role="tablist">{([['action', 'Needs a reply'], ['thank_you', 'Thank-yous'], ['rating', 'Ratings']] as [Filter, string][]).map(([key, label]) => <button key={key} role="tab" aria-selected={filter === key} className={filter === key ? 'on' : ''} onClick={() => setFilter(key)}>{label}</button>)}</div>
      {filter === 'rating' && ratings.length > 0 && <div className="hotel-averages">{averages.map(item => <article key={item.key}><span>{questionLabel[item.key]}</span><strong>{item.average === null ? '—' : item.average.toFixed(1)}</strong></article>)}<article><span>Ratings received</span><strong>{ratings.length}</strong></article></div>}
      {shown.length ? <div className="portal-requests">{shown.map(sub => { const stay = stayById.get(sub.stay_id); const scores = (sub.payload.scores || null) as Record<string, number> | null; return <article key={sub.id}>
        <div><strong>{kindLabel[sub.kind]}</strong><span>{sub.kind === 'rating' ? '' : sub.status}</span></div>
        <p>{stay ? `Guest ${stay.booking_ref}${stay.room ? ` · ${ship ? 'Cabin' : 'Room'} ${stay.room}` : ''}${stay.guest_label ? ` · ${stay.guest_label}` : ''}` : 'Stay no longer held'}{sub.payload.recipient ? ` · About: ${String(sub.payload.recipient)}` : ''}</p>
        {scores && <p>{Object.entries(scores).map(([key, value]) => `${questionLabel[key] || key}: ${value}`).join(' · ')}</p>}
        {Boolean(sub.payload.message || sub.payload.comment) && <blockquote>{String(sub.payload.message || sub.payload.comment)}</blockquote>}
        <small>{new Date(sub.created_at).toLocaleString()}</small>
        {sub.kind !== 'rating' && <div className="hotel-actions">{(['new', 'seen', 'resolved'] as const).filter(status => status !== sub.status).map(status => <button key={status} className="hotel-link" onClick={() => void mark(sub, status)}>Mark {status}</button>)}</div>}
      </article> })}</div> : <p className="portal-empty">Nothing here yet.</p>}
    </section>

    {canWrite && <section className="portal-panel hotel-panel">
      <h2>Settings</h2>
      <form className="hotel-form" onSubmit={saveSettings}>
        <label>Type<select value={settingsForm.venueType} onChange={e => setSettingsForm({ ...settingsForm, venueType: e.target.value as 'hotel' | 'ship' })}><option value="hotel">Hotel or resort</option><option value="ship">Ship</option></select></label>
        <label>Name shown to guests<input maxLength={120} value={settingsForm.hotelName} onChange={e => setSettingsForm({ ...settingsForm, hotelName: e.target.value })} /></label>
        <label>UNIKMO hotel ID<input maxLength={64} value={settingsForm.unikmoHotelId} onChange={e => setSettingsForm({ ...settingsForm, unikmoHotelId: e.target.value })} /></label>
        <label>{desk} email (gets everything)<input type="email" maxLength={254} value={settingsForm.receptionEmail} onChange={e => setSettingsForm({ ...settingsForm, receptionEmail: e.target.value })} /></label>
        <label>Hotel director or manager email (gets ratings only)<input type="email" maxLength={254} value={settingsForm.managerEmail} onChange={e => setSettingsForm({ ...settingsForm, managerEmail: e.target.value })} /></label>
        <label>Days open after checkout<input type="number" min={0} max={60} value={settingsForm.defaultWindowDays} onChange={e => setSettingsForm({ ...settingsForm, defaultWindowDays: Number(e.target.value) })} /></label>
        <label className="hotel-wide">Discover tile, one per line as "Title | Description" (up to 12)<textarea rows={4} value={settingsForm.discover} onChange={e => setSettingsForm({ ...settingsForm, discover: e.target.value })} /></label>
        <button disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </form>
    </section>}
  </>
}
