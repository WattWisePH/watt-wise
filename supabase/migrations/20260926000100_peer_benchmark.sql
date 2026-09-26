-- Peer benchmarking.
--
-- The recommendation engine compares an establishment's consumption against
-- "similar establishments". That comparison needs to read rows belonging to
-- other accounts, which Row-Level Security exists precisely to prevent.
--
-- The way out is a security definer function: it runs as its owner rather
-- than as the caller, so it can see every row, but it only ever returns an
-- aggregate. No caller can reach an individual establishment's figures
-- through it.
--
-- That is a real hole in RLS if it is written carelessly, so three things
-- guard it:
--
--   1. A minimum cohort. An average over one peer IS that peer's data, and
--      an average over two lets a caller subtract their own to recover the
--      other's. Below the floor the function returns null and the caller
--      falls back to a published reference figure.
--   2. The caller's own establishments are excluded, so the "peer" average
--      is genuinely other people. It also stops a single heavy user from
--      being benchmarked against themselves.
--   3. search_path is pinned. Without it, a caller who can create objects
--      could shadow a table name and have this function — running with the
--      owner's privileges — read theirs instead.


-- ---------------------------------------------------------------------------
-- peer_benchmark
-- ---------------------------------------------------------------------------
-- Average monthly consumption for establishments of the same type, and how
-- many of them contributed.
--
-- The cohort size is returned even when the average is withheld: a count is
-- not identifying on its own, and the UI needs it both to say "compared with
-- N similar establishments" and to explain why a comparison is unavailable.

create or replace function public.peer_benchmark(p_type_id uuid)
returns table (peer_average_kwh numeric, cohort_size integer)
language sql
stable
security definer
-- pg_temp last, and explicitly: a temp table shadowing one of ours would
-- otherwise be resolved first.
set search_path = public, pg_temp
as $$
  with peer_monthly as (
    -- One row per peer establishment: its own average monthly consumption.
    -- Averaging per establishment first stops an account that has uploaded
    -- two years of bills from outweighing one that uploaded a single month.
    select
      e.id,
      avg(b.kwh_used) as avg_kwh
    from public.establishments e
    join public.bills b on b.establishment_id = e.id
    where e.type_id = p_type_id
      -- Exclude the caller's own establishments. auth.uid() still resolves
      -- here: security definer changes the executing role, not the JWT.
      and e.account_id <> (select auth.uid())
      -- Recent bills only. A benchmark built from 2019 statements would
      -- compare today's usage against a different tariff era.
      and b.period_end >= (current_date - interval '12 months')
    group by e.id
  ),
  summary as (
    select avg(avg_kwh) as average, count(*)::integer as peers from peer_monthly
  )
  select
    -- Withheld below the floor. Returning null rather than a small-sample
    -- average is deliberate: a wrong benchmark is worse than none, and this
    -- is also the leak guard.
    case when peers >= 5 then round(average, 2) end,
    peers
  from summary;
$$;

comment on function public.peer_benchmark(uuid) is
  'Average monthly kWh for other accounts'' establishments of the given type, '
  'over the last 12 months. Returns a null average when fewer than 5 peers '
  'contributed, so a small cohort cannot expose an individual.';

-- Callable by any signed-in user; the guards above are what make that safe.
-- Revoked from public first, so it isn't reachable unauthenticated.
revoke all on function public.peer_benchmark(uuid) from public;
grant execute on function public.peer_benchmark(uuid) to authenticated;
