-- Hotel stay layer. Separate from the aggregate-only control plane: these tables
-- hold per-stay data (a booking reference, optional room and first name, and the
-- guest's own messages). Keep them out of aggregate reporting, and purge them
-- on the retention schedule below.

create table public.hotel_stay_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  hotel_name text check (hotel_name is null or char_length(hotel_name) between 2 and 120),
  notify_email text check (notify_email is null or char_length(notify_email) between 5 and 254),
  default_window_days integer not null default 14 check (default_window_days between 0 and 60),
  discover_items jsonb not null default '[]'::jsonb check (jsonb_typeof(discover_items) = 'array'),
  created_at timestamptz not null default now()
);

create table public.hotel_stays (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_ref text not null check (char_length(booking_ref) between 1 and 80),
  code_digest text not null check (char_length(code_digest) = 64),
  room text check (room is null or char_length(room) <= 20),
  guest_label text check (guest_label is null or char_length(guest_label) <= 60),
  valid_from date not null,
  valid_to date not null,
  window_days integer not null default 14 check (window_days between 0 and 60),
  status text not null default 'active' check (status in ('active', 'voided')),
  created_at timestamptz not null default now(),
  check (valid_to >= valid_from),
  unique (tenant_id, code_digest)
);

create table public.hotel_stay_submissions (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.hotel_stays(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind text not null check (kind in ('thank_you', 'private', 'feedback', 'rating')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  status text not null default 'new' check (status in ('new', 'seen', 'resolved')),
  created_at timestamptz not null default now()
);

create unique index hotel_stay_one_rating_idx on public.hotel_stay_submissions(stay_id) where kind = 'rating';
create index hotel_stays_tenant_dates_idx on public.hotel_stays(tenant_id, valid_to desc);
create index hotel_stay_submissions_tenant_idx on public.hotel_stay_submissions(tenant_id, created_at desc);
create index hotel_stay_submissions_stay_idx on public.hotel_stay_submissions(stay_id, kind);

alter table public.hotel_stay_settings enable row level security;
alter table public.hotel_stays enable row level security;
alter table public.hotel_stay_submissions enable row level security;

create policy hotel_settings_member_read on public.hotel_stay_settings for select to authenticated using (public.is_tenant_member(tenant_id));
create policy hotel_stays_member_read on public.hotel_stays for select to authenticated using (public.is_tenant_member(tenant_id));
create policy hotel_submissions_member_read on public.hotel_stay_submissions for select to authenticated using (public.is_tenant_member(tenant_id));

grant select on public.hotel_stay_settings, public.hotel_stays, public.hotel_stay_submissions to authenticated;
revoke all on public.hotel_stay_settings, public.hotel_stays, public.hotel_stay_submissions from anon;
grant select, insert, update, delete on public.hotel_stay_settings, public.hotel_stays, public.hotel_stay_submissions to service_role;

-- Retention: delete a stay (and, by cascade, its submissions) this many days after
-- its after-checkout window has closed. 90 is a proposal, not yet decided.
create or replace function public.purge_expired_hotel_stays(retention_days integer default 90)
returns integer language plpgsql security definer set search_path = public
as $$
declare removed integer;
begin
  delete from public.hotel_stays
  where valid_to + window_days + retention_days < current_date;
  get diagnostics removed = row_count;
  return removed;
end $$;
revoke all on function public.purge_expired_hotel_stays(integer) from public;
grant execute on function public.purge_expired_hotel_stays(integer) to service_role;

comment on table public.hotel_stays is 'Per-stay hotel data (booking reference, optional room and first name). Not part of the aggregate-only control plane. Purged by purge_expired_hotel_stays().';
comment on table public.hotel_stay_submissions is 'Guest messages, thank-yous and ratings for a stay. Person-level; purged with the stay.';
