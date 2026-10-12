#!/usr/bin/env bash
#
# Apply every migration to a throwaway Postgres database and assert the
# behaviour the schema is supposed to guarantee.
#
# Why this exists: the Row-Level Security policies are the last line of
# defence for user data, and a policy that silently doesn't apply looks
# exactly like one that does — until someone reads a row they shouldn't. The
# only way to know is to run the SQL and try.
#
# Uses a local Postgres rather than `supabase db start`, which needs Docker.
# The Supabase-provided pieces the migrations depend on (auth.users,
# auth.uid(), the authenticated role) are stubbed below.
#
# Usage:  pnpm test:db        (needs a local Postgres accepting connections)

set -euo pipefail

DB="wattwise_migration_test_$$"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILURES=0

cleanup() { psql -q -c "drop database if exists ${DB}" postgres >/dev/null 2>&1 || true; }
trap cleanup EXIT

pass() { echo "  PASS  $1"; }
fail() { echo "  FAIL  $1"; FAILURES=$((FAILURES + 1)); }

# Assert a psql query outputs an expected value.
expect_eq() {
  local label="$1" expected="$2" actual
  actual="$(psql -q -t -A -d "${DB}" -f - 2>&1 | tail -1 || true)"
  if [[ "${actual}" == "${expected}" ]]; then pass "${label}"; else
    fail "${label} (expected '${expected}', got '${actual}')"
  fi
}

# Assert a statement is rejected.
expect_error() {
  local label="$1" out
  out="$(psql -q -d "${DB}" -f - 2>&1 || true)"
  if grep -qi "ERROR" <<<"${out}"; then pass "${label}"; else
    fail "${label} (statement was allowed)"
  fi
}

echo "Creating ${DB} ..."
psql -q -c "create database ${DB}" postgres

echo "Stubbing the Supabase-provided objects ..."
psql -v ON_ERROR_STOP=1 -q -d "${DB}" <<'SQL'
create schema if not exists auth;
create extension if not exists "pgcrypto";
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);
-- Stand-in for Supabase's auth.uid(): reads whatever the session claims.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
-- Roles are cluster-wide, so this survives between runs.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
end $$;
SQL

