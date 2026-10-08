-- LLM-written narrative for a bill's insights.
--
-- The rule engine owns every number and runs instantly. This table holds the
-- part a language model adds on top: a readable summary and any further
-- suggestions it can justify from the same figures. It never replaces a rule
-- result — it is stored beside one.
--
-- It exists because generation is asynchronous. The insights endpoint answers
-- immediately with the score, starts the model in the background, and the
-- text is picked up on a later request. Without somewhere to put it there is
-- nothing to come back to.
--
-- Keeping it also means a model is called once per set of inputs rather than
-- on every page view, which matters on a rate-limited free tier.


create table if not exists public.bill_insights (
  -- One narrative per bill. Cascades, so deleting a bill takes its text with
  -- it rather than leaving commentary about figures nobody can see.
  bill_id uuid primary key references public.bills (id) on delete cascade,

  -- pending: a request is in flight. ready: text is available. failed: the
  -- model could not be reached, and the caller shows the score without prose
  -- rather than an error — losing the narrative is not losing the feature.
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'failed')),

  -- Fingerprint of the figures the text was written about: consumption,
  -- amount, the appliance survey, and whether the benchmark was real. A bill
  -- is not the only input, so keying on bill_id alone would leave stale prose
  -- describing appliances the user has since corrected. When the fingerprint
  -- no longer matches, the row is regenerated.
  profile_hash text not null,

  summary text,

  -- Extra priority actions the model proposed, as
  -- [{ "title": ..., "description": ..., "impact": ... }].
  -- jsonb rather than a child table: they are written and read as one blob,
  -- never queried individually, and they live and die with this row.
  actions jsonb not null default '[]'::jsonb,

  -- Which model wrote it. Free endpoints are swapped out often, and when the
  -- wording of an old row looks wrong this is the only way to know what
  -- produced it.
  model text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
-- Reached through the owning bill and its establishment, the same ownership
-- chain the rest of the schema uses.
alter table public.bill_insights enable row level security;

create policy "bill_insights: own"
  on public.bill_insights for all
  to authenticated
  using (
    exists (
      select 1
      from public.bills b
      join public.establishments e on e.id = b.establishment_id
      where b.id = bill_insights.bill_id
        and e.account_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.bills b
      join public.establishments e on e.id = b.establishment_id
      where b.id = bill_insights.bill_id
        and e.account_id = (select auth.uid())
    )
  );
