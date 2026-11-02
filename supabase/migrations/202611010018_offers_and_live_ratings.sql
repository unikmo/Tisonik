-- Offers guests can hold a place on (with places left and "a guest you met is going"), and ratings staff push to every guest
-- the moment a show or event ends.

-- A guest can let guests they have met (an accepted compliment) see which offers they are going to.
alter table public.stay_profiles
  add column if not exists share_plans boolean not null default false;

-- Holding a place. The venue still takes payment and confirms; Tisonik only counts places and tells the desk.
create table public.stay_offer_rsvps (
  stay_id uuid not null references public.hotel_stays(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  offer_id text not null check (char_length(offer_id) between 1 and 40),
  created_at timestamptz not null default now(),
  primary key (stay_id, offer_id)
);
create index stay_offer_rsvps_offer_idx on public.stay_offer_rsvps(tenant_id, offer_id);

-- Staff (the cruise director, the animation team, the front desk) ask every guest to rate something now.
create table public.stay_live_ratings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  opened_at timestamptz not null default now(),
  closes_at timestamptz not null,
  check (closes_at > opened_at)
);
create index stay_live_ratings_open_idx on public.stay_live_ratings(tenant_id, closes_at desc);

create table public.stay_live_answers (
  live_id uuid not null references public.stay_live_ratings(id) on delete cascade,
  stay_id uuid not null references public.hotel_stays(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  score smallint not null check (score between 1 and 10),
  created_at timestamptz not null default now(),
  primary key (live_id, stay_id)
);

alter table public.stay_offer_rsvps enable row level security;
alter table public.stay_live_ratings enable row level security;
alter table public.stay_live_answers enable row level security;

create policy stay_offer_rsvps_member_read on public.stay_offer_rsvps for select to authenticated using (private.is_tenant_member(tenant_id));
create policy stay_live_ratings_member_read on public.stay_live_ratings for select to authenticated using (private.is_tenant_member(tenant_id));
create policy stay_live_answers_member_read on public.stay_live_answers for select to authenticated using (private.is_tenant_member(tenant_id));
grant select on public.stay_offer_rsvps, public.stay_live_ratings, public.stay_live_answers to authenticated;

revoke all on public.stay_offer_rsvps, public.stay_live_ratings, public.stay_live_answers from anon;
grant select, insert, update, delete on public.stay_offer_rsvps, public.stay_live_ratings, public.stay_live_answers to service_role;

comment on table public.stay_offer_rsvps is 'A guest holding a place on a venue offer. Person-level; purged with the stay.';
comment on table public.stay_live_answers is 'A guest rating of a staff-pushed show or event. Person-level; purged with the stay.';