echo "Applying migrations ..."
for f in "${ROOT}"/supabase/migrations/*.sql; do
  echo "  - $(basename "${f}")"
  psql -v ON_ERROR_STOP=1 -q -d "${DB}" -f "${f}"
done

# Supabase grants these to the authenticated role by default.
psql -q -d "${DB}" >/dev/null <<'SQL'
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
SQL

echo
echo "Schema"
expect_eq "signup trigger creates the account row" "1" <<'SQL'
insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', 'a@t.com', '{"full_name":"Kenan"}');
select count(*) from public.accounts where id = '11111111-1111-1111-1111-111111111111';
SQL

expect_eq "lookup tables are seeded" "t" <<'SQL'
select (select count(*) from establishment_types) > 0
   and (select count(*) from providers) > 0
   and (select count(*) from appliance_subtypes) > 0;
SQL

expect_eq "row-level security is on for every table" "0" <<'SQL'
select count(*) from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
SQL

# Seed two users' data for the checks below.
psql -q -d "${DB}" >/dev/null <<'SQL'
insert into auth.users (id, email) values ('33333333-3333-3333-3333-333333333333','b@t.com');
insert into public.establishments (id, account_id, type_id, provider_id, name)
select '22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111',
       (select id from establishment_types where name='Cafe'),
       (select id from providers where acronym='Meralco'), 'Cafe Marie';
insert into public.establishments (id, account_id, type_id, provider_id, name)
select '44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333',
       (select id from establishment_types where name='Restaurant'),
       (select id from providers where acronym='VECO'), 'Bob Diner';
insert into public.bills (establishment_id, kwh_used, amount)
values ('22222222-2222-2222-2222-222222222222', 312, 1785.50),
       ('44444444-4444-4444-4444-444444444444', 200, 900.00);
SQL

echo
echo "Constraints"
expect_error "an appliance subtype from another kind is rejected" <<'SQL'
insert into public.appliances (establishment_id, kind_id, subtype_id, quantity)
select '22222222-2222-2222-2222-222222222222',
       (select k.id from appliance_kinds k where k.appliance_name='Air Conditioner'),
       (select s.id from appliance_subtypes s
          join appliance_kinds k on k.id = s.kind_id
         where k.appliance_name='Television' and s.subtype_name='OLED'), 1;
SQL

expect_error "a bill period ending before it starts is rejected" <<'SQL'
insert into public.bills (establishment_id, kwh_used, amount, period_start, period_end)
values ('22222222-2222-2222-2222-222222222222', 10, 10, '2026-06-30', '2026-06-01');
SQL

expect_error "negative usage is rejected" <<'SQL'
insert into public.bills (establishment_id, kwh_used, amount)
values ('22222222-2222-2222-2222-222222222222', -5, 10);
SQL

echo
echo "Row-level security"
expect_eq "a user sees only their own establishment" "Cafe Marie" <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select string_agg(name, ',') from public.establishments;
SQL

expect_eq "the other user sees only theirs" "Bob Diner" <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select string_agg(name, ',') from public.establishments;
SQL

expect_eq "a user sees only their own bills" "1" <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select count(*) from public.bills;
SQL

expect_eq "a session with no user sees nothing" "0" <<'SQL'
set role authenticated;
select count(*) from public.establishments;
SQL

expect_error "writing into another user's establishment is refused" <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.bills (establishment_id, kwh_used, amount)
values ('44444444-4444-4444-4444-444444444444', 999, 999);
SQL

expect_eq "another user's establishment cannot be reassigned" "33333333-3333-3333-3333-333333333333" <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.establishments set account_id = '11111111-1111-1111-1111-111111111111'
where id = '44444444-4444-4444-4444-444444444444';
reset role;
select account_id from public.establishments where id = '44444444-4444-4444-4444-444444444444';
SQL

echo
echo "What the API does"
# These are the operations the API performs on behalf of a signed-in user.
# Until now nothing had ever written to bills or appliances as `authenticated`,
# only as the owner of the database — which proves nothing about either the
# policies or the table privileges.
expect_eq "a user can record a bill against their own establishment" "1" <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.bills (establishment_id, kwh_used, amount, period_start, period_end)
values ('22222222-2222-2222-2222-222222222222', 280, 1600, '2026-07-01', '2026-07-31');
select count(*) from public.bills where period_start = '2026-07-01';
SQL

expect_eq "a user can save an appliance survey for their own establishment" "2" <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.appliances (establishment_id, kind_id, subtype_id, quantity)
select '22222222-2222-2222-2222-222222222222', k.id, s.id, 2
from appliance_kinds k join appliance_subtypes s on s.kind_id = k.id
where k.appliance_name = 'Air Conditioner' and s.subtype_name = 'Inverter';
-- A kind with no variants stores a null subtype rather than a placeholder.
insert into public.appliances (establishment_id, kind_id, quantity)
select '22222222-2222-2222-2222-222222222222', id, 3
from appliance_kinds where appliance_name = 'Electric Fan';
select count(*) from public.appliances;
SQL

expect_eq "appliances are visible only to the account that owns them" "0" <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select count(*) from public.appliances;
SQL

# The store relies on this: a delete that matched nothing and a delete that
# was refused look identical, so it asks for the deleted rows back and
# reports "not found" when none come. If RLS ever raised an error here
# instead of quietly matching nothing, that check would be the wrong shape.
expect_eq "deleting another user's appliance removes nothing, silently" "0" <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
with removed as (delete from public.appliances returning id)
select count(*) from removed;
SQL

expect_eq "a user can delete their own appliance" "1" <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
with removed as (
  delete from public.appliances
  where quantity = 3
  returning id
)
select count(*) from removed;
SQL

echo
echo "Peer benchmark"

# peer_benchmark is security definer, so it reads past RLS on purpose. These
# checks are the ones standing between "an aggregate" and "a way to read
# someone else's consumption", so they matter more than most.

expect_eq "nobody can call it without being signed in" "f" <<'SQL'
select has_function_privilege('public', 'public.peer_benchmark(uuid)', 'execute');
SQL

expect_eq "withholds an average when there are no peers at all" "null/0" <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select coalesce(peer_average_kwh::text, 'null') || '/' || cohort_size
from public.peer_benchmark((select id from establishment_types where name='Cafe'));
SQL

# Four peer cafes: one short of the floor.
psql -q -d "${DB}" >/dev/null <<'SQL'
insert into auth.users (id, email)
select ('55555555-5555-5555-5555-55555555000' || g)::uuid, 'peer' || g || '@t.com'
from generate_series(1, 5) g;

insert into public.establishments (id, account_id, type_id, provider_id, name)
select ('66666666-6666-6666-6666-66666666000' || g)::uuid,
       ('55555555-5555-5555-5555-55555555000' || g)::uuid,
       (select id from establishment_types where name = 'Cafe'),
       (select id from providers where acronym = 'Meralco'),
       'Peer Cafe ' || g
from generate_series(1, 5) g;

-- 100, 200, 300, 400 so far: mean 250, which is NOT what a five-peer cohort
-- averages. If the floor leaked, the next assertion would show that number.
insert into public.bills (establishment_id, kwh_used, amount, period_start, period_end)
select ('66666666-6666-6666-6666-66666666000' || g)::uuid,
       g * 100, g * 500,
       current_date - interval '2 months', current_date - interval '1 month'
from generate_series(1, 4) g;
SQL

expect_eq "still withholds the average one peer short of the floor" "null/4" <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select coalesce(peer_average_kwh::text, 'null') || '/' || cohort_size
from public.peer_benchmark((select id from establishment_types where name='Cafe'));
SQL

# The fifth peer reaches the floor. 100+200+300+400+500 = 1500, mean 300.
psql -q -d "${DB}" >/dev/null <<'SQL'
insert into public.bills (establishment_id, kwh_used, amount, period_start, period_end)
values (('66666666-6666-6666-6666-666666660005')::uuid, 500, 2500,
        current_date - interval '2 months', current_date - interval '1 month');
SQL

# 300 exactly. Cafe Marie (the caller's own, at 312 kWh) would drag this to
# 302 if it were counted, so this number is also the exclusion check.
expect_eq "averages the cohort once the floor is met, excluding the caller's own" "300.00/5" <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select peer_average_kwh::text || '/' || cohort_size
from public.peer_benchmark((select id from establishment_types where name='Cafe'));
SQL

expect_eq "counts an establishment once however many bills it has" "300.00/5" <<'SQL'
-- A second bill for one peer must not give it two votes: the function
-- averages per establishment first, then across establishments.
insert into public.bills (establishment_id, kwh_used, amount, period_start, period_end)
values (('66666666-6666-6666-6666-666666660001')::uuid, 100, 500,
        current_date - interval '4 months', current_date - interval '3 months');
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select peer_average_kwh::text || '/' || cohort_size
from public.peer_benchmark((select id from establishment_types where name='Cafe'));
SQL

expect_eq "ignores bills older than the benchmark window" "300.00/5" <<'SQL'
-- A tariff era ago. Counting it would move the mean; it must not.
insert into public.bills (establishment_id, kwh_used, amount, period_start, period_end)
values (('66666666-6666-6666-6666-666666660002')::uuid, 9000, 45000,
        current_date - interval '25 months', current_date - interval '24 months');
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select peer_average_kwh::text || '/' || cohort_size
from public.peer_benchmark((select id from establishment_types where name='Cafe'));
SQL

expect_eq "a bill with no period is outside the window entirely" "null/0" <<'SQL'
-- Bob Diner's only bill records no period, so there is no way to place its
-- consumption in time. The API always sets one; a row like this can only
-- arrive by hand, and counting it would silently date-shift the benchmark.
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select coalesce(peer_average_kwh::text, 'null') || '/' || cohort_size
from public.peer_benchmark((select id from establishment_types where name='Restaurant'));
SQL

expect_eq "a different type has its own cohort" "null/1" <<'SQL'
-- Give Bob Diner a dated bill and it becomes the Restaurant cohort's only
-- member: separate from the five cafes, and still below the floor.
insert into public.bills (establishment_id, kwh_used, amount, period_start, period_end)
values ('44444444-4444-4444-4444-444444444444', 200, 900,
        current_date - interval '2 months', current_date - interval '1 month');
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select coalesce(peer_average_kwh::text, 'null') || '/' || cohort_size
from public.peer_benchmark((select id from establishment_types where name='Restaurant'));
SQL

echo
echo "LLM narrative"

# A bill with a known id, so the checks below can name it directly. Going
# through a subquery instead would prove nothing: RLS hides the row from the
# other user, so their insert would write zero rows and raise nothing —
# looking like a passing test while the policy went unexercised.
psql -q -d "${DB}" >/dev/null <<'SQL'
insert into public.bills (id, establishment_id, kwh_used, amount, period_start, period_end)
values ('77777777-7777-7777-7777-777777777777',
        '22222222-2222-2222-2222-222222222222', 300, 1500,
        current_date - interval '2 months', current_date - interval '1 month');
SQL

expect_eq "a user can store a narrative for their own bill" "1" <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
with written as (
  insert into public.bill_insights (bill_id, profile_hash, status, summary)
  values ('77777777-7777-7777-7777-777777777777', 'hash-1', 'ready',
          'Your aircon is the biggest draw.')
  returning bill_id
)
select count(*) from written;
SQL

expect_error "a narrative cannot be written against another user's bill" <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into public.bill_insights (bill_id, profile_hash, status)
values ('77777777-7777-7777-7777-777777777777', 'hash-2', 'pending');
SQL

expect_eq "another user cannot read it either" "0" <<'SQL'
-- RLS hides the row rather than refusing the read, so an attacker learns
-- nothing about whether a narrative exists.
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select count(*) from public.bill_insights;
SQL

expect_error "an unknown status is rejected" <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.bill_insights set status = 'half-done';
SQL

expect_eq "deleting a bill takes its narrative with it" "0" <<'SQL'
-- Commentary about figures nobody can see any more would be worse than
-- nothing, so the row cascades rather than lingering.
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
delete from public.bills where establishment_id = '22222222-2222-2222-2222-222222222222';
select count(*) from public.bill_insights;
SQL

echo
if (( FAILURES > 0 )); then
  echo "${FAILURES} check(s) failed."
  exit 1
fi
echo "All schema checks passed."
