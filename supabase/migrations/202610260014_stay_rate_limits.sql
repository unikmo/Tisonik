-- Fixed-window rate limits for the guest and UNIKMO stay endpoints.
-- Buckets are opaque strings (a hashed client key or a hotel id), never raw IP addresses.
create table public.hotel_stay_rate_limits (
  bucket text not null check (char_length(bucket) between 1 and 120),
  window_start timestamptz not null,
  hits integer not null default 0 check (hits >= 0),
  primary key (bucket, window_start)
);
alter table public.hotel_stay_rate_limits enable row level security;
revoke all on public.hotel_stay_rate_limits from anon, authenticated;
grant select, insert, update, delete on public.hotel_stay_rate_limits to service_role;

-- Counts one hit. Returns true while the bucket is still within its limit.
create or replace function public.stay_rate_limit_hit(p_bucket text, p_window_seconds integer, p_limit integer)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  h integer;
begin
  insert into public.hotel_stay_rate_limits(bucket, window_start, hits) values (p_bucket, w, 1)
  on conflict (bucket, window_start) do update set hits = public.hotel_stay_rate_limits.hits + 1
  returning hits into h;
  return h <= p_limit;
end $$;

-- Reads without counting. Returns true once the bucket has reached its limit.
create or replace function public.stay_rate_limit_blocked(p_bucket text, p_window_seconds integer, p_limit integer)
returns boolean language sql stable security definer set search_path = public
as $
  select coalesce((select hits from public.hotel_stay_rate_limits
    where bucket = p_bucket
      and window_start = to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds)), 0) >= p_limit
$;

revoke all on function public.stay_rate_limit_hit(text, integer, integer) from public;
revoke all on function public.stay_rate_limit_blocked(text, integer, integer) from public;
grant execute on function public.stay_rate_limit_hit(text, integer, integer) to service_role;
grant execute on function public.stay_rate_limit_blocked(text, integer, integer) to service_role;

-- The daily purge also clears old rate-limit windows.
create or replace function public.purge_expired_hotel_stays(retention_days integer default 90)
returns integer language plpgsql security definer set search_path = public
as $$
declare removed integer;
begin
  delete from public.hotel_stays
  where valid_to + window_days + retention_days < current_date;
  get diagnostics removed = row_count;
  delete from public.hotel_stay_rate_limits where window_start < now() - interval '2 days';
  return removed;
end $$;
