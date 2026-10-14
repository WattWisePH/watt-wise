-- What the user did with each priority action: marked it done, or dismissed it.
--
-- Keyed per bill, not per establishment: a status answers "this month's
-- analysis", so an action whose cause is still there next month comes back.
-- Title, description and savings are copied in because the narrative they
-- came from is rewritten whenever the inputs change, and the archive still
-- has to say what was done.
create table if not exists public.action_statuses (
  bill_id uuid not null references public.bills (id) on delete cascade,
  -- A rule's slug ("high-vs-peers") or a model action's "ai-<title slug>".
  action_id text not null,
  status text not null check (status in ('done', 'dismissed')),
  title text not null,
  description text not null,
  impact text not null check (impact in ('high', 'medium', 'low')),
  -- { "kwh": 30, "php": 360 }, or null when there was no estimate.
  savings jsonb,
  created_at timestamptz not null default now(),
  primary key (bill_id, action_id)
);

grant select, insert, update, delete on public.action_statuses to authenticated;

-- Same ownership chain as bill_insights: bill -> establishment -> account.
alter table public.action_statuses enable row level security;

create policy "action_statuses: own"
  on public.action_statuses for all
  to authenticated
  using (
    exists (
      select 1
      from public.bills b
      join public.establishments e on e.id = b.establishment_id
      where b.id = action_statuses.bill_id
        and e.account_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.bills b
      join public.establishments e on e.id = b.establishment_id
      where b.id = action_statuses.bill_id
        and e.account_id = (select auth.uid())
    )
  );
