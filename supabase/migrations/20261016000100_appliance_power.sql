-- Typical power draw per appliance, so consumption can be calculated.
--
-- Until now the only way to put a number against an appliance was to ask the
-- language model, which guessed. A guess is not reproducible: the same
-- aircon gets a different figure on a different day, two users with
-- identical setups see different savings, and nobody can answer "where did
-- that come from?".
--
-- With watts and a duty cycle here, and hours of use on the appliance row,
-- consumption is arithmetic:
--
--   kWh/month = watts x duty_cycle x hours_per_day x quantity x 30 / 1000
--
-- Reference data, like the other lookup tables: the same for every user,
-- readable by anyone signed in, writable only by the service role.
--
--
-- WARNING: THE SEEDED FIGURES BELOW ARE UNVERIFIED PLACEHOLDERS.
--
-- They are plausible, not published. power_source records that fact per row
-- so the gap is visible in the data rather than buried in a comment — when
-- these are checked against a real source, that column is what changes.
-- Intended sources: Meralco's appliance calculator and the DOE energy
-- labelling data.


-- ---------------------------------------------------------------------------
-- appliance_kinds
-- ---------------------------------------------------------------------------
alter table public.appliance_kinds
  -- Draw while actually running, for one unit. Not the nameplate maximum,
  -- which a motor only reaches at startup.
  add column if not exists typical_watts integer
    check (typical_watts is null or typical_watts > 0),

  -- The share of its "on" hours that it actually draws power. A fridge is
  -- plugged in around the clock but its compressor runs perhaps a third of
  -- that, so nameplate x 24 overstates it badly. 1.00 for anything that
  -- draws continuously while switched on.
  add column if not exists duty_cycle numeric(3, 2) not null default 1.00
    check (duty_cycle > 0 and duty_cycle <= 1),

  -- Where the figures came from. Shown to the user, and the honest answer
  -- is currently "nobody has checked".
  add column if not exists power_source text;


-- ---------------------------------------------------------------------------
-- appliance_subtypes
-- ---------------------------------------------------------------------------
-- Overrides, null meaning "same as the kind". An inverter unit draws
-- materially less than a non-inverter one of the same size, and that
-- difference is the entire basis of the recommendation the app makes about
-- them — so it cannot be averaged away into one figure for the kind.
alter table public.appliance_subtypes
  add column if not exists typical_watts integer
    check (typical_watts is null or typical_watts > 0),
  add column if not exists duty_cycle numeric(3, 2)
    check (duty_cycle is null or (duty_cycle > 0 and duty_cycle <= 1)),
  add column if not exists power_source text;


-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------
-- Placeholders. See the warning above before trusting any of these.
update public.appliance_kinds set
  typical_watts = v.watts,
  duty_cycle = v.duty,
  power_source = 'PLACEHOLDER - unverified, pending DOE / Meralco check'
from (values
  ('Air Conditioner', 1200, 0.70),
  ('Refrigerator',     150, 0.35),
  ('Television',        80, 1.00),
  ('Washing Machine',  500, 1.00),
  ('Water Heater',    3000, 1.00),
  ('Electric Fan',      60, 1.00),
  ('Lighting',          12, 1.00)
) as v(name, watts, duty)
where appliance_kinds.appliance_name = v.name;

-- Inverter variants only. The others (OLED, CRT, LED bulbs) differ too, but
-- inventing a second unverified number for each adds no accuracy — they
-- inherit the kind until someone has real figures.
update public.appliance_subtypes set
  typical_watts = v.watts,
  duty_cycle = v.duty,
  power_source = 'PLACEHOLDER - unverified, pending DOE / Meralco check'
from (values
  ('Air Conditioner', 'Inverter',     900, 0.60),
  ('Air Conditioner', 'Non-inverter', 1200, 0.70),
  ('Refrigerator',    'Inverter',     120, 0.30),
  ('Refrigerator',    'Non-inverter',  150, 0.35),
  ('Washing Machine', 'Inverter',      400, 1.00),
  ('Washing Machine', 'Non-inverter',  500, 1.00)
) as v(kind, subtype, watts, duty)
where appliance_subtypes.subtype_name = v.subtype
  and appliance_subtypes.kind_id = (
    select id from public.appliance_kinds where appliance_name = v.kind
  );
