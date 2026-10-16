-- Hours of use per appliance, and the model's savings estimates.
--
-- hours_per_day is what turns an appliance list into a consumption estimate:
-- two ACs that run 2 hours a day and two that run 12 are different bills. It
-- applies to each unit in the row (quantity 2, 8 hours = both run 8 hours).
-- 0 is "never", 24 is "always on". Nullable: rows saved before the survey
-- asked read as unknown, and the model is told so rather than guessing zero.
alter table public.appliances
  add column if not exists hours_per_day smallint
    check (hours_per_day between 0 and 24);

-- The model's kWh-per-month estimate for each rule-engine recommendation,
-- keyed by the recommendation id: { "high-vs-peers": { "kwh": 30, "php": 360 } }.
-- Estimates for the model's own actions live inside `actions`. jsonb for the
-- same reason `actions` is: written and read as one blob with the row.
alter table public.bill_insights
  add column if not exists rule_savings jsonb not null default '{}'::jsonb;
