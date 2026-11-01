-- Guest connect: crew recognition, the daily pulse and, where a venue turns it on, guest-to-guest connection.
-- Person-level data, kept with the stay and purged with it (every table cascades from hotel_stays).
-- Guest-to-guest connection is opt-in: a guest chooses a first name, an avatar and interests, confirms they are an adult,
-- and only then becomes visible to other opted-in guests of the same sailing. No chat, no dating, no cabin numbers.

alter table public.hotel_stay_settings
  add column if not exists crew_items jsonb not null default '[]'::jsonb check (jsonb_typeof(crew_items) = 'array');

alter table public.hotel_stay_submissions drop constraint if exists hotel_stay_submissions_kind_check;
alter table public.hotel_stay_submissions add constraint hotel_stay_submissions_kind_check
  check (kind in ('thank_you', 'private', 'feedback', 'rating', 'report'));

create table public.stay_profiles (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null unique references public.hotel_stays(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  avatar text not null check (char_length(avatar) between 1 and 20),
  interests text[] not null default '{}' check (cardinality(interests) <= 10),
  adult_confirmed boolean not null default false,
  discoverable boolean not null default false,
  expires_on date not null,
  updated_at timestamptz not null default now()
);

create table public.stay_affirmations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  from_profile uuid not null references public.stay_profiles(id) on delete cascade,
  to_profile uuid not null references public.stay_profiles(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 30),
  service_date date not null,
  status text not null default 'sent' check (status in ('sent', 'acknowledged', 'ignored')),
  created_at timestamptz not null default now(),
  check (from_profile <> to_profile),
  unique (from_profile, to_profile, service_date)
);

create table public.stay_meetups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  affirmation_id uuid not null references public.stay_affirmations(id) on delete cascade,
  proposed_by uuid not null references public.stay_profiles(id) on delete cascade,
  place text not null check (char_length(place) between 1 and 30),
  status text not null default 'proposed' check (status in ('proposed', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);
create unique index stay_meetups_one_open_idx on public.stay_meetups(affirmation_id) where status = 'proposed';

create table public.stay_blocks (
  blocker_profile uuid not null references public.stay_profiles(id) on delete cascade,
  blocked_profile uuid not null references public.stay_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_profile, blocked_profile)
);

create table public.crew_recognitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  stay_id uuid not null references public.hotel_stays(id) on delete cascade,
  crew_id text not null check (char_length(crew_id) between 1 and 40),
  reasons text[] not null check (cardinality(reasons) between 1 and 2),
  service_date date not null,
  created_at timestamptz not null default now(),
  unique (stay_id, crew_id, service_date)
);

create table public.stay_pulses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  stay_id uuid not null references public.hotel_stays(id) on delete cascade,
  department text not null check (char_length(department) between 1 and 30),
  score smallint not null check (score between 1 and 10),
  service_date date not null,
  created_at timestamptz not null default now(),
  unique (stay_id, department, service_date)
);

create index stay_profiles_tenant_idx on public.stay_profiles(tenant_id) where discoverable;
create index stay_affirmations_to_idx on public.stay_affirmations(to_profile, created_at desc);
create index stay_affirmations_from_idx on public.stay_affirmations(from_profile, created_at desc);
create index crew_recognitions_tenant_idx on public.crew_recognitions(tenant_id, service_date desc);
create index stay_pulses_tenant_idx on public.stay_pulses(tenant_id, service_date desc);

alter table public.stay_profiles enable row level security;
alter table public.stay_affirmations enable row level security;
alter table public.stay_meetups enable row level security;
alter table public.stay_blocks enable row level security;
alter table public.crew_recognitions enable row level security;
alter table public.stay_pulses enable row level security;

-- Operators read recognition and pulse results for their own venue. Guest profiles, compliments, meetups and blocks are
-- never readable by operators: they are reached only through the guest endpoints.
create policy crew_recognitions_member_read on public.crew_recognitions for select to authenticated using (private.is_tenant_member(tenant_id));
create policy stay_pulses_member_read on public.stay_pulses for select to authenticated using (private.is_tenant_member(tenant_id));
grant select on public.crew_recognitions, public.stay_pulses to authenticated;

revoke all on public.stay_profiles, public.stay_affirmations, public.stay_meetups, public.stay_blocks, public.crew_recognitions, public.stay_pulses from anon;
revoke all on public.stay_profiles, public.stay_affirmations, public.stay_meetups, public.stay_blocks from authenticated;
grant select, insert, update, delete on public.stay_profiles, public.stay_affirmations, public.stay_meetups, public.stay_blocks, public.crew_recognitions, public.stay_pulses to service_role;

comment on table public.stay_profiles is 'Opt-in guest profile for guest-to-guest connection: chosen first name, preset avatar, shared interests. Not readable by operators. Purged with the stay.';
comment on table public.stay_affirmations is 'A preset positive compliment from one opted-in guest to another. One per pair per sailing day. Purged with the stay.';
