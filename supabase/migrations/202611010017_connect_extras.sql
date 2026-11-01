-- Guest connect, part two: shared activities, nearby (signal supplied by the ship's app), the "did we fix it?" re-check.

alter table public.hotel_stay_settings
  add column if not exists activity_items jsonb not null default '[]'::jsonb check (jsonb_typeof(activity_items) = 'array');

-- Service recovery re-check. Once the desk marks a private message resolved, the guest is asked whether it was fixed.
alter table public.hotel_stay_submissions
  add column if not exists recheck text check (recheck is null or recheck in ('fixed', 'not_fixed')),
  add column if not exists rechecked_at timestamptz;

-- Nearby. The cruise line's app sends a rotating pseudonymous token for each opted-in guest and the tokens that guest's phone can
-- currently hear. Tisonik stores them only to match two opted-in guests, and treats them as stale after ten minutes.
alter table public.stay_profiles
  add column if not exists nearby_on boolean not null default false,
  add column if not exists proximity_token text check (proximity_token is null or char_length(proximity_token) between 8 and 64),
  add column if not exists nearby_tokens text[] not null default '{}' check (cardinality(nearby_tokens) <= 200),
  add column if not exists nearby_at timestamptz;
create unique index if not exists stay_profiles_token_idx on public.stay_profiles(tenant_id, proximity_token) where proximity_token is not null;

-- Shared activity. A guest says they took part in a venue-listed activity on a given day.
create table public.stay_activity_joins (
  stay_id uuid not null references public.hotel_stays(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  activity_id text not null check (char_length(activity_id) between 1 and 40),
  service_date date not null,
  created_at timestamptz not null default now(),
  primary key (stay_id, activity_id, service_date)
);
create index stay_activity_joins_lookup_idx on public.stay_activity_joins(tenant_id, activity_id, service_date);
alter table public.stay_activity_joins enable row level security;
revoke all on public.stay_activity_joins from anon, authenticated;
grant select, insert, update, delete on public.stay_activity_joins to service_role;
comment on table public.stay_activity_joins is 'Which listed activity a guest took part in, by day. Not readable by operators. Purged with the stay.';
