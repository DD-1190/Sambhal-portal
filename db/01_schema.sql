-- Sambhal portal: database for the WhatsApp property enquiry flow.
-- Works on Postgres 14+ (Supabase included). Run the whole file once in the SQL editor.
-- Every client table carries account_id so client data stays separate.

create extension if not exists pgcrypto;

create table if not exists accounts (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  city           text,
  contact_name   text,
  stage          text not null default 'lead' check (stage in ('lead','check','plan','onboarding','live')),
  plan           text not null default 'property',
  fee_inr        integer not null default 15000,
  hours_included numeric not null default 8,
  jobs_allowed   integer not null default 1,
  is_demo        boolean not null default false,
  created_at     timestamptz not null default now()
);

-- WhatsApp connection per client. The client owns the Meta Business account; Sambhal holds an access token.
-- Phase 0 keeps the token in this table. Before real clients, move it to Supabase Vault or encrypt it (pgcrypto).
create table if not exists account_wa (
  account_id      uuid primary key references accounts(id) on delete cascade,
  phone_number_id text not null unique,
  waba_id         text,
  display_number  text,
  access_token    text not null,
  dealer_phone    text            -- where hot-lead and visit alerts go, digits only with country code
);

-- Per-client settings: buttons, budget bands, areas, visit slots, rates. Empty {} uses the defaults in the workflow.
create table if not exists account_config (
  account_id uuid primary key references accounts(id) on delete cascade,
  config     jsonb not null default '{}'::jsonb
);

create table if not exists usage_caps (
  account_id     uuid primary key references accounts(id) on delete cascade,
  monthly_cap_inr numeric not null default 1500
);

create table if not exists jobs (
  account_id uuid not null references accounts(id) on delete cascade,
  job_key    text not null check (job_key in ('property','pay','quote','report','appt')),
  enabled    boolean not null default false,
  primary key (account_id, job_key)
);

-- Plan enforcement: a client cannot switch on more jobs than their plan allows.
create or replace function enforce_job_limit() returns trigger language plpgsql as $$
declare allowed int; active int;
begin
  if new.enabled then
    select jobs_allowed into allowed from accounts where id = new.account_id;
    select count(*) into active from jobs
      where account_id = new.account_id and enabled and job_key <> new.job_key;
    if active + 1 > allowed then
      raise exception 'Plan allows % job(s); upgrade to enable %', allowed, new.job_key;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_job_limit on jobs;
create trigger trg_job_limit before insert or update on jobs
  for each row execute function enforce_job_limit();

create table if not exists listings (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  kind       text not null check (kind in ('flat','plot')),
  area       text not null,
  price_lakh numeric not null,
  title      text not null,
  details    text not null default '',
  active     boolean not null default true
);
create index if not exists listings_account_idx on listings(account_id, active);

create table if not exists conversations (
  account_id  uuid not null references accounts(id) on delete cascade,
  wa_id       text not null,
  step        text not null default 'new',
  data        jsonb not null default '{}'::jsonb,
  buyer_name  text,
  last_msg_id text,
  updated_at  timestamptz not null default now(),
  primary key (account_id, wa_id)
);

create table if not exists visits (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references accounts(id) on delete cascade,
  wa_id         text not null,
  buyer_name    text,
  listing_title text,
  slot_at       timestamptz not null,
  slot_label    text,
  status        text not null default 'booked',
  reminder_sent boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists visits_due_idx on visits(slot_at) where status = 'booked' and not reminder_sent;

-- The run log. Every row carries usage so the monthly "at cost" line comes straight from here.
-- est_cost is an estimate from the rates in account_config. Reconcile with Meta's invoice monthly.
create table if not exists events (
  id         bigserial primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  at         timestamptz not null default now(),
  job_key    text not null default 'property',
  event      text not null,
  status     text not null default 'ok' check (status in ('ok','failed')),
  msgs       integer not null default 0,
  ai_calls   integer not null default 0,
  est_cost   numeric not null default 0,
  meta       jsonb not null default '{}'::jsonb
);
create index if not exists events_account_at_idx on events(account_id, at desc);

create table if not exists hours_log (
  id         bigserial primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  on_date    date not null default current_date,
  task       text not null,
  hours      numeric not null
);

-- What the Overview and Accounts screens read.
create or replace view v_account_month as
select a.id as account_id, a.name, a.stage, a.fee_inr, a.hours_included, a.jobs_allowed,
  coalesce((select sum(h.hours) from hours_log h where h.account_id = a.id and h.on_date >= date_trunc('month', now())), 0) as hours_used,
  coalesce((select sum(e.msgs) from events e where e.account_id = a.id and e.at >= date_trunc('month', now())), 0) as msgs,
  coalesce((select sum(e.ai_calls) from events e where e.account_id = a.id and e.at >= date_trunc('month', now())), 0) as ai_calls,
  coalesce((select sum(e.est_cost) from events e where e.account_id = a.id and e.at >= date_trunc('month', now())), 0) as est_cost,
  coalesce((select monthly_cap_inr from usage_caps c where c.account_id = a.id), 1500) as cap_inr,
  (select count(*) from jobs j where j.account_id = a.id and j.enabled) as jobs_on,
  (select count(*) from visits v where v.account_id = a.id and v.created_at >= date_trunc('month', now())) as visits_booked
from accounts a;

-- Everything the n8n flow needs about one incoming message, in one round trip.
create or replace function get_context(p_phone_number_id text, p_wa_id text) returns jsonb
language plpgsql stable as $$
declare a accounts%rowtype; w account_wa%rowtype; used numeric; cap numeric;
begin
  select * into w from account_wa where phone_number_id = p_phone_number_id;
  if not found then return jsonb_build_object('known', false); end if;
  select * into a from accounts where id = w.account_id;
  select coalesce(sum(est_cost), 0) into used from events
    where account_id = a.id and at >= date_trunc('month', now());
  select coalesce((select monthly_cap_inr from usage_caps where account_id = a.id), 1500) into cap;
  return jsonb_build_object(
    'known', true,
    'enabled', a.stage in ('onboarding','live')
               and exists (select 1 from jobs j where j.account_id = a.id and j.job_key = 'property' and j.enabled),
    'capped', used >= cap,
    'account', jsonb_build_object('id', a.id, 'name', a.name, 'city', a.city),
    'wa', jsonb_build_object('token', w.access_token, 'phone_number_id', w.phone_number_id, 'dealer_phone', w.dealer_phone),
    'config', coalesce((select config from account_config where account_id = a.id), '{}'::jsonb),
    'conversation', (select to_jsonb(c) - 'account_id' from conversations c
                     where c.account_id = a.id and c.wa_id = p_wa_id),
    'listings', coalesce((select jsonb_agg(to_jsonb(l) order by l.price_lakh) from listings l
                          where l.account_id = a.id and l.active), '[]'::jsonb)
  );
end $$;

-- Saves one turn: the conversation state, the run-log event and any booked visit.
create or replace function save_turn(p jsonb) returns void
language plpgsql as $$
declare aid uuid := (p->>'account_id')::uuid; e jsonb; v jsonb;
begin
  insert into conversations (account_id, wa_id, step, data, buyer_name, last_msg_id, updated_at)
  values (aid, p->>'wa_id', p->>'step', coalesce(p->'data', '{}'::jsonb), nullif(p->>'buyer_name', ''), p->>'msg_id', now())
  on conflict (account_id, wa_id) do update set
    step = excluded.step, data = excluded.data,
    buyer_name = coalesce(excluded.buyer_name, conversations.buyer_name),
    last_msg_id = excluded.last_msg_id, updated_at = now();

  for e in select value from jsonb_array_elements(coalesce(p->'events', '[]'::jsonb)) loop
    insert into events (account_id, job_key, event, status, msgs, ai_calls, est_cost, meta)
    values (aid, 'property', e->>'event', coalesce(e->>'status', 'ok'),
            coalesce((e->>'msgs')::int, 0), coalesce((e->>'ai_calls')::int, 0),
            coalesce((e->>'est_cost')::numeric, 0), coalesce(e->'meta', '{}'::jsonb));
  end loop;

  v := p->'visit';
  if v is not null and jsonb_typeof(v) = 'object' then
    insert into visits (account_id, wa_id, buyer_name, listing_title, slot_at, slot_label)
    values (aid, p->>'wa_id', nullif(p->>'buyer_name', ''), v->>'listing_title', (v->>'slot_at')::timestamptz, v->>'slot_label');
  end if;
end $$;

-- ---------------------------------------------------------------
-- Demo Dealer account. Replace the three CHANGE_ME values, then run this block.
-- ---------------------------------------------------------------
do $$
declare aid uuid;
begin
  if exists (select 1 from accounts where is_demo) then return; end if;
  insert into accounts (name, city, contact_name, stage, fee_inr, is_demo)
  values ('Sambhal Demo Realty', 'Ghaziabad', 'Internal demo', 'live', 0, true) returning id into aid;

  insert into account_wa (account_id, phone_number_id, display_number, access_token, dealer_phone)
  values (aid, 'CHANGE_ME_PHONE_NUMBER_ID', 'CHANGE_ME_DISPLAY_NUMBER', 'CHANGE_ME_ACCESS_TOKEN', 'CHANGE_ME_YOUR_OWN_PHONE_919XXXXXXXXX');
  insert into account_config (account_id) values (aid);
  insert into usage_caps (account_id) values (aid);
  insert into jobs (account_id, job_key, enabled) values (aid, 'property', true);

  -- Sample listings. Prices and units are invented; replace with real stock.
  insert into listings (account_id, kind, area, price_lakh, title, details) values
    (aid, 'flat', 'Raj Nagar Extension', 48, '2 BHK, 1,050 sq ft', 'Ready to move, 6th floor'),
    (aid, 'flat', 'Raj Nagar Extension', 46, '2 BHK, 980 sq ft', 'Corner unit, 3rd floor'),
    (aid, 'flat', 'Raj Nagar Extension', 74, '3 BHK, 1,420 sq ft', 'Under construction, possession Mar 2027'),
    (aid, 'flat', 'Indirapuram', 62, '2 BHK, 1,180 sq ft', 'Gated society, 9th floor'),
    (aid, 'flat', 'Indirapuram', 92, '3 BHK, 1,650 sq ft', 'Ready to move, park facing'),
    (aid, 'flat', 'Vaishali', 41, '2 BHK, 900 sq ft', 'Near metro, 2nd floor'),
    (aid, 'plot', 'Raj Nagar Extension', 55, '150 sq yd plot', 'East facing, 30 ft road');
end $$;
